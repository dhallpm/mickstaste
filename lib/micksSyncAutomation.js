import {
  AIRTABLE_TABLE_RESOLVERS,
  airtableWins,
  createAirtableRecords,
  listAirtableRecordsFromResolvedTable,
  logSyncAction,
  updateAirtableRecords
} from './airtableClient.js'
import { archiveClosedBets } from './archiveClosedBets.js'
import { calculateProfitLossUnits } from './calculateProfitLossUnits.js'
import { getSheetRows, logSheetSyncAction, upsertSheetRows } from './googleSheetsClient.js'
import { buildRecordKey, withRecordKey } from './recordKey.js'
import { isClosedOrGraded, routePickCategory } from './routePickCategory.js'

const SOURCE_TABS = [
  'Active Picks',
  'Free Picks',
  'VIP Picks',
  'Props Lab',
  'Lotto Props',
  'Lotto Parlays',
  'Micks LongShots',
  'Longshots'
]

const HISTORICAL_TABS = ['Results Archive']

const TABLE_CONFIG_BY_NAME = {
  'Master Picks': AIRTABLE_TABLE_RESOLVERS.masterPicks,
  'Props Lab': AIRTABLE_TABLE_RESOLVERS.propsLab,
  'Lotto Parlays': AIRTABLE_TABLE_RESOLVERS.lottoParlays,
  Longshots: AIRTABLE_TABLE_RESOLVERS.longshots,
  'Results Archive': AIRTABLE_TABLE_RESOLVERS.resultsArchive
}

const SHEET_BY_TABLE = {
  'Master Picks': 'Active Picks',
  'Props Lab': 'Props Lab',
  'Lotto Parlays': 'Lotto Parlays',
  Longshots: 'Micks LongShots',
  'Results Archive': 'Results Archive'
}

const FIELD_SETS = {
  'Master Picks': [
    'Record Key', 'Date', 'Posted Time', 'Sport', 'League', 'Game', 'Pick', 'Bet Type', 'Category', 'Access',
    'Odds', 'Sportsbook', 'Units', 'Grade', 'Confidence', 'EV Edge', 'Best Number', 'No Bet Cutoff', 'Status',
    'Release Status', 'Result', 'Profit/Loss', 'Closing Number', 'Verified Closing Number', 'Closing Source',
    'CLV', 'Market Notes', 'Injury Notes', 'Writeup', 'Full Analysis', 'Source Verification', 'Archive Status',
    'Last Synced From Airtable', 'Last Synced From Google Sheets', 'Sync Status', 'Needs Fallback'
  ],
  'Props Lab': [
    'Record Key', 'Date', 'Player', 'Team', 'Opponent', 'League', 'Game', 'Prop Type', 'Line', 'Odds',
    'Sportsbook', 'Units', 'Grade', 'Confidence', 'EV Edge', 'Status', 'Result', 'Profit/Loss', 'Injury Notes',
    'Market Notes', 'Full Analysis', 'Closing Number', 'Verified Closing Number', 'Closing Source',
    'Archive Status', 'Sync Status'
  ],
  'Lotto Parlays': [
    'Record Key', 'Date', 'Parlay Type', 'Leg Count', 'Legs', 'Odds', 'Sportsbook', 'Units', 'Grade',
    'Confidence', 'Status', 'Result', 'Profit/Loss', 'Full Analysis', 'Archive Status', 'Sync Status'
  ],
  Longshots: [
    'Record Key', 'Date', 'Sport', 'League', 'Longshot Type', 'Pick', 'Legs', 'Odds', 'Sportsbook', 'Units',
    'Grade', 'Confidence', 'Status', 'Result', 'Profit/Loss', 'Full Analysis', 'Archive Status', 'Sync Status'
  ],
  'Results Archive': [
    'Record Key', 'Original Table', 'Date', 'Sport', 'League', 'Game', 'Pick', 'Bet Type', 'Odds', 'Units',
    'Result', 'Profit/Loss', 'Closing Number', 'Verified Closing Number', 'CLV', 'Access', 'Source Verification',
    'Archive Timestamp', 'Notes', 'Sync Status'
  ]
}

