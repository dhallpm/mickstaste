import {
  inferGoogleSheetsSettlementResult,
  isGoogleSheetsPublicResultRow,
  listSettledGoogleSheetsPicksWithWarnings
} from '../lib/googleSheetsPickStore.js'
import { buildRecordKey } from '../lib/recordKey.js'

const RESULT_FIELD_NAMES = ['Result', 'Outcome', 'Final Result', 'Pick Result', 'Graded Result']
const STATUS_FIELD_NAMES = ['Status', 'Display Status', 'Pick Status']
const PROFIT_LOSS_FIELD_NAMES = [
  'Profit/Loss',
  'P/L',
  'PL',
  'Profit Loss',
  'Profit / Loss',
  'Profit-Loss',
  'Profit/Loss Units',
  'P/L Units',
  'Unit Profit/Loss'
]

function text(value) {
  return String(value ?? '').trim()
}

function keyToken(value = '') {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function first(fields = {}, names = []) {
  const wanted = new Set(names.map(keyToken))
  for (const [key, value] of Object.entries(fields || {})) {
    if (wanted.has(keyToken(key)) && text(value)) return value
  }
  return ''
}

function values(fields = {}, names = []) {
  const wanted = new Set(names.map(keyToken))
  return Object.entries(fields || {})
    .filter(([key, value]) => wanted.has(keyToken(key)) && text(value))
    .map(([, value]) => value)
}

function todayET() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
}

function dateKey(value) {
  const raw = text(value)
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  if (!raw) return ''
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return raw.slice(0, 10)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(parsed)
}

function finalResultLabel(value) {
  const result = text(value).toLowerCase()
  if (/^(win|won|w|cash|cashed)$/.test(result)) return 'Win'
  if (/^(loss|lost|l|lose|failed)$/.test(result)) return 'Loss'
  if (/^(push)$/.test(result)) return 'Push'
  if (/^(void|cancelled|canceled|no action)$/.test(result)) return 'Void'
  return ''
}

function closedStatusLabel(value) {
  return /^(closed|settled|graded|complete|completed|final)$/i.test(text(value)) ? 'Closed' : ''
}

export function shouldIncludeResultRecord(fields = {}) {
  return isGoogleSheetsPublicResultRow(fields)
}

function isVip(fields = {}) {
  const access = text(first(fields, ['Access', 'Tier', 'Access Tier'])).toLowerCase()
  const grade = text(first(fields, ['Grade', 'Card Grade'])).toUpperCase()
  return access.includes('vip') || access.includes('premium') || grade === 'A' || grade === 'A+'
}

function americanOdds(value) {
  const odds = text(value)
  return /^\d+$/.test(odds) && Number(odds) > 0 ? `+${odds}` : odds
}

function parseNumber(value) {
  const match = String(value ?? '').replace(/,/g, '').match(/[-+]?\d*\.?\d+/)
  return match ? Number(match[0]) : NaN
}

function round2(value) {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0
}

function formatUnits(value) {
  if (!Number.isFinite(value)) return ''
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}u`
}

function formatRoiDisplay(value) {
  if (!Number.isFinite(value)) return ''
  const percent = Math.abs(value) <= 1 ? value * 100 : value
  const rounded = round2(percent)
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : String(rounded)}%`
}

function normalizeProfitLoss(value) {
  const raw = text(value)
  if (!raw) return ''
  if (/u$/i.test(raw)) return raw
  const n = Number(raw.replace(/,/g, ''))
  if (!Number.isFinite(n)) return raw
  return formatUnits(n)
}

function profitLossNumber(value) {
  const n = Number(String(value ?? '').replace(/[u,%,$,]/gi, '').trim())
  return Number.isFinite(n) ? n : 0
}

function inferResultFromProfitLoss(value) {
  const n = profitLossNumber(value)
  if (n > 0) return 'Win'
  if (n < 0) return 'Loss'
  return text(value) ? 'Push' : ''
}

