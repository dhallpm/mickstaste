import { calculateProfitLossUnits } from './calculateProfitLossUnits.js'
import { isClosedOrGraded } from './routePickCategory.js'
import {
  ACTIVE_AIRTABLE_TABLE_CONFIG,
  AIRTABLE_TABLE_RESOLVERS,
  AIRTABLE_TABLES,
  createAirtableRecords,
  deleteAirtableRecord,
  listAirtableRecords,
  listAirtableRecordsFromResolvedTable,
  flattenRecord,
  logSyncAction
} from './airtableClient.js'
import { buildRecordKey, withRecordKey } from './recordKey.js'

function normalizeResult(row = {}) {
  const source = [row.Result, row.Outcome, row.Status, row['Display Status'], row['Pick Status']].join(' ')
  if (/\b(win|won|cash|cashed)\b/i.test(source)) return 'Win'
  if (/\b(loss|lost|lose|failed)\b/i.test(source)) return 'Loss'
  if (/\b(push)\b/i.test(source)) return 'Push'
  if (/\b(void|cancelled|canceled|no action)\b/i.test(source)) return 'Void'
  return ''
}

function isFinalized(row = {}) {
  return ['Win', 'Loss', 'Push', 'Void'].includes(normalizeResult(row))
}

export function archiveFields(row = {}) {
  const result = normalizeResult(row)
  const fields = { ...row }
  delete fields.id
  delete fields.airtableRecordId
  delete fields.__table

  fields.Result = result
  fields.Outcome = result
  fields.Status = 'Closed'
  fields['Display Status'] = 'Closed'
  fields['Pick Status'] = 'Closed'
  fields['Profit/Loss Units'] = calculateProfitLossUnits({ ...row, Result: result })
  fields['Profit/Loss'] = fields['Profit/Loss Units']
  fields['P/L'] = fields['Profit/Loss Units']
  fields['Archived At'] = new Date().toISOString()
  fields['Archive Status'] = 'Archived'
  fields['Original Table'] = row.__table || ''
  fields['Source Airtable Record ID'] = row.airtableRecordId || row.id || ''
  fields['Record Key'] = row['Record Key'] || buildRecordKey(row)

  if (row['Closing Number'] || row['Closing Line']) {
    fields.CLV = row.CLV || row['Closing Value'] || ''
  }

  return fields
}

export async function archiveClosedBets(options = {}) {
  const startedAt = new Date().toISOString()
  const archived = []
  const warnings = []
  const createsByTable = new Map()
  const deletes = []
  let resultsArchiveTable = AIRTABLE_TABLES.resultsArchive

  try {
    const resolvedArchive = await listAirtableRecordsFromResolvedTable(AIRTABLE_TABLE_RESOLVERS.resultsArchive)
    resultsArchiveTable = resolvedArchive.tableName
    warnings.push(...resolvedArchive.warnings)
  } catch (error) {
    if (error.code !== 'AIRTABLE_RESOLVED_TABLE_NOT_FOUND') throw error
    warnings.push(...(error.warnings || []), 'Results Archive table was not found; archive writes will use the configured default.')
  }

  const existingArchiveKeys = new Set(
    (await listAirtableRecords(resultsArchiveTable).catch(() => []))
      .map(record => flattenRecord(record, resultsArchiveTable))
      .map(row => row['Record Key'] || buildRecordKey(row))
      .filter(Boolean)
  )

  for (const config of ACTIVE_AIRTABLE_TABLE_CONFIG) {
    let sourceTable = config.defaultName
    let records = []

    try {
      const resolved = await listAirtableRecordsFromResolvedTable(config)
      records = resolved.records
      sourceTable = resolved.tableName
      warnings.push(...resolved.warnings)
    } catch (error) {
      if (error.code !== 'AIRTABLE_RESOLVED_TABLE_NOT_FOUND') throw error
      warnings.push(...(error.warnings || []), `Skipped archive scan for ${config.defaultName}; no alias table was found.`)
      continue
    }

    for (const record of records) {
      const row = flattenRecord(record, sourceTable)
      if (!isClosedOrGraded(row)) continue
      if (!isFinalized(row)) {
        warnings.push(`Skipped ${row.Pick || row.Selection || row.Game || record.id}: closed/graded marker exists but Result is not Win/Loss/Push/Void.`)
        continue
      }
      if (String(row['Archive Status'] || '').toLowerCase() === 'archived') continue

      const destinationTable = resultsArchiveTable
      const fields = archiveFields(withRecordKey(row))
      if (existingArchiveKeys.has(fields['Record Key'])) continue
      existingArchiveKeys.add(fields['Record Key'])
      createsByTable.set(destinationTable, [...(createsByTable.get(destinationTable) || []), fields])
      deletes.push({ tableName: sourceTable, recordId: record.id })
      archived.push({
        sourceTable,
        archiveTable: destinationTable,
        pick: row.Pick || row.pick || '',
        result: fields.Result,
        profitLossUnits: fields['Profit/Loss Units']
      })
    }
  }

  for (const [tableName, rows] of createsByTable.entries()) {
    if (!options.dryRun) await createAirtableRecords(tableName, rows)
  }

  if (!options.dryRun) {
    for (const item of deletes) {
      await deleteAirtableRecord(item.tableName, item.recordId)
    }
  }

  await logSyncAction('Archive closed bets', {
    source: 'Airtable active tables',
    destination: 'Airtable archive tables',
    count: archived.length,
    message: options.dryRun ? 'Dry run only' : 'Finalized picks archived with Closed status and P/L units'
  })

  return { startedAt, finishedAt: new Date().toISOString(), warnings, archivedCount: archived.length, archived }
}

export default archiveClosedBets