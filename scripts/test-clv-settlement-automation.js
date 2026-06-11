import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import recalculateHandler from '../api/recalculate-clv.js'
import settleHandler from '../api/settle-results.js'
import {
  americanToDecimal,
  calculateClvFields,
  calculateSettlementFields,
  requestedDateKey,
  settleResults
} from '../lib/clvSettlementAutomation.js'
import { cleanWebsiteRow } from '../lib/buildWebsiteFeed.js'
import { mapSettlementFieldToColumn } from '../lib/googleSheetsPickStore.js'

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

const plusParlayMissingOdds = calculateSettlementFields({
  Pick: 'Braves 1st 5 -0.5 + Toronto Tempo -8 + Mariners ML',
  Units: 0.2
}, new Date('2026-06-10T22:00:00Z'), {
  verification: {
    status: 'verified',
    result: 'Win',
    sourceName: 'MLB official box score / WNBA official box score',
    sourceUrl: 'https://statsapi.mlb.com/api/v1/game/111/linescore https://www.wnba.com/game/box-score',
    notes: 'All plus-separated parlay legs won.'
  }
})
assert.equal(plusParlayMissingOdds.fields.Result, 'Win')
assert.equal(plusParlayMissingOdds.fields['Profit/Loss'], '')
assert.equal(plusParlayMissingOdds.fields['Settlement Status'], 'Profit Pending - Missing Odds')

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
assert.equal(mapSettlementFieldToColumn(['Date', 'Profit/Loss'], 'P/L'), 2)

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

function parseSheetRange(range = '') {
  const match = String(range).match(/^'((?:[^']|'')+)'(?:!(.*))?$/)
  if (!match) throw new Error(`Unexpected Google Sheets range: ${range}`)
  return {
    sheetName: match[1].replace(/''/g, "'"),
    cellRange: match[2] || ''
  }
}

function columnIndex(column = '') {
  return String(column).split('').reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0) - 1
}

function makeFakeSheets() {
  const headers = ['Date', 'League', 'Game', 'Pick', 'Bet Type', 'Status', 'Units', 'Odds', 'Category', 'Official Bet']
  const row = values => headers.map(header => values[header] ?? '')
  const tableRows = (sheetIndex, count) => Array.from({ length: count }, (_, recordIndex) => row({
    Date: '2026-06-09',
    League: sheetIndex === 0 && recordIndex === 0 ? 'MLB' : '',
    Game: sheetIndex === 0 && recordIndex === 0 ? 'Baltimore Orioles vs Boston Red Sox' : `SettleAll Test Game ${sheetIndex}-${recordIndex}`,
    Pick: sheetIndex === 0 && recordIndex === 0
      ? 'Orioles/Red Sox Under 7.5'
      : sheetIndex === 0 && recordIndex === 1
        ? 'Heavy soccer favorites pass'
        : `SettleAll Test Pick ${sheetIndex}-${recordIndex}`,
    'Bet Type': sheetIndex === 0 && recordIndex === 0 ? 'Total' : '',
    Status: sheetIndex === 0 && recordIndex === 1 ? 'Pass' : 'Pending',
    Units: sheetIndex === 0 && recordIndex === 1 ? '' : 1,
    Odds: '-110'
  }))

  const blankDatedRow = row({ Date: '2026-06-09' })
  const data = new Map([
    ['Master Picks', [headers.slice(), ...tableRows(0, 6), blankDatedRow, blankDatedRow.slice()]],
    ['Props Lab', [headers.slice(), ...tableRows(1, 3), blankDatedRow.slice()]],
    ['Lotto Parlays', [headers.slice(), ...tableRows(2, 3), blankDatedRow.slice()]],
    ['Longshots', [headers.slice(), ...tableRows(3, 3)]]
  ])
  const calls = {
    headerUpdates: 0,
    batchUpdates: 0,
    updatedRanges: []
  }

  const sheets = {
    spreadsheets: {
      values: {
        get: async ({ range }) => {
          const { sheetName, cellRange } = parseSheetRange(range)
          const values = data.get(sheetName) || []
          return {
            data: {
              values: cellRange === '1:1' ? [values[0] || []] : values
            }
          }
        },
        update: async ({ range, requestBody }) => {
          const { sheetName, cellRange } = parseSheetRange(range)
          assert.equal(cellRange, 'A1')
          const values = data.get(sheetName) || [[]]
          values[0] = requestBody.values?.[0] || []
          data.set(sheetName, values)
          calls.headerUpdates += 1
          calls.updatedRanges.push(range)
          return { data: { updatedRange: range } }
        },
        batchUpdate: async ({ requestBody }) => {
          calls.batchUpdates += 1
          let updatedCells = 0
          const responses = []
          for (const update of requestBody.data || []) {
            const { sheetName, cellRange } = parseSheetRange(update.range)
            const match = cellRange.match(/^([A-Z]+)(\d+)$/)
            if (!match) throw new Error(`Unexpected update range: ${update.range}`)
            const column = columnIndex(match[1])
            const rowIndex = Number(match[2]) - 1
            const values = data.get(sheetName)
            while (values.length <= rowIndex) values.push([])
            values[rowIndex][column] = update.values?.[0]?.[0] ?? ''
            updatedCells += 1
            responses.push({ updatedRange: update.range })
          }
          return {
            data: {
              spreadsheetId: 'test-spreadsheet',
              totalUpdatedCells: updatedCells,
              responses
            }
          }
        }
      }
    }
  }

  return { sheets, data, calls }
}

