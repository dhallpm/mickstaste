import { collectResultSourceUrls } from './settlement/resultSources.js'
import { discoverTrustedSourcesForPick } from './settlement/sourceDiscovery.js'
import { routeSettlementSources } from './settlement/sourceRouter.js'
import {
  googleSheetsSpreadsheetId,
  listAllGoogleSheetsPicksWithWarnings,
  updateSettlementFieldsInGoogleSheets
} from './googleSheetsPickStore.js'

const AIRTABLE_API_ROOT = 'https://api.airtable.com/v0'
const DEFAULT_BASE_ID = 'appsVhMax3qWQ1odj'

const TABLE_CONFIGS = {
  masterPicks: {
    label: 'Master Picks',
    table: () => process.env.AIRTABLE_MASTER_PICKS_TABLE_ID || process.env.AIRTABLE_MASTER_PICKS_TABLE || 'tblB0LZW6ATToi8tF'
  },
  propsLab: {
    label: 'Props Lab',
    table: () => process.env.AIRTABLE_PROPS_TABLE_ID || process.env.AIRTABLE_PROPS_TABLE || 'tblPdZG1sTbjD74mx'
  },
  lottoParlays: {
    label: 'Lotto Parlays',
    table: () => process.env.AIRTABLE_LOTTO_TABLE_ID || process.env.AIRTABLE_LOTTO_TABLE || 'tbllr4X5WVUxtmQyL'
  },
  longshots: {
    label: 'Longshots',
    table: () => process.env.AIRTABLE_LONGSHOTS_TABLE_ID || process.env.AIRTABLE_LONGSHOTS_TABLE || 'tblE2H2iiKoFqQXHl'
  }
}

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

function baseId() {
  return String(process.env.AIRTABLE_VERIFIED_BASE_ID || process.env.AIRTABLE_BASE_ID || DEFAULT_BASE_ID).trim()
}

function masterTable() {
  return TABLE_CONFIGS.masterPicks.table()
}

function tableIdFor(key) {
  return TABLE_CONFIGS[key]?.table?.() || key
}

export function todayEasternKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

export function requestedDateKey(value) {
  const raw = String(value || '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  if (raw) {
    const parsed = new Date(raw)
    if (!Number.isNaN(parsed.getTime())) return todayEasternKey(parsed)
  }
  return todayEasternKey()
}

function firstValue(row = {}, keys = []) {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') return value
  }
  return ''
}

function text(value) {
  return String(value ?? '').trim()
}

export function parseNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN
  const cleaned = String(value ?? '')
    .replace(/,/g, '')
    .match(/[+-]?\d+(?:\.\d+)?/)
  return cleaned ? Number(cleaned[0]) : NaN
}

export function parseAmericanOdds(value) {
  const parsed = parseNumber(value)
  return Number.isFinite(parsed) && parsed !== 0 ? parsed : NaN
}

export function americanToDecimal(odds) {
  const value = parseAmericanOdds(odds)
  if (!Number.isFinite(value)) return NaN
  return value > 0 ? 1 + value / 100 : 1 + 100 / Math.abs(value)
}

function rowDateKey(row = {}) {
  const value = firstValue(row, ['Date', 'date', 'Game Date', 'Posted Time', 'Timestamp'])
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(text(value))) return text(value).slice(0, 10)
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? text(value).slice(0, 10) : todayEasternKey(parsed)
}

function resultLabel(value) {
  const result = text(value).toLowerCase()
  if (/^(win|won|w)$/.test(result)) return 'Win'
  if (/^(loss|lost|l)$/.test(result)) return 'Loss'
  if (/^(push|no action)$/.test(result)) return 'Push'
  if (/^void$/.test(result)) return 'Void'
  if (/^(cancelled|canceled)$/.test(result)) return 'Cancelled'
  if (!result || /^pending$/.test(result)) return ''
  return ''
}

const SHEET_CONFIGS = {
  masterPicks: {
    label: 'Master Picks',
    sheetName: 'Master Picks'
  },
  propsLab: {
    label: 'Props Lab',
    sheetName: 'Props Lab'
  },
  lottoParlays: {
    label: 'Lotto Parlays',
    sheetName: 'Lotto Parlays'
  },
  longshots: {
    label: 'Longshots',
    sheetName: 'Longshots'
  }
}

