import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildCustomerFacingAnalysis, sanitizeCustomerFacingAnalysis, sanitizePublicWriteup } from './customerFacingAnalysis.js'
import { sanitizeCustomerFacingCopy, sanitizeCustomerFacingTitle } from './customerFacingTitle.js'
import { ingestPicksToAirtable, syncAirtableOperatorToSheets } from './micksSyncAutomation.js'

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'
const DEFAULT_AI_MODEL = 'gpt-5.5'
const JSON_SCAN_LIMIT = 50000
const OPENAI_PRIMARY_TIMEOUT_MS = 22000
const OPENAI_REPAIR_TIMEOUT_MS = 8000
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FRAMEWORK_DIR = path.join(__dirname, '..', 'micks-framework')
const A_GRADE_HUNT_RULES_FILE = 'current/a-grade-hunt-rules.json'
const ALLOWED_MODES = new Set(['draft', 'review', 'publish', 'props', 'longshots'])
const ALLOWED_ACCESS = new Set(['free', 'vip', 'premium', 'auto'])
const SUPPORTED_RUN_LEAGUES = ['MLB', 'NHL', 'NBA', 'WNBA', 'UFC']
const FRAMEWORK_FILE_ORDER = [
  'README.md',
  'a-grade-hunt.md',
  A_GRADE_HUNT_RULES_FILE,
  'mlb.md',
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
const REQUIRED_CARD_FIELDS = ['Game', 'Pick', 'Odds', 'Sportsbook', 'Source Verification']
const A_GRADE_FIELDS = [
  'A Grade Gate Result',
  'A Grade Evidence Count',
  'Market Misprice Reason',
  'Unresolved Conflict',
  'A-Hunt Source Notes'
]
const A_HUNT_MARKET_PRIORITIES = [
  'MLB pitcher K props',
  'MLB outs recorded',
  'MLB first 5 lines',
  'MLB team totals',
  'MLB lineup/weather/bullpen driven totals',
  'WNBA injury/rotation spreads',
  'WNBA pace totals',
  'WNBA role-stable props',
  'NBA role-stable props',
  'NBA rest/pace totals',
  'NHL only after goalie confirmation'
]
const DEFAULT_QUOTAS = {
  maxVipPicks: 2,
  maxFreePicks: 1,
  maxProps: 2,
  maxLottoCards: 2,
  maxLottoProps: 1,
  maxLongshots: 1,
  maxCandidatesPerLeague: 2,
  maxTotalCandidates: 8,
  maxManualReviewCards: 6,
  maxAllSportsRuntimeMs: 42000
}
const DEFAULT_PER_RUN_TOKEN_BUDGET = 7000
const DEFAULT_MAX_OUTPUT_TOKENS = 1200
const DEFAULT_OPENAI_TIMEOUT_MS = 45000
const PROPS_PASS_OUTPUT_TOKEN_LIMIT = 1100
const PROPS_PASS_RETRY_OUTPUT_TOKEN_LIMIT = 700
const RATE_CACHE_FILE = path.join(process.env.TMPDIR || process.env.TEMP || '/tmp', 'micks-picks-rate-cache.json')
const rateCacheMemory = {
  runs: [],
  results: {}
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function param(options, name, fallback = '') {
  const value = options?.[name]
  return value === undefined || value === null || value === '' ? fallback : value
}

function boolValue(value) {
  return value === true || ['1', 'true', 'yes', 'y'].includes(String(value || '').trim().toLowerCase())
}

function normalizeRunLeague(value = '') {
  const league = String(value || '').trim().toUpperCase()
  return SUPPORTED_RUN_LEAGUES.includes(league) ? league : ''
}

function isAllSportsValue(value = '') {
  const normalized = String(value || '').trim().toUpperCase()
  return normalized === '' || normalized === 'ALL'
}

function runLeagues(options = {}) {
  const league = param(options, 'league', '')
  const sport = param(options, 'sport', '')
  const cursor = normalizeRunLeague(param(options, 'leagueCursor', param(options, 'startLeague', '')))
  const cursorSlice = leagues => {
    if (!cursor) return leagues
    const index = leagues.indexOf(cursor)
    return index >= 0 ? leagues.slice(index) : leagues
  }
  if (isAllSportsValue(league) && isAllSportsValue(sport)) return cursorSlice(SUPPORTED_RUN_LEAGUES)
  const requested = normalizeRunLeague(league) || normalizeRunLeague(sport)
  return requested ? [requested] : cursorSlice(SUPPORTED_RUN_LEAGUES)
}

function truthyEnv(name) {
  return boolValue(process.env[name])
}

function numberValue(value, fallback = '') {
  if (value === undefined || value === null || value === '') return fallback
  const number = Number(String(value).replace(/[^\d.+-]/g, ''))
  return Number.isFinite(number) ? number : fallback
}

function intValue(value, fallback, min = 0, max = 25) {
  const number = numberValue(value, NaN)
  if (!Number.isFinite(number)) return fallback
  return Math.max(min, Math.min(max, Math.floor(number)))
}

function optionBool(options, name, fallback) {
  const value = options?.[name]
  if (value === undefined || value === null || value === '') return fallback
  return boolValue(value)
}

function enabledQuota(value, fallback, max) {
  const number = intValue(value, fallback, 0, max)
  return number > 0 ? number : fallback
}

function tokenBudgetLimit() {
  return intValue(process.env.MICKS_PICKS_PER_RUN_TOKEN_BUDGET, DEFAULT_PER_RUN_TOKEN_BUDGET, 1000, 200000)
}

function maxOutputTokens() {
  return intValue(process.env.MICKS_PICKS_MAX_OUTPUT_TOKENS, DEFAULT_MAX_OUTPUT_TOKENS, 200, 700)
}

function openAiTimeoutMs() {
  return intValue(process.env.MICKS_PICKS_OPENAI_TIMEOUT_MS, OPENAI_PRIMARY_TIMEOUT_MS, 1000, 25000)
}

function openAiAttemptTimeoutMs(attempt = 0) {
  if (attempt > 0) return Math.min(openAiTimeoutMs(), OPENAI_REPAIR_TIMEOUT_MS)
  return openAiTimeoutMs()
}

function estimateTokens(value = '') {
  return Math.ceil(String(value || '').length / 4)
}

function rateWindowConfig() {
  return {
    windowHours: intValue(process.env.MICKS_PICKS_RATE_WINDOW_HOURS, 5, 1, 24),
    maxRunsPerWindow: intValue(process.env.MICKS_PICKS_MAX_RUNS_PER_WINDOW, 2, 1, 25),
    minutesBetweenRuns: intValue(process.env.MICKS_PICKS_MINUTES_BETWEEN_RUNS, 30, 0, 300),
    maxOpenAiCallsPerRun: intValue(process.env.MICKS_PICKS_MAX_OPENAI_CALLS_PER_RUN, 1, 1, 5),
    deepModeMaxOpenAiCalls: intValue(process.env.MICKS_PICKS_DEEP_MODE_MAX_OPENAI_CALLS, 2, 1, 5)
  }
}

function runCacheKey(options = {}, mode = '') {
  return [
    'run-micks-picks',
    param(options, 'date', todayKey()),
    param(options, 'sport', ''),
    param(options, 'league', ''),
    mode || param(options, 'mode', 'review'),
    boolValue(options.dryRun) ? 'dry' : 'write',
    boolValue(options.includeProps) ? 'props' : 'no-props',
    boolValue(options.includeLotto) ? 'lotto' : 'no-lotto',
    boolValue(options.includeLottoProps) ? 'lotto-props' : 'no-lotto-props',
    boolValue(options.allowReviewLotto) ? 'review-lotto' : 'no-review-lotto'
  ].join('|').toLowerCase()
}

async function readRateCache() {
  try {
    const text = await fs.readFile(RATE_CACHE_FILE, 'utf8')
    const parsed = JSON.parse(text)
    return {
      runs: Array.isArray(parsed.runs) ? parsed.runs : [],
      results: parsed.results && typeof parsed.results === 'object' ? parsed.results : {}
    }
  } catch {
    return { ...rateCacheMemory, results: { ...rateCacheMemory.results } }
  }
}

async function writeRateCache(cache) {
  rateCacheMemory.runs = Array.isArray(cache.runs) ? cache.runs : []
  rateCacheMemory.results = cache.results && typeof cache.results === 'object' ? cache.results : {}
  try {
    await fs.mkdir(path.dirname(RATE_CACHE_FILE), { recursive: true })
    await fs.writeFile(RATE_CACHE_FILE, JSON.stringify(rateCacheMemory), 'utf8')
  } catch {
    // Temporary cache writes are best effort on serverless platforms.
  }
}

function rateBudgetFromCache(cache, config, nowMs, cachedResultUsed = false, overrideUsed = false) {
  const windowMs = config.windowHours * 60 * 60 * 1000
  const runs = (cache.runs || [])
    .map(run => ({ ...run, atMs: Date.parse(run.at) }))
    .filter(run => Number.isFinite(run.atMs) && nowMs - run.atMs < windowMs)
    .sort((left, right) => left.atMs - right.atMs)
  const latest = runs[runs.length - 1]
  const maxNext = runs.length >= config.maxRunsPerWindow ? runs[0].atMs + windowMs : nowMs
  const minNext = latest ? latest.atMs + (config.minutesBetweenRuns * 60 * 1000) : nowMs
  const nextAllowedRunAt = new Date(Math.max(maxNext, minNext, nowMs)).toISOString()
  return {
    windowHours: config.windowHours,
    runsUsed: runs.length,
    runsRemaining: Math.max(0, config.maxRunsPerWindow - runs.length),
    cachedResultUsed,
    overrideUsed,
    nextAllowedRunAt,
    maxRunsPerWindow: config.maxRunsPerWindow,
    minutesBetweenRuns: config.minutesBetweenRuns
  }
}

async function rateGuard(options = {}, mode = '') {
  const config = rateWindowConfig()
  const nowMs = Date.now()
  const cache = await readRateCache()
  const key = runCacheKey(options, mode)
  const windowMs = config.windowHours * 60 * 60 * 1000
  cache.runs = (cache.runs || []).filter(run => {
    const atMs = Date.parse(run.at)
    return Number.isFinite(atMs) && nowMs - atMs < windowMs
  })
  const cached = cache.results?.[key]
  const cachedAtMs = cached?.cachedAt ? Date.parse(cached.cachedAt) : NaN
  const forceRefresh = boolValue(options.forceRefresh)
  const overrideUsed = boolValue(options.overrideRateGuard)
  if (!forceRefresh && !overrideUsed && cached?.result && Number.isFinite(cachedAtMs) && nowMs - cachedAtMs < windowMs) {
    return {
      allowed: false,
      cached: true,
      cache,
      key,
      result: {
        ...cached.result,
        fromCache: true,
        rateBudget: rateBudgetFromCache(cache, config, nowMs, true, false)
      }
    }
  }

  const budget = rateBudgetFromCache(cache, config, nowMs, false, overrideUsed)
  const nextAllowedMs = Date.parse(budget.nextAllowedRunAt)
  if (!overrideUsed && (budget.runsRemaining <= 0 || (Number.isFinite(nextAllowedMs) && nextAllowedMs > nowMs))) {
    return {
      allowed: false,
      cached: false,
      cache,
      key,
      result: {
        success: false,
        rateLimitedByApp: true,
        message: 'Run Micks Picks rate guard active. Use cached result or try later.',
        nextAllowedRunAt: budget.nextAllowedRunAt,
        rateBudget: budget
      }
    }
  }

  return { allowed: true, cached: false, cache, key, rateBudget: budget, config, nowMs, overrideUsed }
}

async function saveRateGuardResult(guard, result = {}) {
  if (!guard?.allowed) return result
  const cache = guard.cache || { runs: [], results: {} }
  const now = new Date().toISOString()
  cache.runs = [...(cache.runs || []), { at: now, key: guard.key, calls: result?.tokenBudget?.openAiRuns || 1 }]
  cache.results = {
    ...(cache.results || {}),
    [guard.key]: {
      cachedAt: now,
      result: {
        ...result,
        rateBudget: undefined
      }
    }
  }
  await writeRateCache(cache)
  return {
    ...result,
    rateBudget: rateBudgetFromCache(cache, guard.config, Date.now(), false, Boolean(guard.overrideUsed))
  }
}

function impliedProbability(odds) {
  const price = numberValue(odds, NaN)
  if (!Number.isFinite(price) || price === 0) return ''
  return price > 0
    ? Number((100 / (price + 100) * 100).toFixed(2))
    : Number((Math.abs(price) / (Math.abs(price) + 100) * 100).toFixed(2))
}

function configuredProvider() {
  if (process.env.MICKS_PICKS_PROVIDER_JSON) return { type: 'manual_override', label: 'MICKS_PICKS_PROVIDER_JSON' }
  if (process.env.MICKS_PICKS_PROVIDER_URL) return { type: 'manual_context_url', url: process.env.MICKS_PICKS_PROVIDER_URL, label: 'MICKS_PICKS_PROVIDER_URL' }
  if (process.env.MICKS_PICKS_DATA_URL) return { type: 'manual_context_url', url: process.env.MICKS_PICKS_DATA_URL, label: 'MICKS_PICKS_DATA_URL' }
  return null
}

async function loadFrameworkFiles() {
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
      loaded.push({
        file,
        available: true,
        content: await fs.readFile(path.join(FRAMEWORK_DIR, file), 'utf8')
      })
    } catch {
      loaded.push({ file, available: false, content: '' })
    }
  }
  return loaded
}

function frameworkLoadedNames(framework = []) {
  return framework.map(item => item.file)
}

function frameworkPrompt(framework = [], context = {}) {
  const league = String(context.league || context.sport || '').toLowerCase()
  const fastMode = context.fastMode !== false
  const ultraFastMode = Boolean(context.ultraFastMode)
  if (ultraFastMode) {
    return [
      'Compact Micks Picks rules:',
      '- Return real current candidates only; never invent games, odds, injuries, books, players, or lines.',
      '- Use A+/A/B+/B/C/Pass grading, implied probability, estimated true probability, EV edge, best number, no-bet cutoff, confidence, and units.',
      '- A-Grade Hunt Mode: search for A candidates before final grading; do not force A grades; B+ is the bridge when A evidence is close but incomplete.',
      `- Apply ${A_GRADE_HUNT_RULES_FILE} as the current A-Hunt rules config for daily cards.`,
      '- A requires 3 independent evidence paths, 5%+ edge or meaningful projection gap, price inside cutoff, confirmed role/news data, no unresolved conflict, and a clear misprice reason.',
      '- A+ requires 7% to 10%+ edge or major stale-line/news mismatch, low number sensitivity, verified news, and strong price protection.',
      '- Positive edge or clear matchup/model edge is required for Review Eligible candidates.',
      '- Put missing/uncertain price, source, injury, or market info in passes/watchlist.',
      league.includes('wnba')
        ? '- WNBA focus: pace/efficiency, matchup edge, injury/news timing, market movement, regression spots, and public-team inflation.'
        : '- Apply sport-specific matchup, market movement, injury/news, and bankroll rules compactly.'
    ].join('\n')
  }
  if (fastMode) {
    const snippets = []
    const addSnippet = (file, limit) => {
      const found = framework.find(item => item.file === file)
      if (!found) return
      const content = found.content || '[file unavailable in runtime bundle]'
      snippets.push(`# FILE: ${file}\n${content.slice(0, limit)}${content.length > limit ? '\n[truncated for fast source acquisition]' : ''}`)
    }
    addSnippet('README.md', 450)
    addSnippet('a-grade-hunt.md', 1400)
    addSnippet(A_GRADE_HUNT_RULES_FILE, 2200)
    addSnippet('bankroll.md', 500)
    addSnippet('closing-odds.md', 450)
    if (league.includes('mlb')) addSnippet('mlb.md', 1400)
    else if (league.includes('wnba')) addSnippet('wnba.md', 1200)
    else if (league.includes('nba')) addSnippet('nba.md', 1000)
    else if (league.includes('ufc')) addSnippet('ufc.md', 1000)
    if (context.includeProps) addSnippet('props.md', 650)
    if (context.includeLotto || context.includeLottoProps) addSnippet('lotto-parlays.md', 500)
    addSnippet('data-integrity.md', 450)
    return snippets.join('\n\n---\n\n')
  }
  const relevant = new Set(['README.md', 'a-grade-hunt.md', A_GRADE_HUNT_RULES_FILE, 'bankroll.md', 'data-integrity.md', 'closing-odds.md'])
  if (league.includes('mlb')) relevant.add('mlb.md')
  if (league.includes('nba')) relevant.add('nba.md')
  if (league.includes('wnba')) relevant.add('wnba.md')
  if (league.includes('ufc')) relevant.add('ufc.md')
  if (context.includeProps) relevant.add('props.md')
  if (context.includeLotto || context.includeLottoProps) relevant.add('lotto-parlays.md')
  if (context.includeLongshots) relevant.add('lotto-parlays.md')

  return framework
    .map(item => {
      const content = item.content || '[file unavailable in runtime bundle]'
      const limit = relevant.has(item.file) ? 3200 : 500
      const clipped = content.length > limit ? `${content.slice(0, limit)}\n[truncated for token budget]` : content
      return `# FILE: ${item.file}\n${clipped}`
    })
    .join('\n\n---\n\n')
}

function optionalManualContext() {
  if (process.env.MICKS_PICKS_PROVIDER_JSON) {
    return `Manual override/context JSON, not primary source:\n${process.env.MICKS_PICKS_PROVIDER_JSON.slice(0, 12000)}`
  }
  if (process.env.MICKS_PICKS_PROVIDER_URL || process.env.MICKS_PICKS_DATA_URL) {
    return `Optional manual context URL: ${process.env.MICKS_PICKS_PROVIDER_URL || process.env.MICKS_PICKS_DATA_URL}`
  }
  return 'No manual provider override configured.'
}

function cleanJsonText(text = '') {
  try {
    const trimmed = String(text ?? '').trim()
    if (trimmed.startsWith('```')) {
      return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    }
    return trimmed
  } catch {
    return ''
  }
}

function extractFirstJsonObject(text = '') {
  try {
    const cleaned = cleanJsonText(text).slice(0, JSON_SCAN_LIMIT)
    if (!cleaned) return null
    let start = -1
    let depth = 0
    let inString = false
    let escaped = false

    for (let index = 0; index < cleaned.length; index += 1) {
      const char = cleaned[index]
      if (inString) {
        if (escaped) {
          escaped = false
        } else if (char === '\\') {
          escaped = true
        } else if (char === '"') {
          inString = false
        }
        continue
      }

      if (char === '"') {
        inString = true
        continue
      }
      if (char === '{') {
        if (depth === 0) start = index
        depth += 1
        continue
      }
      if (char === '}' && depth > 0) {
        depth -= 1
        if (depth === 0 && start >= 0) {
          try {
            return JSON.parse(cleaned.slice(start, index + 1))
          } catch {
            start = -1
          }
        }
      }
    }
    return null
  } catch {
    return null
  }
}

function parseJsonFragment(fragment = '') {
  try {
    return JSON.parse(String(fragment || '').replace(/,\s*([}\]])/g, '$1'))
  } catch {
    return null
  }
}

function findArrayStartForKeys(text = '', keys = []) {
  const cleaned = cleanJsonText(text).slice(0, JSON_SCAN_LIMIT)
  for (const key of keys) {
    const pattern = new RegExp(`["']?${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']?\\s*:`, 'i')
    const match = pattern.exec(cleaned)
    if (!match) continue
    const arrayStart = cleaned.indexOf('[', match.index + match[0].length)
    if (arrayStart >= 0) return { cleaned, key, arrayStart }
  }
  return { cleaned, key: '', arrayStart: -1 }
}

