import { buildWebsiteFeed } from '../lib/buildWebsiteFeed.js'
import { reclassifyBelowAMasterPicks } from './todays-picks.js'

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

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')

  if (!isAllowedVipRequest(req)) {
    res.status(403).json({
      success: false,
      error: 'VIP feed requires the Cloudflare Access protected vip.mickspicks.us host.'
    })
    return
  }

  try {
    const rawResult = await buildWebsiteFeed({
      date: req.query?.date,
      league: req.query?.league
    })
    const result = reclassifyBelowAMasterPicks(rawResult)

    res.status(200).json({
      success: true,
      source: result.source,
      sourceOfTruth: result.sourceOfTruth,
      spreadsheetId: result.spreadsheetId,
      date: result.date,
      warnings: result.warnings || [],
      vip: result.vip || [],
      vipVault: result.vipVault || []
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      success: false,
      error: error.message || String(error)
    })
  }
}
