const DEFAULT_GOOGLE_SHEETS_ID = '15txBM8qsck7f0ZA_za7xYEykBxKpuq0no3x7yHcKNeE'

export const GOOGLE_SHEETS_FALLBACK_TABS = [
  { name: 'Active Picks', gid: '0' },
  { name: 'Website Feed', gid: '1231201305' },
  { name: 'Props Lab', gid: '501253438' },
  { name: 'Lotto Props', gid: '39840357' },
  { name: 'Micks LongShots', gid: '2026051601' },
  { name: 'Results Archive', gid: '1579113575' }
]

function fallbackSheetsId() {
  return process.env.GOOGLE_SHEETS_ID || DEFAULT_GOOGLE_SHEETS_ID
}

function csvUrl(gid) {
  const spreadsheetId = encodeURIComponent(fallbackSheetsId())
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${encodeURIComponent(gid)}`
}

export function parseCsv(text = '') {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]

    if (char === '"' && quoted && next === '"') {
      cell += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      row.push(cell)
      cell = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }

  return rows
}

function normalizeRows(values = [], sheetName = '') {
  const [headers = [], ...rows] = values
  return rows
    .filter(row => row.some(cell => String(cell || '').trim() !== ''))
    .map((row, rowIndex) => ({
      __table: sheetName,
      source: `Google Sheets ${sheetName}`,
      id: `sheets:${sheetName}:${rowIndex + 2}`,
      ...Object.fromEntries(headers.map((header, index) => [header, row[index] || '']))
    }))
}

async function fetchFallbackTab(tab) {
  const response = await fetch(csvUrl(tab.gid))
  const body = await response.text().catch(() => '')

  if (!response.ok) {
    const error = new Error(`Google Sheets fallback tab ${tab.name} failed: ${response.status}`)
    error.statusCode = response.status
    error.body = body.slice(0, 300)
    throw error
  }

  return normalizeRows(parseCsv(body), tab.name)
}

export async function listGoogleSheetsFallbackRows(tabs = GOOGLE_SHEETS_FALLBACK_TABS) {
  const rows = []
  const warnings = []
  const loadedTabs = []

  for (const tab of tabs) {
    try {
      const tabRows = await fetchFallbackTab(tab)
      rows.push(...tabRows)
      loadedTabs.push(tab.name)
    } catch (error) {
      warnings.push(`Google Sheets fallback tab ${tab.name} could not be read: ${error.message}`)
    }
  }

  if (!rows.length) {
    const error = new Error('Google Sheets fallback did not return any rows.')
    error.code = 'GOOGLE_SHEETS_FALLBACK_EMPTY'
    error.warnings = warnings
    throw error
  }

  return {
    source: 'google_sheets_fallback',
    rows,
    warnings,
    loadedTabs
  }
}

export default listGoogleSheetsFallbackRows