function calculateProfitLossNumber(fields = {}) {
  const result = values(fields, RESULT_FIELD_NAMES).map(value => finalResultLabel(value)).find(Boolean)
  const units = parseNumber(first(fields, ['Units', 'Units to Commit', 'Stake']))
  const stored = first(fields, PROFIT_LOSS_FIELD_NAMES)

  if (result && Number.isFinite(units) && units > 0) {
    if (result === 'Push' || result === 'Void') return 0
    if (result === 'Loss') return -units
    if (result === 'Win') {
      const odds = parseNumber(first(fields, ['Odds', 'Posted Odds', 'American Odds']))
      if (Number.isFinite(odds) && odds !== 0) {
        return odds > 0 ? units * odds / 100 : units * 100 / Math.abs(odds)
      }
    }
  }

  if (text(stored)) return profitLossNumber(stored)
  return 0
}

function calculateProfitLoss(fields = {}) {
  const result = values(fields, RESULT_FIELD_NAMES).map(value => finalResultLabel(value)).find(Boolean)
  const units = parseNumber(first(fields, ['Units', 'Units to Commit', 'Stake']))
  const stored = first(fields, PROFIT_LOSS_FIELD_NAMES)

  if (result && Number.isFinite(units) && units > 0) {
    if (result === 'Push' || result === 'Void') return '0.00u'
    if (result === 'Loss') return `-${units.toFixed(2)}u`
    if (result === 'Win') return formatUnits(calculateProfitLossNumber(fields))
  }

  return normalizeProfitLoss(stored)
}

function roiNumber(fields = {}, profitLoss = 0, unitsRisked = 0) {
  const stored = first(fields, ['ROI'])
  if (text(stored)) {
    const parsed = profitLossNumber(stored)
    return /%/.test(String(stored)) ? parsed / 100 : parsed
  }
  return unitsRisked > 0 ? profitLoss / unitsRisked : 0
}

export function hasPositiveUnits(row = {}) {
  const fields = row.fields || row
  const units = parseNumber(first(fields, ['Units', 'Units to Commit', 'Stake']))
  return Number.isFinite(units) && units > 0
}

function tableSection(source = '') {
  if (/props/i.test(source)) return { section: 'props', key: 'propsLab', label: 'Props Lab' }
  if (/lotto|parlay/i.test(source)) return { section: 'lotto', key: 'lottoParlays', label: 'Lotto Parlays' }
  if (/longshot/i.test(source)) return { section: 'longshots', key: 'longshots', label: 'Longshots' }
  return { section: 'master', key: 'masterPicks', label: 'Master Picks' }
}

function pickTitle(fields = {}, section = '') {
  const game = text(first(fields, ['Game', 'Matchup', 'Event']))
  const player = text(first(fields, ['Player', 'Athlete', 'Player Name']))
  if (section === 'props') {
    const prop = text(first(fields, ['Prop', 'Market', 'Bet Type', 'Type']))
    const pick = text(first(fields, ['Pick', 'Selection', 'Play'])) || [player, prop].filter(Boolean).join(' ') || prop || player
    return contextualPickTitle(pick, player || game)
  }
  const pick = text(first(fields, ['Pick', 'Selection', 'Play', 'Name', 'Title'])) || game
  return contextualPickTitle(pick, game || player)
}

function isGenericPickTitle(value = '') {
  const title = text(value)
  if (!title || /\b(vs|versus)\b|@/.test(title.toLowerCase())) return false
  if (/^(over|under)\s+\d+(?:\.\d+)?(?:\s+[a-z][a-z/ -]*)?$/i.test(title)) return true
  return /^(?:live\s+)?[a-z][a-z/ -]*\s+(?:over|under)$/i.test(title)
}

function contextualPickTitle(pick = '', context = '') {
  const title = text(pick)
  const prefix = text(context)
  if (!title || !prefix || !isGenericPickTitle(title)) return title
  if (title.toLowerCase().includes(prefix.toLowerCase())) return title
  return `${prefix} \u2013 ${title}`
}

function publicSection(fields = {}, section = '') {
  if (section === 'props') return 'Props Lab'
  if (section === 'lotto') return 'Lotto Parlays'
  if (section === 'longshots') return 'Longshots'
  return isVip(fields) ? 'VIP' : 'Master Picks'
}