function findMatchingArrayEnd(text = '', start = -1) {
  if (start < 0) return -1
  let depth = 0
  let inString = false
  let escaped = false
  for (let index = start; index < text.length; index += 1) {
    const char = text[index]
    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') {
      inString = true
      continue
    }
    if (char === '[') depth += 1
    if (char === ']') {
      depth -= 1
      if (depth === 0) return index
    }
  }
  return -1
}

function parseCompleteObjectsFromArrayText(text = '', start = -1) {
  const objects = []
  if (start < 0) return objects
  let objectStart = -1
  let objectDepth = 0
  let arrayDepth = 0
  let inString = false
  let escaped = false
  for (let index = start; index < text.length; index += 1) {
    const char = text[index]
    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') {
      inString = true
      continue
    }
    if (char === '[') {
      arrayDepth += 1
      continue
    }
    if (char === ']') {
      arrayDepth -= 1
      if (arrayDepth <= 0) break
      continue
    }
    if (char === '{') {
      if (objectDepth === 0) objectStart = index
      objectDepth += 1
      continue
    }
    if (char === '}' && objectDepth > 0) {
      objectDepth -= 1
      if (objectDepth === 0 && objectStart >= 0) {
        const parsed = parseJsonFragment(text.slice(objectStart, index + 1))
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) objects.push(parsed)
        objectStart = -1
      }
    }
  }
  return objects
}

function recoverArrayForKeys(text = '', keys = []) {
  const { cleaned, arrayStart } = findArrayStartForKeys(text, keys)
  if (arrayStart < 0) return []
  const arrayEnd = findMatchingArrayEnd(cleaned, arrayStart)
  if (arrayEnd >= 0) {
    const parsed = parseJsonFragment(cleaned.slice(arrayStart, arrayEnd + 1))
    if (Array.isArray(parsed)) return parsed
  }
  return parseCompleteObjectsFromArrayText(cleaned, arrayStart)
}

function normalizeRecoveredAiJson(recovered = {}) {
  const rawCandidatePool = Array.isArray(recovered.rawCandidatePool) && recovered.rawCandidatePool.length
    ? recovered.rawCandidatePool
    : Array.isArray(recovered.candidatePool) && recovered.candidatePool.length
    ? recovered.candidatePool
    : Array.isArray(recovered.cards) ? recovered.cards : []
  const sourcesUsed = Array.isArray(recovered.sourcesUsed) && recovered.sourcesUsed.length
    ? recovered.sourcesUsed
    : Array.isArray(recovered.sources) ? recovered.sources : []
  return {
    rawCandidatePool,
    sourcesUsed,
    passes: Array.isArray(recovered.passes) ? recovered.passes : [],
    warnings: [
      ...(Array.isArray(recovered.warnings) ? recovered.warnings : []),
      'Recovered candidate pool from malformed OpenAI JSON.'
    ]
  }
}

function recoverOpenAiJsonFromMalformedText(text = '') {
  try {
    const rawCandidatePool = recoverArrayForKeys(text, ['rawCandidatePool', 'candidatePool', 'cards'])
    if (!rawCandidatePool.length) return null
    return normalizeRecoveredAiJson({
      rawCandidatePool,
      sourcesUsed: recoverArrayForKeys(text, ['sourcesUsed', 'sources']),
      passes: recoverArrayForKeys(text, ['passes']),
      warnings: recoverArrayForKeys(text, ['warnings'])
    })
  } catch {
    return null
  }
}

function parseOpenAiJsonText(text = '') {
  try {
    if (!String(text ?? '').trim()) {
      return { parsed: null, parseErrorType: 'empty_response_text' }
    }
    try {
      const parsed = JSON.parse(cleanJsonText(text))
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return { parsed, parseErrorType: 'ok' }
      if (typeof parsed === 'string' && parsed.trim()) {
        const nested = JSON.parse(cleanJsonText(parsed))
        if (nested && typeof nested === 'object' && !Array.isArray(nested)) return { parsed: nested, parseErrorType: 'ok' }
      }
      return { parsed: null, parseErrorType: 'invalid_json' }
    } catch {
      const extracted = extractFirstJsonObject(text)
      if (extracted) return { parsed: extracted, parseErrorType: 'ok' }
      const recovered = recoverOpenAiJsonFromMalformedText(text)
      if (recovered) return { parsed: recovered, parseErrorType: 'recovered_partial_json' }
      return {
        parsed: null,
        parseErrorType: String(text ?? '').includes('{') ? 'invalid_json' : 'no_json_object'
      }
    }
  } catch {
    return { parsed: null, parseErrorType: 'helper_exception' }
  }
}

function responseText(payload = {}) {
  try {
    if (typeof payload?.output_text === 'string') return payload.output_text
    const parts = []
    for (const item of Array.isArray(payload?.output) ? payload.output : []) {
      for (const content of Array.isArray(item?.content) ? item.content : []) {
        if (content?.type === 'output_text' && content.text) parts.push(String(content.text))
      }
    }
    return parts.join('\n')
  } catch {
    return ''
  }
}

function responseSources(payload = {}, aiJson = {}) {
  try {
    const urls = new Map()
    for (const source of Array.isArray(aiJson?.sourcesUsed) ? aiJson.sourcesUsed : Array.isArray(aiJson?.sources) ? aiJson.sources : []) {
      const url = source?.url || source?.href
      if (url) urls.set(url, { title: source.title || url, url })
    }
    for (const item of Array.isArray(payload?.output) ? payload.output : []) {
      for (const source of Array.isArray(item?.action?.sources) ? item.action.sources : []) {
        const url = source?.url || source?.uri
        if (url) urls.set(url, { title: source.title || url, url })
      }
      for (const content of Array.isArray(item?.content) ? item.content : []) {
        for (const annotation of Array.isArray(content?.annotations) ? content.annotations : []) {
          const url = annotation?.url || annotation?.uri
          if (url) urls.set(url, { title: annotation.title || url, url })
        }
      }
    }
    return Array.from(urls.values())
  } catch {
    return []
  }
}

function searchesRun(payload = {}) {
  try {
    return (Array.isArray(payload?.output) ? payload.output : []).filter(item => String(item?.type || '').includes('web_search')).length
  } catch {
    return 0
  }
}

function previewText(text = '') {
  try {
    return String(text ?? '').slice(0, 500)
  } catch {
    return ''
  }
}

function hasSampleText(value) {
  return /\b(team a|team b|sample|demo|dummy|test game|micks picks test|test ml|retry test)\b/i
    .test(String(value || ''))
}

function hasWord(pattern, value) {
  return pattern.test(String(value || ''))
}

function textFrom(row = {}, keys = []) {
  return keys.map(key => row?.[key]).find(value => value !== undefined && value !== null && value !== '') || ''
}

function normalizeGrade(value = '') {
  return String(value || '').trim().toUpperCase()
}

function gradeScore(grade = '') {
  const normalized = normalizeGrade(grade)
  if (normalized === 'A+') return 48
  if (normalized === 'A') return 40
  if (normalized === 'A-') return 36
  if (normalized === 'B+') return 32
  if (normalized === 'B') return 25
  if (normalized === 'C+') return 16
  if (normalized === 'C') return 12
  if (normalized === 'PASS') return -20
  return 0
}

function edgeScore(value) {
  const edge = numberValue(value, 0)
  return Number.isFinite(edge) ? edge : 0
}

function candidateScore(candidate = {}) {
  const rank = numberValue(candidate.Rank ?? candidate.rank, NaN)
  if (Number.isFinite(rank) && rank > 0) return 1000 - rank
  return gradeScore(textFrom(candidate, ['Grade', 'grade'])) +
    edgeScore(textFrom(candidate, ['EV Edge', 'evEdge'])) +
    (numberValue(textFrom(candidate, ['Confidence', 'confidence']), 0) / 10)
}

function sortCandidates(candidates = []) {
  return [...candidates].sort((left, right) => candidateScore(right) - candidateScore(left))
}

function candidateType(candidate = {}) {
  const value = [
    textFrom(candidate, ['Category', 'category']),
    textFrom(candidate, ['Bet Type', 'betType', 'Market', 'market']),
    textFrom(candidate, ['Prop Type', 'propType']),
    textFrom(candidate, ['Pick', 'pick'])
  ].join(' ')
  if (hasWord(/\b(longshot|long shot|future)\b/i, value)) return 'longshot'
  if (hasWord(/\b(player prop|prop|points|rebounds|assists|\bpra\b|threes|strikeouts|shots|sog|yards)\b/i, value) ||
    textFrom(candidate, ['Player', 'player']) ||
    textFrom(candidate, ['Prop Type', 'propType'])) return 'prop'
  if (hasWord(/\b(parlay|lotto|leg)\b/i, value)) return 'parlay-leg'
  return 'straight'
}

function positiveEdge(candidate = {}) {
  const edge = numberValue(textFrom(candidate, ['EV Edge', 'evEdge']), NaN)
  if (Number.isFinite(edge)) return edge > 0
  return ['A+', 'A', 'A-', 'B+', 'B', 'C+', 'C'].includes(normalizeGrade(textFrom(candidate, ['Grade', 'grade'])))
}

function numericEdge(candidate = {}) {
  return numberValue(textFrom(candidate, ['EV Edge', 'evEdge']), NaN)
}

function hasPositiveEdge(candidate = {}) {
  const edge = numericEdge(candidate)
  return Number.isFinite(edge) && edge > 0
}

function hasNegativeEdge(candidate = {}) {
  const edge = numericEdge(candidate)
  return Number.isFinite(edge) && edge < 0
}

function explicitNoBetReason(candidate = {}) {
  const value = [
    textFrom(candidate, ['Release Gate', 'releaseGate', 'Status', 'status']),
    textFrom(candidate, ['Source Status', 'sourceStatus']),
    textFrom(candidate, ['Market Notes', 'marketNotes']),
    textFrom(candidate, ['Full Analysis', 'fullAnalysis']),
    textFrom(candidate, ['summary'])
  ].join(' ')
  return hasNegativeEdge(candidate) ||
    hasWord(/\b(negative edge|no[- ]?bet|do not play|fake|sample|stale|reject|rejected)\b/i, value)
}

function hasIndependentEdge(candidate = {}) {
  const value = [
    textFrom(candidate, ['Market Notes', 'marketNotes']),
    textFrom(candidate, ['Full Analysis', 'fullAnalysis']),
    textFrom(candidate, ['Writeup', 'writeup']),
    textFrom(candidate, ['Risk/Variance Note', 'riskVarianceNote'])
  ].join(' ')
  return hasWord(/\b(model edge|projection edge|matchup edge|independent edge|true probability|mispriced|number edge)\b/i, value)
}

function aGradeText(candidate = {}) {
  return [
    textFrom(candidate, ['A Grade Gate Result']),
    textFrom(candidate, ['Market Misprice Reason']),
    textFrom(candidate, ['Unresolved Conflict']),
    textFrom(candidate, ['A-Hunt Source Notes']),
    textFrom(candidate, ['Source Verification', 'sourceVerification']),
    textFrom(candidate, ['Market Notes', 'marketNotes']),
    textFrom(candidate, ['Injury Notes', 'injuryNotes']),
    textFrom(candidate, ['Full Analysis', 'fullAnalysis']),
    textFrom(candidate, ['summary'])
  ].join(' ')
}

function aGradeEvidenceCount(candidate = {}) {
  const explicit = numberValue(textFrom(candidate, ['A Grade Evidence Count', 'aGradeEvidenceCount']), NaN)
  if (Number.isFinite(explicit)) return Math.max(0, Math.floor(explicit))
  const value = aGradeText(candidate)
  const paths = [
    /\b(model|projection|true probability|estimated true|ev edge|edge vs implied|projection gap)\b/i,
    /\b(market|price|line|stale|misprice|mispriced|steam|public|consensus|book)\b/i,
    /\b(injury|lineup|starter|probable pitcher|goalie|weather|roof|wind|minutes|rotation|role)\b/i,
    /\b(matchup|pace|bullpen|park|umpire|splits|usage|rest|travel|on\/off)\b/i,
    /\b(verified|confirmed|source|official|beat|rotowire|odds board|sportsbook)\b/i
  ]
  return paths.reduce((count, pattern) => count + (pattern.test(value) ? 1 : 0), 0)
}

function candidateEdge(candidate = {}) {
  const evEdge = numberValue(textFrom(candidate, ['EV Edge', 'evEdge']), NaN)
  if (Number.isFinite(evEdge)) return evEdge
  const trueProbability = numberValue(textFrom(candidate, ['Estimated True Probability', 'True Probability', 'Model Probability', 'estimatedTrueProbability']), NaN)
  const implied = numberValue(textFrom(candidate, ['Implied Probability', 'impliedProbability']), NaN)
  if (Number.isFinite(trueProbability) && Number.isFinite(implied)) return trueProbability - implied
  return NaN
}

function hasMeaningfulProjectionGap(candidate = {}) {
  return hasWord(/\b(meaningful projection gap|projection gap|model projects|projected line|true probability edge|5% edge|5 percent edge)\b/i, aGradeText(candidate))
}

function hasMajorStaleNewsMismatch(candidate = {}) {
  return hasWord(/\b(major stale[- ]line|stale[- ]line|stale price|news mismatch|book has not adjusted|line has not adjusted|major market mismatch)\b/i, aGradeText(candidate))
}

function currentPriceInsideCutoff(candidate = {}) {
  const value = aGradeText(candidate)
  if (hasWord(/\b(outside cutoff|past cutoff|through cutoff|bad number|number is gone|price is gone|do not chase)\b/i, value)) return false
  if (hasWord(/\b(inside cutoff|within cutoff|price inside|current price playable|still playable|inside no[- ]bet cutoff)\b/i, value)) return true
  const cutoff = textFrom(candidate, ['No Bet Cutoff', 'noBetCutoff'])
  const bestNumber = textFrom(candidate, ['Best Number', 'bestNumber', 'Line', 'line'])
  return Boolean(cutoff && bestNumber && exactAmericanOdds(textFrom(candidate, ['Odds', 'odds'])) && verifiedSportsbook(textFrom(candidate, ['Sportsbook', 'sportsbook'])))
}

function confirmedRoleData(candidate = {}) {
  const league = String(textFrom(candidate, ['League', 'league', 'Sport', 'sport']) || '').toUpperCase()
  const value = aGradeText(candidate)
  if (hasWord(/\b(unconfirmed|questionable role|lineup not confirmed|starter not confirmed|goalie not confirmed|weather not confirmed|minutes uncertain|role uncertain)\b/i, value)) return false
  if (league.includes('NHL') && !hasWord(/\b(confirmed goalie|starting goalie confirmed|goalie confirmation|official goalie)\b/i, value)) return false
  if (sourceConfidence(candidate) === 'high') return true
  return hasWord(/\b(confirmed|verified|official|announced|probable pitcher|confirmed lineup|confirmed starter|starting goalie confirmed|weather confirmed|role confirmed|minutes confirmed|rotation confirmed)\b/i, value)
}

function unresolvedConflict(candidate = {}) {
  const explicit = String(textFrom(candidate, ['Unresolved Conflict', 'unresolvedConflict']) || '').trim()
  if (explicit && !/^(no|none|false|clear|resolved|n\/a|na)$/i.test(explicit)) return explicit
  if (hasWord(/\b(unresolved conflict|conflicting reports|source conflict|conflicting source|major conflict)\b/i, aGradeText(candidate))) return 'Unresolved source conflict'
  return ''
}

function marketMispriceReason(candidate = {}) {
  const explicit = String(textFrom(candidate, ['Market Misprice Reason', 'marketMispriceReason']) || '').trim()
  if (explicit) return explicit
  const value = aGradeText(candidate)
  if (hasWord(/\b(stale line|stale price|news mismatch|public tax|favorite tax|market overreaction|mispriced|model edge|projection gap|lineup not priced|injury not priced|bullpen not priced|weather not priced)\b/i, value)) {
    return 'Market misprice described in notes.'
  }
  return ''
}

function lowNumberSensitivity(candidate = {}) {
  return !hasWord(/\b(number sensitive|key number risk|thin cutoff|fragile line|moves through key|high number sensitivity)\b/i, aGradeText(candidate)) &&
    hasWord(/\b(low number sensitivity|not number sensitive|multiple playable numbers|line cushion|buffer|price protection)\b/i, aGradeText(candidate))
}

function verifiedNews(candidate = {}) {
  return sourceConfidence(candidate) === 'high' ||
    hasWord(/\b(verified news|confirmed news|official report|confirmed lineup|confirmed starter|confirmed goalie|announced lineup|rotowire confirmed)\b/i, aGradeText(candidate))
}

function strongPriceProtection(candidate = {}) {
  const value = aGradeText(candidate)
  return currentPriceInsideCutoff(candidate) &&
    hasWord(/\b(strong price protection|best number|no[- ]bet cutoff|cutoff protected|line cushion|inside cutoff|current price playable)\b/i, value)
}

function evaluateAGradeGate(candidate = {}) {
  const grade = normalizeGrade(textFrom(candidate, ['Grade', 'grade']))
  const edge = candidateEdge(candidate)
  const evidenceCount = aGradeEvidenceCount(candidate)
  const misprice = marketMispriceReason(candidate)
  const conflict = unresolvedConflict(candidate)
  const sourceNotes = textFrom(candidate, ['A-Hunt Source Notes', 'aHuntSourceNotes']) ||
    textFrom(candidate, ['Source Verification', 'sourceVerification']) ||
    textFrom(candidate, ['summary']) ||
    ''
  const aEdgeOk = (Number.isFinite(edge) && edge >= 5) || hasMeaningfulProjectionGap(candidate)
  const checks = [
    { ok: evidenceCount >= 3, label: 'needs 3 independent evidence paths' },
    { ok: aEdgeOk, label: 'needs 5%+ edge or meaningful projection gap' },
    { ok: currentPriceInsideCutoff(candidate), label: 'needs current price inside cutoff' },
    { ok: confirmedRoleData(candidate), label: 'needs confirmed role/news data' },
    { ok: !conflict, label: 'unresolved source conflict' },
    { ok: Boolean(misprice), label: 'needs clear market misprice reason' }
  ]
  const failed = checks.filter(check => !check.ok).map(check => check.label)
  const aPass = failed.length === 0
  const aPlusFailed = []
  const aPlusEdgeOk = (Number.isFinite(edge) && edge >= 7) || hasMajorStaleNewsMismatch(candidate)
  if (!aPlusEdgeOk) aPlusFailed.push('needs 7% to 10%+ edge or major stale-line/news mismatch')
  if (!lowNumberSensitivity(candidate)) aPlusFailed.push('needs low number sensitivity')
  if (!verifiedNews(candidate)) aPlusFailed.push('needs verified news')
  if (!strongPriceProtection(candidate)) aPlusFailed.push('needs strong price protection')
  const aPlusPass = aPass && aPlusFailed.length === 0
  const requestedA = ['A+', 'A', 'A-'].includes(grade)
  const targetGrade = aPlusPass ? 'A+' : (aPass ? 'A' : (requestedA ? 'B+' : grade))
  const result = aPlusPass
    ? 'Pass A+ gate'
    : aPass
    ? 'Pass A gate'
    : `Fail A gate: ${failed.join('; ')}`

  return {
    passed: aPass,
    aPlusPassed: aPlusPass,
    targetGrade,
    requestedGrade: grade,
    result,
    evidenceCount,
    edge: Number.isFinite(edge) ? Number(edge.toFixed(2)) : '',
    marketMispriceReason: misprice,
    unresolvedConflict: conflict || 'None',
    sourceNotes,
    failedReasons: failed,
    aPlusFailedReasons: aPlusPass ? [] : aPlusFailed
  }
}

