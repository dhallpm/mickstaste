import assert from 'node:assert/strict'

import { buildNeedsSettlementQueue, isNeedsSettlementRow } from '../lib/needsSettlement.js'

const pastPending = {
  __table: 'Master Picks',
  __rowNumber: 78,
  Date: '2026-06-20',
  League: 'FIFA World Cup 2026',
  Game: 'Netherlands vs Sweden',
  Pick: 'Over 2.5 Goals',
  Status: 'Pending',
  Result: '',
  Outcome: '',
  'Profit/Loss': '',
  'Settled At': '',
  'Settlement Status': ''
}

assert.equal(isNeedsSettlementRow(pastPending, { today: '2026-06-21' }), true)
assert.equal(isNeedsSettlementRow({ ...pastPending, Date: '2026-06-21' }, { today: '2026-06-21' }), false)
assert.equal(isNeedsSettlementRow({ ...pastPending, Status: 'Settled' }, { today: '2026-06-21' }), false)
assert.equal(isNeedsSettlementRow({ ...pastPending, Result: 'Win' }, { today: '2026-06-21' }), false)
assert.equal(isNeedsSettlementRow({ ...pastPending, Outcome: 'Loss' }, { today: '2026-06-21' }), false)

const queue = buildNeedsSettlementQueue({
  source: 'google-sheets',
  sourceOfTruth: 'Google Sheets',
  spreadsheetId: 'sheet-id',
  loadedTabs: ['Master Picks', 'Props Lab', 'Lotto Parlays', 'Longshots', 'Results Archive 2026-06-20'],
  rows: [
    pastPending,
    { ...pastPending, __table: 'Props Lab', __rowNumber: 15, Pick: 'Paul Skenes Over 6.5 Strikeouts' },
    { ...pastPending, Date: '2026-06-21', Pick: 'Today Active Pick' },
    {
      ...pastPending,
      __rowNumber: 79,
      Pick: 'Completed Pick',
      Status: 'Settled',
      Result: 'Win',
      'Profit/Loss': '+0.80u',
      'Settled At': '2026-06-20',
      'Settlement Status': 'Settled'
    }
  ]
}, { today: '2026-06-21' })

assert.equal(queue.count, 2)
assert.deepEqual(queue.countsByTab, { 'Master Picks': 1, 'Props Lab': 1 })
assert.deepEqual(queue.loadedTabs, ['Master Picks', 'Props Lab', 'Lotto Parlays', 'Longshots', 'Results Archive 2026-06-20'])
assert.equal(queue.rows[0].Status, 'Needs Settlement')
assert.equal(queue.rows[0].status, 'Needs Settlement')
assert.equal(queue.rows[0].adminStatus, 'Needs Settlement')
assert.equal(queue.rows[0].needsSettlement, true)
assert.deepEqual(queue.rows[0].missingFields, ['Result/Outcome', 'Profit/Loss', 'Settled At', 'Settlement Status'])
assert.equal(queue.rows.some(row => row.pick === 'Today Active Pick'), false)
assert.equal(queue.rows.some(row => row.pick === 'Completed Pick'), false)

console.log('Needs Settlement admin queue regression passed.')
