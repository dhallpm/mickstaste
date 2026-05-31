import assert from 'node:assert/strict'

import { archiveFields } from '../lib/archiveClosedBets.js'

const fields = archiveFields({
  Date: '2026-05-30',
  Sport: 'Mixed',
  League: 'Mixed',
  Game: 'Lotto Parlay',
  Pick: 'Safe 5-Leg Parlay',
  Odds: '+450',
  Units: 0.25,
  Result: 'Loss'
})

assert.equal(fields.Sport, undefined)
assert.equal(fields.League, undefined)
assert.equal(fields['Profit/Loss Units'], '-0.25u')
assert.equal(fields['P/L'], '-0.25u')
assert.equal(fields['Profit/Loss'], undefined)

const teamTotal = archiveFields({
  Date: '2026-05-30',
  League: 'MLB',
  Game: 'Yankees @ Athletics',
  Pick: 'Yankees Team Total Over 5.0',
  'Bet Type': 'Team Total',
  Access: 'Free',
  Odds: '-110',
  Units: 1,
  Result: 'Loss'
})

assert.equal(teamTotal['Bet Type'], undefined)
assert.match(teamTotal['Record Key'], /\|team total\|free\|-110$/)

console.log('Archive closed bets Lotto mixed-select regression test passed.')
