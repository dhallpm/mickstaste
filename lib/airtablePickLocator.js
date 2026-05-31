import {
  ACTIVE_AIRTABLE_TABLE_CONFIG,
  flattenRecord,
  listAirtableRecords,
  listAirtableRecordsFromResolvedTable
} from './airtableClient.js'

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
    originalTable: text(row['Original Table']),
    recordKey: text(row['Record Key'])
  }
}

async function safeRowsFromResolved(config, warnings = []) {
  try {
    const result = await listAirtableRecordsFromResolvedTable(config)
    warnings.push(...(result.warnings || []))
    return result.rows
  } catch (error) {
    warnings.push(`Skipped ${config.defaultName}: ${error.message}`)
    return []
  }
}

async function safeRowsFromName(tableName, warnings = []) {
  try {
    const records = await listAirtableRecords(tableName)
    return records.map(record => flattenRecord(record, tableName))
  } catch (error) {
    warnings.push(`Skipped ${tableName}: ${error.message}`)
    return []
  }
}

export async function findAirtablePicks(options = {}) {
  const targetDate = String(options.date || '2026-05-30').slice(0, 10)
  const warnings = []
  const rows = []

  for (const config of ACTIVE_AIRTABLE_TABLE_CONFIG) {
    rows.push(...await safeRowsFromResolved(config, warnings))
  }

  for (const tableName of ARCHIVE_TABLES) {
    rows.push(...await safeRowsFromName(tableName, warnings))
  }

  const matches = rows
    .filter(row => dateKey(row) === targetDate || String(row['Record Key'] || '').startsWith(targetDate))
    .map(summarize)
    .sort((a, b) => `${a.table}|${a.game}|${a.pick}`.localeCompare(`${b.table}|${b.game}|${b.pick}`))

  return {
    targetDate,
    count: matches.length,
    tables: [...new Set(matches.map(row => row.table))],
    rows: matches,
    warnings
  }
}

export default findAirtablePicks