function lineDirection(row = {}) {
  const value = [
    firstValue(row, ['Pick', 'Selection', 'Team', 'Side', 'Prop']),
    firstValue(row, ['Bet Type', 'Type', 'Market'])
  ].join(' ').toLowerCase()
  if (/\bover\b/.test(value)) return 'over'
  if (/\bunder\b/.test(value)) return 'under'
  if (/\bmoney\s*line\b|\bmoneyline\b|\bml\b/.test(value)) return 'moneyline'
  return ''
}

function isMoneylinePick(row = {}) {
  const value = [
    firstValue(row, ['Pick', 'Selection', 'Team', 'Side', 'Prop']),
    firstValue(row, ['Bet Type', 'Type', 'Market'])
  ].join(' ').toLowerCase()
  return /\bmoney\s*line\b|\bmoneyline\b|\bml\b/.test(value)
}

function clvField(decimalValue) {
  if (!Number.isFinite(decimalValue)) return {}
  return { '%CLV': Number(decimalValue.toFixed(4)) }
}

function isParlayRow(row = {}) {
  const pick = firstValue(row, ['Pick', 'Selection', 'Play'])
  const value = [
    pick,
    firstValue(row, ['Bet Type', 'Type', 'Market']),
    firstValue(row, ['Category']),
    firstValue(row, ['Legs', 'Parlay Group'])
  ].join(' ').toLowerCase()
  return /\bparlay\b|\blotto\b|\blegs?\b|\|/.test(value) || text(pick).split(/\s+\+\s+(?=[A-Z])/).filter(Boolean).length >= 2
}

function splitPlusParlayLegs(row = {}) {
  const pick = firstValue(row, ['Pick', 'Selection', 'Play'])
  return text(pick).split(/\s+\+\s+(?=[A-Z])/).map(leg => text(leg)).filter(Boolean)
}

