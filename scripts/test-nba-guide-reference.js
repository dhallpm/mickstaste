import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import { NBA_GUIDE, nbaGuideContext, nbaGuideCheckSchema, evaluateNbaGuideCheck } from '../lib/nbaGuideReference.js'
import { buildCustomerFacingAnalysis, sanitizeCustomerFacingAnalysis, sanitizePublicWriteup } from '../lib/customerFacingAnalysis.js'
import { sanitizeCustomerFacingCopy, sanitizeCustomerFacingTitle } from '../lib/customerFacingTitle.js'

assert.equal(NBA_GUIDE.teams.length, 30)
assert.equal(NBA_GUIDE.futuresAndAwardsOpinions.length, 19)
assert.ok(NBA_GUIDE.teams.every(t => Number.isFinite(t.historicalAdjustedRatings.metricsAsPrinted.offense)))
assert.equal(new Set(NBA_GUIDE.teams.map(t => t.pdfPage)).size, 30)
assert.equal(NBA_GUIDE.teams.find(t => t.code === 'OKC').powerRating, 104)
assert.equal(NBA_GUIDE.teams.find(t => t.code === 'NOP').winTotalOpinion.direction, 'under')
assert.ok(NBA_GUIDE.internalDifferences.some(d => d.team === 'NOP'))
assert.equal(nbaGuideContext({ league: 'WNBA' }), '')
assert.equal(nbaGuideContext({ league: 'NFL' }), '')
assert.match(nbaGuideContext({ league: 'NBA' }), /CURRENT\/PARTIALLY_CURRENT\/STALE\/OVERRIDDEN/)
const checkedAt = new Date().toISOString()
const audit = { guideId: NBA_GUIDE.id, pages: [13, 15, 33], basis: 'EXTRACTED_BASELINE', guideFinding: 'Test fixture: health and backup-center concerns.', currentFinding: 'Test fixture only; no claim of actual research.', currentSources: ['https://www.nba.com/test-fixture'], checkedAt, state: 'PARTIALLY_CURRENT', influence: 'Test fixture explains changed availability.', countercase: 'Test fixture: health remains the dominant failure path.', materialConflictResolved: true }
const candidate = { Sport: 'Basketball', League: 'NBA', Game: 'Boston Celtics vs New York Knicks', Pick: 'Boston +3.5', 'Bet Type': 'Spread', Odds: '-110', Sportsbook: 'Fixture Book', Grade: 'B', 'EV Edge': 5, 'Release Gate': 'Publish Eligible', 'Source Verification': 'Test fixture only', sourceConfidence: 'High', 'NBA Guide Check': audit }
assert.equal(evaluateNbaGuideCheck(candidate).passed, true)
assert.equal(evaluateNbaGuideCheck({ ...candidate, 'NBA Guide Check': null }).passed, false)
assert.equal(evaluateNbaGuideCheck({ ...candidate, League: 'WNBA' }).applicable, false)
for (const patch of [
  { pages: [13, 15] }, { pages: [99] }, { currentSources: [] }, { checkedAt: '2020-01-01T00:00:00Z' },
  { checkedAt: '2099-01-01T00:00:00Z' }, { materialConflictResolved: false }, { guideId: 'wrong-guide' }, { countercase: '' }
]) assert.equal(evaluateNbaGuideCheck({ ...candidate, 'NBA Guide Check': { ...audit, ...patch } }).passed, false, JSON.stringify(patch))
assert.equal(evaluateNbaGuideCheck({ ...candidate, 'NBA Guide Check': { ...audit, state: 'OVERRIDDEN', currentFinding: 'Test fixture: verified new evidence replaces the prior.' } }).passed, true)

// Exercise real generator functions without network calls or writes.
const filename = new URL('../lib/micksPicksGenerator.js', import.meta.url)
let engine = await fs.readFile(filename, 'utf8')
engine = engine.replace(/^import .+\n/gm, '').replaceAll('import.meta.url', JSON.stringify(filename.href)).replace(/^export default .+$/gm, '').replace(/^export /gm, '')
const sandbox = vm.createContext({ fs, path, fileURLToPath, process, console, URL, Date, setTimeout, clearTimeout,
  nbaGuideContext, nbaGuideCheckSchema, evaluateNbaGuideCheck,
  buildCustomerFacingAnalysis, sanitizeCustomerFacingAnalysis, sanitizePublicWriteup, sanitizeCustomerFacingCopy, sanitizeCustomerFacingTitle })
vm.runInContext(engine, sandbox)
const get = name => vm.runInContext(name, sandbox)
const framework = await get('loadFrameworkFiles')()
for (const suffix of ['md', 'json']) assert.ok(framework.find(f => f.file === `current/nba-2026-27-vsin-reference.${suffix}`)?.available)
const routing = get('routingOptions')({ includeProps: true })
for (const propsSearch of [false, true]) for (const fastMode of [false, true]) for (const ultraFastMode of [false, true]) {
  const request = get('openAiRequestBody')({ model: 'test', date: '2026-10-20', league: 'NBA', mode: 'review', candidatePoolSize: 2, access: 'Free', framework, routing, propsSearch, fastMode, ultraFastMode })
  const prompt = request.input[0].content[0].text
  assert.match(prompt, /MANDATORY NBA GUIDE: vsin-nba-2026-27-guide/)
  assert.equal((prompt.match(/MANDATORY NBA GUIDE:/g) || []).length, 1, 'no duplicate full guide injection')
}
assert.match(get('openAiPropsRequestBody')({ model: 'test', date: '2026-10-20', league: 'NBA', routing }).input[0].content[0].text, /MANDATORY NBA GUIDE/)
assert.ok(get('aiJsonSchema')().properties.rawCandidatePool.items.properties['NBA Guide Check'])
assert.ok(get('propsJsonSchema')().properties.candidatePool.items.properties['NBA Guide Check'])
const missing = { ...candidate, 'NBA Guide Check': null }
assert.ok(get('missingCandidateFields')(missing).some(s => /guide/.test(s)))
const blocked = get('routeCandidatePool')([missing], { league: 'NBA', mode: 'publish', access: 'Free', date: '2026-10-20', routing })
assert.equal(blocked.cards.length, 0, 'a priced NBA pick cannot bypass guide reconciliation')
const scoped = { ...missing, League: '', Sport: '' }
assert.equal(get('routeCandidatePool')([scoped], { league: 'NBA', mode: 'publish', access: 'Free', routing }).cards.length, 0)
const eligible = get('routeCandidatePool')([candidate], { league: 'NBA', mode: 'publish', access: 'Free', date: '2026-10-20', routing })
assert.ok(eligible.cards.length > 0, 'a fully reconciled candidate can still route after the existing gates')
assert.equal(get('normalizeCandidate')(candidate, { mode: 'review' })['NBA Guide Check'], audit)
const parlay = get('makeParlayCard')({ legs: [candidate, candidate], legCount: 2, parlayType: 'Parlay', date: '2026-10-20', mode: 'review', access: 'Free', league: 'NBA' })
assert.equal(parlay.nbaGuideLegChecks.length, 2, 'each NBA leg retains its own audit')
console.log('PASS NBA guide: 30-team index; core/props/compact/fallback prompts; missing/expired/conflicting checks block routing; per-leg provenance retained; WNBA unaffected')
