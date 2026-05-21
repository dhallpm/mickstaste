import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ingestPicksToAirtable, syncAirtableOperatorToSheets } from './micksSyncAutomation.js'

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'
const DEFAULT_AI_MODEL = 'gpt-5.5'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FRAMEWORK_DIR = path.join(__dirname, '..', 'micks-framework')
const ALLOWED_MODES = new Set(['draft', 'review', 'publish', 'props', 'longshots'])
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
const REQUIRED_CARD_FIELDS = ['Game', 'Pick', 'Odds', 'Sportsbook', 'Source Verification']
const DEFAULT_QUOTAS = {
  maxVipPicks: 2,
  maxFreePicks: 1,
  maxProps: 2,
  maxLottoCards: 2,
  maxLottoProps: 1,
  maxLongshots: 1
}
const DEFAULT_PER_RUN_TOKEN_BUDGET = 24000
const PROPS_PASS_OUTPUT_TOKEN_LIMIT = 800

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

function estimateTokens(value = '') {
  return Math.ceil(String(value || '').length / 4)
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
  const relevant = new Set(['README.md', 'bankroll.md', 'data-integrity.md', 'closing-odds.md'])
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
  const trimmed = String(text || '').trim()
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  }
  return trimmed
}

function responseText(payload = {}) {
  if (payload.output_text) return payload.output_text
  const parts = []
  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && content.text) parts.push(content.text)
    }
  }
  return parts.join('\n')
}

function responseSources(payload = {}, aiJson = {}) {
  const urls = new Map()
  for (const source of aiJson.sources || aiJson.sourcesUsed || []) {
    const url = source.url || source.href
    if (url) urls.set(url, { title: source.title || url, url })
  }
  for (const item of payload.output || []) {
    for (const source of item.action?.sources || []) {
      const url = source.url || source.uri
      if (url) urls.set(url, { title: source.title || url, url })
    }
    for (const content of item.content || []) {
      for (const annotation of content.annotations || []) {
        const url = annotation.url || annotation.uri
        if (url) urls.set(url, { title: annotation.title || url, url })
      }
    }
  }
  return Array.from(urls.values())
}

