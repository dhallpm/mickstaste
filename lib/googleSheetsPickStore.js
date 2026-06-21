import { buildRecordKey } from './recordKey.js'

const SPREADSHEET_ID_ENV = 'GOOGLE_SHEETS_PICK_SHEET_ID'
const SERVICE_ACCOUNT_ENV = 'GOOGLE_SERVICE_ACCOUNT_JSON'
const DEFAULT_SPREADSHEET_ID = '1wber196DbbsSXwcITRXWbIF-IZzOJGwkIKPMIWv0AC4'
const RESULTS_ARCHIVE_TAB_PATTERN = /^Results Archive/i

export const GOOGLE_SHEETS_PICK_TABS = {
  picks: 'Master Picks',
  master: 'Master Picks',
  masterPicks: 'Master Picks',
  props: 'Props Lab',
  propsLab: 'Props Lab',
  lotto: 'Lotto Parlays',
  parlays: 'Lotto Parlays',
  lottoParlays: 'Lotto Parlays',
  longshot: 'Longshots',
  longshots: 'Longshots'
}

export const GOOGLE_SHEETS_ACTIVE_TABS = [
  'Master Picks',
  'Props Lab',
  'Lotto Parlays',
  'Longshots'
]

const SETTLEMENT_FIELDS = new Set([
  'result',
  'outcome',
  'profit/loss',
  'p/l',
  'pl',
  'profit loss',
  'profit-loss'
])

const DEFAULT_PICK_HEADERS = [
  'Record Key',
  'Date',
  'Sport',
  'League',
  'Game',
  'Pick',
  'Player',
  'Prop',
  'Bet Type',
  'Category',
  'Odds',
  'Sportsbook',
  'Grade',
  'Units',
  'Best Number',
  'No Bet Cutoff',
  'Implied Probability',
  'EV Edge',
  'True Probability',
  'Model Probability',
  'Closing Number',
  'Closing Odds',
  'CLV%',
  'CLV Result',
  'Closing Line Value',
  'Status',
  'Release Status',
  'Result',
  'Outcome',
  'Profit/Loss',
  'ROI',
  'Settled At',
  'Settlement Source',
  'Access',
  'Featured',
  'Writeup',
  'Short Take',
  'Why This Play',
  'Matchup Edge',
  'Projection Edge',
  'Key Metrics',
  'Risk',
  'Final Take',
  'Market Notes',
  'Injury Notes',
  'Source Verification',
  'Full Analysis',
  'A Grade Gate Result',
  'A Grade Evidence Count',
  'Market Misprice Reason',
  'Unresolved Conflict',
  'A-Hunt Source Notes',
  'Park/Weather Risk',
  'Blow-Up Risk',
  'Volatility Capped',
  'Tags'
]

export const GOOGLE_SHEETS_SETTLEMENT_HEADERS = [
  'Result',
  'Outcome',
  'Profit/Loss',
  'ROI',
  'Closing Number',
  'Closing Odds',
  'CLV%',
  'CLV Result',
  'Closing Line Value',
  'Settled At',
  'Settlement Source',
  'Settlement Status',
  'Settlement Notes',
  'Status'
]

const SETTLEMENT_HEADER_BY_TOKEN = new Map([
  ['result', 'Result'],
  ['outcome', 'Outcome'],
  ['profitloss', 'Profit/Loss'],
  ['pl', 'Profit/Loss'],
  ['roi', 'ROI'],
  ['closingnumber', 'Closing Number'],
  ['closingodds', 'Closing Odds'],
  ['clv', 'CLV%'],
  ['clvpercent', 'CLV%'],
  ['clvresult', 'CLV Result'],
  ['closinglinevalue', 'Closing Line Value'],
  ['settledat', 'Settled At'],
  ['settlementsource', 'Settlement Source'],
  ['settlementstatus', 'Settlement Status'],
  ['settlementnotes', 'Settlement Notes'],
  ['status', 'Status']
])

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

function spreadsheetId() {
  return process.env[SPREADSHEET_ID_ENV] || DEFAULT_SPREADSHEET_ID
}

export function googleSheetsSpreadsheetId(options = {}) {
  return options.spreadsheetId || spreadsheetId()
}