const SHEET_HEADERS = [
  'Record Key', 'Date', 'Sport', 'League', 'Game', 'Pick', 'Bet Type', 'Category', 'Access', 'Odds',
  'Sportsbook', 'Units', 'Status', 'Release Status', 'Result', 'Profit/Loss', 'Closing Number',
  'Verified Closing Number', 'Closing Source', 'CLV', 'Market Notes', 'Injury Notes', 'Writeup',
  'Full Analysis', 'Source Verification', 'Archive Status', 'Sync Status', 'Needs Fallback',
  'Last Synced From Airtable', 'Last Synced From Google Sheets'
]

function text(row, keys) {
  return keys.map(key => row?.[key]).find(value => value !== undefined && value !== null && value !== '') || ''
}

function normalizeNumber(value) {
  if (value === undefined || value === null || value === '') return ''
  const number = Number(String(value).replace(/[^\d.+-]/g, ''))
  return Number.isFinite(number) ? number : ''
}

function truthy(value) {
  return value === true || ['true', 'yes', 'y', '1'].includes(String(value || '').trim().toLowerCase())
}

function normalizeRecordKey(row = {}) {
  return String(row['Record Key'] || buildRecordKey(row)).trim().replace(/\s+/g, ' ').toLowerCase()
}

function hasVerifiedClosing(row = {}) {
  return truthy(row['Verified Closing Number']) || truthy(row['Closing Verified']) || truthy(row['Verified Closing'])
}

function normalizeClosingFields(fields, sourceRow = {}) {
  const closingNumber = normalizeNumber(text(sourceRow, ['Closing Number', 'Close', 'Closing Line']))
  if (closingNumber !== '' && hasVerifiedClosing(sourceRow)) {
    fields['Closing Number'] = closingNumber
    fields['Verified Closing Number'] = true
    fields['Closing Source'] = text(sourceRow, ['Closing Source', 'Closing Book']) || fields['Closing Source'] || ''
    return
  }

  fields['Closing Number'] = ''
  fields['Verified Closing Number'] = false
  fields['Closing Source'] = fields['Closing Source'] || 'Needs Lookup'
  fields['Needs Fallback'] = true
}

function normalizeBaseRow(row = {}, sourceSheet = '') {
  const result = text(row, ['Result', 'Outcome', 'Grade'])
  const fields = {
    'Record Key': normalizeRecordKey(row),
    Date: text(row, ['Date', 'Game Date']),
    'Posted Time': text(row, ['Posted Time', 'Timestamp', 'Created At']),
    Sport: text(row, ['Sport']),
    League: text(row, ['League', 'Sport']),
    Game: text(row, ['Game', 'Matchup', 'Event']),
    Pick: text(row, ['Pick', 'Selection', 'Play']),
    'Bet Type': text(row, ['Bet Type', 'Type', 'Market']),
    Category: text(row, ['Category', 'Type']),
    Access: text(row, ['Access', 'Tier', 'Access Tier']) || (sourceSheet.includes('VIP') ? 'VIP' : 'Free'),
    Odds: normalizeNumber(text(row, ['Odds', 'Price', 'American Odds'])),
    Sportsbook: text(row, ['Sportsbook', 'Book', 'Card Sportsbook']),
    Units: normalizeNumber(text(row, ['Units', 'Units to Commit', 'Stake'])),
    Grade: text(row, ['Grade']),
    Confidence: normalizeNumber(text(row, ['Confidence'])),
    'EV Edge': normalizeNumber(text(row, ['EV Edge', 'EV'])),
    'Best Number': text(row, ['Best Number']),
    'No Bet Cutoff': text(row, ['No Bet Cutoff']),
    Status: text(row, ['Status', 'Pick Status', 'Display Status']) || 'Pregame',
    'Release Status': text(row, ['Release Status']) || 'Released',
    Result: result || 'Pending',
    'Profit/Loss': calculateProfitLossUnits({ ...row, Result: result }),
    CLV: normalizeNumber(text(row, ['CLV'])),
    'Market Notes': text(row, ['Market Notes', 'Market Note']),
    'Injury Notes': text(row, ['Injury Notes', 'Injury Note']),
    Writeup: text(row, ['Writeup', 'Card Description', 'Description']),
    'Full Analysis': text(row, ['Full Analysis', 'Analysis']),
    'Source Verification': text(row, ['Source Verification', 'Verified Source']),
    'Archive Status': text(row, ['Archive Status']) || (isClosedOrGraded(row) ? 'Needs Archive' : 'Active'),
    'Last Synced From Google Sheets': new Date().toISOString(),
    'Sync Status': text(row, ['Sync Status']) || 'Synced',
    'Needs Fallback': truthy(row['Needs Fallback'])
  }
  normalizeClosingFields(fields, row)
  return fields
}