function searchesRun(payload = {}) {
  return (payload.output || []).filter(item => String(item.type || '').includes('web_search')).length
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

function gradeScore(grade = '') {
  const normalized = String(grade || '').trim().toUpperCase()
  if (normalized === 'A') return 40
  if (normalized === 'B') return 25
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
  return ['A', 'B', 'C'].includes(String(textFrom(candidate, ['Grade', 'grade'])).trim().toUpperCase())
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
  return {
    ...candidate,
    'Eligible Routes': eligibleRoutes(candidate),
    'Release Gate': releaseGate(candidate),
    _type: candidateType(candidate),
    _score: candidateScore(candidate)
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
    if (!textFrom(candidate, ['Sportsbook', 'sportsbook'])) missing.push('sportsbook')
  } else {
    if (textFrom(candidate, ['Odds', 'odds']) === '') missing.push('odds')
    if (!textFrom(candidate, ['Sportsbook', 'sportsbook'])) missing.push('sportsbook')
  }
  return missing
}

function appearsSampleCard(card = {}) {
  return ['Game', 'Pick', 'Source Verification', 'Writeup', 'Full Analysis']
    .some(field => hasSampleText(card[field]))
}

function aiJsonSchema() {
  const cardProperties = {
    Date: { type: 'string' },
    Sport: { type: 'string' },
    League: { type: 'string' },
    Game: { type: 'string' },
    Pick: { type: 'string' },
    'Bet Type': { type: 'string' },
    Odds: { type: ['number', 'string'] },
    Sportsbook: { type: 'string' },
    'Source Status': { type: 'string' },
    Grade: { type: 'string' },
    Units: { type: ['number', 'string'] },
    'Best Number': { type: ['number', 'string'] },
    'No Bet Cutoff': { type: ['number', 'string'] },
    'Implied Probability': { type: ['number', 'string'] },
    'Estimated True Probability': { type: ['number', 'string'] },
    'EV Edge': { type: ['number', 'string'] },
    Confidence: { type: ['number', 'string'] },
    Status: { type: 'string' },
    'Release Status': { type: 'string' },
    Result: { type: 'string' },
    'Archive Status': { type: 'string' },
    Access: { type: 'string' },
    Writeup: { type: 'string' },
    'Market Notes': { type: 'string' },
    'Injury Notes': { type: 'string' },
    'Source Verification': { type: 'string' },
    'Full Analysis': { type: 'string' }
  }
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
    Units: { type: ['number', 'string'] },
    Confidence: { type: ['number', 'string'] },
    'EV Edge': { type: ['number', 'string'] },
    'Best Number': { type: ['number', 'string'] },
    'No Bet Cutoff': { type: ['number', 'string'] },
    'Implied Probability': { type: ['number', 'string'] },
    'Estimated True Probability': { type: ['number', 'string'] },
    'Risk/Variance Note': { type: 'string' },
    'Market Notes': { type: 'string' },
    'Injury Notes': { type: 'string' },
    'Source Verification': { type: 'string' },
    'Correlation Tags': { type: 'array', items: { type: 'string' } },
    'Conflict Tags': { type: 'array', items: { type: 'string' } },
    'Eligible Routes': { type: 'array', items: { type: 'string' } },
    'Release Gate': { type: 'string' },
    Writeup: { type: 'string' },
    'Full Analysis': { type: 'string' }
  }

  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      searchesRun: { type: ['number', 'string'] },
      candidatePool: {
        type: 'array',
        minItems: 0,
        maxItems: 25,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: candidateProperties,
          required: Object.keys(candidateProperties)
        }
      },
      cards: { type: 'array', items: { type: 'object', additionalProperties: false, properties: cardProperties, required: Object.keys(cardProperties) } },
      passes: {
        type: 'array',
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
      warnings: { type: 'array', items: { type: 'string' } },
      sources: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: { title: { type: 'string' }, url: { type: 'string' } },
          required: ['title', 'url']
        }
      }
    },
    required: ['searchesRun', 'candidatePool', 'cards', 'passes', 'warnings', 'sources']
  }
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
    'Source Verification': { type: 'string' },
    'Eligible Routes': { type: 'array', items: { type: 'string' } },
    'Release Gate': { type: 'string' }
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

function openAiPropsRequestBody({ model, date, sport, league, routing }) {
  const prompt = [
    'Run a compact props-only Micks Picks follow-up search.',
    `Date: ${date}`,
    sport ? `Sport filter: ${sport}` : '',
    league ? `League filter: ${league}` : '',
    `Return at most ${routing.maxProps || DEFAULT_QUOTAS.maxProps} verified player prop candidates.`,
    'Use web search for book-priced player prop boards only.',
    'Each prop must have player, game, prop type, line, odds, sportsbook, and source URL.',
    'Do not invent odds, players, games, or lines.',
    'If no book-priced prop source is available, return no candidates and explain missing fields in passes/warnings.'
  ].filter(Boolean).join('\n')

  return {
    model,
    input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }] }],
    instructions: 'Return only verified book-priced Micks Picks prop candidates. Never fabricate data. Return only valid JSON.',
    tools: [{ type: 'web_search', search_context_size: 'low' }],
    tool_choice: 'required',
    reasoning: { effort: 'low' },
    max_output_tokens: PROPS_PASS_OUTPUT_TOKEN_LIMIT,
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

