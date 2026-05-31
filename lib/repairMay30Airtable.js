import {
  AIRTABLE_TABLE_RESOLVERS,
  deleteAirtableRecord,
  flattenRecord,
  listAirtableRecordsFromResolvedTable,
  updateAirtableRecords
} from './airtableClient.js'
import { buildRecordKey } from './recordKey.js'

const TARGET_DATE = '2026-05-30'

const SAFE_5_LEGS = `1. Yankees Team Total Over 5.0
2. Spurs +3.5
3. Victor Wembanyama Over 9.5 Rebounds
4. Fever ML
5. Amanda Serrano ML`

const ULTRA_6_LEGS = `1. Yankees ML
2. Braves ML
3. Spurs +3.5
4. Victor Wembanyama 8+ Rebounds alt
5. Fever ML
6. Dmitry Bivol ML`

const STRAIGHT_RESULTS = new Map([
  ['spurs +3.5', 'Win'],
  ['yankees team total over 5.0', 'Loss'],
  ['dmitry bivol ml', 'Win'],
  ['braves ml', 'Win'],
  ['fever ml', 'Loss'],
  ['amanda serrano ml', 'Win'],
  ['yankees ml', 'Loss']
])

const ARCHIVE_REPAIRS = [
  {
    match: /safe 5-leg parlay/i,
    fields: {
      Pick: 'Safe 5-Leg Parlay',
      Grade: 'A-',
      Access: 'VIP',
      Legs: SAFE_5_LEGS,
      Result: 'Loss',
      'Profit/Loss': '-0.25u',
      'P/L': '-0.25u',
      'Profit/Loss Units': '-0.25u'
    }
  },
  {
    match: /ultra safe 6-leg parlay/i,
    fields: {
      Pick: 'Ultra Safe 6-Leg Parlay',
      Grade: 'B+',
      Access: 'VIP',
      Legs: ULTRA_6_LEGS,
      Result: 'Loss',
      'Profit/Loss': '-0.15u',
      'P/L': '-0.15u',
      'Profit/Loss Units': '-0.15u'
    }
  },
  {
    match: /shai gilgeous-alexander over 29\.5 points/i,
    fields: {
      Pick: 'Shai Gilgeous-Alexander Over 29.5 Points',
      Grade: 'B+',
      Access: 'VIP',
      Result: 'Win',
      'Profit/Loss': '+0.45u',
      'P/L': '+0.45u',
      'Profit/Loss Units': '+0.45u'
    }
  },
  {
    match: /victor wembanyama over 9\.5 rebounds/i,
    fields: {
      Pick: 'Victor Wembanyama Over 9.5 Rebounds',
      Grade: 'A-',
      Access: 'VIP',
      Result: 'Loss',
      'Profit/Loss': '-0.75u',
      'P/L': '-0.75u',
      'Profit/Loss Units': '-0.75u'
    }
  }
]

function text(value) {
  return String(value ?? '').trim()
}

function rowKey(row = {}) {
  return buildRecordKey(row)
}

function recordId(row = {}) {
  return row.airtableRecordId || row.id
}

function rowPick(row = {}) {
  return text(row.Pick || row.Selection || row.Play || row.Name).toLowerCase()
}

function isTargetDate(row = {}) {
  return text(row.Date || row.date || row['Game Date']).slice(0, 10) === TARGET_DATE
}

function archiveHaystack(row = {}) {
  return [row.Pick, row['Record Key'], row.Game, row['Original Table']].map(text).join(' ')
}

export function buildMay30RepairPlan(masterRows = [], archiveRows = []) {
  const byKey = new Map()
  for (const row of masterRows.filter(isTargetDate)) {
    const key = rowKey(row)
    if (!key) continue
    byKey.set(key, [...(byKey.get(key) || []), row])
  }

  const masterUpdates = []
  const duplicateDeletes = []
  for (const rows of byKey.values()) {
    const survivor = rows.find(row => text(row['Archive Status']).toLowerCase() === 'active') || rows[0]
    duplicateDeletes.push(...rows.filter(row => recordId(row) !== recordId(survivor)))
    const result = STRAIGHT_RESULTS.get(rowPick(survivor))
    if (!result) continue
    masterUpdates.push({
      id: recordId(survivor),
      pick: survivor.Pick,
      fields: {
        Result: result,
        Status: 'Closed',
        'Display Status': 'Closed',
        'Pick Status': 'Closed'
      }
    })
  }

  const archiveUpdates = []
  for (const repair of ARCHIVE_REPAIRS) {
    const row = archiveRows.find(candidate => repair.match.test(archiveHaystack(candidate)))
    if (!row) throw new Error(`Could not find existing Results Archive row for ${repair.fields.Pick}`)
    archiveUpdates.push({
      id: recordId(row),
      pick: repair.fields.Pick,
      fields: {
        ...repair.fields,
        Status: 'Closed',
        'Display Status': 'Closed',
        'Pick Status': 'Closed'
      }
    })
  }

  return { masterUpdates, duplicateDeletes, archiveUpdates }
}

export async function repairMay30Airtable(options = {}) {
  const warnings = []
  const master = await listAirtableRecordsFromResolvedTable(AIRTABLE_TABLE_RESOLVERS.masterPicks)
  const archive = await listAirtableRecordsFromResolvedTable(AIRTABLE_TABLE_RESOLVERS.resultsArchive)
  warnings.push(...master.warnings, ...archive.warnings)

  const plan = buildMay30RepairPlan(
    master.records.map(record => flattenRecord(record, master.tableName)),
    archive.records.map(record => flattenRecord(record, archive.tableName))
  )

  if (!options.dryRun) {
    await updateAirtableRecords(master.tableName, plan.masterUpdates, {
      baseId: master.baseId,
      typecast: true,
      warnings
    })
    await updateAirtableRecords(archive.tableName, plan.archiveUpdates, {
      baseId: archive.baseId,
      typecast: true,
      warnings
    })
    for (const row of plan.duplicateDeletes) {
      await deleteAirtableRecord(master.tableName, recordId(row))
    }
  }

  return {
    dryRun: Boolean(options.dryRun),
    created: 0,
    updatedMasterPicks: plan.masterUpdates.map(row => ({ id: row.id, pick: row.pick, result: row.fields.Result })),
    deletedDuplicates: plan.duplicateDeletes.map(row => ({ id: recordId(row), pick: row.Pick, recordKey: row['Record Key'] })),
    repairedArchiveRows: plan.archiveUpdates.map(row => ({ id: row.id, pick: row.pick })),
    warnings
  }
}

export default repairMay30Airtable
