import {
  ACTIVE_AIRTABLE_TABLES,
  AIRTABLE_TABLES,
  listAirtableRecords,
  flattenRecord,
  logSyncAction
} from './airtableClient.js'
import { replaceSheetRows, logSheetSyncAction } from './googleSheetsClient.js'

const MIRROR_TABLES = [
  ...ACTIVE_AIRTABLE_TABLES,
  AIRTABLE_TABLES.websiteFeed,
  AIRTABLE_TABLES.resultsArchive,
  AIRTABLE_TABLES.propsResults,
  AIRTABLE_TABLES.lottoArchive,
  AIRTABLE_TABLES.longshotsHistory
]

export async function syncAirtableToSheets(options = {}) {
  const startedAt = new Date().toISOString()
  const summaries = []

  for (const tableName of MIRROR_TABLES) {
    const records = await listAirtableRecords(tableName)
    const rows = records.map(record => flattenRecord(record, tableName))
    const summary = options.dryRun
      ? { sheetName: tableName, rows: rows.length, dryRun: true }
      : await replaceSheetRows(tableName, rows, ['airtableRecordId', 'Date', 'League', 'Game', 'Pick', 'Odds', 'Units', 'Status', 'Result', 'Profit/Loss Units', 'Sync Status'])
    summaries.push(summary)
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

  return { startedAt, finishedAt: new Date().toISOString(), tables: summaries, totalRows }
}

export default syncAirtableToSheets
