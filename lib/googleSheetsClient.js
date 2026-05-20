const DEFAULT_SHEETS = [
  'Website Feed',
  'Active Picks',
  'Props Lab',
  'Props Results',
  'Lotto Props',
  'Micks LongShots',
  'Longshots History',
  'Results Archive',
  'Airtable Sync Log',
  'Micks Picks Automation Log'
]

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

export function normalizeSheetRows(values = []) {
  const [headers = [], ...rows] = values
  return rows
    .filter(row => row.some(cell => cell !== undefined && cell !== null && cell !== ''))
    .map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] || ''])))
}

export async function getSheetRows(sheetName) {
  const sheets = await sheetsClient()
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: requiredEnv('GOOGLE_SHEETS_ID'),
    range: `'${sheetName}'`
  })

  return normalizeSheetRows(response.data.values || [])
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
    range: `'${sheetName}'`
  })

  await sheets.spreadsheets.values.update({
    spreadsheetId: requiredEnv('GOOGLE_SHEETS_ID'),
    range: `'${sheetName}'!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values }
  })

  return { sheetName, rows: Math.max(values.length - 1, 0), columns: headers.length }
}

export async function appendSheetRows(sheetName, rows, preferredHeaders = []) {
  if (!rows.length) return { sheetName, rows: 0 }

  const currentRows = await getSheetRows(sheetName).catch(() => [])
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
    range: `'${sheetName}'!A1`,
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

  const currentRows = await getSheetRows(sheetName).catch(() => [])
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
    Action: action,
    Source: details.source || 'vercel',
    Destination: details.destination || 'Google Sheets',
    Status: details.status || 'Success',
    Message: details.message || '',
    Count: details.count || 0
  }], ['Timestamp', 'Action', 'Source', 'Destination', 'Status', 'Message', 'Count'])
}

export { DEFAULT_SHEETS }
