import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')
const resultsHtml = await readFile(new URL('../results.html', import.meta.url), 'utf8')
const runtimeRules = await readFile(new URL('../micks-runtime-rules.js', import.meta.url), 'utf8')

assert.match(html, /fetch\('\/api\/results\?days=180'/)
assert.match(html, /Results feed failed; using Google Sheets fallback:/)
assert.match(html, /rows:group\('rows'\),free:group\('free'\),vip:group\('vip'\),props:group\('props'\),lotto:group\('lotto'\),longshots:group\('longshots'\)/)
assert.match(html, /freeResults=airtableResults\?dedupe\(airtableResults\.free\):sheetFreeResults/)
assert.match(html, /vipResults=airtableResults\?dedupe\(airtableResults\.vip\):sheetVipResults/)
assert.match(html, /propsRows=airtableResults\?dedupe\(airtableResults\.props\):sheetPropsRows/)
assert.match(html, /longshotRows=airtableResults\?dedupe\(airtableResults\.lotto\.concat\(airtableResults\.longshots\)\):sheetLongshotRows/)
assert.match(html, /overallRows=airtableResults\?dedupe\(airtableResults\.rows\):sheetOverallRows/)
assert.match(html, /renderResultsSummary\('resultsRows',overallRows\)/)
assert.match(runtimeRules, /if \(id === 'resultsRows'\) cells\.splice\(2, 1\)/)
assert.doesNotMatch(html, /allArchiveRows/)
assert.doesNotMatch(runtimeRules, /allArchiveRows/)
assert.match(html, /<th>Legs \/ Loss Notes<\/th>.*<th>Notes<\/th>/)
assert.doesNotMatch(html, /<th>Settled<\/th>/)
assert.match(runtimeRules, /function renderLongshotsRows\(rows\)/)
assert.match(runtimeRules, /getValue\(r, 'grade'\) \|\| '--'/)
assert.match(runtimeRules, /getValue\(r, 'notes'\) \|\| 'No additional notes recorded\.'/)
assert.match(runtimeRules, /const calculated = calculateProfitLossUnits\(row\);\s+if \(calculated\) return calculated;/)
assert.match(runtimeRules, /\.filter\(hasPositiveUnits\)\.map\(normalizeForDisplay\)/)
assert.doesNotMatch(runtimeRules, /window\.setTimeout\(\(\) => window\.boot\(\), 0\)/)
assert.match(html, /featuredCard=document\.getElementById\('featuredCard'\);if\(featuredCard\)/)
assert.match(resultsHtml, /fetch\('\/api\/results\?days=3650&cache='/)
assert.match(resultsHtml, /Official Straight Record/)
assert.match(resultsHtml, /VIP Record/)
assert.match(resultsHtml, /Props Lab Record/)
assert.match(resultsHtml, /Lotto Parlay Record/)
assert.match(resultsHtml, /Longshots Record/)
assert.match(resultsHtml, /<th>Profit\/Loss<\/th>/)
assert.match(resultsHtml, /<th>Section<\/th>/)
assert.doesNotMatch(resultsHtml, /app\.js/)
assert.doesNotMatch(resultsHtml, /Full Analysis/)
assert.match(resultsHtml, /rowsFromByDate/)
assert.match(resultsHtml, /rowsFromPayload/)
assert.match(resultsHtml, /No settled results returned from \/api\/results\./)
assert.match(resultsHtml, /Profit Pending - Missing Odds/)
assert.match(resultsHtml, /Math\.abs\(n\) <= 1 \? n \* 100 : n/)

function resultPageScript(source = '') {
  const scripts = Array.from(source.matchAll(/<script>([\s\S]*?)<\/script>/g))
  assert.ok(scripts.length, 'results.html should include an inline script')
  return scripts.at(-1)[1]
}

async function renderResultsPage(payload) {
  const elements = new Map()
  const elementFor = id => {
    if (!elements.has(id)) {
      elements.set(id, {
        id,
        innerHTML: '',
        textContent: ''
      })
    }
    return elements.get(id)
  }

  const context = vm.createContext({
    console: { error() {} },
    Date,
    document: {
      getElementById: elementFor
    },
    fetch: async () => ({
      ok: true,
      json: async () => payload
    })
  })

  new vm.Script(resultPageScript(resultsHtml)).runInContext(context)
  await new Promise(resolve => setTimeout(resolve, 0))
  await new Promise(resolve => setTimeout(resolve, 0))

  return {
    bodyHtml: elementFor('resultsBody').innerHTML,
    statusText: elementFor('resultsStatus').textContent,
    summaryHtml: elementFor('summaryCards').innerHTML,
    overallRoi: elementFor('overallRoi').textContent
  }
}

const summary = {
  overall: { wins: 6, losses: 5, pushes: 0, voids: 0, profitLoss: 1.07, roi: 0.27 },
  officialStraight: { wins: 4, losses: 1 },
  vip: { wins: 0, losses: 1 },
  propsLab: { wins: 1, losses: 1 },
  lottoParlays: { wins: 1, losses: 0 },
  longshots: { wins: 0, losses: 3 }
}

const june9Rows = [
  { date: '2026-06-09', section: 'VIP', league: 'MLB', game: 'Seattle Mariners vs Baltimore Orioles', pick: 'Colton Cowser HRR Over 0.5', odds: '-149', grade: 'A', units: '0.75', result: 'Loss', profitLoss: '-0.75u', roi: -100 },
  { date: '2026-06-09', section: 'Master Picks', league: 'MLB', game: 'New York Yankees vs Cleveland Guardians', pick: 'Yankees/Guardians Under 8.5', odds: '-115', grade: 'B', units: '0.5', result: 'Win', profitLoss: '+0.43u', roi: 86.96 },
  { date: '2026-06-09', section: 'Master Picks', league: 'WNBA', game: 'Atlanta Dream vs Chicago Sky', pick: 'Chicago Sky +7.5', odds: '-110', grade: 'B', units: '0.5', result: 'Win', profitLoss: '+0.45u', roi: 90.91 },
  { date: '2026-06-09', section: 'Master Picks', league: 'MLB', game: 'Boston Red Sox vs Tampa Bay Rays', pick: 'Red Sox/Rays Under 7.5', odds: '-110', grade: 'B', units: '0.5', result: 'Win', profitLoss: '+0.45u', roi: 90.91 },
  { date: '2026-06-09', section: 'Master Picks', league: 'NHL', game: 'Carolina Hurricanes vs Vegas Golden Knights', pick: 'Carolina Hurricanes ML', odds: '-115', grade: 'B', units: '0.5', result: 'Win', profitLoss: '+0.43u', roi: 86.96 },
  { date: '2026-06-09', section: 'Props Lab', league: 'MLB', game: 'New York Yankees vs Cleveland Guardians', pick: 'Slade Cecconi Over 4.5 Strikeouts', odds: '+113', grade: 'B', units: '0.5', result: 'Win', profitLoss: '+0.56u', roi: 113 },
  { date: '2026-06-09', section: 'Props Lab', league: 'MLB', game: 'Boston Red Sox vs Tampa Bay Rays', pick: 'Nick Martinez Over 3.5 Strikeouts', odds: '-120', grade: 'B', units: '0.35', result: 'Loss', profitLoss: '-0.35u', roi: -100 },
  { date: '2026-06-09', section: 'Lotto Parlays', league: 'MLB/NHL', game: 'Yankees/Guardians + Hurricanes/Golden Knights', pick: 'Yankees/Guardians Under 8.5 / Hurricanes ML', odds: '#ERROR!', grade: 'B-', units: '0.2', result: 'Win', profitLoss: '', roi: 0, settlementStatus: 'Profit Pending - Missing Odds' },
  { date: '2026-06-09', section: 'Longshots', league: 'MLB', game: 'New York Yankees vs Cleveland Guardians', pick: 'Guardians ML +108 or better', odds: '+108 or better', grade: 'C', units: '0.05', result: 'Loss', profitLoss: '-0.05u', roi: -100 },
  { date: '2026-06-09', section: 'Longshots', league: 'MLB', game: 'Boston Red Sox vs Tampa Bay Rays', pick: 'Nick Martinez 5+ Strikeouts', odds: '+180', grade: 'C', units: '0.05', result: 'Loss', profitLoss: '-0.05u', roi: -100 },
  { date: '2026-06-09', section: 'Longshots', league: 'NHL', game: 'Carolina Hurricanes vs Vegas Golden Knights', pick: 'Seth Jarvis Anytime Goal', odds: '+250', grade: 'C', units: '0.05', result: 'Loss', profitLoss: '-0.05u', roi: -100 }
]

const byDateRender = await renderResultsPage({
  success: true,
  sourceOfTruth: 'Google Sheets',
  summary,
  byDate: { '2026-06-09': june9Rows },
  records: []
})

assert.match(byDateRender.bodyHtml, /2026-06-09/)
for (const pick of [
  'Colton Cowser HRR Over 0.5',
  'Yankees/Guardians Under 8.5',
  'Chicago Sky \\+7.5',
  'Red Sox/Rays Under 7.5',
  'Carolina Hurricanes ML',
  'Slade Cecconi Over 4.5 Strikeouts',
  'Nick Martinez Over 3.5 Strikeouts',
  'Yankees/Guardians Under 8.5 \\/ Hurricanes ML',
  'Guardians ML \\+108 or better',
  'Nick Martinez 5\\+ Strikeouts',
  'Seth Jarvis Anytime Goal'
]) {
  assert.match(byDateRender.bodyHtml, new RegExp(pick))
}
assert.match(byDateRender.bodyHtml, /90\.91%/)
assert.match(byDateRender.bodyHtml, /Profit Pending - Missing Odds/)
assert.match(byDateRender.bodyHtml, /VIP/)
assert.match(byDateRender.bodyHtml, /Props Lab/)
assert.match(byDateRender.bodyHtml, /Lotto Parlays/)
assert.match(byDateRender.bodyHtml, /Longshots/)
assert.equal(byDateRender.statusText, '11 settled row(s) loaded from Google Sheets.')
assert.equal(byDateRender.overallRoi, '27%')

const recordsRender = await renderResultsPage({
  success: true,
  sourceOfTruth: 'Google Sheets',
  summary,
  records: [{ Date: '2026-06-09', League: 'MLB', Game: 'Records Game', Pick: 'Records Fallback Pick', Result: 'Win', Odds: '-110', ROI: 90.91, section: 'Master Picks' }]
})
assert.match(recordsRender.bodyHtml, /Records Fallback Pick/)
assert.match(recordsRender.bodyHtml, /2026-06-09/)
assert.match(recordsRender.bodyHtml, /90\.91%/)

const rowsRender = await renderResultsPage({
  success: true,
  sourceOfTruth: 'Google Sheets',
  summary,
  rows: [{ date: '2026-06-09', league: 'MLB', game: 'Rows Game', pick: 'Rows Fallback Pick', result: 'Loss', odds: '+100', roi: -100, section: 'Longshots' }]
})
assert.match(rowsRender.bodyHtml, /Rows Fallback Pick/)

const emptyRender = await renderResultsPage({
  success: true,
  sourceOfTruth: 'Google Sheets',
  summary,
  byDate: {},
  records: [],
  rows: []
})
assert.match(emptyRender.bodyHtml, /No settled results returned from \/api\/results\./)

console.log('Google Sheets results frontend wiring regression test passed.')
