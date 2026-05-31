import {
  ACTIVE_AIRTABLE_TABLE_CONFIG,
  AIRTABLE_TABLE_RESOLVERS,
  flattenRecord,
  listAirtableRecords,
  listAirtableRecordsFromResolvedTable
} from '../lib/airtableClient.js'

const ARCHIVE_TABLES = [
  'Results Archive',
  'VIP Archive',
  'Props Results',
  'Lotto Props',
  'Lotto Parlays Archive',
  'Longshots History'
]

function text(...values) {
  return values.map(value => String(value ?? '').trim()).find(Boolean) || ''
}

function dateKey(row = {}) {
  const value = text(row.Date, row.date, row['Game Date'], row.Timestamp, row['Posted Time'], row['Archived At'])
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)
  const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  return value.slice(0, 10)
}

function pickName(row = {}) {
  return text(row.Pick, row.Selection, row.Play, row.Name, row['Card Title'], row.Player, row.Game, row.Matchup, row.Legs, row['Parlay Type'])
}

function resultOf(row = {}) {
  const source = [row.Result, row.Outcome, row.Status, row['Display Status'], row['Pick Status']].join(' ')
  if (/\b(win|won|cash|cashed)\b/i.test(source)) return 'Win'
  if (/\b(loss|lost|lose|failed)\b/i.test(source)) return 'Loss'
  if (/\bpush\b/i.test(source)) return 'Push'
  if (/\b(void|cancelled|canceled)\b/i.test(source)) return 'Void'
  return text(row.Result, row.Outcome, row.Status, row['Display Status'], row['Pick Status'])
}

function summarize(row = {}) {
  return {
    table: row.__table,
    recordId: row.airtableRecordId || row.id,
    date: dateKey(row),
    league: text(row.League, row.Sport),
    game: text(row.Game, row.Matchup, row.Event),
    pick: pickName(row),
    betType: text(row['Bet Type'], row.Market, row.Type, row['Prop Type']),
    access: text(row.Access, row.Tier, row['Access Tier']),
    status: text(row.Status, row['Display Status'], row['Pick Status']),
    releaseStatus: text(row['Release Status'], row['Display Release Status'], row.Release),
    result: resultOf(row),
    archiveStatus: text(row['Archive Status']),
    odds: text(row.Odds, row.Price, row['Card Odds']),
    units: text(row.Units, row['Units to Commit'], row.Stake),
    grade: text(row.Grade, row['Card Grade']),
    profitLossUnits: text(row['Profit/Loss Units'], row['P/L'], row.PL, row['Profit/Loss']),
    originalTable: text(row['Original Table'])
  }
}

async function safeRowsFromResolved(config) {
  try {
    const result = await listAirtableRecordsFromResolvedTable(config)
    return result.rows
  } catch (error) {
    console.warn(`Skipped ${config.defaultName}: ${error.message}`)
    return []
  }
}

async function safeRowsFromName(tableName) {
  try {
    const records = await listAirtableRecords(tableName)
    return records.map(record => flattenRecord(record, tableName))
  } catch (error) {
    console.warn(`Skipped ${tableName}: ${error.message}`)
    return []
  }
}

const targetDate = process.argv[2] || '2026-05-30'
const rows = []

for (const config of ACTIVE_AIRTABLE_TABLE_CONFIG) {
  rows.push(...await safeRowsFromResolved(config))
}

for (const tableName of ARCHIVE_TABLES) {
  rows.push(...await safeRowsFromName(tableName))
}

const matches = rows
  .filter(row => dateKey(row) === targetDate || String(row['Record Key'] || '').startsWith(targetDate))
  .map(summarize)
  .sort((a, b) => `${a.table}|${a.game}|${a.pick}`.localeCompare(`${b.table}|${b.game}|${b.pick}`))

console.log(JSON.stringify({
  targetDate,
  count: matches.length,
  tables: [...new Set(matches.map(row => row.table))],
  rows: matches
}, null, 2))

if (!matches.length) {
  console.log(`No Airtable pick rows found for ${targetDate}. Confirm AIRTABLE_VERIFIED_BASE_ID and table aliases in Vercel.`)
}
