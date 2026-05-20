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

function archiveFields(row = {}) {
  const fields = { ...row }
  delete fields.id
  delete fields.airtableRecordId
  delete fields.__table

  fields['Profit/Loss Units'] = calculateProfitLossUnits(row)
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
    message: options.dryRun ? 'Dry run only' : 'Closed/graded picks archived with P/L units'
  })

  return { startedAt, finishedAt: new Date().toISOString(), warnings, archivedCount: archived.length, archived }
}

export default archiveClosedBets
