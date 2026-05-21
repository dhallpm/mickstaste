import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ingestPicksToAirtable, syncAirtableOperatorToSheets } from './micksSyncAutomation.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FRAMEWORK_DIR = path.join(__dirname, '..', 'micks-framework')
const ALLOWED_MODES = new Set(['draft', 'review', 'publish'])
const ALLOWED_ACCESS = new Set(['free', 'vip', 'premium', 'auto'])
const FRAMEWORK_FILE_ORDER = [
  'README.md',
  'nba.md',
  'wnba.md',
  'ufc.md',
  'props.md',
  'lotto-parlays.md',
  'bankroll.md',
  'closing-odds.md',
  'data-integrity.md',
  'changelog.md'
]

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function param(options, name, fallback = '') {
  const value = options?.[name]
  return value === undefined || value === null || value === '' ? fallback : value
}

function numberValue(value, fallback = '') {
  if (value === undefined || value === null || value === '') return fallback
  const number = Number(String(value).replace(/[^\d.+-]/g, ''))
  return Number.isFinite(number) ? number : fallback
}

function boolValue(value) {
  return value === true || ['1', 'true', 'yes', 'y'].includes(String(value || '').trim().toLowerCase())
}

function impliedProbability(odds) {
  const price = numberValue(odds, NaN)
  if (!Number.isFinite(price) || price === 0) return ''
  return price > 0
    ? Number((100 / (price + 100) * 100).toFixed(2))
    : Number((Math.abs(price) / (Math.abs(price) + 100) * 100).toFixed(2))
}

function edgePercent(trueProbability, odds) {
  const trueProb = numberValue(trueProbability, NaN)
  const implied = impliedProbability(odds)
  if (!Number.isFinite(trueProb) || !Number.isFinite(implied)) return ''
  const normalized = trueProb <= 1 ? trueProb * 100 : trueProb
  return Number((normalized - implied).toFixed(2))
}

function gradeFromEdge(edge, hasEnoughData) {
  if (!hasEnoughData) return 'Review'
  if (!Number.isFinite(edge)) return 'Review'
  if (edge >= 5) return 'A'
  if (edge >= 3) return 'B'
  if (edge >= 1.5) return 'C'
  return 'Pass'
}

function noBetCutoff(odds, edge) {
  const price = numberValue(odds, NaN)
  if (!Number.isFinite(price) || !Number.isFinite(edge) || edge <= 0) return ''
  const buffer = Math.max(5, Math.round(edge * 2))
  return price < 0 ? price - buffer : price + buffer
}

function get(row, keys) {
  for (const key of keys) {
    const value = row?.[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return ''
}

function normalizeProviderRows(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.picks)) return payload.picks
  if (Array.isArray(payload?.candidates)) return payload.candidates
  if (Array.isArray(payload?.events)) return payload.events
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

function configuredProvider() {
  if (process.env.MICKS_PICKS_PROVIDER_JSON) return { type: 'json' }
  if (process.env.MICKS_PICKS_PROVIDER_URL) return { type: 'url', url: process.env.MICKS_PICKS_PROVIDER_URL }
  if (process.env.MICKS_PICKS_DATA_URL) return { type: 'url', url: process.env.MICKS_PICKS_DATA_URL }
  return null
}

async function loadFrameworkSummary() {
  const entries = await fs.readdir(FRAMEWORK_DIR, { withFileTypes: true }).catch(() => [])
  const markdownFiles = entries
    .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
    .map(entry => entry.name)
  const known = FRAMEWORK_FILE_ORDER
  const extras = markdownFiles
    .filter(file => !FRAMEWORK_FILE_ORDER.includes(file))
    .sort((left, right) => left.localeCompare(right))
  const files = [...known, ...extras]
  const loaded = []
  for (const file of files) {
    try {
      const text = await fs.readFile(path.join(FRAMEWORK_DIR, file), 'utf8')
      loaded.push({ file, available: true, lines: text.split(/\r?\n/).filter(Boolean).slice(0, 12) })
    } catch {
      loaded.push({ file, available: false, lines: [] })
    }
  }
  return loaded
}

function frameworkLoadedNames(framework = []) {
  return framework.map(item => item.file)
}

async function fetchProviderRows(provider, options) {
  if (provider.type === 'json') {
    return normalizeProviderRows(JSON.parse(process.env.MICKS_PICKS_PROVIDER_JSON))
  }

  const url = new URL(provider.url)
  for (const key of ['date', 'sport', 'league']) {
    if (options[key]) url.searchParams.set(key, options[key])
  }
  const headers = { Accept: 'application/json' }
  if (process.env.MICKS_PICKS_PROVIDER_API_KEY) {
    headers.Authorization = `Bearer ${process.env.MICKS_PICKS_PROVIDER_API_KEY}`
  }

  const response = await fetch(url, { headers })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(`Configured Micks Picks provider returned ${response.status}.`)
    error.statusCode = 502
    error.providerStatus = response.status
    error.providerMessage = payload?.error?.message || payload?.message || response.statusText
    throw error
  }
  return normalizeProviderRows(payload)
}