function applyAGradeGate(candidate = {}) {
  const gate = evaluateAGradeGate(candidate)
  const grade = normalizeGrade(textFrom(candidate, ['Grade', 'grade']))
  const nextGrade = gate.passed
    ? gate.targetGrade
    : (['A+', 'A', 'A-'].includes(grade) ? 'B+' : grade)
  return {
    ...candidate,
    ...(nextGrade ? { Grade: nextGrade } : {}),
    'A Grade Gate Result': gate.result,
    'A Grade Evidence Count': gate.evidenceCount,
    'Market Misprice Reason': gate.marketMispriceReason,
    'Unresolved Conflict': gate.unresolvedConflict,
    'A-Hunt Source Notes': gate.sourceNotes,
    _aGradeGate: gate
  }
}

function buildACandidateQueue(candidates = []) {
  return sortCandidates(candidates).slice(0, 12).map(candidate => {
    const gate = candidate._aGradeGate || evaluateAGradeGate(candidate)
    const label = [
      textFrom(candidate, ['League', 'league']),
      textFrom(candidate, ['Game', 'game']),
      textFrom(candidate, ['Pick', 'pick'])
    ].filter(Boolean).join(' - ') || 'Candidate'
    return {
      Candidate: label,
      Grade: normalizeGrade(textFrom(candidate, ['Grade', 'grade'])) || '',
      'A Grade Gate Result': gate.result,
      'A Grade Evidence Count': gate.evidenceCount,
      'Market Misprice Reason': gate.marketMispriceReason || '',
      'Unresolved Conflict': gate.unresolvedConflict || 'None',
      'A-Hunt Source Notes': gate.sourceNotes || '',
      passed: gate.passed,
      failedReasons: gate.failedReasons,
      aPlusFailedReasons: gate.aPlusFailedReasons
    }
  })
}

function aGradeStatusFromQueue(queue = []) {
  const passed = queue.filter(item => item.passed)
  return {
    found: passed.length > 0,
    count: passed.length,
    message: passed.length ? `${passed.length} A-grade candidate(s) passed the gate.` : 'No A-grade found.'
  }
}

function emptyAGradeStatus() {
  return { found: false, count: 0, message: 'No A-grade found.' }
}

function publicSafe(candidate = {}) {
  const value = [
    textFrom(candidate, ['Category', 'category']),
    textFrom(candidate, ['Market Notes', 'marketNotes']),
    textFrom(candidate, ['Full Analysis', 'fullAnalysis']),
    textFrom(candidate, ['Writeup', 'writeup'])
  ].join(' ')
  if (hasWord(/\b(vip|premium|thin|volatile|longshot|lotto|high variance|manual only)\b/i, value)) return false
  return true
}

function boolFromCandidate(value) {
  return value === true || ['1', 'true', 'yes', 'y'].includes(String(value || '').trim().toLowerCase())
}

function sourceConfidence(candidate = {}) {
  const explicit = String(textFrom(candidate, ['sourceConfidence', 'Source Confidence', 'SourceConfidence']) || '').trim().toLowerCase()
  if (['high', 'medium', 'low'].includes(explicit)) return explicit
  const sourceStatus = [
    textFrom(candidate, ['Source Status', 'sourceStatus']),
    textFrom(candidate, ['Sportsbook', 'sportsbook']),
    textFrom(candidate, ['Source Verification', 'sourceVerification']),
    textFrom(candidate, ['Market Notes', 'marketNotes'])
  ].join(' ')
  const hasBook = Boolean(textFrom(candidate, ['Sportsbook', 'sportsbook'])) && !hasWord(/\b(aggregate|aggregated|multiple|manual|unknown)\b/i, textFrom(candidate, ['Sportsbook', 'sportsbook']))
  const hasPrice = textFrom(candidate, ['Odds', 'odds']) !== ''
  const hasLine = textFrom(candidate, ['Best Number', 'bestNumber', 'Line', 'line']) !== ''
  const hasSource = Boolean(textFrom(candidate, ['Source Verification', 'sourceVerification']))
  const injuryKnown = Boolean(textFrom(candidate, ['Injury Notes', 'injuryNotes']))
  if (hasBook && hasPrice && hasLine && hasSource && injuryKnown) return 'high'
  if (hasPrice && hasLine && hasSource && hasWord(/\b(aggregate|aggregated|consensus|manual book confirmation|required)\b/i, sourceStatus)) return 'medium'
  if (hasPrice && hasLine && hasSource) return 'medium'
  return 'low'
}

function manualConfirmationRequired(candidate = {}) {
  const explicit = textFrom(candidate, ['manualConfirmationRequired', 'Manual Confirmation Required'])
  if (explicit !== '') return boolFromCandidate(explicit)
  return sourceConfidence(candidate) === 'medium' ||
    hasWord(/\b(aggregate|aggregated|manual confirmation|required|missing exact book|book confirmation)\b/i, [
      textFrom(candidate, ['Source Status', 'sourceStatus']),
      textFrom(candidate, ['Market Notes', 'marketNotes']),
      textFrom(candidate, ['Full Analysis', 'fullAnalysis'])
    ].join(' '))
}

function hasAggregateOddsSource(candidate = {}) {
  return hasWord(/\b(aggregate|aggregated|consensus|manual book confirmation|required|missing exact book)\b/i, [
    textFrom(candidate, ['Source Status', 'sourceStatus']),
    textFrom(candidate, ['Sportsbook', 'sportsbook']),
    textFrom(candidate, ['Source Verification', 'sourceVerification']),
    textFrom(candidate, ['Market Notes', 'marketNotes'])
  ].join(' '))
}

function explicitMissingFields(candidate = {}) {
  return Array.isArray(candidate.missingFields)
    ? candidate.missingFields.map(field => String(field || '').trim()).filter(Boolean)
    : []
}

function candidateMissingVerifiedReviewFields(candidate = {}) {
  const missing = []
  if (!textFrom(candidate, ['Game', 'game'])) missing.push('Game')
  if (!textFrom(candidate, ['Pick', 'pick'])) missing.push('Pick')
  if (!exactAmericanOdds(textFrom(candidate, ['Odds', 'odds']))) missing.push('Odds')
  if (!verifiedSportsbook(textFrom(candidate, ['Sportsbook', 'sportsbook']))) missing.push('Sportsbook')
  if (textFrom(candidate, ['Line', 'line', 'Best Number', 'bestNumber']) === '') missing.push('Line')
  if (!textFrom(candidate, ['Source Verification', 'sourceVerification'])) missing.push('Source Verification')
  return missing
}

function hasVerifiedReviewPrice(candidate = {}) {
  const missingFields = explicitMissingFields(candidate)
  return sourceConfidence(candidate) === 'high' &&
    candidateMissingVerifiedReviewFields(candidate).length === 0 &&
    missingFields.length === 0 &&
    !explicitNoBetReason(candidate)
}

function hasPricedManualReviewFields(candidate = {}) {
  return candidateMissingVerifiedReviewFields(candidate).length === 0 &&
    explicitMissingFields(candidate).length === 0 &&
    !explicitNoBetReason(candidate)
}

function watchlistManualReviewCandidate(candidate = {}) {
  const confidence = sourceConfidence(candidate)
  return hasWord(/\bwatchlist\b/i, textFrom(candidate, ['Release Gate', 'releaseGate'])) &&
    hasPricedManualReviewFields(candidate) &&
    (manualConfirmationRequired(candidate) || confidence === 'low' || confidence === 'medium')
}

function verifiedProp(candidate = {}) {
  if (candidateType(candidate) !== 'prop') return false
  return Boolean(
    textFrom(candidate, ['Player', 'player']) &&
    textFrom(candidate, ['Prop Type', 'propType', 'Bet Type']) &&
    textFrom(candidate, ['Line', 'line']) !== ''
  )
}

function releaseGate(candidate = {}) {
  const explicit = String(textFrom(candidate, ['Release Gate', 'releaseGate']) || '').trim()
  if (hasVerifiedReviewPrice(candidate)) return 'Review Eligible'
  if (explicit) return explicit
  if (!positiveEdge(candidate)) return 'Pass'
  const required = [
    textFrom(candidate, ['Game', 'game']),
    textFrom(candidate, ['Pick', 'pick']),
    textFrom(candidate, ['Odds', 'odds']),
    textFrom(candidate, ['Sportsbook', 'sportsbook']),
    textFrom(candidate, ['Source Verification', 'sourceVerification'])
  ]
  if (required.some(value => value === undefined || value === null || String(value).trim() === '')) return 'Review'
  if (candidateType(candidate) === 'prop' && !verifiedProp(candidate)) return 'Review'
  return 'Publish Eligible'
}

function normalizeReleaseGate(candidate = {}) {
  const raw = String(textFrom(candidate, ['Release Gate', 'releaseGate', 'Status', 'status']) || '').trim()
  const joined = [
    raw,
    textFrom(candidate, ['Source Status', 'sourceStatus']),
    textFrom(candidate, ['Market Notes', 'marketNotes']),
    textFrom(candidate, ['Full Analysis', 'fullAnalysis'])
  ].join(' ')
  if (explicitNoBetReason(candidate)) return 'Pass'
  if (hasVerifiedReviewPrice(candidate)) return 'Review Eligible'
  if (hasWord(/\b(pass|do not play|no bet|reject)\b/i, joined)) return 'Pass'
  if (hasWord(/\b(hold|held|watchlist|watch list|no release|manual only|needs price|unverified)\b/i, joined)) return 'Watchlist'
  if (sourceConfidence(candidate) === 'low') return 'Watchlist'
  if (sourceConfidence(candidate) === 'medium' && manualConfirmationRequired(candidate)) return 'Review Eligible'
  if (hasWord(/\bpublish eligible|released?\b/i, joined)) return 'Publish Eligible'
  if (hasWord(/\breview eligible\b/i, joined)) return 'Review Eligible'
  const inferred = releaseGate(candidate)
  if (hasWord(/\bpass\b/i, inferred)) return 'Pass'
  if (hasWord(/\bhold|watchlist|no release\b/i, inferred)) return 'Watchlist'
  if (hasWord(/\bpublish eligible\b/i, inferred)) return 'Publish Eligible'
  return 'Review Eligible'
}

function eligibleRoutes(candidate = {}) {
  const explicit = candidate['Eligible Routes'] || candidate.eligibleRoutes
  if (Array.isArray(explicit)) return explicit
  if (typeof explicit === 'string' && explicit.trim()) {
    return explicit.split(/[,|]/).map(route => route.trim()).filter(Boolean)
  }
  const type = candidateType(candidate)
  if (type === 'prop') return ['Props Lab', 'Lotto Props']
  if (type === 'longshot') return ['Longshot']
  return ['VIP', 'Free', 'Lotto Parlay']
}

function decorateCandidate(candidate = {}) {
  const aGatedCandidate = applyAGradeGate(candidate)
  const normalizedGate = normalizeReleaseGate(aGatedCandidate)
  const confidence = sourceConfidence(aGatedCandidate)
  const manualRequired = manualConfirmationRequired(aGatedCandidate)
  return {
    ...aGatedCandidate,
    'Eligible Routes': eligibleRoutes(aGatedCandidate),
    'Original Release Gate': textFrom(aGatedCandidate, ['Release Gate', 'releaseGate']) || '',
    'Release Gate': normalizedGate,
    sourceConfidence: confidence,
    missingFields: missingCandidateFields(aGatedCandidate),
    manualConfirmationRequired: manualRequired,
    _type: candidateType(aGatedCandidate),
    _score: candidateScore(aGatedCandidate)
  }
}

function marketFamily(candidate = {}) {
  const value = [
    textFrom(candidate, ['Category', 'category']),
    textFrom(candidate, ['Bet Type', 'betType', 'Market', 'market']),
    textFrom(candidate, ['Pick', 'pick'])
  ].join(' ')
  if (hasWord(/\b(total|over|under)\b/i, value)) return 'total'
  if (hasWord(/\b(moneyline|\bml\b)\b/i, value)) return 'moneyline'
  if (hasWord(/\b(spread|ats|\+|-)\b/i, value)) return 'spread'
  if (candidateType(candidate) === 'prop') {
    return `prop:${String(textFrom(candidate, ['Player', 'player'])).toLowerCase()}:${String(textFrom(candidate, ['Prop Type', 'propType', 'Bet Type'])).toLowerCase()}`
  }
  return 'market'
}

function conflictKey(candidate = {}) {
  return [
    String(textFrom(candidate, ['Game', 'game'])).trim().toLowerCase(),
    marketFamily(candidate)
  ].join('|')
}

function conflictPass(candidate = {}, kept = {}) {
  return {
    Candidate: textFrom(candidate, ['Pick', 'pick']) || 'Conflicting candidate',
    Reason: `Moved to watchlist because it conflicts with stronger candidate: ${textFrom(kept, ['Pick', 'pick']) || 'higher-ranked play'}.`,
    'Source Verification': textFrom(candidate, ['Source Verification', 'sourceVerification']) || 'Source not verified.'
  }
}

function filterConflicts(candidates = []) {
  const keptByKey = new Map()
  const passes = []
  for (const candidate of sortCandidates(candidates)) {
    const key = conflictKey(candidate)
    const existing = keptByKey.get(key)
    if (!existing) {
      keptByKey.set(key, candidate)
      continue
    }
    if (candidateScore(candidate) > candidateScore(existing)) {
      keptByKey.set(key, candidate)
      passes.push(conflictPass(existing, candidate))
    } else {
      passes.push(conflictPass(candidate, existing))
    }
  }
  return { kept: sortCandidates(Array.from(keptByKey.values())), passes }
}

function propMissingReasons(candidates = []) {
  const reasons = new Set()
  const propLike = candidates.filter(candidate => candidateType(candidate) === 'prop')
  for (const candidate of propLike) {
    if (!textFrom(candidate, ['Player', 'player'])) reasons.add('missing verified player name')
    if (!textFrom(candidate, ['Prop Type', 'propType', 'Bet Type'])) reasons.add('missing verified prop market')
    if (textFrom(candidate, ['Line', 'line']) === '') reasons.add('missing verified prop line')
    if (!textFrom(candidate, ['Sportsbook', 'sportsbook'])) reasons.add('missing sportsbook')
    if (!textFrom(candidate, ['Source Verification', 'sourceVerification'])) reasons.add('missing source verification')
  }
  if (!propLike.length) reasons.add('no player prop lines returned by current sources')
  return Array.from(reasons)
}

function missingCandidateFields(candidate = {}) {
  const missing = []
  if (!textFrom(candidate, ['Game', 'game'])) missing.push('game')
  if (!textFrom(candidate, ['Pick', 'pick'])) missing.push('pick')
  if (!textFrom(candidate, ['Source Verification', 'sourceVerification'])) missing.push('source verification')
  if (candidateType(candidate) === 'prop') {
    if (!textFrom(candidate, ['Player', 'player'])) missing.push('player')
    if (!textFrom(candidate, ['Prop Type', 'propType', 'Bet Type'])) missing.push('prop market')
    if (textFrom(candidate, ['Line', 'line']) === '') missing.push('prop line')
    if (textFrom(candidate, ['Odds', 'odds']) === '') missing.push('odds')
    if (!textFrom(candidate, ['Sportsbook', 'sportsbook']) && !hasAggregateOddsSource(candidate)) missing.push('sportsbook')
  } else {
    if (textFrom(candidate, ['Odds', 'odds']) === '') missing.push('odds')
    if (!textFrom(candidate, ['Sportsbook', 'sportsbook']) && !hasAggregateOddsSource(candidate)) missing.push('sportsbook')
  }
  return missing
}

function routeGateOk(candidate = {}) {
  return hasWord(/\b(review eligible|publish eligible)\b/i, textFrom(candidate, ['Release Gate']))
}

function passedStraightAGate(candidate = {}) {
  const grade = normalizeGrade(textFrom(candidate, ['Grade', 'grade']))
  return ['A+', 'A'].includes(grade) && Boolean(candidate._aGradeGate?.passed)
}

function vipEligible(candidate = {}) {
  if (candidate._type !== 'straight') return false
  if (!routeGateOk(candidate)) return false
  if (hasNegativeEdge(candidate)) return false
  if (!passedStraightAGate(candidate)) return false
  return hasPositiveEdge(candidate) || hasIndependentEdge(candidate)
}

function freeEligible(candidate = {}) {
  if (candidate._type !== 'straight') return false
  if (!routeGateOk(candidate)) return false
  if (!hasPositiveEdge(candidate)) return false
  if (hasNegativeEdge(candidate)) return false
  return publicSafe(candidate)
}

function propRouteEligible(candidate = {}) {
  if (candidate._type !== 'prop') return false
  if (!routeGateOk(candidate)) return false
  if (hasNegativeEdge(candidate)) return false
  return verifiedProp(candidate)
}

function lottoLegEligible(candidate = {}, allowReview = false) {
  if (['longshot', 'prop'].includes(candidate._type)) return false
  if (!routeGateOk(candidate)) return false
  if (hasNegativeEdge(candidate)) return false
  return hasPositiveEdge(candidate) || (allowReview && hasWord(/\breview eligible\b/i, candidate['Release Gate']))
}

function appearsSampleCard(card = {}) {
  return ['Game', 'Pick', 'Source Verification', 'Writeup', 'Full Analysis']
    .some(field => hasSampleText(card[field]))
}

function aiJsonSchema(maxRawItems = 4) {
  const candidateProperties = {
    Sport: { type: 'string' },
    League: { type: 'string' },
    Game: { type: 'string' },
    Pick: { type: 'string' },
    'Bet Type': { type: 'string' },
    Odds: { type: 'string' },
    Sportsbook: { type: 'string' },
    Line: { type: 'string' },
    'Best Number': { type: 'string' },
    'No Bet Cutoff': { type: 'string' },
    Grade: { type: 'string' },
    Confidence: { type: 'string' },
    'Implied Probability': { type: 'string' },
    'Estimated True Probability': { type: 'string' },
    'EV Edge': { type: 'string' },
    'Market Notes': { type: 'string' },
    'Injury Notes': { type: 'string' },
    'Source Verification': { type: 'string' },
    'A Grade Gate Result': { type: 'string' },
    'A Grade Evidence Count': { type: ['number', 'string'] },
    'Market Misprice Reason': { type: 'string' },
    'Unresolved Conflict': { type: 'string' },
    'A-Hunt Source Notes': { type: 'string' },
    sourceConfidence: { type: 'string' },
    manualConfirmationRequired: { type: ['boolean', 'string'] },
    summary: { type: 'string' }
  }

  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      rawCandidatePool: {
        type: 'array',
        minItems: 0,
        maxItems: maxRawItems,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: candidateProperties,
          required: Object.keys(candidateProperties)
        }
      },
      sourcesUsed: {
        type: 'array',
        maxItems: 2,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: { title: { type: 'string' }, url: { type: 'string' } },
          required: ['title', 'url']
        }
      },
      passes: {
        type: 'array',
        maxItems: 2,
        items: { type: 'string' }
      },
      warnings: { type: 'array', maxItems: 3, items: { type: 'string' } }
    },
    required: ['rawCandidatePool', 'sourcesUsed', 'passes', 'warnings']
  }
}

function compactAiJsonSchema(maxRawItems = 3) {
  return aiJsonSchema(maxRawItems)
}

