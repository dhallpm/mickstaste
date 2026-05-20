import {
  AIRTABLE_TABLE_RESOLVERS,
  AIRTABLE_TABLES,
  listAirtableRecords,
  listAirtableRecordsFromResolvedTable,
  flattenRecord,
  logSyncAction
} from './airtableClient.js'
import { replaceSheetRows, logSheetSyncAction } from './googleSheetsClient.js'
import { withRecordKey } from './recordKey.js'

const MIRROR_MAP = [
  { resolver: AIRTABLE_TABLE_RESOLVERS.masterPicks, sheets: ['Active Picks', 'Website Feed'] },
  { resolver: AIRTABLE_TABLE_RESOLVERS.propsLab, sheets: ['Props Lab'] },
  { resolver: AIRTABLE_TABLE_RESOLVERS.lottoParlays, sheets: ['Lotto Props'] },
  { resolver: AIRTABLE_TABLE_RESOLVERS.longshots, sheets: ['Micks LongShots'] },
  { resolver: AIRTABLE_TABLE_RESOLVERS.resultsArchive, sheets: ['Results Archive'] },
  { airtable: AIRTABLE_TABLES.propsResults, sheets: ['Props Results'] },
  { airtable: AIRTABLE_TABLES.lottoArchive, sheets: ['Lotto Props'] },
  { airtable: AIRTABLE_TABLES.longshotsHistory, sheets: ['Longshots History'] },
  { airtable: AIRTABLE_TABLES.syncLog, sheets: ['Airtable Sync Log'] }
]

export async function syncAirtableToSheets(options = {}) {
  const startedAt = new Date().toISOString()
  const summaries = []
  const warnings = []

  for (const mapping of MIRROR_MAP) {
    let sourceTable = mapping.airtable
    let records = []

    try {
      if (mapping.resolver) {
        const resolved = await listAirtableRecordsFromResolvedTable(mapping.resolver)
        records = resolved.records
        sourceTable = resolved.tableName
        warnings.push(...resolved.warnings)
      } else {
        records = await listAirtableRecords(mapping.airtable)
      }
    } catch (error) {
      if (error.code !== 'AIRTABLE_RESOLVED_TABLE_NOT_FOUND') throw error
      warnings.push(...(error.warnings || []), `Skipped Airtable mirror for ${mapping.resolver.defaultName}; no alias table was found.`)
      continue
    }

    const rows = records.map(record => withRecordKey(flattenRecord(record, sourceTable)))
    for (const sheetName of mapping.sheets) {
      const summary = options.dryRun
        ? { sheetName, sourceTable, rows: rows.length, dryRun: true }
        : await replaceSheetRows(sheetName, rows, ['airtableRecordId', 'Record Key', 'Date', 'League', 'Game', 'Pick', 'Bet Type', 'Odds', 'Units', 'Status', 'Result', 'Profit/Loss Units', 'Sync Status'])
      summary.sourceTable = summary.sourceTable || sourceTable
      summaries.push(summary)
    }
  }

  const totalRows = summaries.reduce((sum, item) => sum + (item.rows || 0), 0)
  await logSyncAction('Airtable to Google Sheets mirror', {
    source: 'Airtable',
    destination: 'Google Sheets',
    count: totalRows,
    message: options.dryRun ? 'Dry run only' : 'Airtable mirrored to fallback sheets'
  })

  if (!options.dryRun) {
    await logSheetSyncAction('Airtable to Google Sheets mirror', {
      source: 'Airtable',
      count: totalRows,
      message: 'Airtable mirrored to fallback sheets'
    })
  }

  return { startedAt, finishedAt: new Date().toISOString(), warnings, tables: summaries, totalRows }
}

export default syncAirtableToSheets