function parseServiceAccountJson() {
  const raw = requiredEnv(SERVICE_ACCOUNT_ENV).trim()
  let parsed

  try {
    parsed = JSON.parse(raw)
  } catch {
    try {
      parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'))
    } catch (error) {
      throw new Error(`${SERVICE_ACCOUNT_ENV} must be valid JSON or base64-encoded JSON`)
    }
  }

  if (!parsed.client_email || !parsed.private_key) {
    throw new Error(`${SERVICE_ACCOUNT_ENV} must include client_email and private_key`)
  }

  return {
    ...parsed,
    private_key: String(parsed.private_key).replace(/\\n/g, '\n')
  }
}

async function sheetsClient() {
  const { google } = await import('googleapis')
  const credentials = parseServiceAccountJson()
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  })

  return google.sheets({ version: 'v4', auth })
}

function quoteSheetName(sheetName) {
  return `'${String(sheetName).replace(/'/g, "''")}'`
}

function columnName(index) {
  let n = Number(index)
  let name = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    name = String.fromCharCode(65 + rem) + name
    n = Math.floor((n - 1) / 26)
  }
  return name
}

function cleanText(value) {
  return String(value ?? '')
    .replace(/\ufeff/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00a0/g, ' ')
    .trim()
}

function cleanValue(value) {
  return typeof value === 'string' ? cleanText(value) : value
}

function settlementKey(key = '') {
  return cleanText(key).toLowerCase().replace(/\s+/g, ' ')
}

function headerToken(key = '') {
  return cleanText(key).toLowerCase().replace(/[^a-z0-9]/g, '')
}

function canonicalSettlementHeader(fieldName = '') {
  return SETTLEMENT_HEADER_BY_TOKEN.get(headerToken(fieldName)) || ''
}

function isSettlementField(key = '') {
  return SETTLEMENT_FIELDS.has(settlementKey(key))
}

function gradeValue(row = {}) {
  return cleanText(row.Grade || row['Card Grade'] || row.grade || '').toUpperCase()
}

function isAOrBetter(row = {}) {
  const grade = gradeValue(row)
  return grade === 'A' || grade === 'A+'
}

function normalizeAccessByGrade(row = {}) {
  const next = { ...row }
  const access = cleanText(next.Access || next.access)
  if (/\b(vip|premium)\b/i.test(access) && !isAOrBetter(next)) {
    next.Access = 'Free'
    if (Object.hasOwn(next, 'access')) next.access = 'Free'
  }
  return next
}

function cleanImportRecord(record = {}) {
  const cleaned = {}
  for (const [rawKey, rawValue] of Object.entries(record || {})) {
    const key = cleanText(rawKey)
    if (!key || key.startsWith('__') || key === 'id' || key === 'airtableRecordId') continue
    if (isSettlementField(key)) continue
    const value = cleanValue(rawValue)
    if (value === '' || value === null || value === undefined) continue
    cleaned[key] = value
  }

  const normalized = normalizeAccessByGrade(cleaned)
  normalized['Record Key'] = normalized['Record Key'] || buildRecordKey(normalized)
  return normalized
}

function rowHasValue(row = []) {
  return row.some(cell => cleanText(cell) !== '')
}

function rowsFromValues(values = [], sheetName = '') {
  const [headerRow = [], ...bodyRows] = values
  const headers = headerRow.map(cleanText)
  return bodyRows
    .filter(rowHasValue)
    .map((row, rowIndex) => ({
      __table: sheetName,
      __sheetName: sheetName,
      __rowNumber: rowIndex + 2,
      source: 'Google Sheets',
      id: `sheets:${sheetName}:${rowIndex + 2}`,
      ...Object.fromEntries(headers.map((header, index) => [header, row[index] ?? '']).filter(([header]) => header))
    }))
}

function missingSheetError(error) {
  const message = String(error?.message || error?.response?.data?.error?.message || '')
  return /unable to parse range|requested entity was not found|not found/i.test(message)
}

async function sheetTitles(sheets, options = {}) {
  const response = await sheets.spreadsheets.get({
    spreadsheetId: googleSheetsSpreadsheetId(options),
    fields: 'sheets.properties.title'
  })
  return new Set((response.data.sheets || []).map(sheet => sheet.properties?.title).filter(Boolean))
}