export function normalizeRecord(record = {}, config = {}) {
  const fields = record.fields || record
  const sourceTable = text(first(fields, ['Original Table', 'Source Table', 'Source Sheet', 'Original Tab', 'Source Tab']) || config.label || record.__table || record.Table || '')
  const table = tableSection(sourceTable)
  const section = config.section || table.section
  const label = config.label || table.label
  const settlementDate = first(fields, ['Settled At', 'Settlement Date', 'Archive Timestamp'])
  const rawDate = settlementDate || first(fields, ['Date', 'Game Date', 'Posted Time', 'Timestamp'])
  const date = dateKey(rawDate) || todayET()
  const storedProfitLoss = first(fields, PROFIT_LOSS_FIELD_NAMES)
  const result = inferGoogleSheetsSettlementResult(fields) || inferResultFromProfitLoss(storedProfitLoss)
  const normalizedFields = result ? { ...fields, Result: result, Outcome: result } : fields
  const profitLoss = calculateProfitLoss(normalizedFields)
  const profitLossValue = round2(calculateProfitLossNumber(normalizedFields))
  const rawStatus = text(first(fields, STATUS_FIELD_NAMES))
  const closedStatus = values(fields, STATUS_FIELD_NAMES).some(value => closedStatusLabel(value))
  const status = result || (closedStatus ? 'Closed' : rawStatus)
  const unitsRisked = Math.max(0, parseNumber(first(fields, ['Units', 'Units to Commit', 'Stake'])) || 0)
  const roi = round2(roiNumber(fields, profitLossValue, unitsRisked))
  const pick = pickTitle(fields, section)
  const access = text(first(fields, ['Access', 'Tier', 'Access Tier'])) || (isVip(fields) ? 'VIP' : 'Free')
  const betType = text(first(fields, ['Bet Type', 'Type', 'Market', 'Prop'])) || (section === 'props' ? 'Player Prop' : section === 'lotto' ? 'Parlay' : '')
  const closingNumber = first(fields, ['Closing Number', 'Closing Line', 'Verified Closing Number'])
  const recordKey = fields['Record Key'] || buildRecordKey({ ...fields, Pick: pick })
  const settlementStatus = first(fields, ['Settlement Status'])
  const settlementNotes = first(fields, ['Settlement Notes'])

  return {
    id: record.id || recordKey,
    recordKey,
    sourceTab: record.__table || label,
    sourceRow: record.__rowNumber || null,
    __source: 'Google Sheets Results API',
    __table: label,
    __section: section,
    source: 'Google Sheets',
    sourceOfTruth: 'Google Sheets',
    section: publicSection(fields, section),
    resultSection: table.key,
    Date: date,
    date,
    Sport: text(first(fields, ['Sport'])),
    sport: text(first(fields, ['Sport'])),
    League: text(first(fields, ['League', 'Sport'])),
    league: text(first(fields, ['League', 'Sport'])),
    Game: text(first(fields, ['Game', 'Matchup', 'Event'])),
    game: text(first(fields, ['Game', 'Matchup', 'Event'])),
    Pick: pick,
    pick,
    cardTitle: pick,
    'Bet Type': betType,
    betType,
    Category: text(first(fields, ['Category', 'Parlay Group', 'Longshot'])) || label,
    category: text(first(fields, ['Category', 'Parlay Group', 'Longshot'])) || label,
    Odds: americanOdds(first(fields, ['Odds', 'Posted Odds', 'American Odds'])),
    odds: americanOdds(first(fields, ['Odds', 'Posted Odds', 'American Odds'])),
    Grade: text(first(fields, ['Grade', 'Card Grade'])),
    grade: text(first(fields, ['Grade', 'Card Grade'])),
    Units: first(fields, ['Units', 'Units to Commit', 'Stake']),
    units: first(fields, ['Units', 'Units to Commit', 'Stake']),
    unitsRisked,
    'Best Number': first(fields, ['Best Number', 'Line', 'Number']),
    bestNumber: first(fields, ['Best Number', 'Line', 'Number']),
    'Closing Number': closingNumber,
    closingNumber,
    closing: closingNumber,
    'Closing Odds': first(fields, ['Closing Odds', 'Closing Price']),
    closingOdds: first(fields, ['Closing Odds', 'Closing Price']),
    'CLV%': first(fields, ['CLV%', 'CLV']),
    clvPercent: first(fields, ['CLV%', 'CLV']),
    'CLV Result': text(first(fields, ['CLV Result'])),
    clvResult: text(first(fields, ['CLV Result'])),
    'Closing Line Value': first(fields, ['Closing Line Value']),
    closingLineValue: first(fields, ['Closing Line Value']),
    Result: result,
    Outcome: result,
    result,
    Status: status,
    status,
    'Profit/Loss': profitLoss,
    'Profit/Loss Units': profitLoss,
    'P/L': profitLoss,
    PL: profitLoss,
    pl: profitLoss,
    profitLoss,
    profitLossValue,
    ROI: roi,
    roi,
    roiDisplay: unitsRisked > 0 ? formatRoiDisplay(roi) : '',
    Access: access,
    access,
    Sportsbook: text(first(fields, ['Sportsbook', 'Book'])),
    sportsbook: text(first(fields, ['Sportsbook', 'Book'])),
    'Settled At': settlementDate,
    settledAt: settlementDate,
    'Settlement Source': first(fields, ['Settlement Source']),
    settlementSource: first(fields, ['Settlement Source']),
    'Settlement Status': settlementStatus,
    settlementStatus,
    'Settlement Notes': settlementNotes,
    settlementNotes,
    Notes: text(first(fields, ['Notes', 'Result Notes', 'Settlement Notes', 'Market Notes', 'Leg Results', 'Losing Leg'])),
    notes: text(first(fields, ['Notes', 'Result Notes', 'Settlement Notes', 'Market Notes', 'Leg Results', 'Losing Leg'])),
    Legs: text(first(fields, ['Legs', 'Parlay Group'])) || pick,
    legs: text(first(fields, ['Legs', 'Parlay Group'])) || pick,
    Timestamp: settlementDate || first(fields, ['Posted Time', 'Timestamp']),
    timestamp: settlementDate || first(fields, ['Posted Time', 'Timestamp']),
    originalTable: label
  }
}

