import {
  AIRTABLE_TABLE_RESOLVERS,
  listAirtableRecordsFromResolvedTable,
  updateAirtableRecords
} from './airtableClient.js'
import { normalizeUnitSize } from './unitSizing.js'
import { rowDateKey } from './routePickCategory.js'

function text(...values) {
  return values.map(value => String(value ?? '').trim()).find(Boolean) || ''
}

function sameNumber(left, right) {
  const a = Number(left)
  const b = Number(right)
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 0.0001
}

function pickName(row = {}) {
  return text(row.Pick, row.Selection, row.Play, row.Player, row.Game, row.Matchup)
}

export async function repairPropsUnits(options = {}) {
  const targetDate = String(options.date || '').trim()
  const result = await listAirtableRecordsFromResolvedTable(AIRTABLE_TABLE_RESOLVERS.propsLab)
  const updates = []
  const scanned = []

  for (const row of result.rows) {
    const date = rowDateKey(row)
    if (targetDate && date !== targetDate) continue
    const rawUnits = text(row.Units, row['Units to Commit'], row.Stake)
    if (!rawUnits) continue
    const normalized = normalizeUnitSize(rawUnits)
    if (normalized === '') continue

    scanned.push({
      recordId: row.airtableRecordId || row.id,
      date,
      pick: pickName(row),
      rawUnits,
      normalized
    })

    if (!sameNumber(rawUnits, normalized)) {
      updates.push({
        id: row.airtableRecordId || row.id,
        fields: { Units: normalized }
      })
    }
  }

  const updated = updates.length
    ? await updateAirtableRecords(result.tableName, updates, {
      baseId: result.baseId,
      typecast: true
    })
    : []

  return {
    table: result.tableName,
    date: targetDate || 'all',
    scannedCount: scanned.length,
    updatedCount: updated.length,
    scanned,
    updated: updates.map(update => ({ recordId: update.id, Units: update.fields.Units }))
  }
}

export default repairPropsUnits
