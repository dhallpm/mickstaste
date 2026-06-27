import { createPublicKey, verify as verifySignature } from 'node:crypto'

import { buildWebsiteFeed } from '../lib/buildWebsiteFeed.js'
import { sendError } from '../lib/syncAuth.js'

const VIP_ORIGIN_HOSTS = new Set(['vip.mickspicks.us', 'www.mickspicks.us'])
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])
const JWKS_CACHE = new Map()

function firstHeader(headers = {}, name = '') {
  const lowerName = name.toLowerCase()
  const pair = Object.entries(headers || {}).find(([key]) => key.toLowerCase() === lowerName)
  const value = pair ? pair[1] : ''
  return Array.isArray(value) ? value[0] : String(value || '')
}

export function requestHost(req = {}) {
  const forwardedHost = firstHeader(req.headers, 'x-forwarded-host')
  const host = forwardedHost || firstHeader(req.headers, 'host')
  return host.split(',')[0].trim().toLowerCase().replace(/:\d+$/, '')
}

export function cloudflareAccessToken(req = {}) {
  return firstHeader(req.headers, 'cf-access-jwt-assertion')
}

function accessConfig(env = process.env) {
  const teamDomain = String(env.CF_ACCESS_TEAM_DOMAIN || env.CLOUDFLARE_ACCESS_TEAM_DOMAIN || '').trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
  const audience = String(env.CF_ACCESS_AUD || env.CLOUDFLARE_ACCESS_AUD || env.VIP_ACCESS_AUD || '').trim()
  const allowedEmails = String(env.VIP_ACCESS_EMAILS || env.CF_ACCESS_ALLOWED_EMAILS || '').split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean)
  return { teamDomain, audience, allowedEmails }
}

