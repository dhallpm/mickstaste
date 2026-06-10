import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import recalculateHandler from '../api/recalculate-clv.js'
import settleHandler from '../api/settle-results.js'
import {
  americanToDecimal,
  calculateClvFields,
  calculateSettlementFields,
  requestedDateKey
} from '../lib/clvSettlementAutomation.js'
import { cleanWebsiteRow } from '../lib/buildWebsiteFeed.js'

assert.equal(requestedDateKey('2026-06-02'), '2026-06-02')
assert.equal(Number(americanToDecimal('+150').toFixed(2)), 2.5)
assert.equal(Number(americanToDecimal('-110').toFixed(3)), 1.909)

assert.deepEqual(calculateClvFields({
  Pick: 'Over 8.5',
  'Bet Type': 'Total',
  'Closing Number': 8.5,
  'Verified Closing Number': 9.5
}).fields, {
  '%CLV': 0.1176
})

assert.deepEqual(calculateClvFields({
  Pick: 'Under 8.5',
  'Bet Type': 'Total',
  'Closing Number': 8.5,
  'Verified Closing Number': 7.5
}).fields, {
  '%CLV': 0.1176
})

assert.deepEqual(calculateClvFields({
  Pick: 'Favorite -3.5',
  'Bet Type': 'Spread',
  'Closing Number': -3.5,
  'Verified Closing Number': -5.5
}).fields, {
  '%CLV': 0.5714
})

assert.deepEqual(calculateClvFields({
  Pick: 'Underdog +5.5',
  'Bet Type': 'Spread',
  'Closing Number': 5.5,
  'Verified Closing Number': 3.5
}).fields, {
  '%CLV': 0.3636
})

assert.deepEqual(calculateClvFields({
  Pick: 'Mets ML',
  'Bet Type': 'Moneyline',
  Odds: '+150',
  'Closing Odds': '+120'
}).fields, {
  '%CLV': 0.1364
})

assert.deepEqual(calculateClvFields({
  Pick: 'Over 8.5',
  'Bet Type': 'Total',
  'Closing Number': 8.5
}).fields, {})

assert.equal(calculateSettlementFields({ Result: 'Win', Units: 1, Odds: '+150' }, new Date('2026-06-02T22:00:00Z')).fields['Profit/Loss'], 1.5)
assert.equal(calculateSettlementFields({ Result: 'Win', Units: 1, Odds: '-110' }, new Date('2026-06-02T22:00:00Z')).fields['Profit/Loss'], 0.91)
assert.equal(calculateSettlementFields({ Result: 'Loss', Units: 0.75, Odds: '+450' }, new Date('2026-06-02T22:00:00Z')).fields['Profit/Loss'], -0.75)
assert.equal(calculateSettlementFields({ Result: 'Push', Units: 0.75, Odds: '+450' }, new Date('2026-06-02T22:00:00Z')).fields['Profit/Loss'], 0)
assert.equal(calculateSettlementFields({ Result: 'Void', Units: 0.75, Odds: '+450' }, new Date('2026-06-02T22:00:00Z')).fields.Result, 'Void')
assert.equal(calculateSettlementFields({ Result: 'Cancelled', Units: 0.75, Odds: '+450' }, new Date('2026-06-02T22:00:00Z')).fields['Profit/Loss'], 0)
assert.equal(calculateSettlementFields({ Result: 'Pending', Units: 1, Odds: '+150' }).skipped, true)

const verifiedSettlement = calculateSettlementFields({
  Units: 1,
  Odds: '+150'
}, new Date('2026-06-02T22:00:00Z'), {
  verification: {
    status: 'verified',
    result: 'Win',
    sourceName: 'MLB official box score',
    sourceUrl: 'https://www.mlb.com/gameday/box-score',
    notes: 'Final score verified from official box score.'
  }
})
assert.equal(verifiedSettlement.fields.Result, 'Win')
assert.equal(verifiedSettlement.fields['Settlement Status'], 'Settled')
assert.match(verifiedSettlement.fields['Settlement Source'], /MLB official box score/)
assert.match(verifiedSettlement.fields['Settlement Notes'], /Final score verified/)

const parlayMissingOdds = calculateSettlementFields({
  Pick: 'Knicks ML | Under 205.5',
  'Bet Type': 'Parlay',
  Units: 1
}, new Date('2026-06-02T22:00:00Z'), {
  verification: {
    status: 'verified',
    result: 'Win',
    sourceName: 'ESPN box score',
    sourceUrl: 'https://www.espn.com/nba/boxscore/_/gameId/1',
    notes: 'All parlay legs won.'
  }
})
assert.equal(parlayMissingOdds.fields.Result, 'Win')
assert.equal(parlayMissingOdds.fields['Profit/Loss'], '')
assert.equal(parlayMissingOdds.fields.ROI, '')
assert.equal(parlayMissingOdds.fields['Settlement Status'], 'Profit Pending - Missing Odds')
assert.match(parlayMissingOdds.fields['Settlement Notes'], /Profit pending/)

const mapped = cleanWebsiteRow({
  id: 'rec1',
  Date: '2026-06-02',
  Sport: 'MLB',
  Game: 'A at B',
  Pick: 'A ML',
  Odds: '+150',
  'Implied Probability': 40,
  'EV Edge': 2.5,
  'Model Probability': 44,
  'Closing Number': -1.5,
  'Closing Odds': '+120',
  'CLV%': 13.64,
  'CLV Result': 'Positive',
  'Closing Line Value': 2,
  Outcome: 'Win',
  'P/L': 1.5,
  ROI: 150
})