function candidateToPick(candidate, options) {
  const odds = numberValue(get(candidate, ['odds', 'Odds', 'price', 'Price', 'americanOdds', 'American Odds']), '')
  const trueProbability = get(candidate, ['trueProbability', 'True Probability', 'estimatedTrueProbability', 'winProbability', 'Win Probability'])
  const edge = edgePercent(trueProbability, odds)
  const hasEnoughData = Boolean(
    get(candidate, ['sourceVerification', 'Source Verification', 'source', 'Source']) &&
    get(candidate, ['game', 'Game', 'matchup', 'Matchup', 'event', 'Event']) &&
    get(candidate, ['pick', 'Pick', 'selection', 'Selection']) &&
    odds !== ''
  )
  const mode = options.mode
  const publish = mode === 'publish' && hasEnoughData
  const grade = get(candidate, ['grade', 'Grade']) || gradeFromEdge(edge, hasEnoughData)
  const access = String(options.access || '').toLowerCase() === 'auto'
    ? (grade === 'A' ? 'VIP' : 'Free')
    : options.access

  return {
    date: options.date,
    sport: get(candidate, ['sport', 'Sport']) || options.sport || get(candidate, ['league', 'League']) || options.league || '',
    league: get(candidate, ['league', 'League']) || options.league || get(candidate, ['sport', 'Sport']) || options.sport || '',
    game: get(candidate, ['game', 'Game', 'matchup', 'Matchup', 'event', 'Event']),
    pick: get(candidate, ['pick', 'Pick', 'selection', 'Selection']),
    betType: get(candidate, ['betType', 'Bet Type', 'market', 'Market', 'type', 'Type']) || 'Moneyline',
    access,
    odds,
    sportsbook: get(candidate, ['sportsbook', 'Sportsbook', 'book', 'Book']) || 'Provider',
    units: numberValue(get(candidate, ['units', 'Units']), grade === 'A' ? 1 : 0.5),
    grade,
    confidence: numberValue(get(candidate, ['confidence', 'Confidence']), edge !== '' ? Math.max(1, Math.min(99, Math.round(50 + edge))) : ''),
    evEdge: edge,
    bestNumber: get(candidate, ['bestNumber', 'Best Number']) || odds,
    noBetCutoff: get(candidate, ['noBetCutoff', 'No Bet Cutoff']) || noBetCutoff(odds, edge),
    status: publish ? 'Active' : (mode === 'draft' ? 'Draft' : 'Pregame'),
    releaseStatus: publish ? 'Released' : 'Held',
    result: 'Pending',
    profitLoss: '+0.00u',
    archiveStatus: 'Active',
    writeup: get(candidate, ['writeup', 'Writeup']) || `${get(candidate, ['pick', 'Pick', 'selection', 'Selection'])} is queued for Micks Picks review from configured provider data.`,
    marketNotes: get(candidate, ['marketNotes', 'Market Notes']) || (edge !== '' ? `Implied probability ${impliedProbability(odds)}%; estimated edge ${edge}%.` : 'Provider supplied candidate; edge requires complete probability data.'),
    injuryNotes: get(candidate, ['injuryNotes', 'Injury Notes']) || get(candidate, ['injuryImpact', 'Injury Impact']),
    sourceVerification: get(candidate, ['sourceVerification', 'Source Verification']) || get(candidate, ['source', 'Source']) || 'Configured Micks Picks provider.',
    fullAnalysis: get(candidate, ['fullAnalysis', 'Full Analysis', 'analysis', 'Analysis']) || [
      'Generated by the Airtable-first Micks Picks framework layer.',
      edge !== '' ? `Market price was compared with estimated true probability for a ${edge}% edge.` : 'Probability data was incomplete, so this card remains review-first.',
      'Confirm market, injury/context, and best available number before release.'
    ].join(' ')
  }
}

