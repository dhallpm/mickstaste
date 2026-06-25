import { buildWebsiteFeed } from '../lib/buildWebsiteFeed.js'
import { sendError } from '../lib/syncAuth.js'

const VIP_HOST = 'vip.mickspicks.us'
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

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

export function isAllowedVipRequest(req = {}) {
  const host = requestHost(req)
  if (LOCAL_HOSTS.has(host)) return true
  return host === VIP_HOST && Boolean(cloudflareAccessToken(req))
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
    homePreview: 'Full betting number, stake, sportsbook, and analysis are available inside the protected VIP portal.',
    analysisPreview: 'Full betting number, stake, sportsbook, and analysis are available inside the protected VIP portal.',
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
    if (vipFeed && !isAllowedVipRequest(req)) {
      res.status(403).json({
        success: false,
        error: 'VIP feed requires the Cloudflare Access protected vip.mickspicks.us host.'
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
