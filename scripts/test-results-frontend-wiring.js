import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import vm from 'node:vm'

const rootUrl = new URL('../', import.meta.url)
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')
const resultsHtml = await readFile(new URL('../results.html', import.meta.url), 'utf8')
const runtimeRules = await readFile(new URL('../micks-runtime-rules.js', import.meta.url), 'utf8')
const propsLiveFilter = await readFile(new URL('../micks-props-live-filter.js', import.meta.url), 'utf8')

assert.match(html, /fetch\('\/api\/results\?days=3650'/)
assert.match(runtimeRules, /fetch\('\/api\/results\?days=3650'/)
assert.match(html, /id="resultsBody"/)
assert.match(html, /id="summaryCards"/)
assert.match(html, /id="propsCards"/)
assert.match(html, /renderPropsLabCards/)
assert.match(html, /propsContainer\.innerHTML=''/)
assert.match(html, /renderPropsLabCards\(activeProps\)/)
assert.match(propsLiveFilter, /Props Lab cards now render once from index\.html using \/api\/todays-picks/)
assert.match(html, /class="results-grid/)
assert.match(html, /class="results-card/)
assert.match(html, /Section Records/)
assert.match(html, /Results Ledger/)
assert.match(html, /Master Picks \/ Official/)
assert.match(html, /No settled results yet\./)
const publicResultsSection = html.match(/<section id="results"[\s\S]*?<\/section>/)?.[0] || ''
assert.ok(publicResultsSection)
assert.doesNotMatch(publicResultsSection, /Results Archive|Google Sheets|Airtable|source of truth|row\(s\) loaded/i)
assert.match(html, /renderCanonicalResults\(airtableResults\|\|/)
assert.match(runtimeRules, /window\.renderCanonicalResults/)
assert.doesNotMatch(html, /micks-props-live-filter\.js/)
assert.doesNotMatch(html, /id="activePropsCards"/)
assert.doesNotMatch(html, /renderPropSummary/)
assert.doesNotMatch(html, /\/api\/props/)
assert.doesNotMatch(propsLiveFilter, /fetch\('/)
assert.doesNotMatch(propsLiveFilter, /setInterval/)
assert.doesNotMatch(propsLiveFilter, /setTimeout/)
assert.doesNotMatch(propsLiveFilter, /propsCards|activePropsCards/)
assert.doesNotMatch(html, /id="resultsRows"/)
assert.doesNotMatch(html, /renderResultsSummary\('resultsRows',overallRows\)/)
assert.doesNotMatch(html, /\/api\/results\?days=180/)
assert.doesNotMatch(runtimeRules, /\/api\/results\?days=180/)
assert.doesNotMatch(propsLiveFilter, /\/api\/results\?days=180/)

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
assert.match(resultsHtml, /Profit Pending - Missing Odds/)
assert.match(resultsHtml, /Math\.abs\(n\) <= 1 \? n \* 100 : n/)

const htmlFiles = (await readdir(rootUrl)).filter(file => file.endsWith('.html'))
for (const file of htmlFiles) {
  const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8')
  assert.doesNotMatch(source, /href=["']\.\/results\.html["']/, `${file} should not link main nav to ./results.html`)
  assert.doesNotMatch(source, /href=["']\/results\.html["']/, `${file} should not link main nav to /results.html`)
}

function inlineScript(source = '', label = 'page') {
  const scripts = Array.from(source.matchAll(/<script>([\s\S]*?)<\/script>/g))
  assert.ok(scripts.length, `${label} should include an inline script`)
  return scripts.at(-1)[1]
}

function fakeElement(id) {
  return {
    id,
    value: id === 'evProb' ? '50' : id === 'evOdds' ? '-110' : id === 'evStake' ? '1' : '',
    innerHTML: '',
    outerHTML: '',
    textContent: '',
    dataset: {},
    classList: {
      add() {},
      remove() {},
      toggle() {}
    },
    addEventListener() {},
    querySelectorAll() {
      return []
    }
  }
}

async function renderIndexPage(payload, todayPayload = { success: true, free: [], vip: [], vipVault: [], props: [], lottoParlays: [], longshots: [] }) {
  const elements = new Map()
  const fetchCalls = []
  const elementFor = id => {
    if (!elements.has(id)) elements.set(id, fakeElement(id))
    return elements.get(id)
  }

  const evProb = elementFor('evProb')
  const evOdds = elementFor('evOdds')
  const evStake = elementFor('evStake')
  const evResult = elementFor('evResult')

  const context = vm.createContext({
    console: { log() {}, warn() {}, error() {} },
    Date,
    RegExp,
    Promise,
    setTimeout,
    clearTimeout,
    evProb,
    evOdds,
    evStake,
    evResult,
    document: {
      getElementById: elementFor,
      querySelectorAll() {
        return []
      }
    },
    window: {
      addEventListener() {},
      scrollTo() {}
    },
    history: { replaceState() {} },
    location: { hash: '', hostname: 'localhost' },
    lucide: { createIcons() {} },
    fetch: async url => {
      const href = String(url)
      fetchCalls.push(href)
      if (href.startsWith('/api/todays-picks')) {
        return {
          ok: true,
          json: async () => todayPayload
        }
      }
      if (href.startsWith('/api/results')) {
        return {
          ok: true,
          json: async () => payload
        }
      }
      return {
        ok: true,
        text: async () => 'Date,Pick,Status\n'
      }
    }
  })
  context.window.window = context.window
  context.window.document = context.document
  context.window.renderCanonicalResults = undefined

  new vm.Script(inlineScript(html, 'index.html')).runInContext(context)
  await new Promise(resolve => setTimeout(resolve, 0))
  await new Promise(resolve => setTimeout(resolve, 0))
  await new Promise(resolve => setTimeout(resolve, 0))

  const propsBeforeHash = elementFor('propsCards').innerHTML
  if (typeof context.setTab === 'function') context.setTab('props')
  const propsAfterHash = elementFor('propsCards').innerHTML

  return {
    bodyHtml: elementFor('resultsBody').innerHTML,
    freeHtml: elementFor('freeCards').innerHTML,
    vipHtml: elementFor('vipCards').innerHTML,
    sportsHtml: elementFor('sportPanels').innerHTML,
    propsHtml: elementFor('propsCards').innerHTML,
    legacyPropsHtml: elementFor('activePropsCards').innerHTML,
    propsDataset: elementFor('propsCards').dataset,
    propsStableAfterHash: propsBeforeHash === propsAfterHash,
    fetchCalls,
    featuredHtml: elementFor('featuredCard').outerHTML || elementFor('featuredCard').innerHTML,
    statusText: elementFor('resultsStatus').textContent,
    summaryHtml: elementFor('summaryCards').innerHTML,
    overallRecord: elementFor('overallRecord').textContent,
    overallRoi: elementFor('overallRoi').textContent
  }
}

async function renderResultsPage(payload) {
  const elements = new Map()
  const elementFor = id => {
    if (!elements.has(id)) elements.set(id, fakeElement(id))
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

  new vm.Script(inlineScript(resultsHtml, 'results.html')).runInContext(context)
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
  masterPicks: { wins: 4, losses: 1 },
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

const june10Rows = [
  { date: '2026-06-10', section: 'Master Picks', league: 'WNBA', game: 'Toronto Tempo vs Connecticut Sun', pick: 'Toronto Tempo -8', odds: '', bestNumber: 'Toronto Tempo -8 -110 or better', grade: 'B', units: '0.5', result: 'Win', profitLoss: '+0.45u', roi: 90.91 }
]

const june11Rows = [
  { date: '2026-06-11', section: 'Props Lab', league: 'Stanley Cup Final', game: '', player: 'Jordan Staal', pick: 'Over 1.5 Shots on Goal', odds: '', grade: 'A-', units: '1', result: 'Win', profitLoss: '', roi: 0, settlementStatus: 'Profit Pending - Missing Odds' },
  { date: '2026-06-11', section: 'Lotto Parlays', league: '', game: '', pick: 'Over 164 + Under 171 + South Korea DNB + Canada ML + Jordan Staal Over 1.5 SOG', odds: '', grade: 'B', units: '0.25', result: 'Loss', profitLoss: '-0.25u', roi: -100 },
  { date: '2026-06-11', section: 'Master Picks', league: 'Soccer', game: 'South Korea vs Kuwait', pick: 'South Korea Draw No Bet', market: 'Draw No Bet', betType: 'Draw No Bet', odds: '+120', grade: 'B', units: '0.5', result: 'Win', profitLoss: '+0.60u', roi: 120 },
  { date: '2026-06-11', section: 'Master Picks', league: 'Soccer', game: 'Canada vs Curacao', pick: 'Canada ML', odds: '-140', grade: 'B', units: '1', result: '', profitLoss: '', roi: '', settlementStatus: 'Pending - Game Not Started' }
]

const byDatePayload = {
  success: true,
  source: 'google-sheets',
  sourceOfTruth: 'Google Sheets',
  summary,
  byDate: {
    '2026-06-11': june11Rows,
    '2026-06-10': june10Rows,
    '2026-06-09': june9Rows
  },
  records: []
}

const june9OnlyPayload = {
  ...byDatePayload,
  byDate: { '2026-06-09': june9Rows }
}

const indexByDateRender = await renderIndexPage(byDatePayload)
assert.match(indexByDateRender.bodyHtml, /2026-06-09/)
assert.match(indexByDateRender.bodyHtml, /June 9, 2026/)
assert.match(indexByDateRender.bodyHtml, /June 10, 2026/)
assert.match(indexByDateRender.bodyHtml, /June 11, 2026/)
assert.doesNotMatch(indexByDateRender.bodyHtml, /<td colspan="11">2026-06-11<\/td>/)
assert.match(indexByDateRender.summaryHtml, /Master Picks \/ Official/)
assert.match(indexByDateRender.summaryHtml, /VIP Record/)
assert.match(indexByDateRender.summaryHtml, /Props Lab Record/)
assert.match(indexByDateRender.summaryHtml, /Lotto Parlay Record/)
assert.match(indexByDateRender.summaryHtml, /Longshots Record/)
assert.equal(indexByDateRender.overallRecord, '6-5')
assert.equal(indexByDateRender.overallRoi, '27%')

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
  assert.match(indexByDateRender.bodyHtml, new RegExp(pick))
}
assert.match(indexByDateRender.bodyHtml, /90\.91%/)
assert.doesNotMatch(indexByDateRender.bodyHtml, /9091%/)
assert.match(indexByDateRender.bodyHtml, /Profit Pending - Missing Odds/)
assert.match(indexByDateRender.bodyHtml, /Missing Odds/)
assert.match(indexByDateRender.bodyHtml, /Odds needed/)
assert.match(indexByDateRender.bodyHtml, />Pending<\/td>/)
assert.doesNotMatch(indexByDateRender.bodyHtml, />0%<\/td>/)
assert.match(indexByDateRender.bodyHtml, /-0\.75u/)
assert.match(indexByDateRender.bodyHtml, /\+0\.45u/)
assert.match(indexByDateRender.bodyHtml, /Seattle Mariners vs Baltimore Orioles/)
assert.match(indexByDateRender.bodyHtml, /-149/)
assert.match(indexByDateRender.bodyHtml, /Toronto Tempo -8 -110 or better/)
assert.match(indexByDateRender.bodyHtml, /Jordan Staal - Over 1\.5 Shots on Goal/)
assert.match(indexByDateRender.bodyHtml, /Stanley Cup Final/)
assert.match(indexByDateRender.bodyHtml, /Multi-Sport/)
assert.match(indexByDateRender.bodyHtml, /Multiple Games/)
assert.match(indexByDateRender.bodyHtml, /Over 164 \+ Under 171 \+ South Korea DNB \+ Canada ML \+ Jordan Staal Over 1\.5 SOG/)
assert.match(indexByDateRender.bodyHtml, /South Korea Draw No Bet/)
assert.doesNotMatch(indexByDateRender.bodyHtml, />No Bet</)
assert.doesNotMatch(indexByDateRender.bodyHtml, /Canada vs Curacao/)
assert.doesNotMatch(indexByDateRender.bodyHtml, />Canada ML</)
assert.match(indexByDateRender.bodyHtml, /VIP/)
assert.match(indexByDateRender.bodyHtml, /Props Lab/)
assert.match(indexByDateRender.bodyHtml, /Lotto Parlays/)
assert.match(indexByDateRender.bodyHtml, /Longshots/)
assert.doesNotMatch(`${indexByDateRender.summaryHtml}${indexByDateRender.bodyHtml}`, /Google Sheets|Airtable|source of truth/i)
const indexRecordsRender = await renderIndexPage({
  success: true,
  sourceOfTruth: 'Google Sheets',
  summary,
  records: [{ Date: '2026-06-09', League: 'MLB', Game: 'Records Game', Pick: 'Records Fallback Pick', Result: 'Win', Odds: '-110', ROI: 90.91, section: 'Master Picks' }]
})
assert.match(indexRecordsRender.bodyHtml, /Records Fallback Pick/)
assert.match(indexRecordsRender.bodyHtml, /2026-06-09/)
assert.match(indexRecordsRender.bodyHtml, /90\.91%/)

const indexRowsRender = await renderIndexPage({
  success: true,
  sourceOfTruth: 'Google Sheets',
  summary,
  rows: [{ date: '2026-06-09', league: 'MLB', game: 'Rows Game', pick: 'Rows Fallback Pick', result: 'Loss', odds: '+100', roi: -100, section: 'Longshots' }]
})
assert.match(indexRowsRender.bodyHtml, /Rows Fallback Pick/)

const todayCardRender = await renderIndexPage({
  success: true,
  sourceOfTruth: 'Google Sheets',
  summary: {},
  records: []
}, {
  success: true,
  free: [
    {
      section: 'picks',
      date: '2026-06-11',
      league: 'FIFA World Cup',
      game: 'South Korea vs Czechia',
      pick: 'South Korea Draw No Bet',
      cardTitle: 'South Korea Draw No Bet',
      betType: 'Draw No Bet',
      market: 'Draw No Bet',
      status: 'Pending',
      releaseStatus: 'Free Released',
      access: 'Free',
      officialBet: 'Yes',
      units: '1',
      odds: '+105',
      grade: 'B'
    },
    {
      section: 'picks',
      date: '2026-06-11',
      league: 'FIFA World Cup',
      game: 'South Korea vs Czechia',
      pick: 'South Korea No Draw',
      cardTitle: 'South Korea No Draw',
      betType: 'No Draw',
      market: 'No Draw',
      status: 'Pending',
      releaseStatus: 'Free Released',
      access: 'Free',
      officialBet: 'Yes',
      units: '1',
      odds: '+100',
      grade: 'B'
    },
    {
      section: 'free',
      date: '2026-06-14',
      league: 'WNBA',
      game: 'Public WNBA Game',
      pick: 'Public WNBA Free Pick',
      cardTitle: 'Public WNBA Free Pick',
      betType: 'Total',
      status: 'Pending',
      releaseStatus: 'Free Released',
      access: 'Free',
      officialBet: 'Yes',
      units: '1',
      odds: '-105',
      grade: 'B+'
    },
    {
      section: 'picks',
      date: '2026-06-11',
      league: 'FIFA World Cup',
      game: 'Heavy Favorite',
      pick: 'Heavy favorite pass',
      betType: 'Pass',
      status: 'Pass',
      releaseStatus: 'Free Released',
      access: 'Free',
      grade: 'Pass',
      units: '0'
    }
  ],
  props: [
    {
      section: 'props',
      date: '2026-06-11',
      league: 'Stanley Cup Final',
      game: 'Stanley Cup Final',
      player: 'Jordan Staal',
      pick: 'Over 1.5 Shots on Goal',
      betLine: 'Over 1.5 Shots on Goal',
      prop: 'Shots on Goal',
      cardTitle: 'Stanley Cup Final | Player Prop',
      betType: 'Player Prop',
      status: 'Pending',
      releaseStatus: 'Free Released',
      access: 'Free',
      odds: '-120',
      grade: 'B+',
      units: '1',
      bestNumber: 'Over 1.5',
      noBetCutoff: 'Over 1.5 -145',
      shortTake: 'Jordan Staal can clear this at normal shot volume.',
      whyThisPlay: 'This is not just a trend play. Jordan Staal is getting enough shot volume against Florida to make Over 1.5 Shots on Goal playable.',
      matchupEdge: 'Florida can allow Carolina to build zone time, and Staal role gives him enough even-strength looks to matter.',
      projectionEdge: 'Projected shots closer to 2.4 vs line 1.5.',
      keyMetrics: 'Recent attempts are climbing, ice time is stable, and the line asks for normal volume instead of a ceiling game.',
      risk: 'The risk is game script. If Carolina plays from ahead and lowers event volume, shots can flatten.',
      finalTake: 'Props Lab play at Over 1.5 -120 or better.',
      writeup: 'Generic public card text is on the public card for this matchup. Check the listed number and sportsbook close to lock before placing a wager.',
      fullAnalysis: 'Jordan Staal owns enough shot volume to make Over 1.5 Shots on Goal playable at this number.',
      notes: 'Props note should stay visible.'
    },
    {
      section: 'props',
      date: '2026-06-11',
      league: 'Stanley Cup Final',
      game: 'Stanley Cup Final',
      player: 'Jordan Staal',
      pick: 'Over 1.5 Shots on Goal',
      betLine: 'Over 1.5 Shots on Goal',
      prop: 'Shots on Goal',
      cardTitle: 'Stanley Cup Final | Player Prop',
      betType: 'Player Prop',
      status: 'Pending',
      releaseStatus: 'Free Released',
      access: 'Free',
      odds: '-120',
      grade: 'B+',
      units: '1',
      bestNumber: 'Over 1.5',
      noBetCutoff: 'Over 1.5 -145',
      shortTake: 'Jordan Staal can clear this at normal shot volume.',
      whyThisPlay: 'This is not just a trend play. Jordan Staal is getting enough shot volume against Florida to make Over 1.5 Shots on Goal playable.',
      matchupEdge: 'Florida can allow Carolina to build zone time, and Staal role gives him enough even-strength looks to matter.',
      projectionEdge: 'Projected shots closer to 2.4 vs line 1.5.',
      keyMetrics: 'Recent attempts are climbing, ice time is stable, and the line asks for normal volume instead of a ceiling game.',
      risk: 'The risk is game script. If Carolina plays from ahead and lowers event volume, shots can flatten.',
      finalTake: 'Props Lab play at Over 1.5 -120 or better.',
      writeup: 'Generic public card text is on the public card for this matchup. Check the listed number and sportsbook close to lock before placing a wager.',
      fullAnalysis: 'Jordan Staal owns enough shot volume to make Over 1.5 Shots on Goal playable at this number.',
      notes: 'Props note should stay visible.'
    },
    {
      section: 'props',
      date: '2026-06-11',
      league: 'Stanley Cup Final',
      game: 'Stanley Cup Final',
      pick: 'Over 1.5 Shots on Goal',
      prop: 'Shots on Goal',
      betType: 'Player Prop',
      status: 'Pending',
      releaseStatus: 'Free Released',
      access: 'Free',
      odds: '-110',
      grade: 'B',
      units: '0.5',
      writeup: 'Prop writeup details should render even with no player.'
    },
    {
      section: 'props',
      date: '2026-06-11',
      league: 'MLB',
      game: 'Dodgers vs Padres',
      pick: 'Over 6.5 Strikeouts',
      betType: 'Player Prop',
      status: 'Pending',
      releaseStatus: 'Free Released',
      access: 'Free',
      grade: 'B',
      units: '0.5',
      fullAnalysis: 'Strikeout prop analysis should render even when the price is not available.'
    }
  ],
  vip: [
    {
      section: 'picks',
      date: '2026-06-14',
      league: 'WNBA',
      game: 'Toronto Tempo vs Atlanta Dream',
      pick: 'Tempo/Dream Under 172.5',
      cardTitle: 'Tempo/Dream Under 172.5',
      betType: 'Total',
      status: 'Pending',
      releaseStatus: 'VIP Released',
      officialBet: 'Yes',
      access: 'VIP',
      units: '1.25',
      odds: '-110',
      grade: 'A',
      bestNumber: 'Under 172.5',
      noBetCutoff: 'Pass below 170.5',
      writeup: 'VIP preview should not replace the full analysis.',
      shortTake: 'SHORT TAKE SUBSTITUTE SHOULD NOT BECOME FULL ANALYSIS',
      whyThisPlay: 'WHY THIS PLAY SUBSTITUTE SHOULD NOT BECOME FULL ANALYSIS',
      fullAnalysis: 'RAW FULL ANALYSIS MAIN: VIP A-grade WNBA total. TSI projects 170 against a 172.5 market.\n\nThis is the complete long-form handicapper writeup from the exact Full Analysis column.\n\nFinal Take: Official VIP play at 172.5.'
    }
  ],
  vipVault: [],
  lottoParlays: [],
  longshots: []
})
assert.match(todayCardRender.freeHtml, /South Korea Draw No Bet/)
assert.match(todayCardRender.freeHtml, /South Korea No Draw/)
assert.match(todayCardRender.freeHtml, /Public WNBA Free Pick/)
assert.doesNotMatch(todayCardRender.freeHtml, /<span class="pill">No Bet<\/span>/)
assert.match(todayCardRender.freeHtml, /<span class="pill">Pass<\/span>/)
assert.match(todayCardRender.vipHtml, /Tempo\/Dream Under 172\.5/)
assert.match(todayCardRender.vipHtml, /Full Analysis/)
assert.match(todayCardRender.vipHtml, /RAW FULL ANALYSIS MAIN/)
assert.match(todayCardRender.vipHtml, /TSI projects 170/)
assert.doesNotMatch(todayCardRender.vipHtml, /No picks released yet/)
assert.equal((todayCardRender.vipHtml.match(/<article class="card pick-card/g) || []).length, 1)
assert.match(todayCardRender.sportsHtml, /Public WNBA Free Pick/)
assert.doesNotMatch(todayCardRender.sportsHtml, /Tempo\/Dream Under 172\.5/)
assert.match(todayCardRender.propsHtml, /Jordan Staal - Over 1\.5 Shots on Goal/)
assert.match(todayCardRender.propsHtml, /Over 1\.5 Shots on Goal/)
assert.match(todayCardRender.propsHtml, /Bet Line:<\/b> Over 1\.5 Shots on Goal/)
assert.match(todayCardRender.propsHtml, /Odds:<\/b> -120/)
assert.match(todayCardRender.propsHtml, /Grade:<\/b> B\+/)
assert.match(todayCardRender.propsHtml, /Units:<\/b> 1u/)
assert.match(todayCardRender.propsHtml, /B\+/)
assert.match(todayCardRender.propsHtml, /Over 1\.5/)
assert.match(todayCardRender.propsHtml, /Best Number:<\/b> Over 1\.5/)
assert.match(todayCardRender.propsHtml, /No-Bet Cutoff:<\/b> Over 1\.5 -145/)
assert.match(todayCardRender.propsHtml, /Jordan Staal can clear this at normal shot volume/)
assert.match(todayCardRender.propsHtml, /Full Analysis/)
assert.match(todayCardRender.propsHtml, /Why This Play:<\/b> This is not just a trend play/)
assert.match(todayCardRender.propsHtml, /Matchup Edge:<\/b> Florida can allow Carolina/)
assert.match(todayCardRender.propsHtml, /Projection Edge:<\/b> Projected shots closer to 2\.4 vs line 1\.5/)
assert.match(todayCardRender.propsHtml, /Key Metrics:<\/b> Recent attempts are climbing/)
assert.match(todayCardRender.propsHtml, /Risk:<\/b> The risk is game script/)
assert.match(todayCardRender.propsHtml, /Final Take:<\/b> Props Lab play/)
assert.match(todayCardRender.propsHtml, /Prop writeup details should render even with no player/)
assert.match(todayCardRender.propsHtml, /Bet Line:<\/b> Over 6\.5 Strikeouts/)
assert.match(todayCardRender.propsHtml, /Odds:<\/b> Shop best price/)
assert.match(todayCardRender.propsHtml, /Strikeout prop analysis should render/)
assert.ok(todayCardRender.propsHtml.indexOf('Bet Line:</b> Over 1.5 Shots on Goal') < todayCardRender.propsHtml.indexOf('Why This Play:</b>'))
assert.ok(todayCardRender.propsHtml.indexOf('Odds:</b> -120') < todayCardRender.propsHtml.indexOf('Why This Play:</b>'))
assert.ok(todayCardRender.propsHtml.indexOf('Jordan Staal can clear this at normal shot volume') < todayCardRender.propsHtml.indexOf('Full Analysis'))
assert.doesNotMatch(todayCardRender.propsHtml, /Generic public card text is on the public card/)
assert.equal(todayCardRender.fetchCalls.filter(href => href.startsWith('/api/todays-picks')).length, 1)
assert.equal(todayCardRender.fetchCalls.some(href => /\/api\/props/i.test(href)), false)
assert.equal(todayCardRender.legacyPropsHtml, '')
assert.equal(todayCardRender.propsDataset.source, 'api-todays-picks')
assert.match(todayCardRender.propsDataset.renderedAt, /^\d{4}-\d{2}-\d{2}T/)
assert.equal(todayCardRender.propsStableAfterHash, true)
assert.equal((todayCardRender.propsHtml.match(/<article class="card pick-card/g) || []).length, 3)
assert.equal((todayCardRender.propsHtml.match(/Jordan Staal - Over 1\.5 Shots on Goal/g) || []).length, 1)
assert.doesNotMatch(todayCardRender.propsHtml, /Released player props will appear|Today’s Active Props|No active props released|No picks released yet/)

const indexEmptyRender = await renderIndexPage({
  success: true,
  sourceOfTruth: 'Google Sheets',
  summary: {},
  byDate: {},
  records: [],
  rows: []
})
assert.match(indexEmptyRender.bodyHtml, /No settled results yet\./)

const resultsByDateRender = await renderResultsPage(june9OnlyPayload)
assert.match(resultsByDateRender.bodyHtml, /2026-06-09/)
assert.match(resultsByDateRender.bodyHtml, /Profit Pending - Missing Odds/)
assert.match(resultsByDateRender.bodyHtml, /90\.91%/)
assert.equal(resultsByDateRender.statusText, '11 settled row(s) loaded from Google Sheets.')
assert.equal(resultsByDateRender.overallRoi, '27%')

const resultsRecordsRender = await renderResultsPage({
  success: true,
  sourceOfTruth: 'Google Sheets',
  summary,
  records: [{ Date: '2026-06-09', League: 'MLB', Game: 'Records Game', Pick: 'Records Fallback Pick', Result: 'Win', Odds: '-110', ROI: 90.91, section: 'Master Picks' }]
})
assert.match(resultsRecordsRender.bodyHtml, /Records Fallback Pick/)
assert.match(resultsRecordsRender.bodyHtml, /90\.91%/)

console.log('Canonical Google Sheets results frontend wiring regression test passed.')
