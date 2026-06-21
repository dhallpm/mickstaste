import assert from 'node:assert/strict'
import { buildResultsPayload, hasPositiveUnits, normalizeRow, shouldIncludeResultRecord } from '../api/results.js'
import { listSettledGoogleSheetsPicksWithWarnings } from '../lib/googleSheetsPickStore.js'

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
assert.equal(shouldIncludeResultRecord({ Status: 'Closed' }), false)
assert.equal(shouldIncludeResultRecord({ Status: 'Settled' }), false)
assert.equal(shouldIncludeResultRecord({ Result: 'Pending' }), false)
assert.equal(shouldIncludeResultRecord({ Status: 'Watchlist' }), false)
assert.equal(shouldIncludeResultRecord({ Status: 'Closed', Result: 'Pending' }), false)
assert.equal(shouldIncludeResultRecord({ 'Profit/Loss': 0 }), false)
assert.equal(shouldIncludeResultRecord({ Status: 'Pending', 'Profit/Loss': -1 }), false)
assert.equal(shouldIncludeResultRecord({ Units: 0, Result: 'Loss', 'Profit/Loss': -1 }), false)
assert.equal(shouldIncludeResultRecord({ ROI: 120 }), false)
assert.equal(shouldIncludeResultRecord({ 'Settled At': '2026-06-04T12:00:00Z' }), false)
assert.equal(shouldIncludeResultRecord({ Outcome: 'Win' }), false)
assert.equal(shouldIncludeResultRecord({ 'Final Result': 'Loss' }), false)
assert.equal(shouldIncludeResultRecord({ 'Settlement Status': 'Settled' }), false)
assert.equal(shouldIncludeResultRecord({ 'Settlement Status': 'Won' }), false)
assert.equal(shouldIncludeResultRecord({ 'Settlement Notes': 'The prop cashed.' }), false)
assert.equal(shouldIncludeResultRecord({ 'Result Notes': 'The bet lost.' }), false)
assert.equal(shouldIncludeResultRecord({ Notes: 'The ticket was graded a push.' }), false)
assert.equal(shouldIncludeResultRecord({ 'Archive Reason': 'The selection was voided.' }), false)
assert.equal(shouldIncludeResultRecord({ 'Short Take': 'The matchup has won attention from sharp bettors.' }), false)
assert.equal(shouldIncludeResultRecord({
  Result: 'Win',
  'Profit/Loss': '+0.80u',
  'Settled At': '2026-06-20',
  'Settlement Status': 'Settled'
}), true)
assert.equal(shouldIncludeResultRecord({
  Outcome: 'Loss',
  'Profit/Loss': '-1.00u',
  'Settled At': '2026-06-20',
  'Settlement Status': 'Settled'
}), true)

assert.equal(normalizeRow({
  Date: '2026-06-18',
  'Settled At': '2026-06-19T21:30:00-04:00',
  Result: 'Win'
}, 'Master Picks').date, '2026-06-19')
assert.equal(normalizeRow({
  Date: '2026-06-18',
  'Settlement Date': '2026-06-19',
  Result: 'Win'
}, 'Results Archive 2026-06-19').date, '2026-06-19')
assert.equal(normalizeRow({
  Date: '2026-06-18',
  'Archive Timestamp': '2026-06-19T23:45:00-04:00',
  Result: 'Win'
}, 'Results Archive 2026-06-19').date, '2026-06-19')
assert.equal(normalizeRow({
  Date: '2026-06-18',
  Result: 'Win'
}, 'Master Picks').date, '2026-06-18')

const pendingMaster = normalizeRow({
  Game: 'Baltimore Orioles vs Boston Red Sox',
  Pick: 'Under 10 Runs',
  Status: 'Pending'
}, 'Master Picks')

assert.equal(shouldIncludeResultRecord(pendingMaster), false)

const settledTotal = normalizeRow({
  Game: 'Baltimore Orioles vs Boston Red Sox',
  Pick: 'Under 10 Runs',
  Result: 'Win',
  Units: '1',
  Odds: '+100'
}, 'Master Picks')

assert.equal(settledTotal.Pick, 'Baltimore Orioles vs Boston Red Sox \u2013 Under 10 Runs')
assert.equal(settledTotal.Result, 'Win')
assert.equal(settledTotal.Status, 'Win')