function propsJsonSchema() {
  const candidateProperties = {
    Rank: { type: ['number', 'string'] },
    Category: { type: 'string' },
    Sport: { type: 'string' },
    League: { type: 'string' },
    Game: { type: 'string' },
    Pick: { type: 'string' },
    'Bet Type': { type: 'string' },
    Odds: { type: ['number', 'string'] },
    Sportsbook: { type: 'string' },
    Player: { type: 'string' },
    Team: { type: 'string' },
    Opponent: { type: 'string' },
    'Prop Type': { type: 'string' },
    Line: { type: ['number', 'string'] },
    Grade: { type: 'string' },
    Confidence: { type: ['number', 'string'] },
    'EV Edge': { type: ['number', 'string'] },
    'Best Number': { type: ['number', 'string'] },
    'No Bet Cutoff': { type: ['number', 'string'] },
    'Implied Probability': { type: ['number', 'string'] },
    'Estimated True Probability': { type: ['number', 'string'] },
    'Market Notes': { type: 'string' },
    'Injury Notes': { type: 'string' },
    'Source Verification': { type: 'string' },
    'A Grade Gate Result': { type: 'string' },
    'A Grade Evidence Count': { type: ['number', 'string'] },
    'Market Misprice Reason': { type: 'string' },
    'Unresolved Conflict': { type: 'string' },
    'A-Hunt Source Notes': { type: 'string' },
    'Eligible Routes': { type: 'array', items: { type: 'string' } },
    'Release Gate': { type: 'string' },
    sourceConfidence: { type: 'string' },
    missingFields: { type: 'array', items: { type: 'string' } },
    manualConfirmationRequired: { type: ['boolean', 'string'] }
  }

  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      searchesRun: { type: ['number', 'string'] },
      candidatePool: {
        type: 'array',
        maxItems: 5,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: candidateProperties,
          required: Object.keys(candidateProperties)
        }
      },
      passes: {
        type: 'array',
        maxItems: 5,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            Candidate: { type: 'string' },
            Reason: { type: 'string' },
            'Source Verification': { type: 'string' }
          },
          required: ['Candidate', 'Reason', 'Source Verification']
        }
      },
      warnings: { type: 'array', maxItems: 5, items: { type: 'string' } },
      sources: {
        type: 'array',
        maxItems: 5,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: { title: { type: 'string' }, url: { type: 'string' } },
          required: ['title', 'url']
        }
      }
    },
    required: ['searchesRun', 'candidatePool', 'passes', 'warnings', 'sources']
  }
}

function openAiPropsRequestBody({ model, date, sport, league, routing, retry = false }) {
  const prompt = [
    retry ? 'Retry with strict compact JSON only for Micks Picks props.' : 'Run a compact props-only Micks Picks follow-up search.',
    `Date: ${date}`,
    sport ? `Sport filter: ${sport}` : '',
    league ? `League filter: ${league}` : '',
    'A-Grade Hunt Mode is on: before final grading, identify any A-candidate props, then explain why each passes or fails the A-grade gate.',
    'Do not force A grades. Use B+ as the bridge between B and A when a candidate is strong but misses the full A gate.',
    `Return at most ${routing.maxProps || DEFAULT_QUOTAS.maxProps} verified player prop candidates.`,
    'Use web search for book-priced player prop boards only.',
    'Each prop must have player, game, prop type, line, odds, sportsbook, and source URL.',
    'A grade requires 3 independent evidence paths, 5%+ edge or meaningful projection gap, price inside cutoff, confirmed role/news data, no unresolved source conflict, and a clear market misprice reason.',
    'A+ requires 7% to 10%+ edge or a major stale-line/news mismatch, low number sensitivity, verified news, and strong price protection.',
    'Include A Grade Gate Result, A Grade Evidence Count, Market Misprice Reason, Unresolved Conflict, and A-Hunt Source Notes for every prop.',
    'Include sourceConfidence, missingFields, and manualConfirmationRequired for every prop.',
    'Do not invent odds, players, games, or lines.',
    'If no book-priced prop source is available, return no candidates and explain missing fields in passes/warnings.',
    retry ? 'Return JSON matching the schema exactly. No markdown. No prose outside JSON.' : ''
  ].filter(Boolean).join('\n')

  return {
    model,
    input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }] }],
    instructions: 'Return only verified book-priced Micks Picks prop candidates. Never fabricate data. Return only valid JSON.',
    tools: [{ type: 'web_search', search_context_size: 'low' }],
    tool_choice: 'required',
    reasoning: { effort: 'low' },
    max_output_tokens: retry ? PROPS_PASS_RETRY_OUTPUT_TOKEN_LIMIT : PROPS_PASS_OUTPUT_TOKEN_LIMIT,
    text: {
      format: {
        type: 'json_schema',
        name: 'micks_picks_props',
        strict: true,
        schema: propsJsonSchema()
      }
    }
  }
}

function estimatePropsPassTokens({ model, date, sport, league, routing }) {
  const body = openAiPropsRequestBody({ model, date, sport, league, routing })
  return estimateTokens(JSON.stringify(body)) + PROPS_PASS_OUTPUT_TOKEN_LIMIT
}

function openAiRequestBody({ model, date, sport, league, mode, candidatePoolSize, access, framework, routing, propsSearch = false, retry = false, fastMode = true, ultraFastMode = false }) {
  const target = propsSearch
    ? Math.min(Number(candidatePoolSize) || 4, ultraFastMode ? 4 : 6)
    : Math.min(Number(candidatePoolSize) || 4, ultraFastMode ? 2 : 4)
  const sourceRouting = propsSearch
    ? routing
    : {
      ...routing,
      includeProps: false,
      includeLotto: false,
      includeLottoProps: false,
      includeLongLotto: false,
      includeLongshots: false,
      maxProps: 0,
      maxLottoCards: 0,
      maxLottoProps: 0,
      maxLongshots: 0,
      candidatePoolSize: target
    }
  const scope = [
    `Date: ${date}`,
    sport ? `Sport filter: ${sport}` : '',
    league ? `League filter: ${league}` : '',
    `Mode: ${mode}`,
    `Candidate pool target: ${target}`,
    `Access default: ${access}`,
    `Routing quotas: ${JSON.stringify({ ...sourceRouting, candidatePoolSize: target })}`,
    `Fast mode: ${fastMode ? 'on' : 'off'}`,
    ultraFastMode ? 'Ultra fast fallback: on' : ''
  ].filter(Boolean).join('\n')

  return {
    model,
    input: [{
      role: 'user',
      content: [{
        type: 'input_text',
        text: [
          ultraFastMode
            ? 'Ultra-fast Run Micks Picks fallback. Find the smallest verified current board snapshot and return strict JSON only.'
            : retry
            ? 'Retry Run Micks Picks with strict compact JSON only. Do not add markdown, prose, comments, trailing commas, or code fences.'
            : propsSearch
            ? 'Run a props-specific Micks Picks follow-up search for today using live web research.'
            : 'Run Micks Picks for today using one live web research pass.',
          scope,
          '',
          propsSearch ? (fastMode ? 'Compact Micks Picks framework:' : 'Full Micks Picks framework:') : `Tiny Micks Picks ${league || sport || 'board'} rules:`,
          propsSearch ? frameworkPrompt(framework, {
            sport,
            league,
            includeProps: sourceRouting.includeProps,
            includeLotto: sourceRouting.includeLotto,
            includeLottoProps: sourceRouting.includeLottoProps,
            includeLongshots: sourceRouting.includeLongshots,
            fastMode,
            ultraFastMode
          }) : [
            `- ${league || sport || 'Current'} board only: sides, totals, moneylines.`,
            `- A-Grade Hunt Mode is on. Run a pre-grading A-candidate search before assigning final grades. Return at most ${target} current board ideas.`,
            '- Prioritize A-Hunt markets: MLB pitcher K props, outs recorded, first 5 lines, team totals, lineup/weather/bullpen driven totals; WNBA injury/rotation spreads, pace totals, role-stable props; NBA role-stable props and rest/pace totals; NHL only after goalie confirmation.',
            '- Exact book-priced candidates should include American odds like -110 or +125, a real sportsbook/book label, line, best number, no-bet cutoff, and source URL/text.',
            '- Do not force A grades. B+ is the bridge between B and A for strong candidates that miss the full A-grade gate.',
            '- A grade requires 3 independent evidence paths, 5%+ edge vs implied probability or meaningful projection gap, current price inside cutoff, confirmed injury/lineup/starter/weather/goalie role data as needed, no major unresolved source conflict, and a clear market misprice reason.',
            '- A+ requires 7% to 10%+ edge or major stale-line/news mismatch, low number sensitivity, verified news, and strong price protection.',
            '- Include A Grade Gate Result, A Grade Evidence Count, Market Misprice Reason, Unresolved Conflict, and A-Hunt Source Notes for every candidate. If no candidate passes, the gate result should say No A-grade found.',
            '- If the spot is valid but exact odds, sportsbook, or line are missing, keep it in rawCandidatePool with those fields blank, manualConfirmationRequired=true, and a short Source Verification/summary for manual review.',
            '- Prioritize sportsbook pages or odds boards with book columns such as DraftKings, FanDuel, BetMGM, Caesars, ESPN BET, or BetRivers.',
            '- If an odds comparison board shows a price by book, use that exact book name and price.',
            '- Do not use prediction articles as verified odds sources unless they include a current book-labelled line and price; they may support a manual review idea only.',
            '- Put rawCandidatePool first. Put sourcesUsed after candidates. Use short source titles.',
            '- Candidate summary must include concrete matchup, market, injury/availability, and risk notes in 2-4 customer-facing sentences. Do not use generic framework filler.',
            '- Put only unusable ideas in passes, such as missing game, missing pick, no current board context, or no source context.',
            '- Keep summary to one short sentence. No markdown. No escaped JSON string.'
          ].join('\n'),
          '',
          optionalManualContext(),
          '',
          'Research requirements:',
          propsSearch
            ? '- Use web search to find book-priced player prop boards, player prop lines, sportsbook labels, and source URLs. Do not return unpriced prop ideas as eligible candidates.'
            : '- Use web search once to gather today\'s games, odds/lines, injuries/news, market context, matchup stats, and sportsbook prices.',
          '- Start with an A-candidate queue pass before final grade assignment. Explain pass/fail gate evidence in the A-Hunt fields; no A-grade is valid when the gate is not cleared.',
          propsSearch
            ? '- Treat this as a props-only follow-up after the core board JSON already parsed.'
            : '- Treat source acquisition as board-only: current games, sides, totals, moneylines, injury/news context, and market prices. Do not source player props in the core call.',
          '- Return only rawCandidatePool, sourcesUsed, passes, and warnings. Do not return routed cards.',
          `- rawCandidatePool must contain at most ${target} real candidates. Backend code will normalize, score, gate A candidates, and route after JSON parses.`,
          '- Each candidate must include only schema fields: Sport, League, Game, Pick, Bet Type, Odds, Sportsbook, Line, Best Number, No Bet Cutoff, Grade, Confidence, Implied Probability, Estimated True Probability, EV Edge, Market Notes, Injury Notes, Source Verification, A Grade Gate Result, A Grade Evidence Count, Market Misprice Reason, Unresolved Conflict, A-Hunt Source Notes, sourceConfidence, manualConfirmationRequired, summary.',
          '- The summary should name the actual betting angle and any known matchup or availability reason; never write generic text like "the market lines up with the framework."',
          '- sourceConfidence must be high, medium, or low. high means exact book, line, odds, injury context, and market are verified. medium means aggregate odds source with line/price but missing exact book label and manual confirmation is required. low means missing price, line, injury context, or reliable source.',
          '- Medium-confidence candidates may only be manual review ideas when manualConfirmationRequired is true. Low-confidence candidates must be Watchlist or Pass.',
          '- Use real current data only. Do not invent games, odds, injuries, sportsbooks, or fake teams.',
          '- If a candidate lacks exact verified odds or sportsbook but has a real game, pick, market, and source context, keep it in rawCandidatePool for manual review with missing fields blank.',
          '- If odds are not an exact American price or sportsbook is only aggregate/consensus, set manualConfirmationRequired=true and leave unverified fields blank; do not invent replacements.',
          propsSearch ? '- Search specifically for player prop lines, player names, prop markets, prop odds, book labels, and source URLs. If no verified props are available, explain the missing source in warnings/passes rather than inventing props.' : '- Do not search player props, lotto props, or parlay construction in the core source-acquisition call.',
          '- Include source URLs for odds/news/stat claims.',
          '- Limit sourcesUsed to 2 short entries. Limit warnings and passes to short strings.',
          fastMode ? '- Keep source acquisition compact: one board/odds source plus one injury/news source is enough for this run.' : '',
          ultraFastMode ? '- If verified candidates cannot be found immediately, return empty rawCandidatePool with clear passes/warnings before timeout.' : '',
          '- Return an actual JSON object only. Do not return a quoted or escaped JSON string.',
          retry ? '- Output compact JSON only using the retry schema.' : '- Output JSON only using the requested schema.'
        ].join('\n')
      }]
    }],
    instructions: propsSearch
      ? 'You are the Micks Picks props sourcing engine. Return only verified book-priced prop candidates or passes with missing fields. Never fabricate data. Return only valid JSON.'
      : 'You are the Micks Picks betting engine. Apply the supplied framework strictly. Use one analysis run and a shared candidate pool. Never fabricate data. Return only valid JSON matching the schema. Do not include markdown, code fences, comments, or prose outside JSON.',
    tools: [{ type: 'web_search', search_context_size: 'low' }],
    tool_choice: 'required',
    reasoning: { effort: 'low' },
    max_output_tokens: Math.min(maxOutputTokens(), propsSearch ? 1000 : (ultraFastMode ? 600 : 1000)),
    text: {
      format: {
        type: 'json_schema',
        name: retry ? 'micks_picks_source_pool_retry' : 'micks_picks_source_pool',
        strict: true,
        schema: retry ? compactAiJsonSchema(target) : aiJsonSchema(target)
      }
    }
  }
}

function openAiRepairRequestBody({ model, rawText, propsSearch = false }) {
  try {
    return {
      model,
      input: [{
        role: 'user',
        content: [{
          type: 'input_text',
          text: [
            'Convert this to valid JSON matching schema. If no usable candidates, return empty arrays.',
            'Do not add markdown, prose, comments, or code fences.',
            'Return an actual JSON object only, not a quoted or escaped JSON string.',
            '',
            'Raw OpenAI text:',
            String(rawText ?? '').slice(0, 12000)
          ].join('\n')
        }]
      }],
      instructions: 'Convert this to valid JSON matching schema. If no usable candidates, return empty arrays.',
      reasoning: { effort: 'low' },
      max_output_tokens: 700,
      text: {
        format: {
          type: 'json_schema',
          name: propsSearch ? 'micks_picks_props_repair' : 'micks_picks_source_pool_repair',
          strict: true,
          schema: aiJsonSchema()
        }
      }
    }
  } catch {
    return null
  }
}

function buildJsonParseError({ message, openAiRuns = 1, retryUsed = false, parseFailures = 0, parseErrorType = 'invalid_json', rawOpenAiPreview = '', responseId = '' } = {}) {
  const error = new Error(message || 'OpenAI Micks Picks engine returned invalid JSON after strict JSON retry.')
  error.statusCode = 200
  error.stage = 'jsonParse'
  error.openAiRuns = retryUsed ? 2 : Math.max(1, Number(openAiRuns) || 1)
  error.retryUsed = Boolean(retryUsed)
  error.parseFailures = parseFailures
  error.parseErrorType = parseErrorType || 'invalid_json'
  error.rawOpenAiPreview = rawOpenAiPreview || ''
  error.responseId = responseId || ''
  error.details = error.responseId ? { responseId: error.responseId } : undefined
  return error
}

function emptyCoreSourceResult({ model, parseErrorType = 'invalid_json', rawOpenAiPreview = '', responseId = '', retries = 0 } = {}) {
  return {
    success: true,
    model,
    response: {},
    ai: {
      sourcesUsed: [],
      rawCandidatePool: [],
      passes: ['Core source acquisition did not return parseable JSON before timeout.'],
      warnings: [`Core source acquisition returned no parseable candidates (${parseErrorType || 'invalid_json'}).`]
    },
    searchesRun: 0,
    sourcesUsed: [],
    rawOpenAiPreview,
    parseErrorType: parseErrorType || 'invalid_json',
    responseId: responseId || '',
    retries,
    coreFallback: true
  }
}

function recoveredCoreSourceResult({ model, payload = {}, recovered, rawText = '', parseErrorType = 'recovered_partial_json', responseId = '', retries = 0 } = {}) {
  const ai = normalizeRecoveredAiJson(recovered || {})
  return {
    success: true,
    model,
    response: payload,
    ai,
    searchesRun: searchesRun(payload),
    sourcesUsed: responseSources(payload, ai),
    rawOpenAiPreview: previewText(rawText),
    parseErrorType,
    responseId: responseId || payload?.id || '',
    retries,
    coreRecovered: true
  }
}

function logRunMicksPicksFailure(stage, error) {
  console.error('run-micks-picks failed', {
    stage,
    message: error?.message || String(error || 'unknown error'),
    stack: error?.stack || ''
  })
}

function jsonHelperError({ helper, error, openAiRuns = 1, retryUsed = false, parseFailures = 0, rawOpenAiPreview = '', responseId = '' } = {}) {
  return buildJsonParseError({
    message: `OpenAI JSON helper failed${helper ? ` in ${helper}` : ''}: ${error?.message || 'unknown helper error'}`,
    openAiRuns,
    retryUsed,
    parseFailures,
    parseErrorType: 'helper_exception',
    rawOpenAiPreview,
    responseId
  })
}

function runJsonHelper(helper, fn, context = {}) {
  try {
    const value = fn()
    if (value === null || value === undefined) {
      throw new Error(`${helper} returned no value`)
    }
    return value
  } catch (error) {
    throw jsonHelperError({ helper, error, ...context })
  }
}