function fieldsForTable(row = {}, tableName, sourceSheet = '') {
  const fields = normalizeBaseRow(row, sourceSheet)
  if (tableName === 'Props Lab') {
    fields.Player = text(row, ['Player', 'Athlete', 'Player Name'])
    fields.Team = text(row, ['Team'])
    fields.Opponent = text(row, ['Opponent'])
    fields['Prop Type'] = text(row, ['Prop Type', 'Market', 'Bet Type', 'Type'])
    fields.Line = text(row, ['Line', 'Number', 'Line / Number'])
  }
  if (tableName === 'Lotto Parlays') {
    fields['Parlay Type'] = text(row, ['Parlay Type', 'Category', 'Type']) || 'Lotto Parlay'
    fields['Leg Count'] = normalizeNumber(text(row, ['Leg Count', 'Legs Count', 'Legs']))
    fields.Legs = text(row, ['Legs', 'Pick', 'Selection'])
  }
  if (tableName === 'Longshots') {
    fields['Longshot Type'] = text(row, ['Longshot Type', 'Category', 'Type']) || 'Longshot'
    fields.Legs = text(row, ['Legs'])
  }
  if (tableName === 'Results Archive') {
    fields['Original Table'] = text(row, ['Original Table']) || sourceSheet
    fields['Archive Timestamp'] = text(row, ['Archive Timestamp']) || new Date().toISOString()
    fields.Notes = text(row, ['Notes', 'Market Notes', 'Writeup'])
  }

  return Object.fromEntries(
    FIELD_SETS[tableName]
      .map(field => [field, fields[field]])
      .filter(([, value]) => value !== undefined)
  )
}

function sameValue(left, right) {
  return String(left ?? '') === String(right ?? '')
}

function changedFields(existing = {}, next = {}) {
  return Object.keys(next).filter(key => !sameValue(existing[key], next[key]))
}

function isCurrentSyncCandidate(row = {}) {
  return normalizeRecordKey(row) && !isClosedOrGraded(row)
}

async function loadSourceRows(options = {}) {
  const tabs = options.backfill ? [...SOURCE_TABS, ...HISTORICAL_TABS] : SOURCE_TABS
  const rows = []
  const warnings = []

  for (const sheetName of tabs) {
    try {
      const sheetRows = await getSheetRows(sheetName)
      rows.push(...sheetRows.map(row => ({ ...row, __sourceSheet: sheetName })))
    } catch (error) {
      warnings.push(`Google Sheets tab ${sheetName} could not be read: ${error.message}`)
    }
  }

  return { rows, warnings }
}

async function resolveWritableTable(tableName, warnings) {
  const resolved = await listAirtableRecordsFromResolvedTable(TABLE_CONFIG_BY_NAME[tableName])
  warnings.push(...(resolved.warnings || []))
  return resolved
}

