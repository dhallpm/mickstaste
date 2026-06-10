import { buildRecordKey } from './recordKey.js'

const SPREADSHEET_ID_ENV = 'GOOGLE_SHEETS_PICK_SHEET_ID'
const SERVICE_ACCOUNT_ENV = 'GOOGLE_SERVICE_ACCOUNT_JSON'

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

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

function spreadsheetId() {
  return requiredEnv(SPREADSHEET_ID_ENV)
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
      source: 'Google Sheets',
      id: `sheets:${sheetName}:${rowIndex + 2}`,
      ...Object.fromEntries(headers.map((header, index) => [header, row[index] ?? '']).filter(([header]) => header))
    }))
}

function missingSheetError(error) {
  const message = String(error?.message || error?.response?.data?.error?.message || '')
  return /unable to parse range|requested entity was not found|not found/i.test(message)
}

async function sheetTitles(sheets) {
  const response = await sheets.spreadsheets.get({
    spreadsheetId: spreadsheetId(),
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

async function getValues(sheets, sheetName, range = '') {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range: `${quoteSheetName(sheetName)}${range}`
  })
  return response.data.values || []
}

async function readTab(sheets, sheetName) {
  const values = await getValues(sheets, sheetName)
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

export async function listActiveGoogleSheetsPicksWithWarnings() {
  const sheets = await sheetsClient()
  const rows = []
  const warnings = []
  const loadedTabs = []

  for (const sheetName of GOOGLE_SHEETS_ACTIVE_TABS) {
    try {
      const tabRows = await readTab(sheets, sheetName)
      rows.push(...tabRows)
      loadedTabs.push(sheetName)
    } catch (error) {
      warnings.push(`Google Sheets tab ${sheetName} could not be read: ${error.message || String(error)}`)
    }
  }

  return {
    source: 'google-sheets',
    sourceOfTruth: 'Google Sheets',
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

function finalResultValue(value = '') {
  const result = cleanText(value).toLowerCase()
  if (/^(win|won|w|cash|cashed)$/.test(result)) return 'Win'
  if (/^(loss|lost|l|lose|failed)$/.test(result)) return 'Loss'
  if (/^(push)$/.test(result)) return 'Push'
  if (/^(void|cancelled|canceled|no action)$/.test(result)) return 'Void'
  return ''
}

export function isGoogleSheetsSettledPickRow(row = {}) {
  const result = firstRowValue(row, ['Result', 'Outcome', 'Final Result', 'Pick Result', 'Graded Result'])
  const profitLoss = firstRowValue(row, ['Profit/Loss', 'P/L', 'PL', 'Profit Loss', 'Profit / Loss', 'Profit-Loss', 'Profit/Loss Units'])
  return Boolean(finalResultValue(result) || cleanText(profitLoss))
}

export async function listAllGoogleSheetsPicksWithWarnings() {
  const sheets = await sheetsClient()
  const rows = []
  const warnings = []
  const loadedTabs = []

  for (const sheetName of GOOGLE_SHEETS_ACTIVE_TABS) {
    try {
      const tabRows = await readTab(sheets, sheetName)
      rows.push(...tabRows)
      loadedTabs.push(sheetName)
    } catch (error) {
      warnings.push(`Google Sheets tab ${sheetName} could not be read: ${error.message || String(error)}`)
    }
  }

  return {
    source: 'google-sheets',
    sourceOfTruth: 'Google Sheets',
    rows,
    warnings,
    loadedTabs
  }
}

export async function listSettledGoogleSheetsPicksWithWarnings() {
  const result = await listAllGoogleSheetsPicksWithWarnings()
  return {
    ...result,
    rows: result.rows.filter(isGoogleSheetsSettledPickRow)
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
  isGoogleSheetsSettledPickRow,
  resolveGoogleSheetsPickTab
}