function openAiRequestBody({ model, date, sport, league, mode, candidatePoolSize, access, framework, routing, propsSearch = false }) {
  const scope = [
    `Date: ${date}`,
    sport ? `Sport filter: ${sport}` : '',
    league ? `League filter: ${league}` : '',
    `Mode: ${mode}`,
    `Candidate pool target: ${candidatePoolSize}`,
    `Access default: ${access}`,
    `Routing quotas: ${JSON.stringify(routing)}`
  ].filter(Boolean).join('\n')

  return {
    model,
    input: [{
      role: 'user',
      content: [{
        type: 'input_text',
        text: [
          propsSearch
            ? 'Run a props-specific Micks Picks follow-up search for today using live web research.'
            : 'Run Micks Picks for today using one live web research pass.',
          scope,
          '',
          'Full Micks Picks framework:',
          frameworkPrompt(framework, {
            sport,
            league,
            includeProps: routing.includeProps,
            includeLotto: routing.includeLotto,
            includeLottoProps: routing.includeLottoProps,
            includeLongshots: routing.includeLongshots
          }),
          '',
          optionalManualContext(),
          '',
          'Research requirements:',
          propsSearch
            ? '- Use web search to find book-priced player prop boards, player prop lines, sportsbook labels, and source URLs. Do not return unpriced prop ideas as eligible candidates.'
            : '- Use web search once to gather today\'s games, odds/lines, injuries/news, market context, matchup stats, and sportsbook prices.',
          `- Build one shared ranked candidate pool of ${candidatePoolSize} legs if enough verified candidates exist.`,
          '- Include straight sides/spreads, moneylines, totals, player props, team props if supported, safer alt-line candidates when available, and longshots only when requested by the mode/options.',
          '- Each candidate must include Category, game, pick, odds, sportsbook or clear source status, grade, confidence, EV edge when available, best number, no-bet cutoff, risk/variance note, source verification, conflict/correlation tags, Eligible Routes, and Release Gate.',
          '- Put the ranked legs in candidatePool. Leave cards empty; the backend will route VIP, Free, Props Lab, Lotto Parlays, Lotto Props, and Longshots from the shared pool.',
          '- Use real current data only. Do not invent games, odds, injuries, sportsbooks, or fake teams.',
          '- If a candidate lacks verified odds, sportsbook, game, pick, player for props, or source verification, put it in passes instead of candidatePool.',
          routing.includeProps ? '- Props are requested: search specifically for player prop lines, player names, prop markets, prop odds, book labels, and source URLs. If no verified props are available, explain the missing source in warnings/passes rather than inventing props.' : '- Props are not requested; do not spend extra search effort on prop-only markets.',
          '- Include source URLs for odds/news/stat claims.',
          '- Output JSON only using the requested schema.'
        ].join('\n')
      }]
    }],
    instructions: propsSearch
      ? 'You are the Micks Picks props sourcing engine. Return only verified book-priced prop candidates or passes with missing fields. Never fabricate data. Return only valid JSON.'
      : 'You are the Micks Picks betting engine. Apply the supplied framework strictly. Use one analysis run and a shared candidate pool. Never fabricate data. Return only valid JSON.',
    tools: [{ type: 'web_search', search_context_size: 'high' }],
    tool_choice: 'required',
    reasoning: { effort: 'medium' },
    text: {
      format: {
        type: 'json_schema',
        name: 'micks_picks_cards',
        strict: true,
        schema: aiJsonSchema()
      }
    }
  }
}

async function callOpenAiEngine({ date, sport, league, mode, candidatePoolSize, access, framework, routing, propsSearch = false }) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return {
      success: false,
      needsOpenAI: true,
      message: 'OPENAI_API_KEY is required for Run Micks Picks.'
    }
  }

  const model = process.env.MICKS_PICKS_AI_MODEL || DEFAULT_AI_MODEL
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(propsSearch
      ? openAiPropsRequestBody({ model, date, sport, league, routing })
      : openAiRequestBody({ model, date, sport, league, mode, candidatePoolSize, access, framework, routing, propsSearch }))
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = payload?.error?.message || response.statusText
    const error = new Error(`OpenAI Micks Picks engine ${response.status}: ${message}`)
    error.statusCode = response.status
    throw error
  }

  const text = responseText(payload)
  let parsed
  try {
    parsed = JSON.parse(cleanJsonText(text))
  } catch {
    const error = new Error('OpenAI Micks Picks engine returned invalid JSON.')
    error.statusCode = 502
    throw error
  }
  return {
    success: true,
    model,
    response: payload,
    ai: parsed,
    searchesRun: Number(parsed.searchesRun || searchesRun(payload) || 0),
    sourcesUsed: responseSources(payload, parsed)
  }
}