async function callOpenAiEngine({ date, sport, league, mode, candidatePoolSize, access, framework, routing, propsSearch = false, allowRetry = false, fastMode = true }) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return {
      success: false,
      needsOpenAI: true,
      message: 'OPENAI_API_KEY is required for Run Micks Picks.'
    }
  }

  const model = process.env.MICKS_PICKS_AI_MODEL || DEFAULT_AI_MODEL
  const attempts = propsSearch ? (allowRetry ? 2 : 1) : 2
  let lastPayload = {}
  let parseFailures = 0
  let parseErrorType = ''
  let firstRawText = ''
  let lastRawText = ''
  let responseId = ''
  let retryUsed = false
  let ultraFastMode = false
  let firstParseErrorType = ''

  try {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (attempt > 0 && !String(firstRawText ?? '').trim() && !ultraFastMode) break
      if (attempt > 0) retryUsed = true

      const controller = new AbortController()
      const attemptTimeoutMs = openAiAttemptTimeoutMs(attempt)
      const timeout = setTimeout(() => controller.abort(), attemptTimeoutMs)
      let response
      try {
        const body = attempt > 0
          ? ultraFastMode && !String(firstRawText ?? '').trim()
          ? runJsonHelper('openAiRequestBody.ultraFastMode', () => openAiRequestBody({ model, date, sport, league, mode, candidatePoolSize: Math.min(candidatePoolSize, 4), access, framework, routing, propsSearch, retry: false, fastMode: true, ultraFastMode: true }), {
            openAiRuns: 2,
            retryUsed: true,
            parseFailures,
            rawOpenAiPreview: previewText(firstRawText),
            responseId
          })
          : runJsonHelper('openAiRepairRequestBody', () => openAiRepairRequestBody({ model, rawText: firstRawText, propsSearch }), {
            openAiRuns: 2,
            retryUsed: true,
            parseFailures,
            rawOpenAiPreview: previewText(firstRawText),
            responseId
          })
          : propsSearch
          ? runJsonHelper('openAiPropsRequestBody', () => openAiPropsRequestBody({ model, date, sport, league, routing, retry: attempt > 0 }), {
            openAiRuns: 1,
            retryUsed: false,
            parseFailures,
            rawOpenAiPreview: previewText(firstRawText),
            responseId
          })
          : runJsonHelper('openAiRequestBody', () => openAiRequestBody({ model, date, sport, league, mode, candidatePoolSize, access, framework, routing, propsSearch, retry: attempt > 0, fastMode }), {
            openAiRuns: 1,
            retryUsed: false,
            parseFailures,
            rawOpenAiPreview: previewText(firstRawText),
            responseId
          })
        response = await fetch(OPENAI_RESPONSES_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal,
          body: JSON.stringify(body)
        })
      } catch (error) {
        if (error?.stage === 'jsonParse') throw error
        const timedOut = error?.name === 'AbortError'
        if (timedOut && attempt === 0 && !propsSearch) {
          ultraFastMode = true
          retryUsed = true
          parseErrorType = 'timeout_ultrafast_fallback'
          continue
        }
        const wrapped = new Error(timedOut
          ? `OpenAI Micks Picks engine timed out after ${attemptTimeoutMs}ms.`
          : `OpenAI Micks Picks engine request failed: ${error.message || 'unknown fetch error'}`)
        wrapped.statusCode = 200
        wrapped.stage = 'sourceAcquisition'
        wrapped.openAiRuns = retryUsed ? 2 : 1
        wrapped.retryUsed = Boolean(retryUsed)
        throw wrapped
      } finally {
        clearTimeout(timeout)
      }
      const payload = typeof response?.json === 'function'
        ? await response.json().catch(() => ({}))
        : {}
      lastPayload = payload
      responseId = payload?.id || responseId

      if (!response?.ok) {
        const message = payload?.error?.message || response?.statusText || 'OpenAI request failed'
        const error = new Error(`OpenAI Micks Picks engine ${response?.status || 500}: ${message}`)
        error.statusCode = response?.status || 200
        error.stage = 'sourceAcquisition'
        error.openAiRuns = retryUsed ? 2 : 1
        error.retryUsed = Boolean(retryUsed)
        error.responseId = responseId || ''
        error.details = error.responseId ? { responseId: error.responseId } : undefined
        throw error
      }

      const text = runJsonHelper('responseText', () => responseText(payload), {
        openAiRuns: retryUsed ? 2 : 1,
        retryUsed,
        parseFailures,
        rawOpenAiPreview: previewText(lastRawText || firstRawText),
        responseId
      })
      lastRawText = text
      if (attempt === 0 || !firstRawText) firstRawText = text
      const parsedJson = runJsonHelper('parseOpenAiJsonText', () => parseOpenAiJsonText(text), {
        openAiRuns: retryUsed ? 2 : 1,
        retryUsed,
        parseFailures,
        rawOpenAiPreview: previewText(text || lastRawText || firstRawText),
        responseId
      })
      parseErrorType = parsedJson.parseErrorType
      if (attempt === 0 && parseErrorType && parseErrorType !== 'ok') firstParseErrorType = parseErrorType
      if (parseErrorType === 'helper_exception') {
        throw jsonHelperError({
          helper: 'parseOpenAiJsonText',
          openAiRuns: retryUsed ? 2 : 1,
          retryUsed,
          parseFailures,
          rawOpenAiPreview: previewText(text),
          responseId
        })
      }
      if (parsedJson.parsed) {
        const responseSearchesRun = runJsonHelper('searchesRun', () => searchesRun(payload), {
          openAiRuns: retryUsed ? 2 : 1,
          retryUsed,
          parseFailures,
          rawOpenAiPreview: previewText(text),
          responseId
        })
        const parsedSources = runJsonHelper('responseSources', () => responseSources(payload, parsedJson.parsed), {
          openAiRuns: retryUsed ? 2 : 1,
          retryUsed,
          parseFailures,
          rawOpenAiPreview: previewText(text),
          responseId
        })
        return {
          success: true,
          model,
          response: payload,
          ai: parsedJson.parsed,
          searchesRun: Number(parsedJson.parsed.searchesRun || responseSearchesRun || 0),
          sourcesUsed: parsedSources,
          rawOpenAiPreview: previewText(text),
          parseErrorType,
          responseId,
          retries: attempt,
          coreRecovered: String(parseErrorType || '').includes('recovered')
        }
      }
      parseFailures += 1
      if (parseErrorType === 'empty_response_text') break
      if (attempt < attempts - 1) continue
    }
  } catch (error) {
    const stage = error?.stage || (retryUsed ? 'jsonParse' : 'sourceAcquisition')
    logRunMicksPicksFailure(stage, error)
    let rawText = lastRawText || firstRawText
    let recovered = recoverOpenAiJsonFromMalformedText(rawText)
    if (!recovered && firstRawText && firstRawText !== rawText) {
      const firstRecovered = recoverOpenAiJsonFromMalformedText(firstRawText)
      if (firstRecovered) {
        recovered = firstRecovered
        rawText = firstRawText
      }
    }
    if (recovered) {
      return recoveredCoreSourceResult({
        model,
        payload: lastPayload,
        recovered,
          rawText,
          parseErrorType: error?.parseErrorType ? `recovered_after_${error.parseErrorType}` : `recovered_after_${firstParseErrorType || parseErrorType || 'exception'}`,
        responseId: responseId || lastPayload?.id || '',
        retries: retryUsed ? 1 : 0
      })
    }
    if (error?.stage === 'jsonParse') {
      if (!propsSearch) {
        return emptyCoreSourceResult({
          model,
          parseErrorType: error.parseErrorType || firstParseErrorType || parseErrorType || 'json_parse_exception',
          rawOpenAiPreview: error.rawOpenAiPreview || previewText(firstRawText || rawText),
          responseId: error.responseId || responseId || lastPayload?.id || '',
          retries: retryUsed ? 1 : 0
        })
      }
      throw error
    }
    if (!retryUsed && error?.statusCode) {
      error.stage = stage
      error.openAiRuns = error.openAiRuns || 1
      error.retryUsed = Boolean(error.retryUsed)
      throw error
    }
    const safeError = buildJsonParseError({
      message: 'OpenAI Micks Picks engine returned invalid JSON after strict JSON retry.',
      openAiRuns: retryUsed ? 2 : 1,
      retryUsed,
      parseFailures,
      parseErrorType: firstParseErrorType || parseErrorType || (retryUsed ? 'repair_exception' : 'invalid_json'),
      rawOpenAiPreview: previewText(firstRawText || lastRawText),
      responseId: responseId || lastPayload?.id || ''
    })
    logRunMicksPicksFailure(safeError.stage, safeError)
    throw safeError
  }

  let recoveryRawText = lastRawText || firstRawText
  let recovered = recoverOpenAiJsonFromMalformedText(recoveryRawText)
  if (!recovered && firstRawText && firstRawText !== recoveryRawText) {
    const firstRecovered = recoverOpenAiJsonFromMalformedText(firstRawText)
    if (firstRecovered) {
      recovered = firstRecovered
      recoveryRawText = firstRawText
    }
  }
  if (recovered) {
    return recoveredCoreSourceResult({
      model,
      payload: lastPayload,
      recovered,
      rawText: recoveryRawText,
      parseErrorType: firstParseErrorType ? `recovered_after_${firstParseErrorType}` : (parseErrorType ? `recovered_after_${parseErrorType}` : 'recovered_partial_json'),
      responseId: responseId || lastPayload?.id || '',
      retries: retryUsed ? 1 : 0
    })
  }

  const parseError = buildJsonParseError({
    openAiRuns: retryUsed ? 2 : 1,
    retryUsed,
    parseFailures,
    parseErrorType: firstParseErrorType || parseErrorType || 'invalid_json',
    rawOpenAiPreview: previewText(firstRawText || lastRawText),
    responseId: responseId || lastPayload?.id || ''
  })
  if (!propsSearch) {
    logRunMicksPicksFailure('sourceAcquisitionFallback', parseError)
    return emptyCoreSourceResult({
      model,
      parseErrorType: parseError.parseErrorType,
      rawOpenAiPreview: parseError.rawOpenAiPreview,
      responseId: parseError.responseId,
      retries: retryUsed ? 1 : 0
    })
  }
  logRunMicksPicksFailure(parseError.stage, parseError)
  throw parseError
}

function tagCandidatesForLeague(candidates = [], league = '') {
  const normalizedLeague = normalizeRunLeague(league)
  return (candidates || []).map(candidate => ({
    ...candidate,
    Sport: candidate.Sport || normalizedLeague,
    League: candidate.League || normalizedLeague
  }))
}

function tagPassesForLeague(passes = [], league = '') {
  const normalizedLeague = normalizeRunLeague(league)
  return (passes || []).map(pass => {
    if (typeof pass === 'string') return normalizedLeague ? `${normalizedLeague}: ${pass}` : pass
    return { League: pass.League || normalizedLeague, ...pass }
  })
}

function tagSourcesForLeague(sources = [], league = '') {
  const normalizedLeague = normalizeRunLeague(league)
  return (sources || []).map(source => ({
    ...source,
    league: source.league || normalizedLeague
  }))
}

async function callOpenAiEngineForRun({ options, date, mode, access, framework, routing }) {
  const leagues = runLeagues(options)
  if (leagues.length === 1) {
    const league = leagues[0]
    return callOpenAiEngine({
      date,
      sport: league,
      league,
      mode,
      candidatePoolSize: routing.candidatePoolSize,
      access,
      framework,
      routing,
      fastMode: true
    })
  }

  const maxPerLeague = routing.maxCandidatesPerLeague || DEFAULT_QUOTAS.maxCandidatesPerLeague
  const maxTotal = routing.maxTotalCandidates || DEFAULT_QUOTAS.maxTotalCandidates
  const maxRuntimeMs = routing.maxAllSportsRuntimeMs || DEFAULT_QUOTAS.maxAllSportsRuntimeMs
  const startedAt = Date.now()
  const aggregate = {
    success: true,
    model: process.env.MICKS_PICKS_AI_MODEL || DEFAULT_AI_MODEL,
    response: {},
    ai: { rawCandidatePool: [], sourcesUsed: [], passes: [], warnings: [] },
    searchesRun: 0,
    sourcesUsed: [],
    rawOpenAiPreview: '',
    parseErrorType: '',
    responseId: '',
    retries: 0,
    allSportsMode: true,
    leaguesScanned: [],
    partial: false,
    remainingLeagues: [],
    elapsedMs: 0,
    maxAllSportsRuntimeMs: maxRuntimeMs
  }

  for (let index = 0; index < leagues.length; index += 1) {
    const league = leagues[index]
    const elapsed = Date.now() - startedAt
    const remainingMs = maxRuntimeMs - elapsed
    if (index > 0 && remainingMs < 8000) {
      aggregate.partial = true
      aggregate.remainingLeagues = leagues.slice(index)
      aggregate.ai.warnings.push(`All-sports run stopped safely before timeout. Remaining leagues: ${aggregate.remainingLeagues.join(', ')}.`)
      break
    }

    try {
      const engine = await callOpenAiEngine({
        date,
        sport: league,
        league,
        mode,
        candidatePoolSize: maxPerLeague,
        access,
        framework,
        routing: { ...routing, includeProps: false, includeLotto: false, includeLottoProps: false },
        fastMode: true
      })
      if (engine.success === false) return engine
      aggregate.model = engine.model || aggregate.model
      aggregate.leaguesScanned.push(league)
      aggregate.searchesRun += Number(engine.searchesRun || 0)
      aggregate.retries += Number(engine.retries || 0)
      aggregate.rawOpenAiPreview ||= engine.rawOpenAiPreview || ''
      aggregate.parseErrorType ||= engine.parseErrorType || ''
      aggregate.responseId ||= engine.responseId || ''
      aggregate.sourcesUsed = mergeSources(aggregate.sourcesUsed, tagSourcesForLeague(engine.sourcesUsed, league))
      aggregate.ai.sourcesUsed = aggregate.sourcesUsed
      const slotsRemaining = Math.max(0, maxTotal - aggregate.ai.rawCandidatePool.length)
      if (slotsRemaining > 0) {
        aggregate.ai.rawCandidatePool.push(...tagCandidatesForLeague(rawCandidatesFromEngine(engine), league).slice(0, Math.min(maxPerLeague, slotsRemaining)))
      } else {
        aggregate.ai.warnings.push(`${league}: source scan completed after candidate quota was already filled.`)
      }
      aggregate.ai.passes.push(...tagPassesForLeague(Array.isArray(engine.ai?.passes) ? engine.ai.passes : [], league))
      aggregate.ai.warnings.push(...(Array.isArray(engine.ai?.warnings) ? engine.ai.warnings.map(warning => `${league}: ${warning}`) : []))
      if (engine.coreFallback) aggregate.ai.warnings.push(`${league}: source acquisition returned no parseable candidates.`)
    } catch (error) {
      logRunMicksPicksFailure(`${league}:sourceAcquisition`, error)
      aggregate.leaguesScanned.push(league)
      aggregate.ai.warnings.push(`${league}: source acquisition failed safely: ${error.message || 'unknown error'}`)
      aggregate.ai.passes.push({ League: league, Candidate: league, Reason: 'Source acquisition failed safely.', 'Source Verification': error.message || 'OpenAI source pass failed.' })
    }
  }

  aggregate.elapsedMs = Date.now() - startedAt
  aggregate.ai.rawCandidatePool = aggregate.ai.rawCandidatePool.slice(0, maxTotal)
  return aggregate
}

function rawCandidatesFromEngine(engine = {}) {
  return Array.isArray(engine.ai?.rawCandidatePool) && engine.ai.rawCandidatePool.length
    ? engine.ai.rawCandidatePool
    : Array.isArray(engine.ai?.candidatePool) && engine.ai.candidatePool.length
    ? engine.ai.candidatePool
    : (Array.isArray(engine.ai?.cards) ? engine.ai.cards : [])
}

function exactAmericanOdds(value) {
  return /^[+-]?\d{2,5}$/.test(String(value || '').trim())
}

function verifiedSportsbook(value) {
  const sportsbook = String(value || '').trim()
  return Boolean(sportsbook) && !hasWord(/\b(aggregate|consensus|not verified|unknown|pending|multiple|manual|tbd)\b/i, sportsbook)
}

function candidateMissingManualFields(candidate = {}) {
  const missing = []
  if (!exactAmericanOdds(textFrom(candidate, ['Odds', 'odds']))) missing.push('Odds')
  if (!verifiedSportsbook(textFrom(candidate, ['Sportsbook', 'sportsbook']))) missing.push('Sportsbook')
  if (!textFrom(candidate, ['Line', 'line'])) missing.push('Line')
  if (!textFrom(candidate, ['Source Verification', 'sourceVerification'])) missing.push('Source Verification')
  return missing
}

function coreSourcePassReason(candidate = {}) {
  if (!textFrom(candidate, ['Game', 'game'])) return 'Game was missing.'
  if (!textFrom(candidate, ['Pick', 'pick'])) return 'Pick was missing.'
  if (!textFrom(candidate, ['Bet Type', 'betType', 'Market'])) return 'Bet Type was missing.'
  if (!textFrom(candidate, ['Source Verification', 'sourceVerification', 'summary'])) return 'Source context was missing.'
  return ''
}

function filterCoreSourceCandidates(rawCandidates = []) {
  const kept = []
  const manual = []
  const passes = []
  for (const candidate of rawCandidates) {
    const reason = coreSourcePassReason(candidate)
    if (reason) {
      passes.push({
        Candidate: textFrom(candidate, ['Pick', 'pick']) || textFrom(candidate, ['Game', 'game']) || 'Candidate',
        Reason: reason,
        'Source Verification': textFrom(candidate, ['Source Verification', 'sourceVerification']) || 'Source not verified.'
      })
      continue
    }

    const missingManualFields = candidateMissingManualFields(candidate)
    if (missingManualFields.length) {
      manual.push({
        ...candidate,
        missingFields: missingManualFields,
        manualConfirmationRequired: true
      })
    } else {
      kept.push(candidate)
    }
  }
  return { kept, manual, passes }
}

function mergeCandidatePools(...pools) {
  const seen = new Set()
  const merged = []
  for (const pool of pools) {
    for (const candidate of pool || []) {
      const key = [
        textFrom(candidate, ['Game', 'game']),
        textFrom(candidate, ['Pick', 'pick']),
        textFrom(candidate, ['Bet Type', 'betType']),
        textFrom(candidate, ['Sportsbook', 'sportsbook'])
      ].join('|').toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(candidate)
    }
  }
  return merged
}

function mergeSources(...sourceLists) {
  const seen = new Set()
  const merged = []
  for (const list of sourceLists) {
    for (const source of list || []) {
      const key = String(source.url || source.title || '').toLowerCase()
      if (!key || seen.has(key)) continue
      seen.add(key)
      merged.push(source)
    }
  }
  return merged
}

function sourceConfidenceCounts(candidates = []) {
  return candidates.reduce((counts, candidate) => {
    const key = candidate.sourceConfidence || sourceConfidence(candidate)
    counts[key] = (counts[key] || 0) + 1
    return counts
  }, { high: 0, medium: 0, low: 0 })
}

function sourceAcquisitionStatus({ routed, sourcesUsed, routing, tokenBudget }) {
  const raw = routed.rawCandidatePool || []
  const skippedReasons = []
  const hasOddsCandidate = raw.some(candidate => textFrom(candidate, ['Odds', 'odds']) !== '' && textFrom(candidate, ['Source Verification', 'sourceVerification']))
  const hasBoardSource = sourcesUsed.some(source => hasWord(/\b(odds|spread|moneyline|total|sportsbook|draftkings|fanduel|betmgm|caesars)\b/i, `${source.title || ''} ${source.url || ''}`))
  const hasInjuryCandidate = raw.some(candidate => textFrom(candidate, ['Injury Notes', 'injuryNotes']))
  const hasInjurySource = sourcesUsed.some(source => hasWord(/\b(injury|injuries|status|report)\b/i, `${source.title || ''} ${source.url || ''}`))
  const propsRequested = routing.includeProps

  if (tokenBudget.propsSecondPassSkippedReason) skippedReasons.push(tokenBudget.propsSecondPassSkippedReason)
  if (!propsRequested) skippedReasons.push('Props pass skipped because includeProps was not requested.')

  return {
    boardOddsPass: hasOddsCandidate ? 'complete' : (hasBoardSource || raw.length ? 'partial' : 'skipped'),
    injuryPass: hasInjuryCandidate ? 'complete' : (hasInjurySource || raw.length ? 'partial' : 'skipped'),
    propsPass: propsRequested
      ? (routed.propsStatus.verified ? 'complete' : (routed.propsStatus.rawFound ? 'partial' : (tokenBudget.propsSecondPassSkippedReason ? 'skipped' : 'partial')))
      : 'skipped',
    skippedReasons,
    sourceConfidence: sourceConfidenceCounts(raw)
  }
}

function emptySourceAcquisition(routing, reason = '') {
  return {
    boardOddsPass: 'skipped',
    injuryPass: 'skipped',
    propsPass: routing.includeProps ? 'skipped' : 'skipped',
    skippedReasons: reason ? [reason] : [],
    sourceConfidence: { high: 0, medium: 0, low: 0 }
  }
}

function emptyRouteOutputs() {
  return {
    vipReview: [],
    freeReview: [],
    manualReview: [],
    propsReview: [],
    lottoReview: [],
    lottoPropsReview: [],
    longshotsReview: []
  }
}

