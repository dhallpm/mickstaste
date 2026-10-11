
import { createRequire } from 'node:module'
const localResults = createRequire(import.meta.url)('../data/results.json')
function mergeVerifiedTickets(payload) {
  const added = (localResults.results || []).filter(r => String(r.id || '').startsWith('micks-2026-10-11-pdf-ticket-'))
  const ids = new Set(added.map(r => r.id))
  const original = payload.results || payload.rows || payload.records || []
  const rows = [...added, ...original.filter(r => !ids.has(r.id))]
  const stats = list => {
    const eligible = list.filter(r => r.excludeFromRecord !== true)
    const number = v => Number(String(v ?? '').replace(/u$/i, '')) || 0
    const wins = eligible.filter(r => /^win$/i.test(r.result || r.Result)).length
    const losses = eligible.filter(r => /^loss$/i.test(r.result || r.Result)).length
    const pushes = eligible.filter(r => /^(push|void)$/i.test(r.result || r.Result)).length
    const netUnits = Number(eligible.reduce((s,r) => s + number(r.profitLoss ?? r['Profit/Loss']), 0).toFixed(2))
    const unitsRisked = Number(eligible.reduce((s,r) => s + number(r.units ?? r.Units), 0).toFixed(2))
    return {wins,losses,pushes,record:`${wins}-${losses}${pushes ? '-'+pushes : ''}`,netUnits,unitsRisked,units:`${netUnits>=0?'+':''}${netUnits.toFixed(2)}u`,profitLoss:`${netUnits>=0?'+':''}${netUnits.toFixed(2)}u`,winRate:wins+losses?(wins/(wins+losses)*100).toFixed(1)+'%':'--',roi:unitsRisked?Number((netUnits/unitsRisked*100).toFixed(1)):0}
  }
  const section = r => r.section || r.Section
  const group = name => rows.filter(r => section(r) === name)
  const overall = stats(rows), lotto = group('Lotto Parlays')
  const summary = {...payload.summary,overall,lottoParlays:stats(lotto)}
  const result = {...payload,date:'2026-10-11',summary,stats:overall,record:overall.record,overallRecord:overall.record,units:overall.units,totalUnits:overall.units,overallUnits:overall.units,profitLoss:overall.profitLoss,winRate:overall.winRate,lotto,parlayRecord:summary.lottoParlays.record,lottoRecord:summary.lottoParlays.record}
  for (const key of ['results','rows','records','resultRows','weeklyResults','archive','resultsArchive','gradedPicks','settledPicks','recentResults','latestResults','allRows']) result[key] = rows
  if (result.breakdown) result.breakdown = {...result.breakdown,overall,lotto:summary.lottoParlays,parlays:summary.lottoParlays}
  if (result.metrics) result.metrics = overall
  return result
}
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

    if (!response.ok) throw new Error(`Results upstream returned ${response.status}`)

    const payload = mergeVerifiedTickets(await response.json())
    res.status(200).json({
      ...payload,
      success: payload.success !== false,
      proxiedBy: 'mickstaste-public-results-strict-sections'
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