async function ensureSheetTab(sheets, sheetName) {
  const titles = await sheetTitles(sheets)
  if (titles.has(sheetName)) return

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: spreadsheetId(),
    requestBody: {
      requests: [{
        addSheet: {
          properties: { title: sheetName }
        }
      }]
    }
  })
}

async function getValues(sheets, sheetName, range = '', options = {}) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: googleSheetsSpreadsheetId(options),
    range: `${quoteSheetName(sheetName)}${range}`
  })
  return response.data.values || []
}

async function readTab(sheets, sheetName, options = {}) {
  const values = await getValues(sheets, sheetName, '', options)
  return rowsFromValues(values, sheetName)
}

function headersForAppend(existingHeaders = [], records = []) {
  const current = existingHeaders.map(cleanText).filter(Boolean)
  const headers = [...current]
  const seen = new Set(headers)
  for (const header of DEFAULT_PICK_HEADERS) {
    if (!seen.has(header)) {
      headers.push(header)
      seen.add(header)
    }
  }
  for (const record of records) {
    for (const rawHeader of Object.keys(record)) {
      const header = cleanText(rawHeader)
      if (!header || header.startsWith('__') || seen.has(header)) continue
      headers.push(header)
      seen.add(header)
    }
  }
  return headers
}

async function ensureHeaders(sheets, sheetName, records = []) {
  await ensureSheetTab(sheets, sheetName)

  let headerValues = []
  try {
    headerValues = await getValues(sheets, sheetName, '!1:1')
  } catch (error) {
    if (!missingSheetError(error)) throw error
  }

  const existingHeaders = (headerValues[0] || []).map(cleanText).filter(Boolean)
  const headers = headersForAppend(existingHeaders, records)

  if (!existingHeaders.length || headers.length !== existingHeaders.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId(),
      range: `${quoteSheetName(sheetName)}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [headers] }
    })
  }

  return headers
}

export function resolveGoogleSheetsPickTab(tableAlias = '') {
  const key = cleanText(tableAlias)
  const sheetName = GOOGLE_SHEETS_PICK_TABS[key]
  if (!sheetName) throw new Error(`Unsupported Google Sheets pick table alias: ${tableAlias || '(blank)'}`)
  return sheetName
}

export async function listActiveGoogleSheetsPicksWithWarnings(options = {}) {
  const sheets = options.sheets || await sheetsClient()
  const rows = []
  const warnings = []
  const loadedTabs = []

  for (const sheetName of GOOGLE_SHEETS_ACTIVE_TABS) {
    try {
      const tabRows = await readTab(sheets, sheetName, options)
      rows.push(...tabRows)
      loadedTabs.push(sheetName)
    } catch (error) {
      warnings.push(`Google Sheets tab ${sheetName} could not be read: ${error.message || String(error)}`)
    }
  }

  return {
    source: 'google-sheets',
    sourceOfTruth: 'Google Sheets',
    spreadsheetId: googleSheetsSpreadsheetId(options),
    rows,
    warnings,
    loadedTabs
  }
}

function firstRowValue(row = {}, names = []) {
  const wanted = new Set(names.map(settlementKey))
  for (const [key, value] of Object.entries(row || {})) {
    if (wanted.has(settlementKey(key)) && cleanText(value)) return value
  }
  return ''
}

function rowValues(row = {}, names = []) {
  const wanted = new Set(names.map(settlementKey))
  return Object.entries(row || {})
    .filter(([key, value]) => wanted.has(settlementKey(key)) && cleanText(value))
    .map(([, value]) => value)
}

function finalResultValue(value = '') {
  const result = cleanText(value).toLowerCase()
  if (/^(win|won|w|cash|cashed)$/.test(result)) return 'Win'
  if (/^(loss|lost|l|lose|failed)$/.test(result)) return 'Loss'
  if (/^(push)$/.test(result)) return 'Push'
  if (/^(void|cancelled|canceled|no action)$/.test(result)) return 'Void'
  return ''
}

function closedSettlementState(value = '') {
  return /^(settled|graded)$/i.test(cleanText(value))
}

function noteSettlementResult(value = '') {
  const note = cleanText(value)
  if (!note) return ''

  const subject = String.raw`(?:pick|play|bet|prop|ticket|selection|wager|leg|card|over\s+\d+(?:\.\d+)?(?:\s+[a-z]+){0,4}|under\s+\d+(?:\.\d+)?(?:\s+[a-z]+){0,4})`
  const resultPrefix = String.raw`(?:result|outcome|settlement)\s*(?::|is|was|-)?\s*`

  if (
    new RegExp(String.raw`\b${subject}\b[^.!?;]{0,80}\b(?:won|cashed)\b`, 'i').test(note) ||
    new RegExp(String.raw`\b${resultPrefix}(?:win|won|cash|cashed)\b`, 'i').test(note) ||
    /\b(?:this|it|we)(?:\s+one)?\s+(?:won|cashed)\b/i.test(note) ||
    /(?:^|[.!?;]\s*)(?:win|won|cash|cashed)\s*[.!?;]?\s*$/i.test(note)
  ) return 'Win'

  if (
    new RegExp(String.raw`\b${subject}\b[^.!?;]{0,80}\b(?:lost|failed)\b`, 'i').test(note) ||
    new RegExp(String.raw`\b${resultPrefix}(?:loss|lost|failed)\b`, 'i').test(note) ||
    /\b(?:this|it|we)(?:\s+one)?\s+(?:lost|failed)\b/i.test(note) ||
    /\bfailed\s+to\s+(?:cash|cover|hit)\b/i.test(note) ||
    /\b(?:did not|didn't)\s+(?:cash|cover|hit)\b/i.test(note) ||
    /(?:^|[.!?;]\s*)(?:loss|lost|failed)\s*[.!?;]?\s*$/i.test(note)
  ) return 'Loss'

  if (
    new RegExp(String.raw`\b${subject}\b[^.!?;]{0,80}\bpush(?:ed)?\b`, 'i').test(note) ||
    new RegExp(String.raw`\b${resultPrefix}push(?:ed)?\b`, 'i').test(note) ||
    /\b(?:was|is|graded)\s+(?:as\s+|a\s+)?push\b/i.test(note) ||
    /(?:^|[.!?;]\s*)push(?:ed)?\s*[.!?;]?\s*$/i.test(note)
  ) return 'Push'

  if (
    new RegExp(String.raw`\b${subject}\b[^.!?;]{0,80}\bvoid(?:ed)?\b`, 'i').test(note) ||
    new RegExp(String.raw`\b${resultPrefix}void(?:ed)?\b`, 'i').test(note) ||
    /\b(?:was|is|graded)\s+(?:as\s+)?void\b/i.test(note) ||
    /(?:^|[.!?;]\s*)void(?:ed)?\s*[.!?;]?\s*$/i.test(note)
  ) return 'Void'

  return ''
}

export function inferGoogleSheetsSettlementResult(row = {}) {
  const fields = row.fields || row
  const explicitResult = rowValues(fields, ['Result', 'Outcome', 'Final Result', 'Pick Result', 'Graded Result'])
    .map(finalResultValue)
    .find(Boolean)
  if (explicitResult) return explicitResult

  const settlementStatusResult = rowValues(fields, ['Settlement Status'])
    .map(finalResultValue)
    .find(Boolean)
  if (settlementStatusResult) return settlementStatusResult

  return rowValues(fields, [
    'Settlement Notes',
    'Result Notes',
    'Notes',
    'Leg Results',
    'Losing Leg',
    'Archive Reason',
    'Short Take'
  ])
    .map(noteSettlementResult)
    .find(Boolean) || ''
}

export function isGoogleSheetsSettledPickRow(row = {}) {
  const fields = row.fields || row
  const profitLoss = firstRowValue(fields, ['Profit/Loss', 'P/L', 'PL', 'Profit Loss', 'Profit / Loss', 'Profit-Loss', 'Profit/Loss Units'])
  const hasClosedStatus = rowValues(fields, ['Settlement Status'])
    .some(closedSettlementState)
  const hasSettlementResult = Boolean(inferGoogleSheetsSettlementResult(fields))

  return Boolean(hasSettlementResult || cleanText(profitLoss) || hasClosedStatus)
}

export async function listAllGoogleSheetsPicksWithWarnings(options = {}) {
  const sheets = options.sheets || await sheetsClient()
  const rows = []
  const warnings = []
  const loadedTabs = []

  for (const sheetName of GOOGLE_SHEETS_ACTIVE_TABS) {
    try {
      const tabRows = await readTab(sheets, sheetName, options)
      rows.push(...tabRows)
      loadedTabs.push(sheetName)
    } catch (error) {
      warnings.push(`Google Sheets tab ${sheetName} could not be read: ${error.message || String(error)}`)
    }
  }

  return {
    source: 'google-sheets',
    sourceOfTruth: 'Google Sheets',
    spreadsheetId: googleSheetsSpreadsheetId(options),
    rows,
    warnings,
    loadedTabs
  }
}

export function mapSettlementFieldToColumn(headers = [], fieldName = '') {
  const canonical = canonicalSettlementHeader(fieldName)
  if (!canonical) return 0
  const wanted = headerToken(canonical)
  const index = headers.findIndex(header => headerToken(header) === wanted)
  return index >= 0 ? index + 1 : 0
}

export async function addMissingSettlementHeadersIfNeeded(sheetName, options = {}) {
  const sheets = options.sheets || await sheetsClient()
  let headerValues = []
  try {
    headerValues = await getValues(sheets, sheetName, '!1:1', options)
  } catch (error) {
    if (!missingSheetError(error)) throw error
  }

  const existingHeaders = (headerValues[0] || []).map(cleanText).filter(Boolean)
  const headers = [...existingHeaders]
  const addedHeaders = []

  for (const requiredHeader of GOOGLE_SHEETS_SETTLEMENT_HEADERS) {
    if (mapSettlementFieldToColumn(headers, requiredHeader)) continue
    headers.push(requiredHeader)
    addedHeaders.push(requiredHeader)
  }

  if (addedHeaders.length && !options.dryRun) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: googleSheetsSpreadsheetId(options),
      range: `${quoteSheetName(sheetName)}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [headers] }
    })
  }

  return {
    spreadsheetId: googleSheetsSpreadsheetId(options),
    sheetName,
    headers,
    addedHeaders,
    dryRun: Boolean(options.dryRun)
  }
}