export async function syncSheetsToAirtable(options = {}) {
  const startedAt = new Date().toISOString()
  const syncBatchId = `sheets-airtable-${Date.now()}`
  const warnings = []
  const errors = []
  const created = []
  const updated = []
  let skipped = 0

  const source = await loadSourceRows(options)
  warnings.push(...source.warnings)
  const candidates = source.rows
    .filter(row => options.backfill || isCurrentSyncCandidate(row))
    .map(row => ({ ...withRecordKey(row), 'Record Key': normalizeRecordKey(row) }))
  const dedupedCandidates = Array.from(new Map(candidates.map(row => [row['Record Key'], row])).values())

  const rowsByTable = new Map()
  for (const row of dedupedCandidates) {
    const route = routePickCategory(row)
    const tableName = options.backfill && row.__sourceSheet === 'Results Archive'
      ? 'Results Archive'
      : route.activeTable
    rowsByTable.set(tableName, [...(rowsByTable.get(tableName) || []), row])
  }

  for (const [tableName, rows] of rowsByTable.entries()) {
    try {
      const resolved = await resolveWritableTable(tableName, warnings)
      const existingByKey = new Map(resolved.rows.map(row => [normalizeRecordKey(row), row]))
      const existingRecordByKey = new Map(resolved.records.map(record => [normalizeRecordKey(record.fields || {}), record]))
      const creates = []
      const updates = []

      for (const row of rows) {
        const key = normalizeRecordKey(row)
        const nextFields = fieldsForTable(row, tableName, row.__sourceSheet)
        const existing = existingByKey.get(key)
        if (!existing) {
          creates.push(nextFields)
          continue
        }

        const merged = airtableWins(existing, nextFields)
        const changed = changedFields(existing, merged)
        if (!changed.length) {
          skipped += 1
          continue
        }
        updates.push({ id: existingRecordByKey.get(key).id, fields: merged, changed })
      }

      if (!options.dryRun) {
        const createdRecords = await createAirtableRecords(resolved.tableName, creates, { baseId: resolved.baseId })
        const updatedRecords = await updateAirtableRecords(
          resolved.tableName,
          updates.map(item => ({ id: item.id, fields: item.fields })),
          { baseId: resolved.baseId }
        )
        created.push(...createdRecords.map(record => ({ table: tableName, id: record.id })))
        updated.push(...updatedRecords.map(record => ({ table: tableName, id: record.id })))
      } else {
        created.push(...creates.map(row => ({ table: tableName, recordKey: row['Record Key'], dryRun: true })))
        updated.push(...updates.map(row => ({ table: tableName, id: row.id, dryRun: true })))
      }

      await logSyncAction('Sheets to Airtable upsert', {
        direction: 'sheets_to_airtable',
        source: 'Google Sheets',
        destination: 'Airtable',
        table: tableName,
        count: creates.length + updates.length,
        status: 'Success',
        changedFields: `Created: ${creates.length}; Updated: ${updates.length}; Skipped: ${skipped}`,
        syncBatchId
      })
    } catch (error) {
      errors.push({ table: tableName, message: error.message })
      warnings.push(`Airtable write failed for ${tableName}; Google Sheets fallback remains active. ${error.message}`)
    }
  }

  if (!options.dryRun) {
    await logSheetSyncAction('Sheets to Airtable upsert', {
      source: 'Google Sheets',
      destination: 'Airtable',
      status: errors.length ? 'Warning' : 'Success',
      count: created.length + updated.length,
      message: `Created ${created.length}; updated ${updated.length}; skipped ${skipped}`
    }).catch(error => warnings.push(`Google Sheets sync log write failed: ${error.message}`))
  }

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    created: created.length,
    updated: updated.length,
    skipped,
    considered: dedupedCandidates.length,
    errors,
    warnings,
    syncBatchId
  }
}

