import { listResultsGoogleSheetsPicksWithWarnings } from './googleSheetsPickStore.js'
import { rowDateKey, todayEasternKey } from './routePickCategory.js'

function clean(value) {
  return String(value ?? '').trim()
}

function field(row = {}, names = []) {
  const wanted = new Set(names.map(name => name.toLowerCase().replace(/[^a-z0-9]/g, '')))
  for (const [key, value] of Object.entries(row || {})) {
    const token = key.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (wanted.has(token) && clean(value)) return value
  }
  return ''
}

function isPendingStatus(row = {}) {
  return /^pending$/i.test(clean(field(row, ['Status', 'Display Status', 'Pick Status'])))
}

function missingSettlementFields(row = {}) {
  const missing = []
  const result = field(row, ['Result', 'Outcome'])
  if (!/^(win|won|loss|lost|push|void|cancelled|canceled|no action)$/i.test(clean(result))) {
    missing.push('Result/Outcome')
  }
  if (!clean(field(row, ['Profit/Loss', 'P/L', 'PL', 'Profit Loss', 'Profit / Loss', 'Profit-Loss', 'Profit/Loss Units']))) {
    missing.push('Profit/Loss')
  }
  if (!clean(field(row, ['Settled At']))) missing.push('Settled At')
  if (!/^settled$/i.test(clean(field(row, ['Settlement Status'])))) missing.push('Settlement Status')
  return missing
}

export function isNeedsSettlementRow(row = {}, options = {}) {
  const today = clean(options.today) || todayEasternKey(options.now || new Date())
  const date = rowDateKey(row)
  const result = field(row, ['Result', 'Outcome'])
  return Boolean(date && date < today && isPendingStatus(row) && !clean(result))
}

export function buildNeedsSettlementQueue(source = {}, options = {}) {
  const rows = (Array.isArray(source.rows) ? source.rows : [])
    .filter(row => isNeedsSettlementRow(row, options))
    .map(row => ({
      id: row.id || `${row.__table || 'sheet'}:${row.__rowNumber || ''}`,
      Status: 'Needs Settlement',
      status: 'Needs Settlement',
      adminStatus: 'Needs Settlement',
      needsSettlement: true,
      date: rowDateKey(row),
      sourceTab: row.__table || row.__sheetName || '',
      sourceRow: row.__rowNumber || null,
      sourceStatus: clean(field(row, ['Status', 'Display Status', 'Pick Status'])),
      league: clean(field(row, ['League', 'Sport'])),
      game: clean(field(row, ['Game', 'Matchup', 'Event'])),
      pick: clean(field(row, ['Pick', 'Selection', 'Play'])),
      access: clean(field(row, ['Access', 'Tier', 'Access Tier'])),
      missingFields: missingSettlementFields(row)
    }))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.sourceTab).localeCompare(String(b.sourceTab)) || Number(a.sourceRow || 0) - Number(b.sourceRow || 0))
  const countsByTab = rows.reduce((counts, row) => {
    const tab = row.sourceTab || 'Unknown'
    counts[tab] = (counts[tab] || 0) + 1
    return counts
  }, {})

  return {
    success: true,
    source: source.source || 'google-sheets',
    sourceOfTruth: source.sourceOfTruth || 'Google Sheets',
    spreadsheetId: source.spreadsheetId || '',
    asOf: clean(options.today) || todayEasternKey(options.now || new Date()),
    loadedTabs: source.loadedTabs || [],
    warnings: source.warnings || [],
    count: rows.length,
    countsByTab,
    rows
  }
}

export async function listNeedsSettlementGoogleSheetsPicksWithWarnings(options = {}) {
  const source = await listResultsGoogleSheetsPicksWithWarnings(options)
  return buildNeedsSettlementQueue(source, options)
}

export default listNeedsSettlementGoogleSheetsPicksWithWarnings