function isUsablePick(pick) {
  return Boolean(pick.date && pick.game && pick.pick && pick.betType && pick.odds !== '' && pick.sport)
}

export async function generateMicksPicks(options = {}) {
  const date = String(param(options, 'date', todayKey()))
  const mode = String(param(options, 'mode', 'review')).toLowerCase()
  const access = String(param(options, 'access', 'auto'))
  const normalizedAccess = access.toLowerCase()
  const maxPicks = Math.max(1, Math.min(25, numberValue(param(options, 'maxPicks', 3), 3)))
  const provider = configuredProvider()
  const framework = await loadFrameworkSummary()

  if (!ALLOWED_MODES.has(mode)) {
    return { success: false, error: 'Invalid mode. Use draft, review, or publish.' }
  }
  if (!ALLOWED_ACCESS.has(normalizedAccess)) {
    return { success: false, error: 'Invalid access. Use Free, VIP, Premium, or auto.' }
  }
  if (!provider) {
    return {
      success: false,
      needsDataProvider: true,
      message: 'No data provider configured for automated Micks Picks generation.',
      providerOptions: ['MICKS_PICKS_PROVIDER_JSON', 'MICKS_PICKS_PROVIDER_URL', 'MICKS_PICKS_DATA_URL'],
      frameworkLoaded: frameworkLoadedNames(framework)
    }
  }

  const providerRows = await fetchProviderRows(provider, {
    date,
    sport: param(options, 'sport', ''),
    league: param(options, 'league', '')
  })
  const scopedRows = providerRows.filter(row => {
    const sport = String(param(options, 'sport', '')).toLowerCase()
    const league = String(param(options, 'league', '')).toLowerCase()
    const rowSport = String(get(row, ['sport', 'Sport'])).toLowerCase()
    const rowLeague = String(get(row, ['league', 'League'])).toLowerCase()
    return (!sport || rowSport === sport || rowLeague === sport) &&
      (!league || rowLeague === league)
  })

  const generated = scopedRows
    .map(row => candidateToPick(row, {
      date,
      sport: param(options, 'sport', ''),
      league: param(options, 'league', ''),
      mode,
      access: normalizedAccess === 'auto' ? 'auto' : access
    }))
    .filter(isUsablePick)
    .slice(0, maxPicks)

  const warnings = []
  if (!generated.length) {
    return {
      success: true,
      generated: 0,
      created: 0,
      updated: 0,
      skipped: providerRows.length,
      mode,
      cards: [],
      warnings: ['Configured provider returned no complete pick candidates. No Airtable rows were created.'],
      frameworkLoaded: frameworkLoadedNames(framework)
    }
  }

  const dryRun = boolValue(options.dryRun)
  if (dryRun) {
    return {
      success: true,
      dryRun: true,
      generated: generated.length,
      created: 0,
      updated: 0,
      skipped: 0,
      mode,
      cards: generated,
      warnings,
      frameworkLoaded: frameworkLoadedNames(framework)
    }
  }

  const ingest = await ingestPicksToAirtable({ date, picks: generated }, { dryRun: false })
  warnings.push(...(ingest.warnings || []))
  let backup = { skipped: true, reason: 'No successful Airtable writes to mirror.' }

  if (!ingest.errors?.length && (ingest.created || ingest.updated)) {
    backup = await syncAirtableOperatorToSheets({ dryRun: false })
    warnings.push(...(backup.warnings || []))
  }

  return {
    success: !ingest.errors?.length,
    mode,
    generated: generated.length,
    cards: generated,
    created: ingest.created,
    updated: ingest.updated,
    skipped: ingest.skipped,
    considered: ingest.considered,
    errors: ingest.errors,
    warnings,
    backup,
    syncBatchId: ingest.syncBatchId,
    frameworkLoaded: frameworkLoadedNames(framework)
  }
}

export default generateMicksPicks
