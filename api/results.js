const DEFAULT_RESULTS_UPSTREAM = 'https://mickspicks-vip.vercel.app/api/results'

function boundedDays(value) {
  return Math.min(Math.max(Number(value || 180), 1), 3650)
}

function upstreamUrl(req) {
  const target = new URL(process.env.RESULTS_API_URL || DEFAULT_RESULTS_UPSTREAM)
  target.searchParams.set('days', String(boundedDays(req.query?.days)))
  target.searchParams.set('cache', String(Date.now()))
  return target
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

    const payload = await response.json()
    res.status(200).json({
      ...payload,
      success: payload.success !== false,
      proxiedBy: 'mickstaste-public-results'
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
