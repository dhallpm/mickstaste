const AIRTABLE_API_ROOT = 'https://api.airtable.com/v0'
const DEFAULT_BASE_ID = 'appsVhMax3qWQ1odj'

const TABLES = {
  masterPicks: {
    label: 'Master Picks',
    section: 'master',
    table: () => process.env.AIRTABLE_MASTER_PICKS_TABLE_ID || process.env.AIRTABLE_MASTER_PICKS_TABLE || 'tblB0LZW6ATToi8tF'
  },
  propsLab: {
    label: 'Props Lab',
    section: 'props',
    table: () => process.env.AIRTABLE_PROPS_TABLE_ID || process.env.AIRTABLE_PROPS_TABLE || 'tblPdZG1sTbjD74mx'
  },
  lottoParlays: {
    label: 'Lotto Parlays',
    section: 'lotto',
    table: () => process.env.AIRTABLE_LOTTO_TABLE_ID || process.env.AIRTABLE_LOTTO_TABLE || 'tbllr4X5WVUxtmQyL'
  },
  longshots: {
    label: 'Longshots',
    section: 'longshots',
    table: () => process.env.AIRTABLE_LONGSHOTS_TABLE_ID || process.env.AIRTABLE_LONGSHOTS_TABLE || 'tblE2H2iiKoFqQXHl'
  }
}

function baseId() {
  return String(process.env.AIRTABLE_VERIFIED_BASE_ID || process.env.AIRTABLE_BASE_ID || DEFAULT_BASE_ID).trim()
}

function apiKey() {
  const key = process.env.AIRTABLE_API_KEY
  if (!key) throw new Error('AIRTABLE_API_KEY is required')
  return key
}

function text(value) {
  return String(value ?? '').trim()
}