assert.equal(mapped.impliedProbability, '40')
assert.equal(mapped.evEdge, '2.5')
assert.equal(mapped.trueProbability, '44')
assert.equal(mapped.closingOdds, '+120')
assert.equal(mapped.clvPercent, '13.64')
assert.equal(mapped.clvResult, 'Positive')
assert.equal(mapped.closingLineValue, '2')
assert.equal(mapped.result, 'Win')
assert.equal(mapped.profitLoss, '1.5')
assert.equal(mapped.roi, '150')

function makeRes() {
  return {
    statusCode: 0,
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    }
  }
}

const clvRes = makeRes()
await recalculateHandler({ method: 'GET', query: {} }, clvRes)
assert.equal(clvRes.statusCode, 200)
assert.equal(clvRes.body.endpoint, 'recalculate-clv')
assert.match(clvRes.body.confirmUrl, /confirm=CLV/)
assert.deepEqual(clvRes.body.updates, ['%CLV'])

const settleRes = makeRes()
await settleHandler({ method: 'GET', query: {} }, settleRes)
assert.equal(settleRes.statusCode, 200)
assert.equal(settleRes.body.endpoint, 'settle-results')
assert.match(settleRes.body.confirmUrl, /confirm=SETTLE/)

const originalFetch = globalThis.fetch
const originalAirtableKey = process.env.AIRTABLE_API_KEY
process.env.AIRTABLE_API_KEY = 'test_airtable_key'

const tableIds = [
  'tblB0LZW6ATToi8tF',
  'tblPdZG1sTbjD74mx',
  'tbllr4X5WVUxtmQyL',
  'tblE2H2iiKoFqQXHl'
]
const recordsByTable = new Map(tableIds.map((tableId, tableIndex) => [
  tableId,
  Array.from({ length: tableIndex === 0 ? 6 : 3 }, (_, recordIndex) => ({
    id: `rec${tableIndex}${recordIndex}settle`,
    fields: {
      Date: '2026-06-09',
      League: tableIndex === 0 && recordIndex === 0 ? 'MLB' : '',
      Game: tableIndex === 0 && recordIndex === 0 ? 'Baltimore Orioles vs Boston Red Sox' : `SettleAll Test Game ${tableIndex}-${recordIndex}`,
      Pick: tableIndex === 0 && recordIndex === 0
        ? 'Orioles/Red Sox Under 7.5'
        : tableIndex === 0 && recordIndex === 1
          ? 'Heavy soccer favorites pass'
          : `SettleAll Test Pick ${tableIndex}-${recordIndex}`,
      Status: tableIndex === 0 && recordIndex === 1 ? 'Pass' : 'Pending',
      Units: tableIndex === 0 && recordIndex === 1 ? '' : 1,
      Odds: '-110'
    }
  }))
]))

let patchedRecords = 0
globalThis.fetch = async (url, options = {}) => {
  const requestUrl = new URL(String(url))
  if (requestUrl.hostname === 'statsapi.mlb.com' && requestUrl.pathname === '/api/v1/schedule') {
    return {
      ok: true,
      json: async () => ({
        dates: [{
          games: [{
            gamePk: 12345,
            teams: {
              away: { score: 4, team: { name: 'Baltimore Orioles', teamName: 'Orioles' } },
              home: { score: 2, team: { name: 'Boston Red Sox', teamName: 'Red Sox' } }
            }
          }]
        }]
      })
    }
  }
  if (requestUrl.hostname === 'statsapi.mlb.com' && requestUrl.pathname === '/api/v1/game/12345/boxscore') {
    return {
      ok: true,
      json: async () => ({ teams: { away: { players: {} }, home: { players: {} } } })
    }
  }
  const tableId = decodeURIComponent(requestUrl.pathname.split('/').pop())
  if (options.method === 'PATCH') {
    const body = JSON.parse(options.body || '{}')
    patchedRecords += body.records?.length || 0
    return {
      ok: true,
      json: async () => ({ records: body.records || [] })
    }
  }
  return {
    ok: true,
    json: async () => ({ records: recordsByTable.get(tableId) || [] })
  }
}

const settleAllRes = makeRes()
await settleHandler({
  method: 'GET',
  query: {
    date: '2026-06-09',
    settleAll: 'true',
    confirm: 'SETTLE'
  }
}, settleAllRes)
assert.equal(settleAllRes.statusCode, 200)
assert.equal(settleAllRes.body.settleAll, true)
assert.equal(settleAllRes.body.scanned, 15)
assert.equal(settleAllRes.body.matched, 1)
assert.equal(settleAllRes.body.needsReview, 13)
assert.equal(settleAllRes.body.skipped, 1)
assert.equal(settleAllRes.body.updated, 14)
assert.equal(settleAllRes.body.records.length, 1)
assert.equal(settleAllRes.body.records[0].plannedSettlementStatus, 'Settled')
assert.equal(settleAllRes.body.records[0].plannedResult, 'Win')
assert.match(settleAllRes.body.records[0].discoveredSources[0].sourceUrl, /statsapi\.mlb\.com/)
assert.equal(settleAllRes.body.needsReviewRecords.length, 13)
assert.equal(settleAllRes.body.skippedRecords.length, 1)
assert.equal(settleAllRes.body.skippedRecords[0].reason, 'Skipped non-official watchlist/pass row.')
assert.equal(patchedRecords, 14)

globalThis.fetch = originalFetch
if (originalAirtableKey === undefined) delete process.env.AIRTABLE_API_KEY
else process.env.AIRTABLE_API_KEY = originalAirtableKey

const html = await readFile(new URL('../import-airtable.html', import.meta.url), 'utf8')
assert.match(html, /api\/recalculate-clv\?date=/)
assert.match(html, /api\/settle-results\?date=/)
assert.match(html, /Enter Closing Number \/ Closing Odds manually in Airtable/)

console.log('CLV and settlement automation regression test passed.')