function normalizeAiCard(card = {}, options = {}) {
  const publish = options.mode === 'publish'
  const odds = numberValue(card.Odds, '')
  const normalized = {
    Date: card.Date || options.date,
    Sport: card.Sport || options.sport || '',
    League: card.League || options.league || card.Sport || options.sport || '',
    Game: card.Game || '',
    Pick: sanitizeCustomerFacingTitle(card.Pick || ''),
    'Bet Type': card['Bet Type'] || '',
    Category: card.Category || '',
    Odds: odds,
    Sportsbook: card.Sportsbook || '',
    'Source Status': card['Source Status'] || card.sourceStatus || '',
    Grade: card.Grade || '',
    Units: numberValue(card.Units, 1),
    'Best Number': card['Best Number'] || card.Odds || '',
    'No Bet Cutoff': card['No Bet Cutoff'] || '',
    'Implied Probability': card['Implied Probability'] || impliedProbability(odds),
    'Estimated True Probability': card['Estimated True Probability'] || '',
    'EV Edge': card['EV Edge'] || '',
    Confidence: card.Confidence || '',
    Status: publish ? 'Active' : 'Pregame',
    'Release Status': publish ? 'Released' : 'Held',
    Result: 'Pending',
    'Archive Status': 'Active',
    Access: options.access === 'auto' ? (String(card.Access || '').trim() || 'Free') : options.access,
    Writeup: card.Writeup || '',
    'Market Notes': card['Market Notes'] || '',
    'Injury Notes': card['Injury Notes'] || '',
    'Source Verification': card['Source Verification'] || '',
    'Full Analysis': card['Full Analysis'] || '',
    'A Grade Gate Result': card['A Grade Gate Result'] || '',
    'A Grade Evidence Count': card['A Grade Evidence Count'] || '',
    'Market Misprice Reason': card['Market Misprice Reason'] || '',
    'Unresolved Conflict': card['Unresolved Conflict'] || '',
    'A-Hunt Source Notes': card['A-Hunt Source Notes'] || '',
    Player: card.Player || '',
    Team: card.Team || '',
    Opponent: card.Opponent || '',
    'Prop Type': card['Prop Type'] || card['Bet Type'] || '',
    Line: card.Line || '',
    Legs: card.Legs || '',
    'Leg Count': card['Leg Count'] || '',
    'Parlay Type': card['Parlay Type'] || '',
    'Longshot Type': card['Longshot Type'] || '',
    'Suggested Line': card['Suggested Line'] || '',
    'Missing Fields': card['Missing Fields'] || '',
    'Manual Odds Needed': card['Manual Odds Needed'] || false,
    'Sportsbook Needed': card['Sportsbook Needed'] || false,
    'Manual Odds': card['Manual Odds'] || '',
    'Manual Sportsbook': card['Manual Sportsbook'] || '',
    'Manual Line': card['Manual Line'] || '',
    'Manual Confirmed': card['Manual Confirmed'] || '',
    'Manual Submitted': card['Manual Submitted'] || false,
    'Manual Submit Time': card['Manual Submit Time'] || '',
    'Release Approved': card['Release Approved'] || false,
    sourceConfidence: card.sourceConfidence || card['Source Confidence'] || '',
    missingFields: Array.isArray(card.missingFields) ? card.missingFields : [],
    manualConfirmationRequired: card.manualConfirmationRequired || false
  }
  normalized.Writeup = sanitizeCustomerFacingCopy(sanitizePublicWriteup(normalized))
  normalized['Full Analysis'] = sanitizeCustomerFacingCopy(sanitizeCustomerFacingAnalysis(normalized))
  return normalized
}

function normalizeCandidate(candidate = {}, options = {}) {
  const baseCard = {
    Date: candidate.Date || options.date,
    Sport: candidate.Sport || options.sport || '',
    League: candidate.League || options.league || candidate.Sport || options.sport || '',
    Game: candidate.Game || '',
    Pick: candidate.Pick || '',
    'Bet Type': candidate['Bet Type'] || candidate.Market || '',
    Category: candidate.Category || candidateType(candidate),
    Odds: candidate.Odds,
    Sportsbook: candidate.Sportsbook || '',
    'Source Status': candidate['Source Status'] || candidate.sourceStatus || '',
    Grade: candidate.Grade || '',
    Units: candidate.Units || 1,
    'Best Number': candidate['Best Number'] || candidate.Odds || '',
    'No Bet Cutoff': candidate['No Bet Cutoff'] || '',
    'Implied Probability': candidate['Implied Probability'] || '',
    'Estimated True Probability': candidate['Estimated True Probability'] || '',
    'EV Edge': candidate['EV Edge'] || '',
    Confidence: candidate.Confidence || '',
    Access: candidate.Access || '',
    Writeup: candidate.Writeup || candidate.summary || candidate['Risk/Variance Note'] || '',
    'Market Notes': candidate['Market Notes'] || candidate.summary || candidate['Risk/Variance Note'] || '',
    'Injury Notes': candidate['Injury Notes'] || '',
    'Source Verification': candidate['Source Verification'] || '',
    'Full Analysis': candidate['Full Analysis'] || candidate.Writeup || candidate.summary || '',
    'A Grade Gate Result': candidate['A Grade Gate Result'] || '',
    'A Grade Evidence Count': candidate['A Grade Evidence Count'] || '',
    'Market Misprice Reason': candidate['Market Misprice Reason'] || '',
    'Unresolved Conflict': candidate['Unresolved Conflict'] || '',
    'A-Hunt Source Notes': candidate['A-Hunt Source Notes'] || '',
    Player: candidate.Player || '',
    Team: candidate.Team || '',
    Opponent: candidate.Opponent || '',
    'Prop Type': candidate['Prop Type'] || candidate['Bet Type'] || '',
    Line: candidate.Line || candidate.line || '',
    sourceConfidence: candidate.sourceConfidence || candidate['Source Confidence'] || '',
    missingFields: Array.isArray(candidate.missingFields) ? candidate.missingFields : [],
    manualConfirmationRequired: candidate.manualConfirmationRequired || false
  }
  baseCard['Full Analysis'] = buildCustomerFacingAnalysis(baseCard)
  return normalizeAiCard(baseCard, options)
}

function heldReviewCard(candidate = {}, options = {}) {
  const line = textFrom(candidate, ['Line', 'line', 'Best Number', 'bestNumber'])
  const baseCard = {
    Date: candidate.Date || options.date,
    Sport: candidate.Sport || options.sport || '',
    League: candidate.League || options.league || candidate.Sport || options.sport || '',
    Game: textFrom(candidate, ['Game', 'game']),
    Pick: textFrom(candidate, ['Pick', 'pick']),
    'Bet Type': textFrom(candidate, ['Bet Type', 'betType', 'Market']),
    Category: 'Review Pick',
    Odds: textFrom(candidate, ['Odds', 'odds']),
    Sportsbook: textFrom(candidate, ['Sportsbook', 'sportsbook']),
    Line: line,
    'Best Number': line,
    Grade: 'Review',
    Units: 0,
    Status: 'Pregame',
    'Release Status': 'Held',
    Result: 'Pending',
    'Archive Status': 'Active',
    Access: options.access === 'auto' ? 'VIP Review' : options.access,
    Writeup: textFrom(candidate, ['summary', 'Writeup', 'writeup', 'Market Notes', 'marketNotes']),
    'Market Notes': textFrom(candidate, ['summary', 'Market Notes', 'marketNotes']),
    'Injury Notes': textFrom(candidate, ['Injury Notes', 'injuryNotes']),
    'Source Verification': textFrom(candidate, ['Source Verification', 'sourceVerification']),
    'A Grade Gate Result': textFrom(candidate, ['A Grade Gate Result']),
    'A Grade Evidence Count': textFrom(candidate, ['A Grade Evidence Count']),
    'Market Misprice Reason': textFrom(candidate, ['Market Misprice Reason']),
    'Unresolved Conflict': textFrom(candidate, ['Unresolved Conflict']),
    'A-Hunt Source Notes': textFrom(candidate, ['A-Hunt Source Notes']),
    sourceConfidence: candidate.sourceConfidence || sourceConfidence(candidate),
    missingFields: [],
    manualConfirmationRequired: false
  }
  baseCard['Full Analysis'] = buildCustomerFacingAnalysis(baseCard)
  return normalizeAiCard(baseCard, { ...options, mode: 'review' })
}

function manualReviewConfirmationNotes(candidate = {}, missingFields = []) {
  const notes = []
  if (missingFields.length) notes.push(`complete ${missingFields.join(', ')}`)
  if (manualConfirmationRequired(candidate)) notes.push('final market and line confirmation')
  if (['low', 'medium'].includes(sourceConfidence(candidate))) notes.push('final injury and availability confirmation')
  if (!notes.length) notes.push('final market confirmation')
  return Array.from(new Set(notes)).join('; ')
}

function manualReviewSourceVerification(candidate = {}, missingFields = []) {
  const sourceVerification = textFrom(candidate, ['Source Verification', 'sourceVerification'])
  const sportsbook = textFrom(candidate, ['Sportsbook', 'sportsbook'])
  const odds = textFrom(candidate, ['Odds', 'odds'])
  const line = textFrom(candidate, ['Line', 'line', 'Best Number', 'bestNumber'])
  const verified = []
  if (sportsbook && odds && line) verified.push(`board price ${sportsbook} ${odds} at ${line}`)
  if (sourceVerification) verified.push('source context')
  return [
    sourceVerification,
    verified.length ? `Verified: ${verified.join(', ')}.` : '',
    `Still needs manual confirmation: ${manualReviewConfirmationNotes(candidate, missingFields)}.`
  ].filter(Boolean).join(' ')
}

function manualReviewCard(candidate = {}, options = {}) {
  const missingFields = Array.isArray(candidate.missingFields) && candidate.missingFields.length
    ? candidate.missingFields
    : candidateMissingManualFields(candidate)
  const line = textFrom(candidate, ['Line', 'line', 'Best Number', 'bestNumber'])
  const summary = textFrom(candidate, ['summary', 'Market Notes', 'Writeup'])
  const sourceVerification = manualReviewSourceVerification(candidate, missingFields)
  const missingText = missingFields.join(', ')
  const confirmationNotes = manualReviewConfirmationNotes(candidate, missingFields)
  const customerAnalysis = sanitizeCustomerFacingAnalysis({
    Date: candidate.Date || options.date,
    Sport: candidate.Sport || options.sport || '',
    League: candidate.League || options.league || candidate.Sport || options.sport || '',
    Game: textFrom(candidate, ['Game', 'game']),
    Pick: textFrom(candidate, ['Pick', 'pick']),
    'Bet Type': textFrom(candidate, ['Bet Type', 'betType', 'Market']),
    Line: line,
    'Best Number': line,
    'No Bet Cutoff': textFrom(candidate, ['No Bet Cutoff', 'noBetCutoff']),
    Writeup: summary,
    'Market Notes': summary,
    'Injury Notes': textFrom(candidate, ['Injury Notes', 'injuryNotes']),
    'Source Verification': sourceVerification,
    'A Grade Gate Result': textFrom(candidate, ['A Grade Gate Result']),
    'A Grade Evidence Count': textFrom(candidate, ['A Grade Evidence Count']),
    'Market Misprice Reason': textFrom(candidate, ['Market Misprice Reason']),
    'Unresolved Conflict': textFrom(candidate, ['Unresolved Conflict']),
    'A-Hunt Source Notes': textFrom(candidate, ['A-Hunt Source Notes']),
    'Manual Confirmation Notes': confirmationNotes
  })
  return normalizeAiCard({
    Date: candidate.Date || options.date,
    Sport: candidate.Sport || options.sport || '',
    League: candidate.League || options.league || candidate.Sport || options.sport || '',
    Game: textFrom(candidate, ['Game', 'game']),
    Pick: textFrom(candidate, ['Pick', 'pick']),
    'Bet Type': textFrom(candidate, ['Bet Type', 'betType', 'Market']),
    Category: 'Manual Review',
    Odds: exactAmericanOdds(textFrom(candidate, ['Odds', 'odds'])) ? textFrom(candidate, ['Odds', 'odds']) : '',
    Sportsbook: verifiedSportsbook(textFrom(candidate, ['Sportsbook', 'sportsbook'])) ? textFrom(candidate, ['Sportsbook', 'sportsbook']) : '',
    Line: line,
    'Best Number': line,
    'Suggested Line': line,
    'Missing Fields': missingText,
    'Manual Odds Needed': missingFields.includes('Odds'),
    'Sportsbook Needed': missingFields.includes('Sportsbook'),
    'Manual Submitted': false,
    'Release Approved': false,
    Grade: 'Review',
    Units: 0,
    Status: 'Pregame',
    'Release Status': 'Held',
    Result: 'Pending',
    'Archive Status': 'Active',
    Access: options.access === 'auto' ? 'VIP Review' : options.access,
    Writeup: summary || `Final confirmation is needed before this review card can be released.`,
    'Market Notes': [
      summary,
      `Manual confirmation still needed: ${confirmationNotes}.`
    ].filter(Boolean).join(' '),
    'Injury Notes': textFrom(candidate, ['Injury Notes', 'injuryNotes']),
    'Source Verification': sourceVerification,
    'Full Analysis': customerAnalysis,
    'A Grade Gate Result': textFrom(candidate, ['A Grade Gate Result']),
    'A Grade Evidence Count': textFrom(candidate, ['A Grade Evidence Count']),
    'Market Misprice Reason': textFrom(candidate, ['Market Misprice Reason']),
    'Unresolved Conflict': textFrom(candidate, ['Unresolved Conflict']),
    'A-Hunt Source Notes': textFrom(candidate, ['A-Hunt Source Notes']),
    sourceConfidence: candidate.sourceConfidence || 'medium',
    missingFields,
    manualConfirmationRequired: true
  }, { ...options, mode: 'review' })
}

function americanToDecimal(odds) {
  const price = numberValue(odds, NaN)
  if (!Number.isFinite(price) || price === 0) return NaN
  return price > 0 ? 1 + (price / 100) : 1 + (100 / Math.abs(price))
}

function decimalToAmerican(decimal) {
  if (!Number.isFinite(decimal) || decimal <= 1) return ''
  const american = decimal >= 2
    ? Math.round((decimal - 1) * 100)
    : Math.round(-100 / (decimal - 1))
  return american
}

function combinedAmericanOdds(legs = []) {
  const decimal = legs.reduce((total, leg) => {
    const next = americanToDecimal(leg.Odds)
    return Number.isFinite(total) && Number.isFinite(next) ? total * next : NaN
  }, 1)
  return decimalToAmerican(decimal)
}

function legList(legs = []) {
  return legs
    .map((leg, index) => `${index + 1}. ${leg.Game} - ${leg.Pick} (${leg.Odds}, ${leg.Sportsbook})`)
    .join('\n')
}

function lowConflictLegs(candidates = [], count) {
  const selected = []
  const games = new Map()
  const tags = new Set()
  const markets = new Set()
  for (const candidate of candidates) {
    const gameKey = String(candidate.Game || '').toLowerCase()
    const marketKey = conflictKey(candidate)
    const candidateTags = [
      ...(candidate['Correlation Tags'] || []),
      ...(candidate['Conflict Tags'] || [])
    ].map(tag => String(tag).toLowerCase()).filter(Boolean)
    if ((games.get(gameKey) || 0) >= 2) continue
    if (markets.has(marketKey)) continue
    if (candidateTags.some(tag => tags.has(tag))) continue
    selected.push(candidate)
    games.set(gameKey, (games.get(gameKey) || 0) + 1)
    markets.add(marketKey)
    candidateTags.forEach(tag => tags.add(tag))
    if (selected.length === count) break
  }
  return selected
}

function makeParlayCard({ legs, legCount, parlayType, date, mode, access, sport, league, reviewOnly = false }) {
  const odds = combinedAmericanOdds(legs)
  const sportsbooks = Array.from(new Set(legs.map(leg => leg.Sportsbook).filter(Boolean)))
  const sourceVerification = legs.map(leg => leg['Source Verification']).filter(Boolean).join(' | ')
  const aGateResults = legs.map(leg => leg['A Grade Gate Result']).filter(Boolean)
  const aEvidenceCounts = legs.map(leg => numberValue(leg['A Grade Evidence Count'], NaN)).filter(Number.isFinite)
  const aSourceNotes = legs.map(leg => leg['A-Hunt Source Notes']).filter(Boolean).join(' | ')
  const confidenceValues = legs.map(leg => numberValue(leg.Confidence, NaN)).filter(Number.isFinite)
  const avgConfidence = confidenceValues.length
    ? Number((confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length).toFixed(1))
    : ''
  const fullAnalysis = [
    `${parlayType} qualifies only if each leg keeps its listed matchup and market edge at the current number.`,
    `The matchup angle comes from combining low-conflict legs across the board: ${legList(legs)}`,
    'Injury and availability context matters across every leg because one late scratch or lineup shift can change the value of the full card.',
    odds
      ? `Market and line context: the estimated combined price is ${odds}${sportsbooks.length ? ` with prices sourced from ${sportsbooks.join(', ')}` : ''}.`
      : 'Market and line context: the combined price should stay close to the listed legs before this card is played.',
    'Risk note: parlays carry higher variance than straight plays, so correlated games, stale prices, or heavy line movement should reduce the edge.'
  ].join('\n\n')

  return normalizeAiCard({
    Date: date,
    Sport: sport || legs[0]?.Sport || '',
    League: league || legs[0]?.League || '',
    Game: `${legCount}-leg ${parlayType}`,
    Pick: `${legCount}-Leg ${parlayType}`,
    'Bet Type': 'Parlay',
    Category: parlayType,
    Odds: odds,
    Sportsbook: sportsbooks.length === 1 ? sportsbooks[0] : 'Multiple books',
    Grade: legCount <= 5 ? 'B' : 'C',
    Units: 0.25,
    Confidence: avgConfidence,
    'EV Edge': '',
    'Best Number': odds,
    'No Bet Cutoff': '',
    Access: access === 'auto' ? 'Free' : access,
    Writeup: `${legCount}-leg ${parlayType} from verified pool legs.`,
    'Market Notes': odds ? 'Combined odds are estimated from verified leg prices; confirm final parlay price at book.' : 'Manual combined odds confirmation required.',
    'Injury Notes': legs.map(leg => leg['Injury Notes']).filter(Boolean).join(' | '),
    'Source Verification': sourceVerification,
    'A Grade Gate Result': aGateResults.length ? `Leg gate summary: ${aGateResults.join(' | ')}` : '',
    'A Grade Evidence Count': aEvidenceCounts.length ? Math.max(...aEvidenceCounts) : '',
    'Market Misprice Reason': legs.map(leg => leg['Market Misprice Reason']).filter(Boolean).join(' | '),
    'Unresolved Conflict': legs.map(leg => leg['Unresolved Conflict']).filter(value => value && !/^none$/i.test(String(value))).join(' | ') || 'None',
    'A-Hunt Source Notes': aSourceNotes,
    'Full Analysis': reviewOnly
      ? `${fullAnalysis}\n\nRisk note: this version should stay held if the final combined number moves materially away from the listed price.`
      : fullAnalysis,
    Legs: legList(legs),
    'Leg Count': legCount,
    'Parlay Type': parlayType
  }, { date, mode: reviewOnly ? 'review' : mode, access, sport, league })
}

function validateCard(card = {}) {
  const missing = REQUIRED_CARD_FIELDS.filter(field => {
    const value = card[field]
    return value === undefined || value === null || String(value).trim() === ''
  })
  if (card.Odds !== '' && !Number.isFinite(numberValue(card.Odds, NaN))) missing.push('Odds')
  const reviewParlay = hasWord(/\breview\b/i, `${card['Parlay Type'] || ''}`) && hasWord(/\bheld\b/i, card['Release Status'])
  if (reviewParlay) {
    const oddsIndex = missing.indexOf('Odds')
    if (oddsIndex >= 0) missing.splice(oddsIndex, 1)
  }
  if (hasAggregateOddsSource(card) && manualConfirmationRequired(card)) {
    const sportsbookIndex = missing.indexOf('Sportsbook')
    if (sportsbookIndex >= 0) missing.splice(sportsbookIndex, 1)
  }
  const isProp = hasWord(/\bprop\b/i, `${card.Category || ''} ${card['Bet Type'] || ''} ${card['Prop Type'] || ''}`)
  if (isProp) {
    if (!String(card.Player || '').trim()) missing.push('Player')
    if (!String(card['Prop Type'] || '').trim()) missing.push('Prop Type')
    if (!String(card.Line || '').trim()) missing.push('Line')
  }
  return missing.length ? [`Missing required field(s): ${Array.from(new Set(missing)).join(', ')}`] : []
}