function keyToken(value = '') {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

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

function excludedStateLabel(value) {
  return /^(pending|watchlist|conditional|released|open|active|lean|pass)$/i.test(text(value)) ? text(value) : ''
}

function hasSettlementValue(fields = {}) {
  const wanted = new Set(PROFIT_LOSS_FIELD_NAMES.map(keyToken))
  return Object.entries(fields || {}).some(([key, value]) => wanted.has(keyToken(key)) && text(value))
}

export function shouldIncludeResultRecord(fields = {}) {
  const resultValues = values(fields, RESULT_FIELD_NAMES)
  const statusValues = values(fields, STATUS_FIELD_NAMES)
  const hasFinalResult = resultValues.some(value => finalResultLabel(value))
  const hasClosedStatus = statusValues.some(value => closedStatusLabel(value))
  const hasProfitLoss = hasSettlementValue(fields)
  const hasExcludedState = [...resultValues, ...statusValues].some(value => excludedStateLabel(value))

  if (hasExcludedState && !hasFinalResult && !hasProfitLoss) return false
  return hasFinalResult || hasClosedStatus || hasProfitLoss
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

function normalizeProfitLoss(value) {
  const raw = text(value)
  if (!raw) return ''
  if (/u$/i.test(raw)) return raw
  const n = Number(raw.replace(/,/g, ''))
  if (!Number.isFinite(n)) return raw
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}u`
}

function parseNumber(value) {
  const match = String(value ?? '').replace(/,/g, '').match(/[-+]?\d*\.?\d+/)
  return match ? Number(match[0]) : NaN
}

function formatUnits(value) {
  if (!Number.isFinite(value)) return ''
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}u`
}

function calculateProfitLoss(fields = {}) {
  const result = values(fields, RESULT_FIELD_NAMES).map(value => finalResultLabel(value)).find(Boolean)
  const units = parseNumber(first(fields, ['Units', 'Units to Commit', 'Stake']))
  if (result && Number.isFinite(units) && units > 0) {
    if (result === 'Push' || result === 'Void') return '0.00u'
    if (result === 'Loss') return `-${units.toFixed(2)}u`
    if (result === 'Win') {
      const odds = parseNumber(first(fields, ['Odds', 'Posted Odds', 'American Odds']))
      if (Number.isFinite(odds) && odds !== 0) {
        return formatUnits(odds > 0 ? units * odds / 100 : units * 100 / Math.abs(odds))
      }
    }
  }
  return normalizeProfitLoss(first(fields, PROFIT_LOSS_FIELD_NAMES))
}

export function hasPositiveUnits(row = {}) {
  const fields = row.fields || row
  const units = parseNumber(first(fields, ['Units', 'Units to Commit', 'Stake']))
  return Number.isFinite(units) && units > 0
}

function inferResultFromProfitLoss(value) {
  const raw = text(value)
  if (!raw) return ''
  const n = Number(raw.replace(/[u,]/gi, ''))
  if (!Number.isFinite(n)) return ''
  if (n > 0) return 'Win'
  if (n < 0) return 'Loss'
  return 'Push'
}

function normalizeRecord(record = {}, config = {}) {
  const fields = record.fields || {}
  const date = dateKey(first(fields, ['Date', 'Game Date', 'Posted Time', 'Timestamp', 'Settled At']))
  const section = config.section
  const access = text(first(fields, ['Access', 'Tier', 'Access Tier'])) || (isVip(fields) ? 'VIP' : 'Free')
  const pick = pickTitle(fields, section)
  const profitLoss = calculateProfitLoss(fields)
  const rawStatus = text(first(fields, STATUS_FIELD_NAMES))
  const finalResult = values(fields, RESULT_FIELD_NAMES).map(value => finalResultLabel(value)).find(Boolean)
  const result = finalResult || inferResultFromProfitLoss(profitLoss)
  const closedStatus = values(fields, STATUS_FIELD_NAMES).some(value => closedStatusLabel(value))
  const status = result || (closedStatus ? 'Closed' : rawStatus)
  const category = text(first(fields, ['Category', 'Parlay Group', 'Longshot'])) || config.label
  const closingNumber = first(fields, ['Closing Number', 'Closing Line', 'Verified Closing Number', 'Best Number'])
  return {
    id: record.id,
    airtableRecordId: record.id,
    __source: 'Airtable Results API',
    __table: config.label,
    __section: section,
    source: 'Airtable',
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
    'Bet Type': text(first(fields, ['Bet Type', 'Type', 'Market', 'Prop'])) || (section === 'props' ? 'Player Prop' : section === 'lotto' ? 'Parlay' : ''),
    betType: text(first(fields, ['Bet Type', 'Type', 'Market', 'Prop'])) || (section === 'props' ? 'Player Prop' : section === 'lotto' ? 'Parlay' : ''),
    Category: category,
    category,
    Odds: americanOdds(first(fields, ['Odds', 'Posted Odds', 'American Odds'])),
    odds: americanOdds(first(fields, ['Odds', 'Posted Odds', 'American Odds'])),
    Grade: text(first(fields, ['Grade', 'Card Grade'])),
    grade: text(first(fields, ['Grade', 'Card Grade'])),
    Units: first(fields, ['Units', 'Units to Commit', 'Stake']),
    units: first(fields, ['Units', 'Units to Commit', 'Stake']),
    'Best Number': first(fields, ['Best Number', 'Line', 'Number']),
    bestNumber: first(fields, ['Best Number', 'Line', 'Number']),
    'Closing Number': closingNumber,
    closingNumber,
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
    profitLoss,
    ROI: first(fields, ['ROI']),
    roi: first(fields, ['ROI']),
    Access: access,
    access,
    Sportsbook: text(first(fields, ['Sportsbook', 'Book'])),
    sportsbook: text(first(fields, ['Sportsbook', 'Book'])),
    Writeup: text(first(fields, ['Writeup', 'Public Writeup', 'Summary'])),
    writeup: text(first(fields, ['Writeup', 'Public Writeup', 'Summary'])),
    Notes: text(first(fields, ['Notes', 'Result Notes', 'Settlement Notes', 'Market Notes', 'Leg Results', 'Losing Leg'])),
    notes: text(first(fields, ['Notes', 'Result Notes', 'Settlement Notes', 'Market Notes', 'Leg Results', 'Losing Leg'])),
    Legs: text(first(fields, ['Legs', 'Parlay Group'])) || pick,
    legs: text(first(fields, ['Legs', 'Parlay Group'])) || pick,
    Timestamp: first(fields, ['Settled At', 'Posted Time', 'Timestamp']),
    timestamp: first(fields, ['Settled At', 'Posted Time', 'Timestamp'])
  }
}

export function normalizeRow(row = {}, sourceTable = '') {
  const source = text(sourceTable || row.__table || row['Original Table'])
  const section = /props/i.test(source) ? 'props' :
    /lotto|parlay/i.test(source) ? 'lotto' :
      /longshot/i.test(source) ? 'longshots' :
        'master'
  return normalizeRecord({ id: row.id || row.airtableRecordId || '', fields: row }, {
    label: source || (section === 'master' ? 'Master Picks' : section),
    section
  })
}

async function listTable(config) {
  const table = config.table()
  const rows = []
  let offset = ''
  do {
    const url = new URL(`${AIRTABLE_API_ROOT}/${baseId()}/${encodeURIComponent(table)}`)
    url.searchParams.set('pageSize', '100')
    if (offset) url.searchParams.set('offset', offset)
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        'Content-Type': 'application/json'
      }
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      return { rows: [], warning: `${config.label}: ${payload?.error?.message || payload?.error?.type || response.statusText}` }
    }
    rows.push(...(payload.records || []))
    offset = payload.offset || ''
  } while (offset)
  return { rows, warning: '' }
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

export default async function handler(req, res) {
  try {
    const days = Math.min(Math.max(Number(req.query?.days || 180), 1), 3650)
    const warnings = []
    const rows = []
    const scanned = {}

    for (const config of Object.values(TABLES)) {
      const result = await listTable(config)
      if (result.warning) warnings.push(result.warning)
      scanned[config.label] = result.rows.length
      rows.push(...result.rows
        .filter(record => shouldIncludeResultRecord(record.fields || {}))
        .map(record => normalizeRecord(record, config)))
    }

    const filtered = dedupe(rows)
      .filter(row => withinDays(row, days))
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.timestamp || '').localeCompare(String(a.timestamp || '')))

    const props = filtered.filter(row => row.__section === 'props')
    const lotto = filtered.filter(row => row.__section === 'lotto')
    const longshots = filtered.filter(row => row.__section === 'longshots')
    const master = filtered.filter(row => row.__section === 'master')
    const vip = master.filter(row => isVip(row))
    const free = master.filter(row => !isVip(row))

    res.status(200).json({
      success: true,
      source: 'airtable',
      sourceOfTruth: 'Airtable',
      date: todayET(),
      days,
      warnings,
      scanned,
      rows: filtered,
      free,
      vip,
      props,
      lotto,
      longshots,
      results: filtered,
      counts: {
        rows: filtered.length,
        free: free.length,
        vip: vip.length,
        props: props.length,
        lotto: lotto.length,
        longshots: longshots.length
      }
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error.message || String(error) })
  }
}
