import {
  AIRTABLE_TABLES,
  listAirtableRecords,
  flattenRecord,
  logSyncAction
} from './airtableClient.js'
import { replaceSheetRows, logSheetSyncAction } from './googleSheetsClient.js'
import { withRecordKey } from './recordKey.js'

const MIRROR_MAP = [
  { airtable: AIRTABLE_TABLES.masterPicks, sheets: ['Active Picks', 'Website Feed'] },
  { airtable: AIRTABLE_TABLES.propsLab, sheets: ['Props Lab'] },
  { airtable: AIRTABLE_TABLES.lottoParlays, sheets: ['Lotto Props'] },
  { airtable: AIRTABLE_TABLES.longshots, sheets: ['Micks LongShots'] },
  { airtable: AIRTABLE_TABLES.resultsArchive, sheets: ['Results Archive'] },
  { airtable: AIRTABLE_TABLES.propsResults, sheets: ['Props Results'] },
  { airtable: AIRTABLE_TABLES.lottoArchive, sheets: ['Lotto Props'] },
  { airtable: AIRTABLE_TABLES.longshotsHistory, sheets: ['Longshots History'] },
  { airtable: AIRTABLE_TABLES.syncLog, sheets: ['Airtable Sync Log'] }
]

export async function syncAirtableToSheets(options = {}) {
  const startedAt = new Date().toISOString()
  const summaries = []

  for (const mapping of MIRROR_MAP) {
    const records = await listAirtableRecords(mapping.airtable)
    const rows = records.map(record => withRecordKey(flattenRecord(record, mapping.airtable)))
    for (const sheetName of mapping.sheets) {
      const summary = options.dryRun
        ? { sheetName, rows: rows.length, dryRun: true }
        : await replaceSheetRows(sheetName, rows, ['airtableRecordId', 'Record Key', 'Date', 'League', 'Game', 'Pick', 'Bet Type', 'Odds', 'Units', 'Status', 'Result', 'Profit/Loss Units', 'Sync Status'])
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

  return { startedAt, finishedAt: new Date().toISOString(), tables: summaries, totalRows }
}

export default syncAirtableToSheets