const settledProp = normalizeRow({
  Player: 'Caitlin Clark',
  Pick: 'Live Points/Assists Over',
  Outcome: 'Loss',
  Units: '1',
  Odds: '-110'
}, 'Props Lab')

assert.equal(settledProp.Pick, 'Caitlin Clark \u2013 Live Points/Assists Over')
assert.equal(settledProp.Result, 'Loss')
assert.equal(settledProp.Status, 'Loss')

const settledPropFromNotes = normalizeRow({
  Player: 'Emmet Sheehan',
  Pick: 'Emmet Sheehan Over 5.5 Strikeouts',
  Status: 'Archive',
  status: 'Pending',
  Units: '1',
  Odds: '+109',
  'Settlement Notes': 'Sheehan Over 5.5 Ks won; he recorded 8 strikeouts.'
}, 'Props Lab')

assert.equal(settledPropFromNotes.Result, 'Win')
assert.equal(settledPropFromNotes.Outcome, 'Win')
assert.equal(settledPropFromNotes.Status, 'Win')
assert.equal(settledPropFromNotes['Profit/Loss'], '+1.09u')

const lottoWin = normalizeRow({
  Pick: 'Safe 5-Leg Parlay',
  Result: 'Win',
  Units: '1',
  Odds: '+300',
  ROI: '90.91',
  'Settlement Status': 'Profit Pending - Missing Odds',
  'Settlement Notes': 'Profit pending because parlay odds are missing or invalid.'
}, 'Lotto Parlays')

assert.equal(lottoWin.__section, 'lotto')
assert.equal(lottoWin.Result, 'Win')
assert.equal(lottoWin.roiDisplay, '90.91%')
assert.equal(lottoWin.settlementStatus, 'Profit Pending - Missing Odds')
assert.equal(lottoWin.settlementNotes, 'Profit pending because parlay odds are missing or invalid.')

const longshotLoss = normalizeRow({
  Pick: 'Longshot HR Ladder',
  Result: 'Loss',
  Units: '0.25',
  Odds: '+1200'
}, 'Longshots')

assert.equal(longshotLoss.__section, 'longshots')
assert.equal(longshotLoss.Result, 'Loss')

const profitLossOnly = normalizeRow({
  Pick: 'Profit/Loss Only',
  Status: 'Pending',
  'Profit/Loss': '-0.25u'
}, 'Master Picks')

assert.equal(profitLossOnly.Result, 'Loss')
assert.equal(profitLossOnly.Status, 'Loss')

const payload = buildResultsPayload({
  loadedTabs: ['Master Picks', 'Props Lab', 'Lotto Parlays', 'Longshots'],
  rows: [
    {
      __table: 'Master Picks',
      Date: '2026-06-09',
      League: 'NBA',
      Game: 'Knicks vs Spurs',
      Pick: 'Knicks +5.5',
      Result: 'Win',
      Units: '0.5',
      Odds: '+100',
      Grade: 'B',
      Access: 'Free',
      'Profit/Loss': '+0.50u',
      'Settled At': '2026-06-09',
      'Settlement Status': 'Settled',
      'Full Analysis': 'VIP-only material should not leak'
    },
    {
      __table: 'Master Picks',
      Date: '2026-06-09',
      League: 'MLB',
      Game: 'Yankees vs Guardians',
      Pick: 'Yankees ML',
      Outcome: 'Loss',
      Units: '1',
      Odds: '-110',
      Grade: 'A',
      Access: 'VIP',
      'Profit/Loss': '-1.00u',
      'Settled At': '2026-06-09',
      'Settlement Status': 'Settled'
    },
    {
      __table: 'Props Lab',
      Date: '2026-06-08',
      Player: 'Caitlin Clark',
      Pick: 'Live Points/Assists Over',
      Result: 'Push',
      Units: '1',
      Odds: '-110',
      'Profit/Loss': '0.00u',
      'Settled At': '2026-06-08',
      'Settlement Status': 'Settled'
    },
    {
      __table: 'Props Lab',
      Date: '2026-06-14',
      Player: 'Emmet Sheehan',
      Pick: 'Emmet Sheehan Over 5.5 Strikeouts',
      Status: 'Archive',
      status: 'Pending',
      Units: '1',
      Odds: '+109',
      Outcome: 'Win',
      'Profit/Loss': '+1.09u',
      'Settled At': '2026-06-14',
      'Settlement Status': 'Settled',
      'Settlement Notes': 'Sheehan Over 5.5 Ks won; he recorded 8 strikeouts.'
    },
    {
      __table: 'Lotto Parlays',
      Date: '2026-06-08',
      Pick: 'Safe 5-Leg Parlay',
      Result: 'Void',
      Units: '0.2',
      Odds: '+400',
      'Profit/Loss': '0.00u',
      'Settled At': '2026-06-08',
      'Settlement Status': 'Settled'
    },
    {
      __table: 'Longshots',
      Date: '2026-06-07',
      Pick: 'Longshot HR Ladder',
      Result: 'Loss',
      'Profit/Loss': '-0.25u',
      Units: '0.25',
      Odds: '+1200',
      'Settled At': '2026-06-07',
      'Settlement Status': 'Settled'
    },
    {
      __table: 'Master Picks',
      Date: '2026-06-09',
      Pick: 'Pending Play',
      Result: 'Pending',
      Units: '1'
    }
  ]
}, { days: 3650 })

