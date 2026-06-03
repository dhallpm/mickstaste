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
assert.equal(calculateSettlementFields({ Result: 'Pending', Units: 1, Odds: '+150' }).skipped, true)

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

const html = await readFile(new URL('../import-airtable.html', import.meta.url), 'utf8')
assert.match(html, /api\/recalculate-clv\?date=/)
assert.match(html, /api\/settle-results\?date=/)
assert.match(html, /Enter Closing Number \/ Closing Odds manually in Airtable/)

console.log('CLV and settlement automation regression test passed.')