function decodeBase64Url(input = '') {
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

function decodeJwtPart(part = '') {
  return JSON.parse(decodeBase64Url(part).toString('utf8'))
}

async function cloudflareAccessJwks(teamDomain) {
  const cached = JWKS_CACHE.get(teamDomain)
  if (cached && cached.expiresAt > Date.now()) return cached.keys
  const response = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Cloudflare Access certs ${response.status}`)
  const body = await response.json()
  const keys = Array.isArray(body.keys) ? body.keys : []
  JWKS_CACHE.set(teamDomain, { keys, expiresAt: Date.now() + 5 * 60 * 1000 })
  return keys
}

function tokenEmail(payload = {}) {
  return String(payload.email || payload.common_name || payload.identity?.email || '').trim().toLowerCase()
}

export async function validateCloudflareAccessJwt(token = '', config = accessConfig()) {
  const parts = String(token || '').split('.')
  if (parts.length !== 3 || !config.teamDomain || !config.audience) return null
  const [encodedHeader, encodedPayload, encodedSignature] = parts
  const header = decodeJwtPart(encodedHeader)
  const payload = decodeJwtPart(encodedPayload)
  const now = Math.floor(Date.now() / 1000)
  const expectedIssuer = `https://${config.teamDomain}`
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
  if (header.alg !== 'RS256' || !header.kid) return null
  if (payload.iss !== expectedIssuer || !audiences.includes(config.audience)) return null
  if (payload.exp && now >= Number(payload.exp)) return null
  if (payload.nbf && now < Number(payload.nbf)) return null

  const keys = await cloudflareAccessJwks(config.teamDomain)
  const jwk = keys.find(key => key.kid === header.kid)
  if (!jwk) return null
  const publicKey = createPublicKey({ key: jwk, format: 'jwk' })
  const valid = verifySignature('RSA-SHA256', Buffer.from(`${encodedHeader}.${encodedPayload}`), publicKey, decodeBase64Url(encodedSignature))
  return valid ? payload : null
}

export async function isAllowedVipRequest(req = {}, env = process.env) {
  const host = requestHost(req)
  if (LOCAL_HOSTS.has(host)) return true
  if (!VIP_ORIGIN_HOSTS.has(host)) return false
  const token = cloudflareAccessToken(req)
  if (!token) return false
  const config = accessConfig(env)
  try {
    const payload = await validateCloudflareAccessJwt(token, config)
    if (!payload) return false
    return !config.allowedEmails.length || config.allowedEmails.includes(tokenEmail(payload))
  } catch (error) {
    console.warn('Cloudflare Access JWT validation failed:', error.message)
    return false
  }
}

function gradeValue(row = {}) {
  return String(row.grade || row.Grade || '').trim().toUpperCase()
}

function isAOrBetter(row = {}) {
  const grade = gradeValue(row)
  return grade === 'A' || grade === 'A+'
}

function isMasterPick(row = {}) {
  const section = String(row.section || '').toLowerCase()
  const table = String(row.originalTable || row.__table || row.Table || '').toLowerCase()
  return (!section || section === 'picks') && !/(props?|lotto|parlay|longshot)/i.test(table)
}

function makePublicCard(row = {}) {
  const card = {
    ...row,
    access: 'Free',
    fullAnalysisLocked: true,
    homePreview: row.homePreview || row.analysisPreview || row.writeup || row.description || '',
    analysisPreview: row.analysisPreview || row.writeup || row.description || ''
  }
  delete card.fullAnalysis
  return card
}

export function makePublicVipTeaser(row = {}) {
  return {
    id: row.id || '',
    recordKey: row.recordKey || '',
    source: row.source || 'Google Sheets',
    section: row.section || 'picks',
    date: row.date || '',
    league: row.league || '',
    game: row.league ? `${row.league} VIP Market Room` : 'VIP Market Room',
    pick: 'VIP Pick Locked',
    cardTitle: 'VIP Pick Locked',
    betType: 'Members Only',
    category: 'VIP Vault',
    access: 'VIP',
    status: 'VIP Locked',
    releaseStatus: 'VIP Locked',
    grade: 'VIP',
    odds: 'Protected',
    units: 'Members',
    bestNumber: 'Members only',
    noBetCutoff: 'Protected portal',
    sportsbook: 'VIP Portal',
    fullAnalysisLocked: true,
    homePreview: 'Full betting number, stake, sportsbook, and analysis are available inside the VIP Vault.',
    analysisPreview: 'Full betting number, stake, sportsbook, and analysis are available inside the VIP Vault.',
    originalTable: row.originalTable || ''
  }
}

function keyOf(row = {}) {
  return String(row.recordKey || row.id || `${row.date || ''}|${row.game || ''}|${row.pick || ''}|${row.grade || ''}`)
}

function dedupe(rows = []) {
  return Array.from(new Map(rows.map(row => [keyOf(row), row])).values())
}

export function reclassifyBelowAMasterPicks(result = {}) {
  const vip = Array.isArray(result.vip) ? result.vip : []
  const free = Array.isArray(result.free) ? result.free : []
  const vipVault = Array.isArray(result.vipVault) ? result.vipVault : []

  const belowAMasterFromVip = vip.filter(row => isMasterPick(row) && !isAOrBetter(row))
  const belowAMasterFromVault = vipVault.filter(row => isMasterPick(row) && !isAOrBetter(row))
  const moveToFree = dedupe([...belowAMasterFromVip, ...belowAMasterFromVault])
  const movedKeys = new Set(moveToFree.map(keyOf))

  const keptVip = vip.filter(row => !movedKeys.has(keyOf(row)))
  const keptVault = vipVault.filter(row => !movedKeys.has(keyOf(row)))

  if (!moveToFree.length && keptVault.length === vipVault.length && keptVip.length === vip.length) return result

  const warnings = [...(result.warnings || [])]
  if (moveToFree.length) {
    warnings.push(`Reclassified/removed ${moveToFree.length} Master Picks below A grade from VIP/Vault and kept them Free only.`)
  }

  return {
    ...result,
    free: dedupe([...free, ...moveToFree.map(makePublicCard)]),
    vip: keptVip,
    vipVault: keptVault,
    warnings
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  try {
    const vipFeed = String(req.query?.vip || '').trim() === '1'
    if (vipFeed && !(await isAllowedVipRequest(req))) {
      res.status(403).json({
        success: false,
        error: 'VIP feed requires access through the VIP Vault destination.'
      })
      return
    }

    const rawResult = await buildWebsiteFeed({
      date: req.query?.date,
      league: req.query?.league
    })
    const result = reclassifyBelowAMasterPicks(rawResult)
    if (result.warnings?.length) {
      console.warn('Today picks Google Sheets diagnostics:', result.warnings)
    }

    const payload = vipFeed ? {
      success: true,
      source: result.source,
      sourceOfTruth: result.sourceOfTruth,
      spreadsheetId: result.spreadsheetId,
      date: result.date,
      warnings: result.warnings || [],
      vip: result.vip || [],
      vipVault: result.vipVault || []
    } : {
      success: true,
      source: result.source,
      sourceOfTruth: result.sourceOfTruth,
      spreadsheetId: result.spreadsheetId,
      date: result.date,
      warnings: result.warnings || [],
      free: result.free,
      vip: dedupe([...(result.vip || []), ...(result.vipVault || [])]).map(makePublicVipTeaser),
      vipVault: [],
      props: result.props,
      lottoParlays: result.lottoParlays,
      longshots: result.longshots
    }

    res.status(200).json(payload)
  } catch (error) {
    console.error(error)
    sendError(res, error)
  }
}
