import {
  ACTIVE_AIRTABLE_TABLE_CONFIG,
  airtableWins,
  createAirtableRecords,
  listAirtableRecordsFromResolvedTable,
  updateAirtableRecords,
  flattenRecord,
  logSyncAction
} from './airtableClient.js'
import { getSheetRows } from './googleSheetsClient.js'
import { routePickCategory } from './routePickCategory.js'
import { buildRecordKey, withRecordKey } from './recordKey.js'

function identity(row = {}) {
  return String(row['Record Key'] || row.airtableRecordId || row['Airtable Record ID'] || row.Id || row.ID || buildRecordKey(row)).trim().toLowerCase()
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
  const resolvedActiveTableByDefault = new Map()
  const warnings = []
  for (const config of ACTIVE_AIRTABLE_TABLE_CONFIG) {
    try {
      const resolved = await listAirtableRecordsFromResolvedTable(config)
      const tableRows = resolved.records.map(record => ({ record, row: flattenRecord(record, resolved.tableName) }))
      airtableRowsByTable.set(resolved.tableName, tableRows)
      airtableRowsByTable.set(config.defaultName, tableRows)
      resolvedActiveTableByDefault.set(config.defaultName, resolved.tableName)
      warnings.push(...resolved.warnings)
    } catch (error) {
      if (error.code !== 'AIRTABLE_RESOLVED_TABLE_NOT_FOUND') throw error
      warnings.push(...(error.warnings || []), `Skipped fallback comparison for ${config.defaultName}; no alias table was found.`)
    }
  }

  const sheetRows = [
    ...(await getSheetRows('Active Picks').catch(() => [])),
    ...(await getSheetRows('Props Lab').catch(() => [])),
    ...(await getSheetRows('Lotto Props').catch(() => [])),
    ...(await getSheetRows('Micks LongShots').catch(() => [])),
    ...(await getSheetRows('Website Feed').catch(() => []))
  ].filter(shouldFallback).map(withRecordKey)

  const created = []
  const updated = []
  const updatesByTable = new Map()
  const createsByTable = new Map()

  for (const sheetRow of sheetRows) {
    const route = routePickCategory(sheetRow)
    const tableName = resolvedActiveTableByDefault.get(route.activeTable) || route.activeTable
    const existing = (airtableRowsByTable.get(tableName) || []).find(item => identity(item.row) === identity(sheetRow))
    if (existing) {
      const merged = airtableWins(existing.row, sheetRow)
      updatesByTable.set(tableName, [...(updatesByTable.get(tableName) || []), { id: existing.record.id, fields: merged }])
    } else {
      createsByTable.set(tableName, [...(createsByTable.get(tableName) || []), withRecordKey(sheetRow)])
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
    considered: sheetRows.length,
    warnings
  }
}

export default syncSheetsToAirtableFallback