export async function updateSettlementFieldsInGoogleSheets({ sheetName, rowNumber, fields = {} } = {}, options = {}) {
  if (!sheetName) throw new Error('sheetName is required for Google Sheets settlement update')
  const sheetRowNumber = Number(rowNumber)
  if (!Number.isFinite(sheetRowNumber) || sheetRowNumber < 2) {
    throw new Error(`Valid Google Sheets rowNumber is required for ${sheetName}`)
  }

  const sheets = options.sheets || await sheetsClient()
  const headerResult = await addMissingSettlementHeadersIfNeeded(sheetName, { ...options, sheets })
  const updates = []

  for (const [fieldName, value] of Object.entries(fields || {})) {
    const canonical = canonicalSettlementHeader(fieldName)
    if (!canonical) continue
    const column = mapSettlementFieldToColumn(headerResult.headers, canonical)
    if (!column) continue
    const range = `${quoteSheetName(sheetName)}!${columnName(column)}${sheetRowNumber}`
    updates.push({
      range,
      values: [[value ?? '']]
    })
  }

  const plannedRange = updates.map(update => update.range).join(',')
  if (options.dryRun) {
    return {
      ok: true,
      dryRun: true,
      source: 'google-sheets',
      sourceOfTruth: 'Google Sheets',
      spreadsheetId: googleSheetsSpreadsheetId(options),
      sheetName,
      sheetRowNumber,
      updatedRange: plannedRange,
      updatedRanges: updates.map(update => update.range),
      updatedCells: 0,
      addedHeaders: headerResult.addedHeaders
    }
  }

  if (!updates.length) {
    return {
      ok: false,
      dryRun: false,
      source: 'google-sheets',
      sourceOfTruth: 'Google Sheets',
      spreadsheetId: googleSheetsSpreadsheetId(options),
      sheetName,
      sheetRowNumber,
      updatedRange: '',
      updatedRanges: [],
      updatedCells: 0,
      addedHeaders: headerResult.addedHeaders,
      error: 'No settlement fields were eligible for Google Sheets update.'
    }
  }

  const response = await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: googleSheetsSpreadsheetId(options),
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: updates
    }
  })

  const updatedRanges = (response.data?.responses || []).map(item => item.updatedRange).filter(Boolean)
  return {
    ok: true,
    dryRun: false,
    source: 'google-sheets',
    sourceOfTruth: 'Google Sheets',
    spreadsheetId: response.data?.spreadsheetId || googleSheetsSpreadsheetId(options),
    sheetName,
    sheetRowNumber,
    updatedRange: updatedRanges.join(','),
    updatedRanges,
    updatedCells: Number(response.data?.totalUpdatedCells || 0),
    addedHeaders: headerResult.addedHeaders
  }
}