function normalizedLegText(value = '') {
  return text(value).toLowerCase().replace(/[^a-z0-9.+-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function sameLegText(left = '', right = '') {
  const a = normalizedLegText(left)
  const b = normalizedLegText(right)
  return Boolean(a && b && (a === b || a.includes(b) || b.includes(a)))
}

async function discoverSourcesFromSheetLegRows(row = {}, allRows = [], date = '', options = {}) {
  const legs = splitPlusParlayLegs(row)
  if (legs.length < 2) return null
  const sourceTextByUrl = {}
  const discoveredSources = []
  const urls = []
  for (const leg of legs) {
    const match = allRows.find(candidateRecord => {
      const candidate = recordFields(candidateRecord)
      if (candidate === row || rowDateKey(candidate) !== date) return false
      const candidatePick = firstValue(candidate, ['Pick', 'Selection', 'Play'])
      const fullParlayPick = firstValue(row, ['Pick', 'Selection', 'Play'])
      return candidatePick && !sameLegText(candidatePick, fullParlayPick) && sameLegText(candidatePick, leg)
    })
    if (!match) continue
    const discovery = await discoverTrustedSourcesForPick(recordFields(match), options)
    for (const url of discovery.urls || []) {
      if (!urls.includes(url)) urls.push(url)
      if (discovery.sourceTextByUrl?.[url]) sourceTextByUrl[url] = discovery.sourceTextByUrl[url]
    }
    discoveredSources.push(...(discovery.discoveredSources || []).map(source => ({ ...source, leg, discoveryMethod: source.discoveryMethod || 'same-date-leg-row' })))
  }
  return urls.length
    ? {
        urls,
        sourceTextByUrl,
        discoveredSources,
        notes: `Discovered ${urls.length} trusted result source${urls.length === 1 ? '' : 's'} from same-date parlay leg rows.`
      }
    : null
}

function sourceDescriptor(verification = {}, fallback = '') {
  const name = text(verification.sourceName)
  const url = text(verification.sourceUrl)
  if (name && url) return `${name} ${url}`
  if (name) return name
  if (url) return url
  return fallback
}

function settlementAuditFields(row = {}, verification = {}) {
  const source = sourceDescriptor(
    verification,
    firstValue(row, ['Settlement Source', 'Result Source', 'Source Verification']) || 'Manual Result/Outcome field'
  )
  return {
    'Settlement Source': source,
    'Settlement Status': verification.status === 'needs_review' ? 'Needs Review' : 'Settled',
    'Settlement Notes': text(verification.notes) || 'Existing Result/Outcome field was used for settlement.'
  }
}

function needsReviewFields(verification = {}, now = new Date()) {
  return {
    'Settlement Source': sourceDescriptor(verification, 'Trusted result source unavailable'),
    'Settlement Status': 'Needs Review',
    'Settlement Notes': text(verification.notes) || 'No trusted source confirmed the needed result.',
    'Settled At': now.toISOString()
  }
}

function canAttemptSourceSettlement(row = {}, settleAll = false) {
  return settleAll || collectResultSourceUrls(row).length > 0
}

function isOfficialBet(row = {}) {
  const value = text(firstValue(row, ['Official Bet', 'Official', 'Official Play', 'Official?', 'Is Official']))
  return /^(yes|true|1|official)$/i.test(value)
}

function unitsAreBlankOrZero(row = {}) {
  const value = firstValue(row, ['Units', 'Units to Commit', 'Stake'])
  const units = parseNumber(value)
  return !Number.isFinite(units) || units <= 0
}

function isBlankSettlementRow(row = {}) {
  const pick = firstValue(row, ['Pick', 'Selection', 'Play', 'Prop', 'Player'])
  const game = firstValue(row, ['Game', 'Matchup', 'Event'])
  const result = firstValue(row, ['Result', 'Outcome'])
  return !text(pick) && !text(game) && unitsAreBlankOrZero(row) && !text(result)
}

function isWatchlistOrPassRow(row = {}) {
  const value = [
    firstValue(row, ['Category']),
    firstValue(row, ['Status', 'Display Status', 'Pick Status']),
    firstValue(row, ['Release Status']),
    firstValue(row, ['Pick', 'Selection', 'Play'])
  ].join(' ').toLowerCase()
  return /\bwatchlist\b|\bfree\s+watchlist\b|\bpass\b|\bno\s+release\b/.test(value)
}

function shouldSkipNonOfficialRow(row = {}) {
  return unitsAreBlankOrZero(row) && !isOfficialBet(row) && isWatchlistOrPassRow(row)
}

function recordFields(record = {}) {
  return record.fields || record || {}
}

function recordSheetName(record = {}, fallback = '') {
  const fields = recordFields(record)
  return text(fields.__sheetName || fields.__table || record.sheetName || fallback)
}

function recordSheetRowNumber(record = {}) {
  const fields = recordFields(record)
  const value = Number(fields.__rowNumber || record.sheetRowNumber)
  return Number.isFinite(value) ? value : 0
}

function recordId(record = {}) {
  const fields = recordFields(record)
  const sheetName = recordSheetName(record)
  const rowNumber = recordSheetRowNumber(record)
  return record.id || fields.id || (sheetName && rowNumber ? `sheets:${sheetName}:${rowNumber}` : '')
}

function safeGoogleSheetsSpreadsheetId(fallback = '') {
  try {
    return googleSheetsSpreadsheetId()
  } catch {
    return fallback
  }
}

function skippedRecord(record, fields, reason, options = {}) {
  const sheetName = recordSheetName(record)
  const sheetRowNumber = recordSheetRowNumber(record)
  return {
    id: recordId(record),
    source: sheetName ? 'google-sheets' : undefined,
    sourceOfTruth: sheetName ? 'Google Sheets' : undefined,
    spreadsheetId: sheetName ? safeGoogleSheetsSpreadsheetId(options.spreadsheetId) : undefined,
    sheetName: sheetName || undefined,
    sheetRowNumber: sheetRowNumber || undefined,
    date: rowDateKey(fields),
    result: firstValue(fields, ['Result', 'Outcome']) || '',
    pick: firstValue(fields, ['Pick', 'Selection', 'Game', 'Prop', 'Player']),
    reason
  }
}

function discoveredSourceSummary(discovery = {}) {
  return (discovery.discoveredSources || []).map(source => ({
    sourceName: source.sourceName,
    sourceUrl: source.sourceUrl,
    priority: source.priority,
    discoveryMethod: source.discoveryMethod || 'auto',
    notes: source.notes || ''
  }))
}

function plannedSettlementFields(fields = {}, discovery = {}, verification = {}) {
  return {
    discoveredSources: discoveredSourceSummary(discovery),
    verificationStatus: verification.status || '',
    plannedResult: fields.Result || '',
    plannedOutcome: fields.Outcome || '',
    plannedProfitLoss: fields['Profit/Loss'] ?? '',
    plannedSettlementStatus: fields['Settlement Status'] || '',
    plannedSettlementNotes: fields['Settlement Notes'] || ''
  }
}

export function calculateClvFields(row = {}) {
  const direction = lineDirection(row)
  const moneyline = direction === 'moneyline' || isMoneylinePick(row)
  const postedNumber = parseNumber(firstValue(row, ['Closing Number']))
  const verifiedClosingNumber = parseNumber(firstValue(row, ['Verified Closing Number']))
  const postedOdds = parseAmericanOdds(firstValue(row, ['Odds', 'Posted Odds', 'American Odds']))
  const closingOdds = parseAmericanOdds(firstValue(row, ['Closing Odds', 'Closing Price']))

  if (moneyline) {
    if (Number.isFinite(postedOdds) && Number.isFinite(closingOdds)) {
      const postedDecimal = americanToDecimal(postedOdds)
      const closingDecimal = americanToDecimal(closingOdds)
      if (Number.isFinite(postedDecimal) && Number.isFinite(closingDecimal) && closingDecimal > 0) {
        return { fields: clvField((postedDecimal / closingDecimal) - 1), reason: 'moneyline odds' }
      }
    }
    return { fields: {}, reason: 'moneyline needs Odds and Closing Odds' }
  }

  if (Number.isFinite(verifiedClosingNumber) && Number.isFinite(postedNumber)) {
    if (Math.abs(verifiedClosingNumber) >= 100 && Math.abs(postedNumber) < 50) {
      return { fields: {}, reason: 'closing odds appear to be entered in Verified Closing Number field' }
    }
    if (postedNumber === 0) {
      return { fields: {}, reason: 'Closing Number cannot be zero for percent CLV' }
    }

    let pointValue
    if (direction === 'over') pointValue = verifiedClosingNumber - postedNumber
    else if (direction === 'under') pointValue = postedNumber - verifiedClosingNumber
    else if (postedNumber < 0 || verifiedClosingNumber < 0) pointValue = Math.abs(verifiedClosingNumber) - Math.abs(postedNumber)
    else if (postedNumber > 0 || verifiedClosingNumber > 0) pointValue = postedNumber - verifiedClosingNumber
    else pointValue = verifiedClosingNumber - postedNumber

    const denominator = Math.abs(postedNumber)
    if (!Number.isFinite(denominator) || denominator === 0) {
      return { fields: {}, reason: 'Invalid Closing Number for percent CLV' }
    }

    return { fields: clvField(pointValue / denominator), reason: 'line percent' }
  }

  return { fields: {}, reason: 'insufficient' }
}

export function calculateSettlementFields(row = {}, now = new Date(), options = {}) {
  const verification = options.verification || {}
  const result = resultLabel(firstValue(row, ['Result', 'Outcome'])) || resultLabel(verification.result)
  if (!result) return { fields: {}, skipped: true, reason: 'Pending or unsupported result' }

  const units = parseNumber(firstValue(row, ['Units', 'Units to Commit', 'Stake']))
  const odds = parseAmericanOdds(firstValue(row, ['Odds', 'Posted Odds', 'American Odds']))
  if (!Number.isFinite(units) || units <= 0) return { fields: {}, skipped: true, reason: 'Missing units' }

  let profitLoss
  let roi
  let profitPendingMissingOdds = false
  if (result === 'Win') {
    if (!Number.isFinite(odds)) {
      if (!isParlayRow(row)) return { fields: {}, skipped: true, reason: 'Missing odds for win settlement' }
      profitPendingMissingOdds = true
      profitLoss = ''
      roi = ''
    } else {
      profitLoss = odds > 0 ? units * odds / 100 : units * 100 / Math.abs(odds)
      roi = Number(((profitLoss / units) * 100).toFixed(2))
    }
  } else if (result === 'Loss') {
    profitLoss = -units
    roi = Number(((profitLoss / units) * 100).toFixed(2))
  } else {
    profitLoss = 0
    roi = 0
  }

  const profitLossField = typeof profitLoss === 'number'
    ? Number(profitLoss.toFixed(2))
    : profitLoss

  const auditFields = settlementAuditFields(row, verification)
  if (profitPendingMissingOdds) {
    auditFields['Settlement Status'] = 'Profit Pending - Missing Odds'
    auditFields['Settlement Notes'] = `${auditFields['Settlement Notes']} Profit pending because parlay odds are missing or invalid.`
  }

  return {
    fields: {
      Result: result,
      Outcome: result,
      Status: 'Closed',
      'Profit/Loss': profitLossField,
      ROI: roi,
      'Settled At': now.toISOString(),
      ...auditFields
    },
    skipped: false,
    reason: result
  }
}

async function listRecordsForTable(tableId) {
  const records = []
  let offset
  do {
    const url = new URL(`${AIRTABLE_API_ROOT}/${baseId()}/${encodeURIComponent(tableId)}`)
    url.searchParams.set('pageSize', '100')
    if (offset) url.searchParams.set('offset', offset)
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${requiredEnv('AIRTABLE_API_KEY')}`,
        'Content-Type': 'application/json'
      }
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      const message = payload?.error?.message || payload?.error?.type || response.statusText
      throw new Error(`Airtable table ${tableId} ${response.status}: ${message}`)
    }
    records.push(...(payload.records || []))
    offset = payload.offset
  } while (offset)
  return records
}

async function listMasterRecords() {
  return listRecordsForTable(masterTable())
}

function rejectedField(payload = {}) {
  const message = String(payload?.error?.message || payload?.error?.type || payload?.error || '')
  return message.match(/field\s+name:\s*"([^"]+)"/i)?.[1] ||
    message.match(/field\s+"([^"]+)"/i)?.[1] ||
    message.match(/Unknown field name:\s*"([^"]+)"/i)?.[1] ||
    ''
}

function removeField(records, fieldName) {
  let removed = false
  const next = records.map(record => {
    if (!Object.hasOwn(record.fields || {}, fieldName)) return record
    const fields = { ...record.fields }
    delete fields[fieldName]
    removed = true
    return { ...record, fields }
  }).filter(record => Object.keys(record.fields || {}).length)
  return { records: next, removed }
}

async function patchRecordsForTable(tableId, records = [], warnings = []) {
  const updated = []
  for (const record of records) {
    let body = { records: [record], typecast: true }
    const removed = new Set()

    while (body.records.length) {
      const response = await fetch(`${AIRTABLE_API_ROOT}/${baseId()}/${encodeURIComponent(tableId)}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${requiredEnv('AIRTABLE_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })
      const payload = await response.json().catch(() => ({}))
      if (response.ok) {
        updated.push(...(payload.records || []))
        for (const fieldName of removed) warnings.push(`Airtable rejected ${fieldName} on ${tableId}; retried without it.`)
        break
      }

      const fieldName = rejectedField(payload)
      if (!fieldName || removed.has(fieldName) || removed.size >= 20) {
        warnings.push(`Could not patch ${record.id} in ${tableId}: ${payload?.error?.message || payload?.error?.type || response.statusText}`)
        break
      }
      const next = removeField(body.records, fieldName)
      if (!next.removed) {
        warnings.push(`Airtable rejected ${fieldName} on ${tableId}, but it was not in payload for ${record.id}.`)
        break
      }
      removed.add(fieldName)
      body = { records: next.records, typecast: true }
    }

    if (!body.records.length && removed.size) {
      for (const fieldName of removed) warnings.push(`Airtable rejected ${fieldName}; no remaining fields were available to patch record ${record.id} in ${tableId}.`)
    }
  }
  return updated
}

async function patchMasterRecords(records = [], warnings = []) {
  return patchRecordsForTable(masterTable(), records, warnings)
}

function writeMetadata(writeResult = {}) {
  if (!writeResult || !Object.keys(writeResult).length) return {}
  return {
    spreadsheetId: writeResult.spreadsheetId,
    sheetName: writeResult.sheetName,
    sheetRowNumber: writeResult.sheetRowNumber,
    updatedRange: writeResult.updatedRange,
    updatedRanges: writeResult.updatedRanges || [],
    updatedCells: writeResult.updatedCells,
    addedHeaders: writeResult.addedHeaders || []
  }
}

function publicRecord(record, fields, extra = {}) {
  const sourceFields = recordFields(record)
  const sheetName = recordSheetName(record, extra.sheetName)
  const sheetRowNumber = recordSheetRowNumber(record) || Number(extra.sheetRowNumber) || 0
  const isSheetsRecord = Boolean(sheetName && sheetRowNumber)
  const { writeResult, ...rest } = extra
  const spreadsheetId = writeResult?.spreadsheetId || rest.spreadsheetId || safeGoogleSheetsSpreadsheetId()
  return {
    id: recordId(record),
    ...(isSheetsRecord
      ? {
          source: 'google-sheets',
          sourceOfTruth: 'Google Sheets',
          spreadsheetId,
          sheetName,
          sheetRowNumber
        }
      : {}),
    pick: firstValue(sourceFields, ['Pick', 'Selection', 'Game', 'Prop', 'Player']),
    fields,
    date: rowDateKey(sourceFields),
    result: firstValue(sourceFields, ['Result', 'Outcome']),
    ...writeMetadata(writeResult),
    ...rest
  }
}

export async function recalculateClv(options = {}) {
  const date = requestedDateKey(options.date)
  const warnings = []
  const records = await listMasterRecords()
  const matched = []
  const skipped = []

  for (const record of records) {
    const fields = record.fields || {}
    if (rowDateKey(fields) !== date) continue
    const hasClosing = (text(firstValue(fields, ['Closing Number'])) && text(firstValue(fields, ['Verified Closing Number']))) ||
      text(firstValue(fields, ['Closing Odds', 'Closing Price']))
    if (!hasClosing) {
      skipped.push({ id: record.id, date: rowDateKey(fields), reason: 'No line pair or Closing Odds' })
      continue
    }
    const calculated = calculateClvFields(fields)
    if (!Object.keys(calculated.fields).length) {
      skipped.push({ id: record.id, date: rowDateKey(fields), reason: calculated.reason })
      continue
    }
    matched.push({ record, fields: calculated.fields, reason: calculated.reason })
  }

  const updates = matched.map(item => ({ id: item.record.id, fields: item.fields }))
  const updated = options.dryRun ? [] : await patchMasterRecords(updates, warnings)

  return {
    success: true,
    date,
    table: masterTable(),
    dryRun: Boolean(options.dryRun),
    scanned: records.length,
    matched: matched.length,
    updated: options.dryRun ? 0 : updated.length,
    skipped: skipped.length,
    warnings,
    records: matched.map(item => publicRecord(item.record, item.fields, { reason: item.reason })),
    skippedRecords: skipped
  }
}

function dateMatches(recordDate, requestedDate, settleEveryDate) {
  return settleEveryDate || recordDate === requestedDate
}

async function writeSettlementItems(items = [], options = {}) {
  const warnings = []
  const writeResults = []

  for (const item of items) {
    const sheetName = recordSheetName(item.record)
    const rowNumber = recordSheetRowNumber(item.record)
    if (!sheetName || !rowNumber) {
      const result = {
        ok: false,
        source: 'google-sheets',
        sourceOfTruth: 'Google Sheets',
        spreadsheetId: safeGoogleSheetsSpreadsheetId(options.spreadsheetId),
        sheetName,
        sheetRowNumber: rowNumber,
        updatedRange: '',
        updatedRanges: [],
        updatedCells: 0,
        error: `Missing Google Sheets row location for ${recordId(item.record) || item.reason || 'settlement row'}.`
      }
      item.writeResult = result
      writeResults.push(result)
      warnings.push(result.error)
      continue
    }

    try {
      const result = await updateSettlementFieldsInGoogleSheets({
        sheetName,
        rowNumber,
        fields: item.fields
      }, options)
      item.writeResult = result
      writeResults.push(result)
      if (!result.ok && result.error) warnings.push(result.error)
    } catch (error) {
      const result = {
        ok: false,
        source: 'google-sheets',
        sourceOfTruth: 'Google Sheets',
        spreadsheetId: safeGoogleSheetsSpreadsheetId(options.spreadsheetId),
        sheetName,
        sheetRowNumber: rowNumber,
        updatedRange: '',
        updatedRanges: [],
        updatedCells: 0,
        error: `Google Sheets update failed for ${sheetName} row ${rowNumber}: ${error.message || String(error)}`
      }
      item.writeResult = result
      writeResults.push(result)
      warnings.push(result.error)
    }
  }

  return {
    writeResults,
    warnings,
    updated: options.dryRun ? 0 : writeResults.filter(result => result.ok).length
  }
}

async function settleTable(key, config, allRows, date, now, options = {}) {
  const warnings = []
  const records = allRows.filter(record => recordSheetName(record) === config.sheetName)
  const matched = []
  const needsReview = []
  const skipped = []
  const availableDates = new Set()
  const resultCounts = {}
  const settleAll = Boolean(options.settleAll)
  const settleEveryDate = Boolean(options.settleEveryDate)

  for (const record of records) {
    const fields = recordFields(record)
    const recordDate = rowDateKey(fields)
    if (recordDate) availableDates.add(recordDate)
    const rawResult = text(firstValue(fields, ['Result', 'Outcome']))
    if (rawResult) resultCounts[rawResult] = (resultCounts[rawResult] || 0) + 1

    if (!dateMatches(recordDate, date, settleEveryDate)) continue
    if (!rawResult || /^pending$/i.test(rawResult)) {
      if (isBlankSettlementRow(fields)) {
        skipped.push(skippedRecord(record, fields, 'Skipped blank row: Pick and Game are blank or missing, Units is blank/0, and Result is blank.', options))
        continue
      }

      if (shouldSkipNonOfficialRow(fields)) {
        skipped.push(skippedRecord(record, fields, 'Skipped non-official watchlist/pass row.', options))
        continue
      }

      const sourceUrls = collectResultSourceUrls(fields)
      if (!canAttemptSourceSettlement(fields, settleAll)) {
        skipped.push(skippedRecord(record, fields, 'Pending or blank Result and no result source URL', options))
        continue
      }

      let discovery = await discoverTrustedSourcesForPick(fields, options)
      if (!discovery.urls?.length && isParlayRow(fields)) {
        discovery = await discoverSourcesFromSheetLegRows(fields, allRows, date, options) || discovery
      }
      const discoveredUrls = discovery.urls?.length ? discovery.urls : sourceUrls

      if (!discoveredUrls.length) {
        const review = {
          status: 'needs_review',
          sourceName: '',
          sourceUrl: '',
          notes: discovery.notes || 'No trusted result source found.',
          providerResults: []
        }
        const reviewFields = needsReviewFields(review, now)
        needsReview.push({
          record,
          fields: reviewFields,
          reason: review.notes,
          discovery,
          verification: review
        })
        continue
      }

      const routed = await routeSettlementSources(fields, {
        ...options,
        urls: discoveredUrls,
        sourceTextByUrl: {
          ...(options.sourceTextByUrl || {}),
          ...(discovery.sourceTextByUrl || {})
        }
      })
      if (routed.status !== 'verified' || !routed.result) {
        needsReview.push({
          record,
          fields: needsReviewFields(routed, now),
          reason: routed.notes,
          discovery,
          verification: routed
        })
        continue
      }

      const calculated = calculateSettlementFields(fields, now, {
        verification: { ...routed, status: 'verified' }
      })
      if (calculated.skipped) {
        const review = {
          ...routed,
          status: 'needs_review',
          notes: `${routed.notes} Settlement calculation blocked: ${calculated.reason}.`
        }
        needsReview.push({
          record,
          fields: needsReviewFields(review, now),
          reason: review.notes,
          discovery,
          verification: review
        })
        continue
      }
      matched.push({ record, fields: calculated.fields, reason: calculated.reason, discovery, verification: routed })
      continue
    }
    const calculated = calculateSettlementFields(fields, now)
    if (calculated.skipped) {
      skipped.push(skippedRecord(record, fields, calculated.reason, options))
      continue
    }
    matched.push({ record, fields: calculated.fields, reason: calculated.reason })
  }

  const writeResult = await writeSettlementItems([...matched, ...needsReview], options)
  warnings.push(...writeResult.warnings)

  return {
    key,
    label: config.label,
    sheetName: config.sheetName,
    source: 'google-sheets',
    sourceOfTruth: 'Google Sheets',
    spreadsheetId: googleSheetsSpreadsheetId(options),
    scanned: records.length,
    matched: matched.length,
    needsReview: needsReview.length,
    updated: writeResult.updated,
    skipped: skipped.length,
    availableDates: Array.from(availableDates).sort(),
    resultCounts,
    warnings,
    records: matched.map(item => publicRecord(item.record, item.fields, {
      section: key,
      spreadsheetId: googleSheetsSpreadsheetId(options),
      writeResult: item.writeResult,
      ...plannedSettlementFields(item.fields, item.discovery, item.verification)
    })),
    needsReviewRecords: needsReview.map(item => publicRecord(item.record, item.fields, {
      section: key,
      spreadsheetId: googleSheetsSpreadsheetId(options),
      writeResult: item.writeResult,
      reason: item.reason,
      ...plannedSettlementFields(item.fields, item.discovery, item.verification)
    })),
    skippedRecords: skipped
  }
}

export async function settleResults(options = {}) {
  const rawDate = String(options.date || '').trim().toLowerCase()
  const settleEveryDate = rawDate === 'all'
  const settleAll = Boolean(options.settleAll) || settleEveryDate
  const date = settleEveryDate ? 'all' : requestedDateKey(options.date)
  const now = new Date()
  const sections = []
  const warnings = []
  const sourceResult = await listAllGoogleSheetsPicksWithWarnings(options)
  const rows = sourceResult.rows || []
  const spreadsheetId = sourceResult.spreadsheetId || googleSheetsSpreadsheetId(options)
  warnings.push(...(sourceResult.warnings || []))

  for (const [key, config] of Object.entries(SHEET_CONFIGS)) {
    try {
      const result = await settleTable(key, config, rows, date, now, {
        ...options,
        spreadsheetId,
        settleAll,
        settleEveryDate
      })
      sections.push(result)
      warnings.push(...result.warnings)
    } catch (error) {
      sections.push({
        key,
        label: config.label,
        sheetName: config.sheetName,
        source: 'google-sheets',
        sourceOfTruth: 'Google Sheets',
        spreadsheetId,
        scanned: 0,
        matched: 0,
        needsReview: 0,
        updated: 0,
        skipped: 0,
        availableDates: [],
        resultCounts: {},
        warnings: [error.message || String(error)],
        records: [],
        needsReviewRecords: [],
        skippedRecords: []
      })
      warnings.push(`${config.label}: ${error.message || String(error)}`)
    }
  }

  return {
    success: true,
    source: 'google-sheets',
    sourceOfTruth: 'Google Sheets',
    spreadsheetId,
    date,
    settleAll,
    dryRun: Boolean(options.dryRun),
    scanned: sections.reduce((sum, section) => sum + section.scanned, 0),
    matched: sections.reduce((sum, section) => sum + section.matched, 0),
    needsReview: sections.reduce((sum, section) => sum + (section.needsReview || 0), 0),
    updated: sections.reduce((sum, section) => sum + section.updated, 0),
    skipped: sections.reduce((sum, section) => sum + section.skipped, 0),
    availableDates: Array.from(new Set(sections.flatMap(section => section.availableDates || []))).sort(),
    warnings,
    sections,
    records: sections.flatMap(section => section.records),
    needsReviewRecords: sections.flatMap(section => section.needsReviewRecords || []),
    skippedRecords: sections.flatMap(section => section.skippedRecords || [])
  }
}
