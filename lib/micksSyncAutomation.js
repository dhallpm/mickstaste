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

const HAS_DEDICATED_LOTTO_PROPS_TABLE = Boolean(process.env.AIRTABLE_LOTTO_PROPS_TABLE_ID || process.env.AIRTABLE_LOTTO_PROPS_TABLE)

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
  ...(HAS_DEDICATED_LOTTO_PROPS_TABLE ? { 'Lotto Props': AIRTABLE_TABLE_RESOLVERS.lottoProps } : {}),
  Longshots: AIRTABLE_TABLE_RESOLVERS.longshots,
  'Results Archive': AIRTABLE_TABLE_RESOLVERS.resultsArchive
}

const SHEET_BY_TABLE = {
  'Master Picks': 'Active Picks',
  'Props Lab': 'Props Lab',
  'Lotto Parlays': 'Lotto Parlays',
  'Lotto Props': 'Lotto Props',
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
  'Lotto Props': [
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
  'Suggested Line', 'Missing Fields', 'Manual Odds Needed', 'Sportsbook Needed', 'Manual Odds',
  'Manual Sportsbook', 'Manual Line', 'Manual Confirmed', 'Manual Submitted', 'Manual Submit Time',
  'Release Approved', 'Implied Probability', 'Last Synced From Airtable', 'Last Synced From Google Sheets'
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

function pickValue(row, keys) {
  return String(text(row, keys) || '').trim()
}

export function isValidPickRow(row = {}) {
  const date = pickValue(row, ['Date', 'Game Date', 'date'])
  const game = pickValue(row, ['Game', 'Matchup', 'Event', 'game'])
  const pick = pickValue(row, ['Pick', 'Selection', 'Play', 'pick'])
  const odds = text(row, ['Odds', 'Price', 'American Odds', 'odds'])
  const market = pickValue(row, ['Sport', 'League', 'Bet Type', 'Type', 'Market', 'Category', 'sport', 'league', 'betType'])
  return Boolean(date && game && pick && odds !== '' && odds !== undefined && odds !== null && market)
}

function isManualReviewRow(row = {}) {
  const date = pickValue(row, ['Date', 'Game Date', 'date'])
  const game = pickValue(row, ['Game', 'Matchup', 'Event', 'game'])
  const pick = pickValue(row, ['Pick', 'Selection', 'Play', 'pick'])
  const market = pickValue(row, ['Sport', 'League', 'Bet Type', 'Type', 'Market', 'Category', 'sport', 'league', 'betType'])
  const manual = truthy(row['Manual Odds Needed']) ||
    truthy(row['Sportsbook Needed']) ||
    /manual review/i.test(String(row.Category || row.Access || row['Release Status'] || ''))
  return Boolean(manual && date && game && pick && market)
}

function isAmericanOdds(value) {
  return /^[+-]?\d{2,5}$/.test(String(value ?? '').trim())
}

function impliedProbabilityFromAmerican(value) {
  const odds = Number(String(value ?? '').trim())
  if (!Number.isFinite(odds) || odds === 0) return ''
  const probability = odds > 0 ? 100 / (odds + 100) : Math.abs(odds) / (Math.abs(odds) + 100)
  return Number((probability * 100).toFixed(2))
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

function appendTextBlock(current, lines = []) {
  const additions = lines.map(line => String(line || '').trim()).filter(Boolean)
  if (!additions.length) return current || ''
  const existing = String(current || '').trim()
  return [existing, ...additions].filter(Boolean).join('\n')
}

function manualReviewSummary(row = {}) {
  const suggestedLine = text(row, ['Suggested Line', 'Suggested Number', 'Line'])
  const missingFields = text(row, ['Missing Fields'])
  const manualOddsNeeded = truthy(row['Manual Odds Needed'])
  const sportsbookNeeded = truthy(row['Sportsbook Needed'])
  const lines = []
  if (suggestedLine) lines.push(`Suggested line: ${suggestedLine}`)
  if (missingFields) lines.push(`Missing manual fields: ${missingFields}`)
  if (manualOddsNeeded) lines.push('Manual odds needed before release.')
  if (sportsbookNeeded) lines.push('Sportsbook needed before release.')
  return lines
}

function applyManualReviewMapping(fields, row = {}) {
  const manualOdds = normalizeNumber(text(row, ['Manual Odds']))
  const manualSportsbook = text(row, ['Manual Sportsbook'])
  const manualLine = text(row, ['Manual Line'])
  const suggestedLine = text(row, ['Suggested Line', 'Suggested Number', 'Line'])
  const lines = manualReviewSummary(row)

  if (manualOdds !== '') fields.Odds = manualOdds
  if (manualSportsbook) fields.Sportsbook = manualSportsbook
  if (manualLine) fields['Best Number'] = manualLine
  else if (!fields['Best Number'] && suggestedLine) fields['Best Number'] = suggestedLine

  if (truthy(row['Release Approved'])) fields['Release Status'] = 'Released'
  if (lines.length) {
    fields['Market Notes'] = appendTextBlock(fields['Market Notes'], lines)
    fields['Full Analysis'] = appendTextBlock(fields['Full Analysis'], [
      'Manual review details:',
      ...lines
    ])
  }
}

function normalizeBaseRow(row = {}, sourceSheet = '') {
  const result = text(row, ['Result', 'Outcome', 'Grade'])
  const postedTime = text(row, ['Posted Time', 'Timestamp', 'Created At'])
  const fields = {
    'Record Key': normalizeRecordKey(row),
    Date: text(row, ['Date', 'Game Date']),
    'Posted Time': postedTime || (sourceSheet === 'Airtable Ingest' ? new Date().toISOString() : ''),
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
    'Suggested Line': text(row, ['Suggested Line', 'Suggested Number']),
    'Missing Fields': text(row, ['Missing Fields']),
    'Manual Odds Needed': truthy(row['Manual Odds Needed']),
    'Sportsbook Needed': truthy(row['Sportsbook Needed']),
    'Manual Odds': text(row, ['Manual Odds']),
    'Manual Sportsbook': text(row, ['Manual Sportsbook']),
    'Manual Line': text(row, ['Manual Line']),
    'Manual Confirmed': text(row, ['Manual Confirmed']),
    'Manual Submitted': truthy(row['Manual Submitted']),
    'Manual Submit Time': text(row, ['Manual Submit Time']),
    'Release Approved': truthy(row['Release Approved']),
    'Implied Probability': normalizeNumber(text(row, ['Implied Probability'])),
    'Last Synced From Airtable': sourceSheet === 'Airtable Ingest' ? new Date().toISOString() : '',
    'Last Synced From Google Sheets': sourceSheet === 'Airtable Ingest' ? '' : new Date().toISOString(),
    'Sync Status': text(row, ['Sync Status']) || 'Synced',
    'Needs Fallback': truthy(row['Needs Fallback'])
  }
  applyManualReviewMapping(fields, row)
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
  if (tableName === 'Lotto Parlays' || tableName === 'Lotto Props') {
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
  return isValidPickRow(row) && normalizeRecordKey(row) && !isClosedOrGraded(row)
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

  if (!options.backfill) {
    return {
      startedAt,
      finishedAt: new Date().toISOString(),
      created: 0,
      updated: 0,
      skipped: 0,
      considered: 0,
      errors,
      warnings: ['Sheets to Airtable is disabled by default. Use action=import-sheets-backfill or backfill=1 for manual historical import.'],
      syncBatchId,
      manualBackfillRequired: true
    }
  }

  const source = await loadSourceRows(options)
  warnings.push(...source.warnings)
  const validRows = source.rows.filter(isCurrentSyncCandidate)
  skipped += source.rows.length - validRows.length
  const candidates = validRows.map(row => ({ ...withRecordKey(row), 'Record Key': normalizeRecordKey(row) }))
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
        const createdRecords = await createAirtableRecords(resolved.tableName, creates, {
          baseId: resolved.baseId,
          typecast: true,
          warnings
        })
        const updatedRecords = await updateAirtableRecords(
          resolved.tableName,
          updates.map(item => ({ id: item.id, fields: item.fields })),
          { baseId: resolved.baseId, typecast: true, warnings }
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

function normalizeIngestPick(pick = {}, defaults = {}) {
  return {
    Date: pick.date || pick.Date || defaults.date || '',
    Sport: pick.sport || pick.Sport || '',
    League: pick.league || pick.League || pick.sport || pick.Sport || '',
    Game: pick.game || pick.Game || pick.matchup || pick.Matchup || '',
    Pick: pick.pick || pick.Pick || pick.selection || pick.Selection || '',
    'Bet Type': pick.betType || pick['Bet Type'] || pick.type || pick.Type || pick.market || pick.Market || '',
    Category: pick.category || pick.Category || '',
    Access: pick.access || pick.Access || 'Free',
    Odds: pick.odds ?? pick.Odds ?? '',
    Sportsbook: pick.sportsbook || pick.Sportsbook || pick.book || pick.Book || '',
    Units: pick.units ?? pick.Units ?? 1,
    Grade: pick.grade || pick.Grade || '',
    Confidence: pick.confidence ?? pick.Confidence ?? '',
    'EV Edge': pick.evEdge ?? pick['EV Edge'] ?? '',
    Status: pick.status || pick.Status || 'Active',
    'Release Status': pick.releaseStatus || pick['Release Status'] || 'Released',
    Result: pick.result || pick.Result || 'Pending',
    'Archive Status': pick.archiveStatus || pick['Archive Status'] || 'Active',
    Writeup: pick.writeup || pick.Writeup || '',
    'Full Analysis': pick.fullAnalysis || pick['Full Analysis'] || '',
    'Market Notes': pick.marketNotes || pick['Market Notes'] || '',
    'Injury Notes': pick.injuryNotes || pick['Injury Notes'] || '',
    'Source Verification': pick.sourceVerification || pick['Source Verification'] || '',
    Player: pick.player || pick.Player || '',
    Team: pick.team || pick.Team || '',
    Opponent: pick.opponent || pick.Opponent || '',
    'Prop Type': pick.propType || pick['Prop Type'] || '',
    Line: pick.line ?? pick.Line ?? '',
    Legs: pick.legs || pick.Legs || '',
    'Leg Count': pick.legCount ?? pick['Leg Count'] ?? '',
    'Parlay Type': pick.parlayType || pick['Parlay Type'] || '',
    'Longshot Type': pick.longshotType || pick['Longshot Type'] || '',
    'Suggested Line': pick.suggestedLine ?? pick['Suggested Line'] ?? '',
    'Missing Fields': Array.isArray(pick.missingFields)
      ? pick.missingFields.join(', ')
      : (pick['Missing Fields'] || pick.missingFields || ''),
    'Manual Odds Needed': pick.manualOddsNeeded ?? pick['Manual Odds Needed'] ?? false,
    'Sportsbook Needed': pick.sportsbookNeeded ?? pick['Sportsbook Needed'] ?? false,
    'Manual Odds': pick.manualOdds ?? pick['Manual Odds'] ?? '',
    'Manual Sportsbook': pick.manualSportsbook || pick['Manual Sportsbook'] || '',
    'Manual Line': pick.manualLine ?? pick['Manual Line'] ?? '',
    'Manual Confirmed': pick.manualConfirmed || pick['Manual Confirmed'] || '',
    'Manual Submitted': pick.manualSubmitted ?? pick['Manual Submitted'] ?? false,
    'Manual Submit Time': pick.manualSubmitTime || pick['Manual Submit Time'] || '',
    'Release Approved': pick.releaseApproved ?? pick['Release Approved'] ?? false,
    'Implied Probability': pick.impliedProbability ?? pick['Implied Probability'] ?? '',
    'Sync Status': pick.syncStatus || pick['Sync Status'] || 'Synced'
  }
}

export async function ingestPicksToAirtable(payload = {}, options = {}) {
  const startedAt = new Date().toISOString()
  const syncBatchId = `ingest-airtable-${Date.now()}`
  const warnings = []
  const errors = []
  const created = []
  const updated = []
  let skipped = 0

  const picks = Array.isArray(payload?.picks) ? payload.picks : []
  const normalized = picks.map(pick => normalizeIngestPick(pick, { date: payload.date }))
  const validRows = normalized.filter(row => isValidPickRow(row) || (options.allowManualReview && isManualReviewRow(row)))
  skipped += normalized.length - validRows.length

  if (!picks.length) warnings.push('No picks array was provided.')
  if (skipped) warnings.push(`Skipped ${skipped} blank or incomplete pick row(s).`)

  const rows = validRows.map(row => ({ ...withRecordKey(row), 'Record Key': normalizeRecordKey(row) }))
  const dedupedRows = Array.from(new Map(rows.map(row => [row['Record Key'], row])).values())
  skipped += rows.length - dedupedRows.length

  const rowsByTable = new Map()
  for (const row of dedupedRows) {
    const route = routePickCategory(row)
    rowsByTable.set(route.activeTable, [...(rowsByTable.get(route.activeTable) || []), row])
  }

  for (const [tableName, tableRows] of rowsByTable.entries()) {
    try {
      const resolved = await resolveWritableTable(tableName, warnings)
      const existingByKey = new Map(resolved.rows.map(row => [normalizeRecordKey(row), row]))
      const existingRecordByKey = new Map(resolved.records.map(record => [normalizeRecordKey(record.fields || {}), record]))
      const creates = []
      const updates = []

      for (const row of tableRows) {
        const key = normalizeRecordKey(row)
        const nextFields = fieldsForTable(row, tableName, 'Airtable Ingest')
        const existing = existingByKey.get(key)
        if (!existing) {
          creates.push(nextFields)
          continue
        }

        const merged = { ...existing, ...nextFields, 'Last Synced From Google Sheets': existing['Last Synced From Google Sheets'] || '' }
        const changed = changedFields(existing, merged)
        if (!changed.length) {
          skipped += 1
          continue
        }
        updates.push({ id: existingRecordByKey.get(key).id, fields: merged, changed })
      }

      if (!options.dryRun) {
        const createdRecords = await createAirtableRecords(resolved.tableName, creates, {
          baseId: resolved.baseId,
          typecast: true,
          warnings
        })
        const updatedRecords = await updateAirtableRecords(
          resolved.tableName,
          updates.map(item => ({ id: item.id, fields: item.fields })),
          { baseId: resolved.baseId, typecast: true, warnings }
        )
        created.push(...createdRecords.map(record => ({ table: tableName, id: record.id })))
        updated.push(...updatedRecords.map(record => ({ table: tableName, id: record.id })))
      } else {
        created.push(...creates.map(row => ({ table: tableName, recordKey: row['Record Key'], dryRun: true })))
        updated.push(...updates.map(row => ({ table: tableName, id: row.id, dryRun: true })))
      }

      await logSyncAction('Ingest picks to Airtable', {
        direction: 'ingest_to_airtable',
        source: 'Micks Picks Admin',
        destination: 'Airtable',
        table: tableName,
        count: creates.length + updates.length,
        status: 'Success',
        changedFields: `Created: ${creates.length}; Updated: ${updates.length}; Skipped: ${skipped}`,
        syncBatchId
      })
    } catch (error) {
      errors.push({ table: tableName, message: error.message })
      warnings.push(`Airtable ingest failed for ${tableName}: ${error.message}`)
    }
  }

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    created: created.length,
    updated: updated.length,
    skipped,
    considered: picks.length,
    errors,
    warnings,
    syncBatchId
  }
}

function manualReviewCandidate(row = {}) {
  return /manual review/i.test(String(row.Category || '')) ||
    /review/i.test(String(row.Grade || '')) ||
    /held/i.test(String(row['Release Status'] || ''))
}

function manualReleaseRequested(row = {}) {
  return /active/i.test(String(row.Status || '')) ||
    /released/i.test(String(row['Release Status'] || ''))
}

function manualCompletion(row = {}) {
  const odds = text(row, ['Odds'])
  const sportsbook = text(row, ['Sportsbook'])
  const line = text(row, ['Best Number', 'Line'])
  const source = text(row, ['Source Verification'])
  const errors = []
  if (!isAmericanOdds(odds)) errors.push('Odds must be numeric American odds.')
  if (!sportsbook) errors.push('Sportsbook is required.')
  if (!text(row, ['Game'])) errors.push('Game is required.')
  if (!text(row, ['Pick'])) errors.push('Pick is required.')
  if (!text(row, ['Bet Type'])) errors.push('Bet Type is required.')
  if (!source) errors.push('Source Verification is required.')
  if (!manualReleaseRequested(row)) errors.push('Status must be Active or Release Status must be Released.')
  return { odds, sportsbook, line, source, errors }
}

export async function submitManualPicks(options = {}) {
  const startedAt = new Date().toISOString()
  const syncBatchId = `submit-manual-${Date.now()}`
  const warnings = []
  const errors = []
  const released = []
  const normalized = []
  let skipped = 0

  const resolved = await resolveWritableTable('Master Picks', warnings)
  const candidates = resolved.records.filter(record => manualReviewCandidate(record.fields || {}))

  const updates = []
  for (const record of candidates) {
    const fields = record.fields || {}
    const completion = manualCompletion(fields)
    if (completion.errors.length) {
      skipped += 1
      warnings.push(`Skipped manual card ${fields['Record Key'] || record.id}: ${completion.errors.join(' ')}`)
      continue
    }

    const nextFields = {
      Odds: completion.odds,
      Sportsbook: completion.sportsbook,
      'Best Number': completion.line || fields['Best Number'] || '',
      'Source Verification': completion.source,
      'Implied Probability': impliedProbabilityFromAmerican(completion.odds),
      'Sync Status': 'Synced',
      Status: 'Active',
      'Release Status': 'Released',
      Result: fields.Result || 'Pending',
      'Archive Status': 'Active'
    }
    updates.push({ id: record.id, fields: nextFields })
    normalized.push({ id: record.id, recordKey: fields['Record Key'] || '', approved: true })
  }

  if (!options.dryRun && updates.length) {
    try {
      const updated = await updateAirtableRecords(resolved.tableName, updates, {
        baseId: resolved.baseId,
        typecast: true,
        warnings
      })
      for (const record of updated) released.push({ table: 'Master Picks', id: record.id })
    } catch (error) {
      errors.push({ table: 'Master Picks', message: error.message })
      warnings.push(`Manual pick submit failed: ${error.message}`)
    }
  } else if (options.dryRun) {
    released.push(...updates.map(update => ({ table: 'Master Picks', id: update.id, dryRun: true })))
  }

  let backup = { skipped: true, reason: 'No manual picks updated.' }
  if (!options.dryRun && !errors.length && updates.length) {
    backup = await syncAirtableOperatorToSheets({ dryRun: false })
    warnings.push(...(backup.warnings || []))
  }

  if (!options.dryRun) {
    await logSyncAction('Submit manual picks', {
      direction: 'airtable_manual_submit',
      source: 'Airtable Manual Review',
      destination: 'Airtable/Google Sheets',
      table: 'Master Picks',
      count: updates.length,
      status: errors.length ? 'Warning' : 'Success',
      changedFields: `Updated: ${updates.length}; Skipped: ${skipped}`,
      syncBatchId
    })
  }

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    success: errors.length === 0,
    considered: candidates.length,
    updated: updates.length,
    released: normalized.filter(item => item.approved).length,
    held: normalized.filter(item => !item.approved).length,
    skipped,
    errors,
    warnings,
    backup,
    syncBatchId
  }
}

export async function runMicksSync(options = {}) {
  const warnings = []
  const nextSteps = []
  const sheetsToAirtable = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    manualBackfillRequired: true,
    reason: 'Default run-sync is Airtable-first and does not import current picks from Google Sheets.'
  }

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

  if (airtableToSheets.errors.length) nextSteps.push('Review errors and confirm Airtable table IDs plus Google Sheets tab names.')
  nextSteps.push('Use action=ingest-picks with a validated picks payload to create today’s Airtable cards.')
  nextSteps.push('Use action=import-sheets-backfill&backfill=1 only for intentional historical/manual imports.')

  return {
    success: airtableToSheets.errors.length === 0,
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
