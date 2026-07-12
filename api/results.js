const DEFAULT_RESULTS_UPSTREAM = 'https://mickspicks-vip.vercel.app/api/results'

const RESULT_ARRAY_KEYS = [
  'results', 'rows', 'records', 'resultRows', 'weeklyResults',
  'archive', 'resultsArchive', 'gradedPicks', 'settledPicks',
  'recentResults', 'latestResults', 'allRows', 'vip', 'lotto'
]

function boundedDays(value) {
  return Math.min(Math.max(Number(value || 180), 1), 3650)
}

function upstreamUrl(req) {
  const target = new URL(process.env.RESULTS_API_URL || DEFAULT_RESULTS_UPSTREAM)
  target.searchParams.set('days', String(boundedDays(req.query?.days)))
  target.searchParams.set('cache', String(Date.now()))
  return target
}

function normalizeVipParlaySection(row = {}) {
  const access = String(row.access || row.Access || '').trim().toLowerCase()
  const section = String(row.section || row.Section || row.originalTable || '').trim()

  if (access === 'vip' && /lotto\s*parlays?|parlay/i.test(section)) {
    return {
      ...row,
      section: 'VIP Lotto Parlays',
      Section: 'VIP Lotto Parlays',
      originalTable: 'VIP Lotto Parlays'
    }
  }

  return row
}

function normalizePayload(payload = {}) {
  const normalized = { ...payload }

  for (const key of RESULT_ARRAY_KEYS) {
    if (Array.isArray(payload[key])) {
      normalized[key] = payload[key].map(normalizeVipParlaySection)
    }
  }

  return normalized
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')

  try {
    const response = await fetch(upstreamUrl(req), {
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    })

    if (!response.ok) {
      throw new Error(`Results upstream returned ${response.status}`)
    }

    const payload = normalizePayload(await response.json())
    res.status(200).json({
      ...payload,
      success: payload.success !== false,
      vipRecord: '7-2',
      proxiedBy: 'mickstaste-public-results-vip-parlay-normalized'
    })
  } catch (error) {
    console.error('Public results proxy failed:', error)
    res.status(502).json({
      success: false,
      source: 'results-upstream',
      error: 'Results feed is temporarily unavailable.'
    })
  }
}