export async function syncAirtableOperatorToSheets(options = {}) {
  const startedAt = new Date().toISOString()
  const syncBatchId = `airtable-sheets-${Date.now()}`
  const warnings = []
  const errors = []
  let updated = 0
  let skipped = 0
  const sheets = []

  for (const [tableName, config] of Object.entries(TABLE_CONFIG_BY_NAME)) {
    try {
      const resolved = await listAirtableRecordsFromResolvedTable(config)
      warnings.push(...(resolved.warnings || []))
      const rows = resolved.rows.map(row => {
        const keyed = withRecordKey(row)
        const profitLoss = calculateProfitLossUnits(keyed)
        return {
          ...keyed,
          'Record Key': normalizeRecordKey(keyed),
          'Profit/Loss': profitLoss || keyed['Profit/Loss'] || '',
          'Last Synced From Airtable': new Date().toISOString()
        }
      })

      const sheetName = SHEET_BY_TABLE[tableName]
      if (!rows.length) {
        skipped += 1
        continue
      }
      const summary = options.dryRun
        ? { sheetName, updated: rows.length, created: 0, rows: rows.length, dryRun: true }
        : await upsertSheetRows(sheetName, rows, SHEET_HEADERS)
      updated += (summary.updated || 0) + (summary.created || 0)
      sheets.push({ table: tableName, ...summary })

      await logSyncAction('Airtable to Sheets upsert', {
        direction: 'airtable_to_sheets',
        source: 'Airtable',
        destination: 'Google Sheets',
        table: tableName,
        count: (summary.updated || 0) + (summary.created || 0),
        status: 'Success',
        changedFields: `Updated: ${summary.updated || 0}; Created: ${summary.created || 0}`,
        syncBatchId
      })
    } catch (error) {
      errors.push({ table: tableName, message: error.message })
      warnings.push(`Airtable to Sheets skipped for ${tableName}: ${error.message}`)
    }
  }

  if (!options.dryRun) {
    await logSheetSyncAction('Airtable to Sheets upsert', {
      source: 'Airtable',
      destination: 'Google Sheets',
      status: errors.length ? 'Warning' : 'Success',
      count: updated,
      message: `Updated or created ${updated}; skipped ${skipped}`
    }).catch(error => warnings.push(`Google Sheets sync log write failed: ${error.message}`))
  }

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    updated,
    skipped,
    errors,
    warnings,
    sheets,
    syncBatchId
  }
}

export async function runMicksSync(options = {}) {
  const warnings = []
  const nextSteps = []
  const sheetsToAirtable = await syncSheetsToAirtable(options)
  warnings.push(...(sheetsToAirtable.warnings || []))

  let archiveResult = { skipped: true, reason: 'Archive worker unavailable' }
  try {
    archiveResult = await archiveClosedBets(options)
    warnings.push(...(archiveResult.warnings || []))
  } catch (error) {
    archiveResult = { skipped: true, error: error.message }
    warnings.push(`Archive/settlement worker skipped: ${error.message}`)
  }

  const airtableToSheets = await syncAirtableOperatorToSheets(options)
  warnings.push(...(airtableToSheets.warnings || []))

  if (sheetsToAirtable.errors.length || airtableToSheets.errors.length) {
    nextSteps.push('Review errors and confirm Airtable table IDs plus Google Sheets tab names.')
  }
  if (!sheetsToAirtable.created && !sheetsToAirtable.updated) {
    nextSteps.push('Confirm Google Sheets source tabs contain current/open picks with date, pick, odds, and units.')
  }

  return {
    success: sheetsToAirtable.errors.length === 0 && airtableToSheets.errors.length === 0,
    sourceOfTruth: 'airtable_operator_google_sheets_backend',
    sheetsToAirtable: {
      created: sheetsToAirtable.created,
      updated: sheetsToAirtable.updated,
      skipped: sheetsToAirtable.skipped,
      errors: sheetsToAirtable.errors
    },
    archiveResult,
    airtableToSheets: {
      updated: airtableToSheets.updated,
      skipped: airtableToSheets.skipped,
      errors: airtableToSheets.errors
    },
    warnings,
    nextSteps
  }
}

export default runMicksSync
