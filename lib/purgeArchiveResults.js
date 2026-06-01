import {
  deleteAirtableRecord,
  flattenRecord,
  listAirtableRecords,
  listAirtableRecordsFromResolvedTable,
  AIRTABLE_TABLE_RESOLVERS
} from './airtableClient.js'

const OPTIONAL_ARCHIVE_TABLES = [
  'VIP Archive',
  'Lotto Parlays Archive',
  'Longshots History'
]

function text(...values) {
  return values.map(value => String(value ?? '').trim()).find(Boolean) || ''
}

function isTargetArchiveRow(row = {}) {
  const source = [
    row.__table,
    row['Original Table'],
    row.Access,
    row.Tier,
    row['Access Tier'],
    row.Category,
    row.Type,
    row['Bet Type'],
    row['Parlay Type'],
    row.Pick,
    row.Game,
    row.Legs,
    row['Record Key']
  ].join(' ').toLowerCase()

  return /\b(vip|premium|member|lotto|lottery|parlay|longshot|long shot)\b/.test(source)
}

function summarize(row = {}) {
  return {
    table: row.__table,
    recordId: row.airtableRecordId || row.id,
    date: text(row.Date, row.date, row['Game Date'], row.Timestamp, row['Archived At']),
    game: text(row.Game, row.Matchup, row.Event),
    pick: text(row.Pick, row.Selection, row.Play, row['Card Title'], row['Parlay Type'], row.Legs),
    access: text(row.Access, row.Tier, row['Access Tier']),
    result: text(row.Result, row.Outcome, row.Status),
    originalTable: text(row['Original Table']),
    recordKey: text(row['Record Key'])
  }
}

async function safeArchiveRows(tableName, warnings = []) {
  try {
    const records = await listAirtableRecords(tableName)
    return records.map(record => flattenRecord(record, tableName))
  } catch (error) {
    warnings.push(`Skipped ${tableName}: ${error.message}`)
    return []
  }
}

async function resultsArchiveRows(warnings = []) {
  try {
    const resolved = await listAirtableRecordsFromResolvedTable(AIRTABLE_TABLE_RESOLVERS.resultsArchive)
    warnings.push(...(resolved.warnings || []))
    return resolved.rows
  } catch (error) {
    warnings.push(`Skipped Results Archive: ${error.message}`)
    return []
  }
}

export async function purgeArchiveResults(options = {}) {
  const dryRun = options.dryRun !== false
  const confirm = String(options.confirm || '').trim()
  const warnings = []
  const rows = []

  rows.push(...await resultsArchiveRows(warnings))
  for (const tableName of OPTIONAL_ARCHIVE_TABLES) {
    rows.push(...await safeArchiveRows(tableName, warnings))
  }

  const targets = rows.filter(isTargetArchiveRow)
  const preview = targets.map(summarize)

  if (!dryRun && confirm !== 'purge-archives') {
    return {
      success: false,
      dryRun,
      error: 'Refusing destructive purge without confirm=purge-archives',
      targetCount: targets.length,
      targets: preview,
      warnings
    }
  }

  const deleted = []
  if (!dryRun) {
    for (const row of targets) {
      await deleteAirtableRecord(row.__table, row.airtableRecordId || row.id)
      deleted.push(summarize(row))
    }
  }

  return {
    success: true,
    dryRun,
    targetCount: targets.length,
    deletedCount: deleted.length,
    targets: preview,
    deleted,
    warnings
  }
}

export default purgeArchiveResults
