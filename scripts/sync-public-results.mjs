import { writeFile } from 'node:fs/promises'

const RESULTS_URL = process.env.RESULTS_API_URL || 'https://mickspicks-vip.vercel.app/api/results'
const target = new URL(RESULTS_URL)
target.searchParams.set('days', '3650')
target.searchParams.set('cache', String(Date.now()))

const response = await fetch(target, {
  cache: 'no-store',
  headers: { Accept: 'application/json' }
})

if (!response.ok) throw new Error(`Results upstream returned ${response.status}`)

const payload = await response.json()
if (payload.success === false) throw new Error(payload.error || 'Results upstream is unavailable')

const rows = [
  payload.results,
  payload.rows,
  payload.records,
  payload.resultRows
].find(candidate => Array.isArray(candidate) && candidate.length) || []

const withRoi = (section = {}) => {
  const unitsRisked = Number(section.unitsRisked || 0)
  const netUnits = Number(section.netUnits || 0)
  return {
    ...section,
    roi: unitsRisked ? Number(((netUnits / unitsRisked) * 100).toFixed(1)) : 0
  }
}

const breakdown = payload.breakdown || payload.sectionRecords || {}
const published = {
  success: true,
  source: 'published-results-static',
  sourceOfTruth: payload.sourceOfTruth || payload.source || 'Micks Picks results archive',
  date: payload.date || '',
  syncedAt: new Date().toISOString(),
  summary: {
    overall: withRoi(breakdown.overall || payload.stats || {}),
    officialStraight: withRoi(breakdown.free || {}),
    vip: withRoi(breakdown.vip || {}),
    propsLab: withRoi(breakdown.props || {}),
    lottoParlays: withRoi(breakdown.lotto || breakdown.parlays || {}),
    longshots: withRoi(breakdown.longshots || {})
  },
  results: rows
}

await writeFile(new URL('../data/results.json', import.meta.url), `${JSON.stringify(published, null, 2)}\n`)
console.log(`Published ${rows.length} settled result rows to data/results.json`)
