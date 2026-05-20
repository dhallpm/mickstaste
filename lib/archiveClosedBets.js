import { calculateProfitLossUnits } from './calculateProfitLossUnits.js'
import { isClosedOrGraded } from './routePickCategory.js'
import {
  ACTIVE_AIRTABLE_TABLES,
  AIRTABLE_TABLES,
  createAirtableRecords,
  deleteAirtableRecord,
  listAirtableRecords,
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
  const createsByTable = new Map()
  const deletes = []
  const existingArchiveKeys = new Set(
    (await listAirtableRecords(AIRTABLE_TABLES.resultsArchive).catch(() => []))
      .map(record => flattenRecord(record, AIRTABLE_TABLES.resultsArchive))
      .map(row => row['Record Key'] || buildRecordKey(row))
      .filter(Boolean)
  )

  for (const tableName of ACTIVE_AIRTABLE_TABLES) {
    const records = await listAirtableRecords(tableName)
    for (const record of records) {
      const row = flattenRecord(record, tableName)
      if (!isClosedOrGraded(row)) continue
      if (String(row['Archive Status'] || '').toLowerCase() === 'archived') continue

      const destinationTable = AIRTABLE_TABLES.resultsArchive
      const fields = archiveFields(withRecordKey(row))
      if (existingArchiveKeys.has(fields['Record Key'])) continue
      existingArchiveKeys.add(fields['Record Key'])
      createsByTable.set(destinationTable, [...(createsByTable.get(destinationTable) || []), fields])
      deletes.push({ tableName, recordId: record.id })
      archived.push({
        sourceTable: tableName,
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

  return { startedAt, finishedAt: new Date().toISOString(), archivedCount: archived.length, archived }
}

export default archiveClosedBets