export function normalizeRow(row = {}, sourceTable = '') {
  return normalizeRecord(row, { label: sourceTable || row.__table || row['Original Table'] || row.Table || '' })
}

function withinDays(row = {}, days = 180) {
  const key = dateKey(row.date || row.Date)
  if (!key || !days) return true
  const rowTime = new Date(`${key}T12:00:00Z`).getTime()
  const cutoff = Date.now() - Number(days) * 24 * 60 * 60 * 1000
  return Number.isFinite(rowTime) && rowTime >= cutoff
}

function dedupe(rows = []) {
  return Array.from(new Map(rows.map(row => [
    [row.date, row.league, row.game, row.pick, row.betType, row.__section].map(value => text(value).toLowerCase()).join('|'),
    row
  ])).values())
}

function emptySummary() {
  return {
    wins: 0,
    losses: 0,
    pushes: 0,
    voids: 0,
    unitsRisked: 0,
    profitLoss: 0,
    roi: 0
  }
}

function summarize(rows = []) {
  const summary = rows.reduce((acc, row) => {
    if (row.result === 'Win') acc.wins += 1
    else if (row.result === 'Loss') acc.losses += 1
    else if (row.result === 'Push') acc.pushes += 1
    else if (row.result === 'Void') acc.voids += 1
    acc.unitsRisked += Number(row.unitsRisked || 0)
    acc.profitLoss += Number(row.profitLossValue || 0)
    return acc
  }, emptySummary())

  summary.unitsRisked = round2(summary.unitsRisked)
  summary.profitLoss = round2(summary.profitLoss)
  summary.roi = summary.unitsRisked > 0 ? round2(summary.profitLoss / summary.unitsRisked) : 0
  return summary
}

function groupByDate(rows = []) {
  return rows.reduce((groups, row) => {
    const key = row.date || 'Undated'
    if (!groups[key]) groups[key] = []
    groups[key].push(row)
    return groups
  }, {})
}