assert.equal(payload.source, 'google-sheets')
assert.equal(payload.sourceOfTruth, 'Google Sheets')
assert.equal(payload.records.length, 6)
assert.equal(payload.summary.overall.wins, 2)
assert.equal(payload.summary.overall.losses, 2)
assert.equal(payload.summary.overall.pushes, 1)
assert.equal(payload.summary.overall.voids, 1)
assert.equal(payload.summary.vip.losses, 1)
assert.equal(payload.summary.propsLab.wins, 1)
assert.equal(payload.summary.propsLab.pushes, 1)
assert.equal(payload.summary.lottoParlays.voids, 1)
assert.equal(payload.summary.longshots.losses, 1)
assert.equal(payload.byDate['2026-06-09'].length, 2)
assert.equal(payload.free.length, 1)
assert.equal(payload.vip.length, 1)
assert.equal(payload.props.length, 2)
assert.equal(payload.props.find(row => row.pick.includes('Emmet Sheehan')).Result, 'Win')
assert.equal(payload.props.find(row => row.pick.includes('Emmet Sheehan')).Outcome, 'Win')
assert.equal(payload.lotto.length, 1)
assert.equal(payload.longshots.length, 1)
assert.equal(JSON.stringify(payload).includes('VIP-only material should not leak'), false)

const requestedRanges = []
const sheets = {
  spreadsheets: {
    get: async () => ({
      data: {
        sheets: [
          ...['Master Picks', 'Props Lab', 'Lotto Parlays', 'Longshots']
            .map(title => ({ properties: { title } })),
          { properties: { title: 'Results Archive 2026-06-20' } },
          { properties: { title: 'results archive legacy' } },
          { properties: { title: 'VIP Archive' } }
        ]
      }
    }),
    values: {
      get: async ({ range }) => {
        requestedRanges.push(range)
        if (range === "'Results Archive 2026-06-20'") {
          return {
            data: {
              values: [
                ['Date', 'Settlement Date', 'League', 'Pick', 'Result', 'Units', 'Odds', 'Profit/Loss', 'Settled At', 'Settlement Status'],
                ['2026-06-19', '2026-06-20', 'MLB', 'June 20 Archived Winner', 'Win', '1', '+110', '+1.10u', '2026-06-20', 'Settled']
              ]
            }
          }
        }
        return { data: { values: [] } }
      }
    }
  }
}
const dynamicArchiveResult = await listSettledGoogleSheetsPicksWithWarnings({ sheets, spreadsheetId: 'test-sheet' })
assert.deepEqual(dynamicArchiveResult.loadedTabs, [
  'Master Picks',
  'Props Lab',
  'Lotto Parlays',
  'Longshots',
  'Results Archive 2026-06-20',
  'results archive legacy'
])
assert.equal(requestedRanges.includes("'VIP Archive'"), false)
assert.equal(dynamicArchiveResult.rows.length, 1)
const dynamicArchivePayload = buildResultsPayload(dynamicArchiveResult, { days: 3650 })
assert.equal(dynamicArchivePayload.records.length, 1)
assert.equal(dynamicArchivePayload.records[0].pick, 'June 20 Archived Winner')
assert.equal(dynamicArchivePayload.records[0].date, '2026-06-20')

console.log('Results API optional archive fallback regression test passed.')