function routingOptions(options = {}) {
  const maxPicks = intValue(param(options, 'maxPicks', 3), 3, 1, 25)
  const mode = String(param(options, 'mode', 'review')).toLowerCase()
  const includeProps = optionBool(options, 'includeProps', true) || mode === 'props'
  const includeLotto = optionBool(options, 'includeLotto', true)
  const includeLottoProps = optionBool(options, 'includeLottoProps', true)
  const includeLongLotto = optionBool(options, 'includeLongLotto', false)
  const includeLongshots = optionBool(options, 'includeLongshots', false) || mode === 'longshots'
  const allowReviewLotto = optionBool(options, 'allowReviewLotto', false)
  const candidatePoolSize = intValue(param(options, 'maxCandidates', ''), Math.min(6, Math.max(4, maxPicks)), 3, 6)
  const maxProps = includeProps ? enabledQuota(param(options, 'maxProps', ''), DEFAULT_QUOTAS.maxProps, 10) : 0
  const maxLottoCards = includeLotto
    ? enabledQuota(param(options, 'maxLottoCards', ''), includeLongLotto ? 4 : DEFAULT_QUOTAS.maxLottoCards, 4)
    : 0
  const maxLottoProps = includeLottoProps
    ? enabledQuota(param(options, 'maxLottoProps', ''), DEFAULT_QUOTAS.maxLottoProps, 4)
    : 0

  return {
    maxPicks,
    candidatePoolSize,
    maxVipPicks: intValue(param(options, 'maxVipPicks', ''), DEFAULT_QUOTAS.maxVipPicks, 0, 10),
    maxFreePicks: intValue(param(options, 'maxFreePicks', ''), DEFAULT_QUOTAS.maxFreePicks, 0, 10),
    maxProps,
    maxLottoCards,
    maxLottoProps,
    maxCandidatesPerLeague: intValue(param(options, 'maxCandidatesPerLeague', ''), DEFAULT_QUOTAS.maxCandidatesPerLeague, 1, 4),
    maxTotalCandidates: intValue(param(options, 'maxTotalCandidates', ''), DEFAULT_QUOTAS.maxTotalCandidates, 1, 12),
    maxManualReviewCards: intValue(param(options, 'maxManualReviewCards', ''), DEFAULT_QUOTAS.maxManualReviewCards, 0, 12),
    maxAllSportsRuntimeMs: intValue(param(options, 'maxAllSportsRuntimeMs', param(options, 'allSportsRuntimeMs', '')), DEFAULT_QUOTAS.maxAllSportsRuntimeMs, 5000, 55000),
    maxLongshots: intValue(param(options, 'maxLongshots', ''), DEFAULT_QUOTAS.maxLongshots, 0, 5),
    includeProps,
    includeLotto,
    includeLottoProps,
    includeLongLotto,
    includeLongshots,
    allowReviewLotto
  }
}

function routeCandidatePool(rawCandidates = [], options = {}) {
  const routing = options.routing
  const decorated = sortCandidates(rawCandidates).map(decorateCandidate)
  const aCandidateQueue = buildACandidateQueue(decorated)
  const aGradeStatus = aGradeStatusFromQueue(aCandidateQueue)
  const candidatePool = decorated.filter(candidate => !missingCandidateFields(candidate).length)
  const releaseEligible = candidatePool.filter(candidate =>
    hasVerifiedReviewPrice(candidate) ||
    (!hasWord(/\bpass\b/i, candidate['Release Gate']) && routeGateOk(candidate))
  )
  const invalidOrPass = decorated.filter(candidate =>
    !hasVerifiedReviewPrice(candidate) &&
    (hasWord(/\bpass\b/i, candidate['Release Gate']) || missingCandidateFields(candidate).length)
  )
  const conflictFiltered = filterConflicts(releaseEligible)
  const normalized = conflictFiltered.kept
  const publishEligible = normalized.filter(candidate => hasWord(/\bpublish eligible\b/i, candidate['Release Gate']))
  const watchlistCount = decorated.filter(candidate => hasWord(/\bwatchlist\b/i, candidate['Release Gate'])).length
  const routeBase = options.mode === 'publish' ? publishEligible : normalized
  const reviewMode = options.mode !== 'publish'
  const manualReviewMode = options.mode === 'review'
  const straight = routeBase.filter(candidate => candidate._type === 'straight')
  const vipCandidates = sortCandidates(straight.filter(vipEligible))
  const freeCandidates = sortCandidates(straight.filter(freeEligible))
  const props = sortCandidates(routeBase.filter(propRouteEligible))
  const longshots = routeBase.filter(candidate => candidate._type === 'longshot' && routeGateOk(candidate) && !hasNegativeEdge(candidate) && (reviewMode || positiveEdge(candidate)))
  const parlayLegs = sortCandidates(routeBase.filter(candidate => lottoLegEligible(candidate, reviewMode)))
  const reviewLottoLegs = sortCandidates(normalized.filter(candidate => lottoLegEligible(candidate, routing.allowReviewLotto)))
  const reviewPropLegs = sortCandidates(normalized.filter(candidate => propRouteEligible(candidate)))
  const cards = []
  const warnings = []
  const passes = [
    ...conflictFiltered.passes,
    ...invalidOrPass.map(candidate => ({
      Candidate: textFrom(candidate, ['Pick', 'pick']) || 'Candidate',
      Reason: missingCandidateFields(candidate).length
        ? `Missing fields: ${missingCandidateFields(candidate).join(', ')}`
        : (candidate['Release Gate'] || 'Pass'),
      'Source Verification': textFrom(candidate, ['Source Verification', 'sourceVerification']) || 'Source not verified.'
    }))
  ]
  const routeOutputs = {
    vipReview: [],
    freeReview: [],
    manualReview: [],
    propsReview: [],
    lottoReview: [],
    lottoPropsReview: [],
    longshotsReview: []
  }
  const freeStatus = {
    requested: routing.maxFreePicks > 0,
    created: 0,
    reason: ''
  }
  const vipStatus = {
    requested: routing.maxVipPicks > 0,
    created: 0,
    reason: ''
  }
  const lottoStatus = {
    requested: routing.includeLotto,
    created: 0,
    reason: ''
  }
  const lottoPropsStatus = {
    requested: routing.includeLottoProps,
    created: 0,
    reason: ''
  }
  const propsStatus = {
    requested: routing.includeProps,
    status: routing.includeProps ? 'incomplete' : 'not_requested',
    rawFound: decorated.filter(candidate => candidate._type === 'prop').length,
    verified: 0,
    missing: [],
    reason: ''
  }
  const routingSummary = {
    candidatePool: candidatePool.length,
    eligibleCandidatePool: normalized.length,
    aGradeStatus,
    aGradeFields: A_GRADE_FIELDS,
    aGradeHuntPriorities: A_HUNT_MARKET_PRIORITIES,
    quotas: {
      maxVipPicks: routing.maxVipPicks,
      maxFreePicks: routing.maxFreePicks,
      maxProps: routing.maxProps,
      maxLottoCards: routing.maxLottoCards,
      maxLottoProps: routing.maxLottoProps,
      maxLongshots: routing.maxLongshots,
      maxManualReviewCards: routing.maxManualReviewCards,
      maxCandidatesPerLeague: routing.maxCandidatesPerLeague,
      maxTotalCandidates: routing.maxTotalCandidates,
      includeProps: routing.includeProps,
      includeLotto: routing.includeLotto,
      includeLottoProps: routing.includeLottoProps,
      allowReviewLotto: routing.allowReviewLotto
    },
    vip: 0,
    free: 0,
    propsLab: 0,
    lottoParlays: 0,
    lottoProps: 0,
    longshots: 0
  }

  const vip = vipCandidates.slice(0, routing.maxVipPicks)
  for (const candidate of vip) {
    const card = { ...normalizeCandidate(candidate, options), Access: 'VIP', Category: 'VIP Pick' }
    cards.push(card)
    routeOutputs.vipReview.push(card)
  }
  routingSummary.vip = vip.length
  vipStatus.created = vip.length
  if (routing.maxVipPicks && !vip.length) {
    vipStatus.reason = 'No straight VIP candidate passed the A-grade gate and release/review gate.'
    warnings.push(vipStatus.reason)
  }

  const routedKeys = new Set(vip.map(candidate => `${candidate.Game}|${candidate.Pick}`))
  const free = freeCandidates
    .filter(candidate => !routedKeys.has(`${candidate.Game}|${candidate.Pick}`))
    .slice(0, routing.maxFreePicks)
  for (const candidate of free) {
    const card = { ...normalizeCandidate(candidate, options), Access: 'Free', Category: 'Free Pick' }
    cards.push(card)
    routeOutputs.freeReview.push(card)
    routedKeys.add(`${candidate.Game}|${candidate.Pick}`)
  }
  routingSummary.free = free.length
  freeStatus.created = free.length
  if (routing.maxFreePicks && !free.length) {
    freeStatus.reason = 'No positive-edge non-VIP public pick available'
    warnings.push(freeStatus.reason)
  }

  const heldReview = sortCandidates(normalized
    .filter(candidate => candidate._type === 'straight')
    .filter(candidate => !routedKeys.has(`${candidate.Game}|${candidate.Pick}`))
    .filter(hasVerifiedReviewPrice))
    .slice(0, routing.maxManualReviewCards)
  for (const candidate of heldReview) {
    const card = heldReviewCard(candidate, options)
    cards.push(card)
    routeOutputs.manualReview.push(card)
    routedKeys.add(`${candidate.Game}|${candidate.Pick}`)
  }

  const manualReviewCapacity = Math.max(0, routing.maxManualReviewCards - routeOutputs.manualReview.length)
  const watchlistManualReview = manualReviewMode
    ? sortCandidates(candidatePool
      .filter(candidate => !routedKeys.has(`${candidate.Game}|${candidate.Pick}`))
      .filter(watchlistManualReviewCandidate))
      .slice(0, manualReviewCapacity)
    : []
  for (const candidate of watchlistManualReview) {
    const card = manualReviewCard(candidate, options)
    cards.push(card)
    routeOutputs.manualReview.push(card)
    routedKeys.add(`${candidate.Game}|${candidate.Pick}`)
  }
  if (watchlistManualReview.length) {
    warnings.push(`${watchlistManualReview.length} watchlist candidate(s) with verified board prices were routed to Held Manual Review.`)
  }

  if (routing.includeProps) {
    const topProps = props.slice(0, routing.maxProps)
    for (const candidate of topProps) {
      const card = { ...normalizeCandidate(candidate, options), Category: 'Player Prop' }
      cards.push(card)
      routeOutputs.propsReview.push(card)
    }
    routingSummary.propsLab = topProps.length
    propsStatus.verified = props.length
    propsStatus.status = props.length ? 'complete' : 'incomplete'
    propsStatus.missing = props.length ? [] : propMissingReasons(decorated)
    if (routing.maxProps && !topProps.length) {
      propsStatus.reason = `No verified prop candidates were available for Props Lab: ${propsStatus.missing.join(', ')}.`
      warnings.push(propsStatus.reason)
    }
  }

  if (routing.includeLotto) {
    const legCounts = [5, 6]
    if (routing.includeLongLotto || parlayLegs.length >= 9) legCounts.push(7)
    if (routing.includeLongLotto || parlayLegs.length >= 12) legCounts.push(8)
    for (const legCount of legCounts.slice(0, routing.maxLottoCards)) {
      const legs = lowConflictLegs(parlayLegs, legCount)
      if (legs.length < legCount) {
      const available = lowConflictLegs(parlayLegs, legCount).length
      const reason = `Insufficient low-conflict eligible legs for ${legCount}-leg lotto parlay: ${available}/${legCount} available.`
      warnings.push(reason)
      lottoStatus.reason ||= reason
      if (routing.allowReviewLotto) {
        const reviewLegs = lowConflictLegs(reviewLottoLegs, legCount)
        if (reviewLegs.length >= legCount) {
          const card = makeParlayCard({
            legs: reviewLegs,
            legCount,
            parlayType: 'Review Lotto',
            reviewOnly: true,
            ...options
          })
          cards.push(card)
          routeOutputs.lottoReview.push(card)
          routingSummary.lottoParlays += 1
          lottoStatus.created += 1
        }
        else {
          lottoStatus.reason ||= `allowReviewLotto requested but only ${reviewLegs.length}/${legCount} review-eligible non-conflicting legs were available.`
        }
      }
      continue
    }
      const card = makeParlayCard({
        legs,
        legCount,
        parlayType: legCount >= 7 ? 'Long Lotto Parlay' : 'Safe Lotto Parlay',
        ...options
      })
      cards.push(card)
      routeOutputs.lottoReview.push(card)
      routingSummary.lottoParlays += 1
      lottoStatus.created += 1
    }
  }

  if (routing.includeLottoProps) {
    for (let index = 0; index < routing.maxLottoProps; index += 1) {
      const legCount = index === 0 ? 5 : 6
      const legs = lowConflictLegs(props, legCount)
      if (legs.length < legCount) {
        const reason = `Insufficient verified prop candidates for a lotto props card: ${legs.length}/${legCount} available.`
        warnings.push(reason)
        lottoPropsStatus.reason ||= reason
        if (routing.allowReviewLotto) {
          const reviewLegs = lowConflictLegs(reviewPropLegs, legCount)
          if (reviewLegs.length >= legCount) {
            const card = makeParlayCard({
              legs: reviewLegs,
              legCount,
              parlayType: 'Lotto Props Review',
              reviewOnly: true,
              ...options
            })
            cards.push(card)
            routeOutputs.lottoPropsReview.push(card)
            routingSummary.lottoProps += 1
            lottoPropsStatus.created += 1
          }
          else {
            lottoPropsStatus.reason ||= `allowReviewLotto requested but only ${reviewLegs.length}/${legCount} review-eligible prop legs were available.`
          }
        }
        break
      }
      const card = makeParlayCard({
        legs,
        legCount,
        parlayType: 'Lotto Props',
        ...options
      })
      cards.push(card)
      routeOutputs.lottoPropsReview.push(card)
      routingSummary.lottoProps += 1
      lottoPropsStatus.created += 1
    }
  }

  if (routing.includeLongshots) {
    const topLongshots = longshots.slice(0, routing.maxLongshots)
    for (const candidate of topLongshots) {
      const card = {
        ...normalizeCandidate(candidate, options),
        Category: 'Longshot',
        'Longshot Type': textFrom(candidate, ['Longshot Type', 'Category']) || 'Longshot'
      }
      cards.push(card)
      routeOutputs.longshotsReview.push(card)
    }
    routingSummary.longshots = topLongshots.length
    if (routing.maxLongshots && !topLongshots.length) warnings.push('Longshots were requested, but no verified longshot candidates were available.')
  }

  return {
    rawCandidatePool: decorated,
    eligibleCandidatePool: normalized,
    candidatePool,
    cards,
    passes,
    warnings,
    routingSummary,
    routeOutputs,
    aCandidateQueue,
    aGradeStatus,
    vipStatus,
    propsStatus,
    freeStatus,
    lottoStatus,
    lottoPropsStatus,
    rawCandidatesFound: decorated.length,
    publishEligibleCount: publishEligible.length,
    reviewEligibleCount: normalized.length - publishEligible.length,
    watchlistCount,
    passCount: passes.length + Math.max(0, decorated.length - normalized.length - passes.length)
  }
}