function countBy(rows = [], valueOf = () => '') {
  return rows.reduce((counts, row) => {
    const key = text(valueOf(row)) || 'Unknown'
    counts[key] = (counts[key] || 0) + 1
    return counts
  }, {})
}

function diagnosticRow(row = {}) {
  return {
    id: row.id,
    date: row.date,
    sourceTab: row.sourceTab || row.__table,
    sourceRow: row.sourceRow || null,
    section: row.section,
    access: row.access,
    league: row.league,
    game: row.game,
    pick: row.pick,
    result: row.result,
    outcome: row.Outcome,
    profitLoss: row.profitLoss,
    settledAt: row.settledAt,
    settlementStatus: row.settlementStatus
  }
}

export function buildResultsPayload(source = {}, options = {}) {
  const days = Math.min(Math.max(Number(options.days || 180), 1), 3650)
  const sourceRows = Array.isArray(source.rows) ? source.rows : []
  const rows = dedupe(sourceRows
    .filter(row => shouldIncludeResultRecord(row))
    .map(row => normalizeRecord(row, { label: row.__table || '' })))
    .filter(row => withinDays(row, days))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.timestamp || '').localeCompare(String(a.timestamp || '')))

  const masterPicks = rows.filter(row => row.__section === 'master')
  const vip = rows.filter(row => isVip(row))
  const free = masterPicks.filter(row => !isVip(row))
  const propsLab = rows.filter(row => row.__section === 'props')
  const lottoParlays = rows.filter(row => row.__section === 'lotto')
  const longshots = rows.filter(row => row.__section === 'longshots')

  const summary = {
    overall: summarize(rows),
    masterPicks: summarize(masterPicks),
    officialStraight: summarize(masterPicks),
    vip: summarize(vip),
    propsLab: summarize(propsLab),
    lottoParlays: summarize(lottoParlays),
    longshots: summarize(longshots)
  }
  const loadedTabs = source.loadedTabs || []
  const scannedRowCounts = source.scannedRowCounts || Object.fromEntries(loadedTabs.map(tab => [
    tab,
    sourceRows.filter(row => row.__table === tab).length
  ]))
  const resultRowCounts = source.resultRowCounts || Object.fromEntries(loadedTabs.map(tab => [
    tab,
    rows.filter(row => row.__table === tab).length
  ]))
  const counts = {
    records: rows.length,
    rows: rows.length,
    free: free.length,
    vip: vip.length,
    props: propsLab.length,
    lotto: lottoParlays.length,
    longshots: longshots.length
  }
  const resultCounts = {
    total: rows.length,
    byOutcome: countBy(rows, row => row.result),
    bySection: countBy(rows, row => row.section),
    byDate: countBy(rows, row => row.date)
  }
  const recentSettledRows = rows
    .filter(row => row.date === '2026-06-20' || row.date === '2026-06-19')
    .map(diagnosticRow)

  return {
    success: true,
    source: 'google-sheets',
    sourceOfTruth: 'Google Sheets',
    spreadsheetId: source.spreadsheetId || '',
    loadedTabs,
    date: todayET(),
    days,
    warnings: source.warnings || [],
    scanned: scannedRowCounts,
    scannedRowCounts,
    resultRowCounts,
    resultCounts,
    recentSettledRows,
    diagnostics: {
      spreadsheetId: source.spreadsheetId || '',
      loadedTabs,
      scannedRowCounts,
      resultRowCounts,
      resultCounts,
      recentSettledRows
    },
    summary,
    byDate: groupByDate(rows),
    records: rows,
    rows,
    free,
    vip,
    props: propsLab,
    lotto: lottoParlays,
    longshots,
    counts
  }
}

export default async function handler(req, res) {
  try {
    const days = Math.min(Math.max(Number(req.query?.days || 180), 1), 3650)
    const source = await listSettledGoogleSheetsPicksWithWarnings()
    res.status(200).json(buildResultsPayload(source, { days }))
  } catch (error) {
    console.error(error)
    res.status(500).json({
      success: false,
      source: 'google-sheets',
      sourceOfTruth: 'Google Sheets',
      error: error.message || String(error)
    })
  }
}
