const DEFAULT_SHEETS = [
  'Website Feed',
  'Active Picks',
  'Props Lab',
  'Props Results',
  'Lotto Props',
  'Lotto Parlays',
  'Micks LongShots',
  'Longshots History',
  'Results Archive',
  'Sync Log',
  'Airtable Sync Log',
  'Micks Picks Automation Log'
]

const PICK_SHEET_HEADERS = [
  'Record Key', 'Date', 'Sport', 'League', 'Game', 'Pick', 'Bet Type', 'Category', 'Access', 'Odds',
  'Sportsbook', 'Units', 'Status', 'Release Status', 'Result', 'Profit/Loss', 'Closing Number',
  'Verified Closing Number', 'Closing Source', 'CLV', 'Market Notes', 'Injury Notes', 'Writeup',
  'Full Analysis', 'Source Verification', 'A Grade Gate Result', 'A Grade Evidence Count',
  'Market Misprice Reason', 'Unresolved Conflict', 'A-Hunt Source Notes', 'Park/Weather Risk',
  'Blow-Up Risk', 'Volatility Capped', 'Tags', 'Archive Status',
  'Sync Status', 'Needs Fallback',
  'Last Synced From Airtable', 'Last Synced From Google Sheets'
]

const SYNC_LOG_HEADERS = [
  'Timestamp', 'Direction', 'Source', 'Destination', 'Table', 'Record Key', 'Action', 'Status',
  'Error Message', 'Changed Fields', 'Sync Batch ID'
]

const BACKUP_TAB_HEADERS = {
  'Active Picks': PICK_SHEET_HEADERS,
  'Props Lab': PICK_SHEET_HEADERS,
  'Lotto Parlays': PICK_SHEET_HEADERS,
  'Micks LongShots': PICK_SHEET_HEADERS,
  'Results Archive': PICK_SHEET_HEADERS,
  'Sync Log': SYNC_LOG_HEADERS
}

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

async function sheetsClient() {
  const { google } = await import('googleapis')
  const privateKey = requiredEnv('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n')
  const auth = new google.auth.JWT({
    email: requiredEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  })

  return google.sheets({ version: 'v4', auth })
}

function quoteSheetName(sheetName) {
  return `'${String(sheetName).replace(/'/g, "''")}'`
}

function headerForSheet(sheetName, preferredHeaders = []) {
  if (preferredHeaders.length) return preferredHeaders
  return BACKUP_TAB_HEADERS[sheetName] || PICK_SHEET_HEADERS
}

function isMissingSheetRangeError(error) {
  return /Unable to parse range/i.test(String(error?.message || '')) ||
    /Unable to parse range/i.test(String(error?.response?.data?.error?.message || ''))
}

async function sheetTitleExists(sheets, sheetName) {
  const response = await sheets.spreadsheets.get({
    spreadsheetId: requiredEnv('GOOGLE_SHEETS_ID'),
    fields: 'sheets.properties.title'
  })
  return (response.data.sheets || [])
    .some(sheet => sheet.properties?.title === sheetName)
}