export async function generateMicksPicks(options = {}) {
  const date = String(param(options, 'date', todayKey()))
  const defaultMode = options.command === 'run-micks-picks' && truthyEnv('MICKS_PICKS_AUTO_PUBLISH')
    ? 'publish'
    : 'review'
  const mode = String(param(options, 'mode', defaultMode)).toLowerCase()
  const access = String(param(options, 'access', 'auto'))
  const normalizedAccess = access.toLowerCase()
  const routing = routingOptions({ ...options, mode })
  const allowSample = boolValue(options.allowSample)
  const framework = await loadFrameworkFiles()
  const provider = configuredProvider()
  const providerStatus = provider
    ? { configured: true, type: provider.type, source: provider.label, role: 'manual override/context only' }
    : { configured: false, role: 'OpenAI web search is primary source' }

  if (!ALLOWED_MODES.has(mode)) return { success: false, error: 'Invalid mode. Use draft, review, publish, props, or longshots.' }
  if (!ALLOWED_ACCESS.has(normalizedAccess)) return { success: false, error: 'Invalid access. Use Free, VIP, Premium, or auto.' }

  const deepMode = boolValue(options.deepMode)
  const rateGuardState = options.command === 'run-micks-picks' ? await rateGuard(options, mode) : null
  if (rateGuardState && !rateGuardState.allowed) return rateGuardState.result
  const maxOpenAiCalls = rateGuardState
    ? (deepMode ? rateGuardState.config.deepModeMaxOpenAiCalls : rateGuardState.config.maxOpenAiCallsPerRun)
    : (deepMode ? rateWindowConfig().deepModeMaxOpenAiCalls : rateWindowConfig().maxOpenAiCallsPerRun)
  const finalize = result => rateGuardState?.allowed ? saveRateGuardResult(rateGuardState, result) : result

  let engine
  try {
    engine = await callOpenAiEngineForRun({ options, date, mode, access, framework, routing })
  } catch (error) {
    const failureStage = error.stage || 'sourceAcquisition'
    logRunMicksPicksFailure(failureStage, error)
    const openAiRuns = error.openAiRuns || 1
    const dryRun = boolValue(options.dryRun)
    return finalize({
      success: false,
      action: 'run-micks-picks',
      stage: failureStage,
      mode,
      frameworkLoaded: frameworkLoadedNames(framework),
      searchesRun: 0,
      sourcesUsed: [],
      cards: [],
      rawCandidatePool: [],
      candidatePool: [],
      eligibleCandidatePool: [],
      aCandidateQueue: [],
      'A-Candidate Queue': [],
      aGradeStatus: emptyAGradeStatus(),
      routeOutputs: emptyRouteOutputs(),
      manualReviewPool: [],
      manualReviewStatus: { requested: true, created: 0, pending: 0, reason: 'OpenAI engine failed before manual review routing.' },
      propsStatus: {
        requested: routing.includeProps,
        status: routing.includeProps ? 'incomplete' : 'not_requested',
        rawFound: 0,
        verified: 0,
        missing: [failureStage === 'jsonParse' ? 'core JSON parse failed' : 'OpenAI engine failed'],
        reason: failureStage === 'jsonParse' ? 'Core JSON parse failed before routing; props pass was not attempted.' : 'OpenAI engine failed before routing.'
      },
      vipStatus: { requested: routing.maxVipPicks > 0, created: 0, reason: failureStage === 'jsonParse' ? 'Core JSON parse failed before routing.' : 'OpenAI engine failed before routing.' },
      freeStatus: { requested: routing.maxFreePicks > 0, created: 0, reason: failureStage === 'jsonParse' ? 'Core JSON parse failed before routing.' : 'OpenAI engine failed before routing.' },
      lottoStatus: { requested: routing.includeLotto, created: 0, reason: failureStage === 'jsonParse' ? 'Core JSON parse failed before routing; lotto routing was not attempted.' : 'OpenAI engine failed before routing.' },
      lottoPropsStatus: { requested: routing.includeLottoProps, created: 0, reason: failureStage === 'jsonParse' ? 'Core JSON parse failed before routing; lotto props routing was not attempted.' : 'OpenAI engine failed before routing.' },
      rawCandidatesFound: 0,
      candidatePoolCount: 0,
      eligibleCandidatePoolCount: 0,
      publishEligibleCount: 0,
      reviewEligibleCount: 0,
      watchlistCount: 0,
      passCount: 0,
      tokenBudget: { openAiRuns, retryUsed: Boolean(error.retryUsed), propsSecondPass: false, propsSecondPassSkippedReason: failureStage === 'jsonParse' ? 'Core JSON parse failed; props/lotto refinement skipped.' : '', candidatePoolTarget: routing.candidatePoolSize, maxRuns: maxOpenAiCalls, deepMode, perRunBudget: tokenBudgetLimit(), maxOutputTokens: maxOutputTokens() },
      sourceAcquisition: emptySourceAcquisition(routing, failureStage === 'jsonParse' ? 'Core OpenAI JSON parse failed after retry.' : 'OpenAI engine failed before source acquisition.'),
      passes: [],
      warnings: [failureStage === 'jsonParse' ? 'Core JSON parse failed; props/lotto refinement was not attempted.' : 'Run Micks Picks could not complete.'],
      created: 0,
      updated: 0,
      errors: [{ message: error.message || 'OpenAI Micks Picks engine failed.' }],
      backup: { skipped: true, reason: 'OpenAI engine failed before Airtable write.' },
      providerStatus,
      rateBudget: rateGuardState?.rateBudget,
      rawOpenAiPreview: error.rawOpenAiPreview || '',
      parseErrorType: error.parseErrorType || '',
      responseId: error.responseId || error.details?.responseId || '',
      retryUsed: Boolean(error.retryUsed),
      ...(dryRun ? {
        rawOpenAiPreview: error.rawOpenAiPreview || '',
        parseErrorType: error.parseErrorType || '',
        responseId: error.responseId || error.details?.responseId || '',
        retryUsed: Boolean(error.retryUsed)
      } : {})
    })
  }

  if (engine.success === false) {
    return {
      ...engine,
      action: 'run-micks-picks',
      stage: 'sourceAcquisition',
      frameworkLoaded: frameworkLoadedNames(framework),
      searchesRun: 0,
      sourcesUsed: [],
      cards: [],
      rawCandidatePool: [],
      candidatePool: [],
      eligibleCandidatePool: [],
      aCandidateQueue: [],
      'A-Candidate Queue': [],
      aGradeStatus: emptyAGradeStatus(),
      routeOutputs: emptyRouteOutputs(),
      manualReviewPool: [],
      manualReviewStatus: { requested: true, created: 0, pending: 0, reason: engine.message },
      propsStatus: { requested: routing.includeProps, status: routing.includeProps ? 'incomplete' : 'not_requested', rawFound: 0, verified: 0, missing: [engine.message], reason: engine.message },
      vipStatus: { requested: routing.maxVipPicks > 0, created: 0, reason: engine.message },
      freeStatus: { requested: routing.maxFreePicks > 0, created: 0, reason: engine.message },
      lottoStatus: { requested: routing.includeLotto, created: 0, reason: engine.message },
      lottoPropsStatus: { requested: routing.includeLottoProps, created: 0, reason: engine.message },
      rawCandidatesFound: 0,
      candidatePoolCount: 0,
      eligibleCandidatePoolCount: 0,
      publishEligibleCount: 0,
      reviewEligibleCount: 0,
      watchlistCount: 0,
      passCount: 0,
      tokenBudget: { openAiRuns: 0, propsSecondPass: false, candidatePoolTarget: routing.candidatePoolSize, maxRuns: maxOpenAiCalls, deepMode, perRunBudget: tokenBudgetLimit(), maxOutputTokens: maxOutputTokens() },
      sourceAcquisition: emptySourceAcquisition(routing, engine.message),
      passes: [],
      warnings: [engine.message],
      created: 0,
      updated: 0,
      errors: [],
      backup: { skipped: true, reason: engine.message },
      providerStatus,
      rateBudget: rateGuardState?.rateBudget,
      rawOpenAiPreview: engine.rawOpenAiPreview || '',
      parseErrorType: engine.parseErrorType || '',
      responseId: engine.responseId || ''
    }
  }

  const warnings = Array.isArray(engine.ai.warnings) ? [...engine.ai.warnings] : []
  if (engine.coreFallback) warnings.push('Core source acquisition fallback returned an empty candidate pool instead of failing the run.')
  if (engine.coreRecovered) warnings.push(`Core source acquisition recovered candidates from malformed JSON (${engine.parseErrorType || 'recovered_partial_json'}).`)
  if (engine.allSportsMode) warnings.push(`All-sports source pass scanned: ${(engine.leaguesScanned || []).join(', ') || 'none'}.`)
  if (engine.partial) warnings.push(`All-sports source pass returned a safe partial result. Remaining leagues: ${(engine.remainingLeagues || []).join(', ') || 'none'}.`)
  const passes = Array.isArray(engine.ai.passes) ? [...engine.ai.passes] : []
  const filteredCore = filterCoreSourceCandidates(rawCandidatesFromEngine(engine))
  let rawCandidatePool = filteredCore.kept
  let manualReviewPool = filteredCore.manual.map(candidate => manualReviewCard(candidate, {
    date,
    mode,
    access,
    sport: param(options, 'sport', ''),
    league: param(options, 'league', '')
  }))
  passes.push(...filteredCore.passes)
  if (filteredCore.passes.length) warnings.push(`${filteredCore.passes.length} core candidate(s) moved to passes because odds/book/source verification was incomplete.`)
  if (manualReviewPool.length) warnings.push(`${manualReviewPool.length} core candidate(s) require manual odds entry before release.`)
  let sourcesUsed = engine.sourcesUsed
  let searchesRunTotal = engine.searchesRun
  const coreOpenAiRuns = (engine.allSportsMode ? (engine.leaguesScanned || []).length : 1) + (engine.retries || 0)
  const tokenBudget = {
    openAiRuns: coreOpenAiRuns,
    retryUsed: Boolean(engine.retries),
    propsSecondPass: false,
    propsPassRetries: 0,
    jsonParseRetries: engine.retries || 0,
    candidatePoolTarget: routing.candidatePoolSize,
    maxRuns: engine.allSportsMode ? Math.max(maxOpenAiCalls, coreOpenAiRuns) : maxOpenAiCalls,
    deepMode,
    perRunBudget: tokenBudgetLimit(),
    maxOutputTokens: maxOutputTokens(),
    propsPassEstimatedTokens: 0,
    propsPassOutputTokenLimit: PROPS_PASS_OUTPUT_TOKEN_LIMIT,
    propsSecondPassSkippedReason: '',
    allSportsPartial: Boolean(engine.partial),
    remainingLeagues: engine.remainingLeagues || [],
    maxAllSportsRuntimeMs: engine.maxAllSportsRuntimeMs || routing.maxAllSportsRuntimeMs,
    sourceParseErrorType: engine.parseErrorType || '',
    sourceRecovered: Boolean(engine.coreRecovered)
  }
  let routed = routeCandidatePool(rawCandidatePool, {
    date,
    mode,
    access,
    sport: param(options, 'sport', ''),
    league: param(options, 'league', ''),
    routing
  })
  if (routing.includeProps && routed.propsStatus.verified === 0) {
    const propsEstimate = estimatePropsPassTokens({
      model: engine.model || process.env.MICKS_PICKS_AI_MODEL || DEFAULT_AI_MODEL,
      date,
      sport: param(options, 'sport', ''),
      league: param(options, 'league', ''),
      routing
    })
    tokenBudget.propsPassEstimatedTokens = propsEstimate
    if (!deepMode || maxOpenAiCalls <= tokenBudget.openAiRuns) {
      tokenBudget.propsSecondPassSkippedReason = 'Props requested but deepMode=1 required for prop sourcing.'
      routed.propsStatus.status = 'incomplete'
      routed.propsStatus.reason = tokenBudget.propsSecondPassSkippedReason
      warnings.push(tokenBudget.propsSecondPassSkippedReason)
    } else if (propsEstimate > tokenBudget.perRunBudget) {
      tokenBudget.propsSecondPassSkippedReason = `Props pass estimate ${propsEstimate} exceeds per-run budget ${tokenBudget.perRunBudget}.`
      routed.propsStatus.reason = tokenBudget.propsSecondPassSkippedReason
      warnings.push(tokenBudget.propsSecondPassSkippedReason)
    } else {
      try {
      tokenBudget.openAiRuns += 1
      tokenBudget.propsSecondPass = true
      const propsEngine = await callOpenAiEngine({
        date,
        sport: param(options, 'sport', ''),
        league: param(options, 'league', ''),
        mode,
        candidatePoolSize: Math.min(12, routing.candidatePoolSize),
        access,
        framework,
        routing,
        propsSearch: true,
        allowRetry: maxOpenAiCalls - tokenBudget.openAiRuns > 0,
        fastMode: true
      })
      tokenBudget.propsPassRetries = propsEngine.retries || 0
      warnings.push(...(Array.isArray(propsEngine.ai.warnings) ? propsEngine.ai.warnings : []))
      passes.push(...(Array.isArray(propsEngine.ai.passes) ? propsEngine.ai.passes : []))
      rawCandidatePool = mergeCandidatePools(rawCandidatePool, rawCandidatesFromEngine(propsEngine))
      manualReviewPool = manualReviewPool.slice(0, 2)
      searchesRunTotal += propsEngine.searchesRun
      sourcesUsed = mergeSources(sourcesUsed, propsEngine.sourcesUsed)
      routed = routeCandidatePool(rawCandidatePool, {
        date,
        mode,
        access,
        sport: param(options, 'sport', ''),
        league: param(options, 'league', ''),
        routing
      })
      } catch (error) {
        warnings.push(`Props-specific second pass failed: ${error.message}`)
        routed.propsStatus.status = 'incomplete'
        routed.propsStatus.reason = `Props-specific second pass failed: ${error.message}`
      }
    }
  }
  const routedManualReviewPool = (routed.routeOutputs.manualReview || [])
    .filter(card => String(card.Category || '') === 'Manual Review')
  const allManualReviewPool = [...routedManualReviewPool, ...manualReviewPool]
  routed.routeOutputs.manualReview = [...(routed.routeOutputs.manualReview || []), ...manualReviewPool]
  const manualReviewStatus = {
    requested: true,
    created: mode === 'review' ? allManualReviewPool.length : 0,
    pending: allManualReviewPool.length,
    reason: allManualReviewPool.length
      ? 'Manual review cards are Held/Pregame until odds, sportsbook, line, source verification, and release approval are completed.'
      : ''
  }
  warnings.push(...routed.warnings)
  passes.push(...routed.passes)
  const validated = []
  const errors = []

  for (const card of routed.cards) {
    const cardErrors = validateCard(card)
    if (appearsSampleCard(card) && !allowSample) cardErrors.push('Provider data appears to be sample/test data.')
    if (cardErrors.length) {
      passes.push({ card: card.Pick || 'Rejected card', reason: cardErrors.join(' ') })
      errors.push({ card: card.Pick || '', message: cardErrors.join(' ') })
    } else {
      validated.push(card)
    }
  }

  const sourceAcquisition = sourceAcquisitionStatus({ routed, sourcesUsed, routing, tokenBudget })
  const dryRun = boolValue(options.dryRun)
  if (dryRun) {
    return finalize({
      success: errors.length === 0,
      action: 'run-micks-picks',
      stage: 'complete',
      dryRun,
      mode,
      model: engine.model,
      frameworkLoaded: frameworkLoadedNames(framework),
      searchesRun: searchesRunTotal,
      sourcesUsed,
      rawCandidatePool: routed.rawCandidatePool,
      candidatePool: routed.candidatePool,
      eligibleCandidatePool: routed.eligibleCandidatePool,
      aCandidateQueue: routed.aCandidateQueue,
      'A-Candidate Queue': routed.aCandidateQueue,
      aGradeStatus: routed.aGradeStatus,
      candidatePoolCount: routed.candidatePool.length,
      eligibleCandidatePoolCount: routed.eligibleCandidatePool.length,
      rawCandidatesFound: routed.rawCandidatesFound,
      publishEligibleCount: routed.publishEligibleCount,
      reviewEligibleCount: routed.reviewEligibleCount,
      watchlistCount: routed.watchlistCount,
      passCount: passes.length,
      routeOutputs: routed.routeOutputs,
      manualReviewPool: allManualReviewPool,
      manualReviewStatus: { ...manualReviewStatus, created: 0 },
      vipStatus: routed.vipStatus,
      propsStatus: routed.propsStatus,
      freeStatus: routed.freeStatus,
      lottoStatus: routed.lottoStatus,
      lottoPropsStatus: routed.lottoPropsStatus,
      tokenBudget,
      sourceAcquisition,
      cards: validated,
      passes,
      warnings,
      routing: routed.routingSummary,
      created: 0,
      updated: 0,
      errors,
      backup: { skipped: true, reason: 'Dry run only' },
      providerStatus,
      rateBudget: rateGuardState?.rateBudget,
      rawOpenAiPreview: engine.rawOpenAiPreview || '',
      parseErrorType: engine.parseErrorType || '',
      responseId: engine.responseId || '',
      retryUsed: Boolean(engine.retries)
    })
  }

  const manualReviewWrites = mode === 'review' ? manualReviewPool : []
  const picksToIngest = [...validated, ...manualReviewWrites]

  if (!picksToIngest.length) {
    return finalize({
      success: false,
      action: 'run-micks-picks',
      stage: 'routing',
      mode,
      model: engine.model,
      frameworkLoaded: frameworkLoadedNames(framework),
      searchesRun: searchesRunTotal,
      sourcesUsed,
      rawCandidatePool: routed.rawCandidatePool,
      candidatePool: routed.candidatePool,
      eligibleCandidatePool: routed.eligibleCandidatePool,
      aCandidateQueue: routed.aCandidateQueue,
      'A-Candidate Queue': routed.aCandidateQueue,
      aGradeStatus: routed.aGradeStatus,
      candidatePoolCount: routed.candidatePool.length,
      eligibleCandidatePoolCount: routed.eligibleCandidatePool.length,
      rawCandidatesFound: routed.rawCandidatesFound,
      publishEligibleCount: routed.publishEligibleCount,
      reviewEligibleCount: routed.reviewEligibleCount,
      watchlistCount: routed.watchlistCount,
      passCount: passes.length,
      routeOutputs: routed.routeOutputs,
      manualReviewPool: allManualReviewPool,
      manualReviewStatus: { ...manualReviewStatus, created: 0 },
      vipStatus: routed.vipStatus,
      propsStatus: routed.propsStatus,
      freeStatus: routed.freeStatus,
      lottoStatus: routed.lottoStatus,
      lottoPropsStatus: routed.lottoPropsStatus,
      tokenBudget,
      sourceAcquisition,
      cards: [],
      passes,
      warnings,
      routing: routed.routingSummary,
      created: 0,
      updated: 0,
      errors: errors.length ? errors : [{ message: 'No valid or manual-review cards were returned by the Micks Picks engine.' }],
      backup: { skipped: true, reason: 'No valid Airtable cards to write.' },
      providerStatus,
      rateBudget: rateGuardState?.rateBudget,
      rawOpenAiPreview: engine.rawOpenAiPreview || '',
      parseErrorType: engine.parseErrorType || '',
      responseId: engine.responseId || ''
    })
  }

  let ingest
  try {
    ingest = await ingestPicksToAirtable({ date, picks: picksToIngest }, {
      dryRun: false,
      allowManualReview: manualReviewWrites.length > 0
    })
    warnings.push(...(ingest.warnings || []))
  } catch (error) {
    return finalize({
      success: false,
      action: 'run-micks-picks',
      stage: 'ingest',
      mode,
      model: engine.model,
      frameworkLoaded: frameworkLoadedNames(framework),
      searchesRun: searchesRunTotal,
      sourcesUsed,
      rawCandidatePool: routed.rawCandidatePool,
      candidatePool: routed.candidatePool,
      eligibleCandidatePool: routed.eligibleCandidatePool,
      aCandidateQueue: routed.aCandidateQueue,
      'A-Candidate Queue': routed.aCandidateQueue,
      aGradeStatus: routed.aGradeStatus,
      candidatePoolCount: routed.candidatePool.length,
      eligibleCandidatePoolCount: routed.eligibleCandidatePool.length,
      rawCandidatesFound: routed.rawCandidatesFound,
      publishEligibleCount: routed.publishEligibleCount,
      reviewEligibleCount: routed.reviewEligibleCount,
      watchlistCount: routed.watchlistCount,
      passCount: passes.length,
      routeOutputs: routed.routeOutputs,
      manualReviewPool: allManualReviewPool,
      manualReviewStatus: { ...manualReviewStatus, created: 0 },
      vipStatus: routed.vipStatus,
      propsStatus: routed.propsStatus,
      freeStatus: routed.freeStatus,
      lottoStatus: routed.lottoStatus,
      lottoPropsStatus: routed.lottoPropsStatus,
      tokenBudget,
      sourceAcquisition,
      cards: validated,
      passes,
      warnings,
      routing: routed.routingSummary,
      created: 0,
      updated: 0,
      errors: [...errors, { message: error.message || 'Airtable ingest failed.' }],
      backup: { skipped: true, reason: 'Airtable ingest failed before Sheets backup.' },
      providerStatus,
      rateBudget: rateGuardState?.rateBudget
    })
  }
  let backup = { skipped: true, reason: 'No successful Airtable writes to mirror.' }
  if (!ingest.errors?.length && (ingest.created || ingest.updated)) {
    try {
      backup = await syncAirtableOperatorToSheets({ dryRun: false })
      warnings.push(...(backup.warnings || []))
    } catch (error) {
      backup = { skipped: true, error: error.message || 'Google Sheets backup failed.' }
      warnings.push(`Google Sheets backup failed: ${backup.error}`)
    }
  }

  return finalize({
    success: !ingest.errors?.length,
    action: 'run-micks-picks',
    stage: backup.error ? 'backup' : 'complete',
    mode,
    model: engine.model,
    frameworkLoaded: frameworkLoadedNames(framework),
    searchesRun: searchesRunTotal,
    sourcesUsed,
    rawCandidatePool: routed.rawCandidatePool,
    candidatePool: routed.candidatePool,
    eligibleCandidatePool: routed.eligibleCandidatePool,
    aCandidateQueue: routed.aCandidateQueue,
    'A-Candidate Queue': routed.aCandidateQueue,
    aGradeStatus: routed.aGradeStatus,
    candidatePoolCount: routed.candidatePool.length,
    eligibleCandidatePoolCount: routed.eligibleCandidatePool.length,
    rawCandidatesFound: routed.rawCandidatesFound,
    publishEligibleCount: routed.publishEligibleCount,
    reviewEligibleCount: routed.reviewEligibleCount,
    watchlistCount: routed.watchlistCount,
    passCount: passes.length,
    routeOutputs: routed.routeOutputs,
    manualReviewPool: allManualReviewPool,
    manualReviewStatus,
    vipStatus: routed.vipStatus,
    propsStatus: routed.propsStatus,
    freeStatus: routed.freeStatus,
    lottoStatus: routed.lottoStatus,
    lottoPropsStatus: routed.lottoPropsStatus,
    tokenBudget,
    sourceAcquisition,
    cards: validated,
    passes,
    warnings,
    routing: routed.routingSummary,
    created: ingest.created,
    updated: ingest.updated,
    skipped: ingest.skipped,
    errors: [...errors, ...(ingest.errors || [])],
    backup,
    providerStatus,
    syncBatchId: ingest.syncBatchId
  })
}

export default generateMicksPicks