export async function listSettledGoogleSheetsPicksWithWarnings(options = {}) {
  const sheets = options.sheets || await sheetsClient()
  const rows = []
  const warnings = []
  const loadedTabs = []
  let archiveTabs = []

  try {
    const titles = await sheetTitles(sheets, options)
    archiveTabs = Array.from(titles).filter(title => RESULTS_ARCHIVE_TAB_PATTERN.test(title))
  } catch (error) {
    warnings.push(`Google Sheets archive tabs could not be listed: ${error.message || String(error)}`)
  }

  const resultTabs = Array.from(new Set([...GOOGLE_SHEETS_ACTIVE_TABS, ...archiveTabs]))
  for (const sheetName of resultTabs) {
    try {
      const tabRows = await readTab(sheets, sheetName, options)
      rows.push(...tabRows)
      loadedTabs.push(sheetName)
    } catch (error) {
      warnings.push(`Google Sheets tab ${sheetName} could not be read: ${error.message || String(error)}`)
    }
  }

  return {
    source: 'google-sheets',
    sourceOfTruth: 'Google Sheets',
    spreadsheetId: googleSheetsSpreadsheetId(options),
    rows: rows.filter(isGoogleSheetsSettledPickRow),
    warnings,
    loadedTabs
  }
}

export async function googleSheetsBatchAppend(tableAlias, records = [], options = {}) {
  const sheetName = resolveGoogleSheetsPickTab(tableAlias)
  const requested = Array.isArray(records) ? records : []
  const prepared = requested
    .map(cleanImportRecord)
    .filter(record => Object.keys(record).length > 0)

  if (options.dryRun) {
    return {
      ok: true,
      success: true,
      dryRun: true,
      tableAlias,
      tableName: sheetName,
      attempted: requested.length,
      requested: requested.length,
      cleaned: prepared.length,
      created: 0,
      destination: 'Google Sheets',
      message: 'DRY RUN - NO GOOGLE SHEETS WRITE',
      preview: prepared.slice(0, 10)
    }
  }

  if (!prepared.length) {
    return {
      ok: false,
      success: false,
      tableAlias,
      tableName: sheetName,
      attempted: requested.length,
      requested: requested.length,
      cleaned: 0,
      created: 0,
      destination: 'Google Sheets',
      error: 'No valid records to append after cleaning.'
    }
  }

  console.log('[google-sheets-import] append records target', {
    spreadsheetId: spreadsheetId(),
    tableAlias,
    sheetName,
    recordCount: requested.length,
    firstRecordKeys: Object.keys(requested[0] || {})
  })

  const sheets = await sheetsClient()
  const headers = await ensureHeaders(sheets, sheetName, prepared)
  const values = prepared.map(record => headers.map(header => record[header] ?? ''))
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: spreadsheetId(),
    range: `${quoteSheetName(sheetName)}!A1`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values }
  })

  const created = Number(response.data?.updates?.updatedRows || 0)
  const ok = created === prepared.length
  return {
    ok,
    success: ok,
    tableAlias,
    tableName: sheetName,
    attempted: requested.length,
    requested: requested.length,
    cleaned: prepared.length,
    created,
    destination: 'Google Sheets',
    updatedRange: response.data?.updates?.updatedRange || '',
    spreadsheetId: response.data?.spreadsheetId || spreadsheetId(),
    ...(ok ? {} : { error: `Google Sheets appended ${created} row(s) for ${prepared.length} prepared record(s).` })
  }
}

export default {
  listActiveGoogleSheetsPicksWithWarnings,
  listAllGoogleSheetsPicksWithWarnings,
  listSettledGoogleSheetsPicksWithWarnings,
  googleSheetsBatchAppend,
  updateSettlementFieldsInGoogleSheets,
  addMissingSettlementHeadersIfNeeded,
  mapSettlementFieldToColumn,
  isGoogleSheetsSettledPickRow,
  resolveGoogleSheetsPickTab
}