const originalFetch = globalThis.fetch
globalThis.fetch = async url => {
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
  return {
    ok: false,
    status: 404,
    statusText: 'Not mocked',
    json: async () => ({})
  }
}

const dryRunSheets = makeFakeSheets()
const dryRunResult = await settleResults({
  date: '2026-06-09',
  settleAll: true,
  dryRun: true,
  sheets: dryRunSheets.sheets,
  spreadsheetId: 'test-spreadsheet'
})
assert.equal(dryRunResult.success, true)
assert.equal(dryRunResult.source, 'google-sheets')
assert.equal(dryRunResult.sourceOfTruth, 'Google Sheets')
assert.equal(dryRunResult.spreadsheetId, 'test-spreadsheet')
assert.equal(dryRunResult.settleAll, true)
assert.equal(dryRunResult.scanned, 19)
assert.equal(dryRunResult.matched, 1)
assert.equal(dryRunResult.needsReview, 13)
assert.equal(dryRunResult.skipped, 5)
assert.equal(dryRunResult.updated, 0)
assert.equal(dryRunResult.records[0].sheetName, 'Master Picks')
assert.equal(dryRunResult.records[0].sheetRowNumber, 2)
assert.match(dryRunResult.records[0].updatedRange, /'Master Picks'![A-Z]+2/)
assert.equal(dryRunSheets.calls.headerUpdates, 0)
assert.equal(dryRunSheets.calls.batchUpdates, 0)
assert.equal(dryRunResult.skippedRecords.filter(record => /Skipped blank row/.test(record.reason)).length, 4)
assert.equal(dryRunResult.needsReviewRecords.filter(record => !record.pick).length, 0)
assert.doesNotMatch(JSON.stringify(dryRunResult), /Airtable|tbl[A-Za-z0-9]{10,}/)

const writeSheets = makeFakeSheets()
const settleAllRes = makeRes()
await settleHandler({
  method: 'GET',
  sheets: writeSheets.sheets,
  spreadsheetId: 'test-spreadsheet',
  query: {
    date: '2026-06-09',
    settleAll: 'true',
    confirm: 'SETTLE'
  }
}, settleAllRes)
assert.equal(settleAllRes.statusCode, 200)
assert.equal(settleAllRes.body.settleAll, true)
assert.equal(settleAllRes.body.source, 'google-sheets')
assert.equal(settleAllRes.body.sourceOfTruth, 'Google Sheets')
assert.equal(settleAllRes.body.spreadsheetId, 'test-spreadsheet')
assert.equal(settleAllRes.body.scanned, 19)
assert.equal(settleAllRes.body.matched, 1)
assert.equal(settleAllRes.body.needsReview, 13)
assert.equal(settleAllRes.body.skipped, 5)
assert.equal(settleAllRes.body.updated, 14)
assert.equal(settleAllRes.body.records.length, 1)
assert.equal(settleAllRes.body.records[0].plannedSettlementStatus, 'Settled')
assert.equal(settleAllRes.body.records[0].plannedResult, 'Win')
assert.match(settleAllRes.body.records[0].discoveredSources[0].sourceUrl, /statsapi\.mlb\.com/)
assert.equal(settleAllRes.body.needsReviewRecords.length, 13)
assert.equal(settleAllRes.body.skippedRecords.length, 5)
assert.equal(settleAllRes.body.skippedRecords.filter(record => /Skipped blank row/.test(record.reason)).length, 4)
assert.equal(settleAllRes.body.skippedRecords.some(record => record.reason === 'Skipped non-official watchlist/pass row.'), true)
assert.equal(writeSheets.calls.headerUpdates, 4)
assert.equal(writeSheets.calls.batchUpdates, 14)
assert.doesNotMatch(JSON.stringify(settleAllRes.body), /Airtable|tbl[A-Za-z0-9]{10,}/)

const masterRows = writeSheets.data.get('Master Picks')
const masterHeaders = masterRows[0]
const resultIndex = masterHeaders.indexOf('Result')
const outcomeIndex = masterHeaders.indexOf('Outcome')
const statusIndex = masterHeaders.indexOf('Status')
const profitLossIndex = masterHeaders.indexOf('Profit/Loss')
const settlementStatusIndex = masterHeaders.indexOf('Settlement Status')
const settlementSourceIndex = masterHeaders.indexOf('Settlement Source')
assert.equal(masterRows[1][resultIndex], 'Win')
assert.equal(masterRows[1][outcomeIndex], 'Win')
assert.equal(masterRows[1][statusIndex], 'Closed')
assert.equal(masterRows[1][profitLossIndex], 0.91)
assert.equal(masterRows[1][settlementStatusIndex], 'Settled')
assert.match(masterRows[1][settlementSourceIndex], /MLB official box score/)
assert.notEqual(masterRows[2][settlementStatusIndex], 'Needs Review')

globalThis.fetch = originalFetch

const html = await readFile(new URL('../import-airtable.html', import.meta.url), 'utf8')
assert.match(html, /api\/recalculate-clv\?date=/)
assert.match(html, /api\/settle-results\?date=/)
assert.match(html, /Enter Closing Number \/ Closing Odds manually in Airtable/)

console.log('CLV and settlement automation regression test passed.')
