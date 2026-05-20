import {
  ACTIVE_AIRTABLE_TABLES,
  airtableWins,
  createAirtableRecords,
  listAirtableRecords,
  updateAirtableRecords,
  flattenRecord,
  logSyncAction
} from './airtableClient.js'
import { getSheetRows } from './googleSheetsClient.js'
import { routePickCategory } from './routePickCategory.js'

function identity(row = {}) {
  return String(row.airtableRecordId || row['Airtable Record ID'] || row.Id || row.ID || [
    row.Date || row.date,
    row.League || row.league,
    row.Game || row.game,
    row.Pick || row.pick
  ].join('|')).trim().toLowerCase()
}

function shouldFallback(row = {}) {
  return String(row['Sync Status'] || '').toLowerCase() === 'needs fallback' ||
    String(row['Allow Sheet Override'] || '').toLowerCase() === 'true' ||
    row['Allow Sheet Override'] === true
}

export async function syncSheetsToAirtableFallback(options = {}) {
  const startedAt = new Date().toISOString()
  if (!options.enableFallback) {
    await logSyncAction('Google Sheets fallback skipped', {
      source: 'Google Sheets',
      destination: 'Airtable',
      status: 'Skipped',
      message: 'Google Sheets never overwrites Airtable unless fallback is explicitly enabled'
    })
    return { startedAt, skipped: true, reason: 'Fallback not enabled' }
  }

  const airtableRowsByTable = new Map()
  for (const tableName of ACTIVE_AIRTABLE_TABLES) {
    const records = await listAirtableRecords(tableName)
    airtableRowsByTable.set(tableName, records.map(record => ({ record, row: flattenRecord(record, tableName) })))
  }

  const sheetRows = [
    ...(await getSheetRows('Active Picks').catch(() => [])),
    ...(await getSheetRows('Props Lab').catch(() => [])),
    ...(await getSheetRows('Lotto Parlays').catch(() => [])),
    ...(await getSheetRows('Longshots').catch(() => []))
  ].filter(shouldFallback)

  const created = []
  const updated = []
  const updatesByTable = new Map()
  const createsByTable = new Map()

  for (const sheetRow of sheetRows) {
    const route = routePickCategory(sheetRow)
    const tableName = route.activeTable
    const existing = (airtableRowsByTable.get(tableName) || []).find(item => identity(item.row) === identity(sheetRow))
    if (existing) {
      const merged = airtableWins(existing.row, sheetRow)
      updatesByTable.set(tableName, [...(updatesByTable.get(tableName) || []), { id: existing.record.id, fields: merged }])
    } else {
      createsByTable.set(tableName, [...(createsByTable.get(tableName) || []), sheetRow])
    }
  }

  for (const [tableName, rows] of updatesByTable.entries()) {
    if (!options.dryRun) updated.push(...await updateAirtableRecords(tableName, rows))
    else updated.push(...rows)
  }

  for (const [tableName, rows] of createsByTable.entries()) {
    if (!options.dryRun) created.push(...await createAirtableRecords(tableName, rows))
    else created.push(...rows)
  }

  await logSyncAction('Google Sheets fallback to Airtable', {
    source: 'Google Sheets',
    destination: 'Airtable',
    count: created.length + updated.length,
    message: options.dryRun ? 'Dry run only' : 'Only fallback-enabled rows were applied'
  })

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    created: created.length,
    updated: updated.length,
    considered: sheetRows.length
  }
}

export default syncSheetsToAirtableFallback
