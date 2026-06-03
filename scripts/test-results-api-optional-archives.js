import assert from 'node:assert/strict'
import { hasPositiveUnits, normalizeRow } from '../api/results.js'

const calculatedBeforeStored = normalizeRow({
  Pick: 'Calculated Result Wins',
  Result: 'Win',
  Units: '1',
  Odds: '+150',
  'Profit/Loss Units': '-9.00u',
  'Profit/Loss': -8
}, 'Results Archive')

assert.equal(calculatedBeforeStored['Profit/Loss'], '+1.50u')
assert.equal(calculatedBeforeStored.Result, 'Win')

const negativeOddsWin = normalizeRow({
  Pick: 'Negative Odds Win',
  Result: 'Win',
  Units: '1',
  Odds: '-110'
}, 'Results Archive')

assert.equal(negativeOddsWin['Profit/Loss'], '+0.91u')

const loss = normalizeRow({
  Pick: 'Loss Settles Units',
  Result: 'Loss',
  Units: '0.75',
  Odds: '+450',
  'Profit/Loss': 9
}, 'Results Archive')

assert.equal(loss['Profit/Loss'], '-0.75u')

const push = normalizeRow({
  Pick: 'Push Settles Zero',
  Result: 'Push',
  Units: '0.75',
  Odds: '+450'
}, 'Results Archive')

assert.equal(push['Profit/Loss'], '0.00u')

const legacyCurrencyFallback = normalizeRow({
  Pick: 'Legacy Currency Fallback',
  Result: 'Win',
  Units: '1',
  'Profit/Loss': 0.75
}, 'Results Archive')

assert.equal(legacyCurrencyFallback['Profit/Loss'], '+0.75u')
assert.equal(hasPositiveUnits({ Units: 0, Result: 'Loss', 'Profit/Loss': -1 }), false)
assert.equal(hasPositiveUnits({ Units: 0.25, Result: 'Loss' }), true)

console.log('Results API optional archive fallback regression test passed.')
