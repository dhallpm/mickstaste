import {
  ACTIVE_AIRTABLE_TABLE_CONFIG,
  AIRTABLE_TABLE_RESOLVERS,
  deleteAirtableRecord,
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

function hasPickData(row = {}) {
  return Boolean(text(
    row.Pick,
    row.Selection,
    row.Play,
    row.Player,
    row.Game,
    row.Matchup,
    row.Event,
    row.Legs,
    row['Parlay Type'],
    row['Record Key'],
    row.Result,
    row.Status
  ))
}

function summarize(row = {}) {
  return {
    table: row.__table,
    recordId: row.airtableRecordId || row.id,
    date: text(row.Date, row.date, row['Game Date'], row.Timestamp, row['Archived At']),
    league: text(row.League, row.Sport),
    game: text(row.Game, row.Matchup, row.Event),
    pick: text(row.Pick, row.Selection, row.Play, row.Player, row['Card Title'], row['Parlay Type'], row.Legs),
    access: text(row.Access, row.Tier, row['Access Tier']),
    status: text(row.Status, row['Display Status'], row['Pick Status']),
    result: text(row.Result, row.Outcome),
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

async function safeRowsFromTableName(tableName, warnings = []) {
  try {
    const records = await listAirtableRecords(tableName)
    return records.map(record => flattenRecord(record, tableName))
  } catch (error) {
    warnings.push(`Skipped ${tableName}: ${error.message}`)
    return []
  }
}

async function getAllPickRows(warnings = []) {
  const rows = []
  for (const config of ACTIVE_AIRTABLE_TABLE_CONFIG) {
    rows.push(...await safeRowsFromResolved(config, warnings))
  }

  rows.push(...await safeRowsFromResolved(AIRTABLE_TABLE_RESOLVERS.resultsArchive, warnings))

  for (const tableName of ARCHIVE_TABLES.filter(name => name !== 'Results Archive')) {
    rows.push(...await safeRowsFromTableName(tableName, warnings))
  }

  const seen = new Set()
  return rows.filter(row => {
    const key = `${row.__table}|${row.airtableRecordId || row.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return hasPickData(row)
  })
}

export async function clearAirtablePicks(options = {}) {
  const dryRun = options.dryRun !== false
  const confirm = String(options.confirm || '').trim()
  const warnings = []
  const rows = await getAllPickRows(warnings)
  const targets = rows.map(summarize)

  if (!dryRun && confirm !== 'clear-all-picks') {
    return {
      success: false,
      dryRun,
      error: 'Refusing destructive clear without confirm=clear-all-picks',
      targetCount: targets.length,
      targets,
      warnings
    }
  }

  const deleted = []
  if (!dryRun) {
    for (const row of rows) {
      await deleteAirtableRecord(row.__table, row.airtableRecordId || row.id)
      deleted.push(summarize(row))
    }
  }

  return {
    success: true,
    dryRun,
    targetCount: targets.length,
    deletedCount: deleted.length,
    targets,
    deleted,
    warnings
  }
}

export default clearAirtablePicks