async function ensureSheetTab(sheetName, preferredHeaders = []) {
  const sheets = await sheetsClient()
  const exists = await sheetTitleExists(sheets, sheetName)
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: requiredEnv('GOOGLE_SHEETS_ID'),
      requestBody: {
        requests: [{
          addSheet: {
            properties: {
              title: sheetName
            }
          }
        }]
      }
    })
  }

  const headers = headerForSheet(sheetName, preferredHeaders)
  if (headers.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: requiredEnv('GOOGLE_SHEETS_ID'),
      range: `${quoteSheetName(sheetName)}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [headers] }
    })
  }
}

async function withMissingSheetRetry(sheetName, preferredHeaders, operation) {
  try {
    return await operation()
  } catch (error) {
    if (!isMissingSheetRangeError(error)) throw error
    await ensureSheetTab(sheetName, preferredHeaders)
    return operation()
  }
}

export function normalizeSheetRows(values = []) {
  const [headers = [], ...rows] = values
  return rows
    .filter(row => row.some(cell => cell !== undefined && cell !== null && cell !== ''))
    .map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] || ''])))
}

export async function getSheetRows(sheetName) {
  return withMissingSheetRetry(sheetName, [], async () => {
    const sheets = await sheetsClient()
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: requiredEnv('GOOGLE_SHEETS_ID'),
      range: quoteSheetName(sheetName)
    })

    return normalizeSheetRows(response.data.values || [])
  })
}

function rowKey(row = {}) {
  return String(row['Record Key'] || row.recordKey || '').trim().toLowerCase()
}

function mergeSheetRows(existing = {}, incoming = {}) {
  const merged = { ...existing }
  Object.entries(incoming).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') merged[key] = value
  })
  return merged
}

export async function replaceSheetRows(sheetName, rows, preferredHeaders = []) {
  await ensureSheetTab(sheetName, preferredHeaders)
  const sheets = await sheetsClient()
  const headers = [
    ...preferredHeaders,
    ...Array.from(new Set(rows.flatMap(row => Object.keys(row))))
      .filter(header => !preferredHeaders.includes(header) && !header.startsWith('__'))
  ]
  const values = [
    headers,
    ...rows.map(row => headers.map(header => row[header] ?? ''))
  ]

  await sheets.spreadsheets.values.clear({
    spreadsheetId: requiredEnv('GOOGLE_SHEETS_ID'),
    range: quoteSheetName(sheetName)
  })

  await sheets.spreadsheets.values.update({
    spreadsheetId: requiredEnv('GOOGLE_SHEETS_ID'),
    range: `${quoteSheetName(sheetName)}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values }
  })

  return { sheetName, rows: Math.max(values.length - 1, 0), columns: headers.length }
}

export async function appendSheetRows(sheetName, rows, preferredHeaders = []) {
  if (!rows.length) return { sheetName, rows: 0 }
  if (preferredHeaders.length) await ensureSheetTab(sheetName, preferredHeaders)

  const currentRows = await getSheetRows(sheetName).catch(error => {
    if (isMissingSheetRangeError(error)) return []
    throw error
  })
  const headers = [
    ...preferredHeaders,
    ...Array.from(new Set([...currentRows, ...rows].flatMap(row => Object.keys(row))))
      .filter(header => !preferredHeaders.includes(header) && !header.startsWith('__'))
  ]
  const sheets = await sheetsClient()

  if (!currentRows.length) {
    await replaceSheetRows(sheetName, [], headers)
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: requiredEnv('GOOGLE_SHEETS_ID'),
    range: `${quoteSheetName(sheetName)}!A1`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: rows.map(row => headers.map(header => row[header] ?? ''))
    }
  })

  return { sheetName, rows: rows.length }
}

export async function upsertSheetRows(sheetName, rows, preferredHeaders = []) {
  if (!rows.length) return { sheetName, updated: 0, created: 0, rows: 0 }

  const currentRows = await getSheetRows(sheetName).catch(error => {
    if (isMissingSheetRangeError(error)) return []
    throw error
  })
  const byKey = new Map()
  const ordered = []

  for (const row of currentRows) {
    const key = rowKey(row)
    if (key) byKey.set(key, { row, index: ordered.length })
    ordered.push(row)
  }

  let updated = 0
  let created = 0
  for (const row of rows) {
    const key = rowKey(row)
    if (key && byKey.has(key)) {
      const item = byKey.get(key)
      ordered[item.index] = mergeSheetRows(item.row, row)
      updated += 1
    } else {
      ordered.push(row)
      created += 1
      if (key) byKey.set(key, { row, index: ordered.length - 1 })
    }
  }

  await replaceSheetRows(sheetName, ordered, preferredHeaders)
  return { sheetName, updated, created, rows: ordered.length }
}

export async function logSheetSyncAction(action, details = {}) {
  return appendSheetRows('Sync Log', [{
    Timestamp: new Date().toISOString(),
    Direction: details.direction || '',
    Source: details.source || 'vercel',
    Destination: details.destination || 'Google Sheets',
    Table: details.table || details.tableName || '',
    'Record Key': details.recordKey || '',
    Action: action,
    Status: details.status || 'Success',
    'Error Message': details.errorMessage || '',
    'Changed Fields': details.changedFields || (details.count !== undefined ? `Count: ${details.count}` : details.message || ''),
    'Sync Batch ID': details.syncBatchId || ''
  }], SYNC_LOG_HEADERS)
}

export { DEFAULT_SHEETS, PICK_SHEET_HEADERS, SYNC_LOG_HEADERS, ensureSheetTab, isMissingSheetRangeError }