function rawCandidatesFromEngine(engine = {}) {
  return Array.isArray(engine.ai?.candidatePool) && engine.ai.candidatePool.length
    ? engine.ai.candidatePool
    : (Array.isArray(engine.ai?.cards) ? engine.ai.cards : [])
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

function normalizeAiCard(card = {}, options = {}) {
  const publish = options.mode === 'publish'
  const odds = numberValue(card.Odds, '')
  return {
    Date: card.Date || options.date,
    Sport: card.Sport || options.sport || '',
    League: card.League || options.league || card.Sport || options.sport || '',
    Game: card.Game || '',
    Pick: card.Pick || '',
    'Bet Type': card['Bet Type'] || '',
    Category: card.Category || '',
    Odds: odds,
    Sportsbook: card.Sportsbook || '',
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
    Player: card.Player || '',
    Team: card.Team || '',
    Opponent: card.Opponent || '',
    'Prop Type': card['Prop Type'] || card['Bet Type'] || '',
    Line: card.Line || '',
    Legs: card.Legs || '',
    'Leg Count': card['Leg Count'] || '',
    'Parlay Type': card['Parlay Type'] || '',
    'Longshot Type': card['Longshot Type'] || ''
  }
}

function normalizeCandidate(candidate = {}, options = {}) {
  return normalizeAiCard({
    Date: candidate.Date || options.date,
    Sport: candidate.Sport || options.sport || '',
    League: candidate.League || options.league || candidate.Sport || options.sport || '',
    Game: candidate.Game || '',
    Pick: candidate.Pick || '',
    'Bet Type': candidate['Bet Type'] || candidate.Market || '',
    Category: candidate.Category || candidateType(candidate),
    Odds: candidate.Odds,
    Sportsbook: candidate.Sportsbook || '',
    Grade: candidate.Grade || '',
    Units: candidate.Units || 1,
    'Best Number': candidate['Best Number'] || candidate.Odds || '',
    'No Bet Cutoff': candidate['No Bet Cutoff'] || '',
    'Implied Probability': candidate['Implied Probability'] || '',
    'Estimated True Probability': candidate['Estimated True Probability'] || '',
    'EV Edge': candidate['EV Edge'] || '',
    Confidence: candidate.Confidence || '',
    Access: candidate.Access || '',
    Writeup: candidate.Writeup || candidate['Risk/Variance Note'] || '',
    'Market Notes': candidate['Market Notes'] || candidate['Risk/Variance Note'] || '',
    'Injury Notes': candidate['Injury Notes'] || '',
    'Source Verification': candidate['Source Verification'] || '',
    'Full Analysis': candidate['Full Analysis'] || candidate.Writeup || '',
    Player: candidate.Player || '',
    Team: candidate.Team || '',
    Opponent: candidate.Opponent || '',
    'Prop Type': candidate['Prop Type'] || candidate['Bet Type'] || '',
    Line: candidate.Line || ''
  }, options)
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
  const confidenceValues = legs.map(leg => numberValue(leg.Confidence, NaN)).filter(Number.isFinite)
  const avgConfidence = confidenceValues.length
    ? Number((confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length).toFixed(1))
    : ''
  const fullAnalysis = [
    `${parlayType} built from the shared Micks Picks candidate pool.`,
    'Legs:',
    legList(legs),
    'Correlation risk: review same-game and market overlap before manual release.'
  ].join('\n')

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
    'Full Analysis': reviewOnly
      ? `${fullAnalysis}\nReview-only lotto: odds require manual confirmation before release.`
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
  const candidatePoolSize = intValue(param(options, 'maxCandidates', ''), Math.max(12, maxPicks), 12, 25)
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
  const releaseEligible = decorated.filter(candidate => !hasWord(/\bpass\b/i, candidate['Release Gate']) && !missingCandidateFields(candidate).length)
  const invalidOrPass = decorated.filter(candidate => hasWord(/\bpass\b/i, candidate['Release Gate']) || missingCandidateFields(candidate).length)
  const conflictFiltered = filterConflicts(releaseEligible)
  const normalized = conflictFiltered.kept
  const publishEligible = normalized.filter(candidate => hasWord(/\bpublish eligible\b/i, candidate['Release Gate']))
  const routeBase = options.mode === 'publish' ? publishEligible : normalized
  const reviewMode = options.mode !== 'publish'
  const straight = routeBase.filter(candidate => candidate._type === 'straight' && (reviewMode || positiveEdge(candidate)))
  const props = routeBase.filter(candidate => candidate._type === 'prop' && (reviewMode || positiveEdge(candidate)) && verifiedProp(candidate))
  const longshots = routeBase.filter(candidate => candidate._type === 'longshot' && (reviewMode || positiveEdge(candidate)))
  const parlayLegs = routeBase.filter(candidate => !['longshot', 'prop'].includes(candidate._type) && (reviewMode || positiveEdge(candidate)))
  const reviewLottoLegs = normalized.filter(candidate => !['longshot', 'prop'].includes(candidate._type))
  const reviewPropLegs = normalized.filter(candidate => candidate._type === 'prop' && verifiedProp(candidate))
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
    candidatePool: normalized.length,
    quotas: {
      maxVipPicks: routing.maxVipPicks,
      maxFreePicks: routing.maxFreePicks,
      maxProps: routing.maxProps,
      maxLottoCards: routing.maxLottoCards,
      maxLottoProps: routing.maxLottoProps,
      maxLongshots: routing.maxLongshots
    },
    vip: 0,
    free: 0,
    propsLab: 0,
    lottoParlays: 0,
    lottoProps: 0,
    longshots: 0
  }

  const vip = straight.slice(0, routing.maxVipPicks)
  for (const candidate of vip) {
    const card = { ...normalizeCandidate(candidate, options), Access: 'VIP', Category: 'VIP Pick' }
    cards.push(card)
    routeOutputs.vipReview.push(card)
  }
  routingSummary.vip = vip.length
  vipStatus.created = vip.length
  if (routing.maxVipPicks && !vip.length) {
    vipStatus.reason = normalized.length
      ? 'No eligible straight candidates available for VIP review.'
      : 'No eligible candidates available for VIP review.'
    warnings.push(vipStatus.reason)
  }

  const vipKeys = new Set(vip.map(candidate => `${candidate.Game}|${candidate.Pick}`))
  const free = straight
    .filter(candidate => !vipKeys.has(`${candidate.Game}|${candidate.Pick}`))
    .slice(0, routing.maxFreePicks)
  for (const candidate of free) {
    const card = { ...normalizeCandidate(candidate, options), Access: 'Free', Category: 'Free Pick' }
    cards.push(card)
    routeOutputs.freeReview.push(card)
  }
  routingSummary.free = free.length
  freeStatus.created = free.length
  if (routing.maxFreePicks && !free.length) {
    freeStatus.reason = 'No positive-edge non-VIP public pick available'
    warnings.push(freeStatus.reason)
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
    candidatePool: normalized,
    cards,
    passes,
    warnings,
    routingSummary,
    routeOutputs,
    vipStatus,
    propsStatus,
    freeStatus,
    lottoStatus,
    lottoPropsStatus,
    rawCandidatesFound: decorated.length,
    publishEligibleCount: publishEligible.length,
    reviewEligibleCount: normalized.length - publishEligible.length,
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

  let engine
  try {
    engine = await callOpenAiEngine({
      date,
      sport: param(options, 'sport', ''),
      league: param(options, 'league', ''),
      mode,
      candidatePoolSize: routing.candidatePoolSize,
      access,
      framework,
      routing
    })
  } catch (error) {
    return {
      success: false,
      mode,
      frameworkLoaded: frameworkLoadedNames(framework),
      searchesRun: 0,
      sourcesUsed: [],
      cards: [],
      rawCandidatePool: [],
      candidatePool: [],
      eligibleCandidatePool: [],
      routeOutputs: {},
      propsStatus: { requested: routing.includeProps, status: 'not_run', verified: 0, missing: ['OpenAI engine failed'] },
      vipStatus: { requested: routing.maxVipPicks > 0, created: 0, reason: 'OpenAI engine failed before routing.' },
      freeStatus: { requested: routing.maxFreePicks > 0, created: 0, reason: 'OpenAI engine failed before routing.' },
      lottoStatus: { requested: routing.includeLotto, created: 0, reason: 'OpenAI engine failed before routing.' },
      lottoPropsStatus: { requested: routing.includeLottoProps, created: 0, reason: 'OpenAI engine failed before routing.' },
      rawCandidatesFound: 0,
      eligibleCandidatePoolCount: 0,
      publishEligibleCount: 0,
      reviewEligibleCount: 0,
      passCount: 0,
      tokenBudget: { openAiRuns: 1, propsSecondPass: false, candidatePoolTarget: routing.candidatePoolSize, maxRuns: routing.includeProps ? 2 : 1 },
      passes: [],
      warnings: ['Run Micks Picks could not complete.'],
      created: 0,
      updated: 0,
      errors: [{ message: error.message || 'OpenAI Micks Picks engine failed.' }],
      backup: { skipped: true, reason: 'OpenAI engine failed before Airtable write.' },
      providerStatus
    }
  }

  if (engine.success === false) {
    return {
      ...engine,
      frameworkLoaded: frameworkLoadedNames(framework),
      searchesRun: 0,
      sourcesUsed: [],
      cards: [],
      rawCandidatePool: [],
      candidatePool: [],
      eligibleCandidatePool: [],
      routeOutputs: {},
      propsStatus: { requested: routing.includeProps, status: 'not_run', verified: 0, missing: [engine.message] },
      vipStatus: { requested: routing.maxVipPicks > 0, created: 0, reason: engine.message },
      freeStatus: { requested: routing.maxFreePicks > 0, created: 0, reason: engine.message },
      lottoStatus: { requested: routing.includeLotto, created: 0, reason: engine.message },
      lottoPropsStatus: { requested: routing.includeLottoProps, created: 0, reason: engine.message },
      rawCandidatesFound: 0,
      eligibleCandidatePoolCount: 0,
      publishEligibleCount: 0,
      reviewEligibleCount: 0,
      passCount: 0,
      tokenBudget: { openAiRuns: 0, propsSecondPass: false, candidatePoolTarget: routing.candidatePoolSize, maxRuns: routing.includeProps ? 2 : 1 },
      passes: [],
      warnings: [engine.message],
      created: 0,
      updated: 0,
      errors: [],
      backup: { skipped: true, reason: engine.message },
      providerStatus
    }
  }

  const warnings = Array.isArray(engine.ai.warnings) ? [...engine.ai.warnings] : []
  const passes = Array.isArray(engine.ai.passes) ? [...engine.ai.passes] : []
  let rawCandidatePool = rawCandidatesFromEngine(engine)
  let sourcesUsed = engine.sourcesUsed
  let searchesRunTotal = engine.searchesRun
  const tokenBudget = {
    openAiRuns: 1,
    propsSecondPass: false,
    candidatePoolTarget: routing.candidatePoolSize,
    maxRuns: routing.includeProps ? 2 : 1,
    perRunBudget: tokenBudgetLimit(),
    propsPassEstimatedTokens: 0,
    propsPassOutputTokenLimit: PROPS_PASS_OUTPUT_TOKEN_LIMIT,
    propsSecondPassSkippedReason: ''
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
    if (propsEstimate > tokenBudget.perRunBudget) {
      tokenBudget.propsSecondPassSkippedReason = `Props pass estimate ${propsEstimate} exceeds per-run budget ${tokenBudget.perRunBudget}.`
      routed.propsStatus.reason = tokenBudget.propsSecondPassSkippedReason
      warnings.push(tokenBudget.propsSecondPassSkippedReason)
    } else {
      try {
      const propsEngine = await callOpenAiEngine({
        date,
        sport: param(options, 'sport', ''),
        league: param(options, 'league', ''),
        mode,
        candidatePoolSize: Math.min(12, routing.candidatePoolSize),
        access,
        framework,
        routing,
        propsSearch: true
      })
      tokenBudget.openAiRuns += 1
      tokenBudget.propsSecondPass = true
      warnings.push(...(Array.isArray(propsEngine.ai.warnings) ? propsEngine.ai.warnings : []))
      passes.push(...(Array.isArray(propsEngine.ai.passes) ? propsEngine.ai.passes : []))
      rawCandidatePool = mergeCandidatePools(rawCandidatePool, rawCandidatesFromEngine(propsEngine))
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
      }
    }
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

  const dryRun = boolValue(options.dryRun)
  if (dryRun) {
    return {
      success: errors.length === 0,
      dryRun,
      mode,
      model: engine.model,
      frameworkLoaded: frameworkLoadedNames(framework),
      searchesRun: searchesRunTotal,
      sourcesUsed,
      rawCandidatePool: routed.rawCandidatePool,
      candidatePool: routed.candidatePool,
      eligibleCandidatePool: routed.eligibleCandidatePool,
      eligibleCandidatePoolCount: routed.eligibleCandidatePool.length,
      rawCandidatesFound: routed.rawCandidatesFound,
      publishEligibleCount: routed.publishEligibleCount,
      reviewEligibleCount: routed.reviewEligibleCount,
      passCount: passes.length,
      routeOutputs: routed.routeOutputs,
      vipStatus: routed.vipStatus,
      propsStatus: routed.propsStatus,
      freeStatus: routed.freeStatus,
      lottoStatus: routed.lottoStatus,
      lottoPropsStatus: routed.lottoPropsStatus,
      tokenBudget,
      cards: validated,
      passes,
      warnings,
      routing: routed.routingSummary,
      created: 0,
      updated: 0,
      errors,
      backup: { skipped: true, reason: 'Dry run only' },
      providerStatus
    }
  }

  if (!validated.length) {
    return {
      success: false,
      mode,
      model: engine.model,
      frameworkLoaded: frameworkLoadedNames(framework),
      searchesRun: searchesRunTotal,
      sourcesUsed,
      rawCandidatePool: routed.rawCandidatePool,
      candidatePool: routed.candidatePool,
      eligibleCandidatePool: routed.eligibleCandidatePool,
      eligibleCandidatePoolCount: routed.eligibleCandidatePool.length,
      rawCandidatesFound: routed.rawCandidatesFound,
      publishEligibleCount: routed.publishEligibleCount,
      reviewEligibleCount: routed.reviewEligibleCount,
      passCount: passes.length,
      routeOutputs: routed.routeOutputs,
      vipStatus: routed.vipStatus,
      propsStatus: routed.propsStatus,
      freeStatus: routed.freeStatus,
      lottoStatus: routed.lottoStatus,
      lottoPropsStatus: routed.lottoPropsStatus,
      tokenBudget,
      cards: [],
      passes,
      warnings,
      routing: routed.routingSummary,
      created: 0,
      updated: 0,
      errors: errors.length ? errors : [{ message: 'No valid cards were returned by the Micks Picks engine.' }],
      backup: { skipped: true, reason: 'No valid Airtable cards to write.' },
      providerStatus
    }
  }

  const ingest = await ingestPicksToAirtable({ date, picks: validated }, { dryRun: false })
  warnings.push(...(ingest.warnings || []))
  let backup = { skipped: true, reason: 'No successful Airtable writes to mirror.' }
  if (!ingest.errors?.length && (ingest.created || ingest.updated)) {
    backup = await syncAirtableOperatorToSheets({ dryRun: false })
    warnings.push(...(backup.warnings || []))
  }

  return {
    success: !ingest.errors?.length,
    mode,
    model: engine.model,
    frameworkLoaded: frameworkLoadedNames(framework),
    searchesRun: searchesRunTotal,
    sourcesUsed,
    rawCandidatePool: routed.rawCandidatePool,
    candidatePool: routed.candidatePool,
    eligibleCandidatePool: routed.eligibleCandidatePool,
    eligibleCandidatePoolCount: routed.eligibleCandidatePool.length,
    rawCandidatesFound: routed.rawCandidatesFound,
    publishEligibleCount: routed.publishEligibleCount,
    reviewEligibleCount: routed.reviewEligibleCount,
    passCount: passes.length,
    routeOutputs: routed.routeOutputs,
    vipStatus: routed.vipStatus,
    propsStatus: routed.propsStatus,
    freeStatus: routed.freeStatus,
    lottoStatus: routed.lottoStatus,
    lottoPropsStatus: routed.lottoPropsStatus,
    tokenBudget,
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
  }
}

export default generateMicksPicks
