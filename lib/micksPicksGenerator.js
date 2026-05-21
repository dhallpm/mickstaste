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

function openAiRequestBody({ model, date, sport, league, mode, candidatePoolSize, access, framework, routing }) {
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
          'Run Micks Picks for today using one live web research pass.',
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
          '- Use web search once to gather today\'s games, odds/lines, injuries/news, market context, matchup stats, and sportsbook prices.',
          `- Build one shared ranked candidate pool of ${candidatePoolSize} legs if enough verified candidates exist.`,
          '- Include straight sides/spreads, moneylines, totals, player props, team props if supported, safer alt-line candidates when available, and longshots only when requested by the mode/options.',
          '- Each candidate must include Category, game, pick, odds, sportsbook, grade, confidence, EV edge when available, best number, no-bet cutoff, risk/variance note, source verification, and conflict/correlation tags.',
          '- Put the ranked legs in candidatePool. Leave cards empty; the backend will route VIP, Free, Props Lab, Lotto Parlays, Lotto Props, and Longshots from the shared pool.',
          '- Use real current data only. Do not invent games, odds, injuries, sportsbooks, or fake teams.',
          '- If a candidate lacks verified odds, sportsbook, game, pick, player for props, or source verification, put it in passes instead of candidatePool.',
          '- Include source URLs for odds/news/stat claims.',
          '- Output JSON only using the requested schema.'
        ].join('\n')
      }]
    }],
    instructions: 'You are the Micks Picks betting engine. Apply the supplied framework strictly. Use one analysis run and a shared candidate pool. Never fabricate data. Return only valid JSON.',
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

async function callOpenAiEngine({ date, sport, league, mode, candidatePoolSize, access, framework, routing }) {
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
    body: JSON.stringify(openAiRequestBody({ model, date, sport, league, mode, candidatePoolSize, access, framework, routing }))
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
  for (const candidate of candidates) {
    const gameKey = String(candidate.Game || '').toLowerCase()
    const candidateTags = [
      ...(candidate['Correlation Tags'] || []),
      ...(candidate['Conflict Tags'] || [])
    ].map(tag => String(tag).toLowerCase()).filter(Boolean)
    if ((games.get(gameKey) || 0) >= 2) continue
    if (candidateTags.some(tag => tags.has(tag))) continue
    selected.push(candidate)
    games.set(gameKey, (games.get(gameKey) || 0) + 1)
    candidateTags.forEach(tag => tags.add(tag))
    if (selected.length === count) break
  }
  return selected
}

function makeParlayCard({ legs, legCount, parlayType, date, mode, access, sport, league }) {
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
    'Full Analysis': fullAnalysis,
    Legs: legList(legs),
    'Leg Count': legCount,
    'Parlay Type': parlayType
  }, { date, mode, access, sport, league })
}

function validateCard(card = {}) {
  const missing = REQUIRED_CARD_FIELDS.filter(field => {
    const value = card[field]
    return value === undefined || value === null || String(value).trim() === ''
  })
  if (card.Odds !== '' && !Number.isFinite(numberValue(card.Odds, NaN))) missing.push('Odds')
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
  const candidatePoolSize = intValue(param(options, 'maxCandidates', ''), Math.max(12, maxPicks), 12, 25)

  return {
    maxPicks,
    candidatePoolSize,
    maxVipPicks: intValue(param(options, 'maxVipPicks', ''), DEFAULT_QUOTAS.maxVipPicks, 0, 10),
    maxFreePicks: intValue(param(options, 'maxFreePicks', ''), DEFAULT_QUOTAS.maxFreePicks, 0, 10),
    maxProps: intValue(param(options, 'maxProps', ''), DEFAULT_QUOTAS.maxProps, 0, 10),
    maxLottoCards: intValue(param(options, 'maxLottoCards', ''), includeLongLotto ? 4 : DEFAULT_QUOTAS.maxLottoCards, 0, 4),
    maxLottoProps: intValue(param(options, 'maxLottoProps', ''), DEFAULT_QUOTAS.maxLottoProps, 0, 4),
    maxLongshots: intValue(param(options, 'maxLongshots', ''), DEFAULT_QUOTAS.maxLongshots, 0, 5),
    includeProps,
    includeLotto,
    includeLottoProps,
    includeLongLotto,
    includeLongshots
  }
}

function routeCandidatePool(rawCandidates = [], options = {}) {
  const routing = options.routing
  const normalized = sortCandidates(rawCandidates)
    .map(candidate => ({
      ...candidate,
      _type: candidateType(candidate),
      _score: candidateScore(candidate)
    }))
  const straight = normalized.filter(candidate => candidate._type === 'straight' && positiveEdge(candidate))
  const props = normalized.filter(candidate => candidate._type === 'prop' && positiveEdge(candidate) && verifiedProp(candidate))
  const longshots = normalized.filter(candidate => candidate._type === 'longshot' && positiveEdge(candidate))
  const parlayLegs = normalized.filter(candidate => candidate._type !== 'longshot' && positiveEdge(candidate))
  const cards = []
  const warnings = []
  const routingSummary = {
    candidatePool: normalized.length,
    vip: 0,
    free: 0,
    propsLab: 0,
    lottoParlays: 0,
    lottoProps: 0,
    longshots: 0
  }

  const vip = straight.slice(0, routing.maxVipPicks)
  for (const candidate of vip) {
    cards.push({ ...normalizeCandidate(candidate, options), Access: 'VIP', Category: 'VIP Pick' })
  }
  routingSummary.vip = vip.length

  const vipKeys = new Set(vip.map(candidate => `${candidate.Game}|${candidate.Pick}`))
  const free = straight
    .filter(candidate => !vipKeys.has(`${candidate.Game}|${candidate.Pick}`))
    .slice(0, routing.maxFreePicks)
  for (const candidate of free) {
    cards.push({ ...normalizeCandidate(candidate, options), Access: 'Free', Category: 'Free Pick' })
  }
  routingSummary.free = free.length
  if (routing.maxFreePicks && !free.length) warnings.push('No positive-edge public/free pick was available after VIP routing.')

  if (routing.includeProps) {
    const topProps = props.slice(0, routing.maxProps)
    for (const candidate of topProps) {
      cards.push({ ...normalizeCandidate(candidate, options), Category: 'Player Prop' })
    }
    routingSummary.propsLab = topProps.length
    if (routing.maxProps && !topProps.length) warnings.push('No verified prop candidates were available for Props Lab.')
  }

  if (routing.includeLotto) {
    const legCounts = [5, 6]
    if (routing.includeLongLotto || parlayLegs.length >= 9) legCounts.push(7)
    if (routing.includeLongLotto || parlayLegs.length >= 12) legCounts.push(8)
    for (const legCount of legCounts.slice(0, routing.maxLottoCards)) {
      const legs = lowConflictLegs(parlayLegs, legCount)
      if (legs.length < legCount) {
        warnings.push(`Insufficient low-conflict candidates for ${legCount}-leg lotto parlay.`)
        continue
      }
      cards.push(makeParlayCard({
        legs,
        legCount,
        parlayType: legCount >= 7 ? 'Long Lotto Parlay' : 'Safe Lotto Parlay',
        ...options
      }))
      routingSummary.lottoParlays += 1
    }
  }

  if (routing.includeLottoProps) {
    for (let index = 0; index < routing.maxLottoProps; index += 1) {
      const legCount = index === 0 ? 5 : 6
      const legs = lowConflictLegs(props, legCount)
      if (legs.length < legCount) {
        warnings.push('Insufficient verified prop candidates for a lotto props card.')
        break
      }
      cards.push(makeParlayCard({
        legs,
        legCount,
        parlayType: 'Lotto Props',
        ...options
      }))
      routingSummary.lottoProps += 1
    }
  }

  if (routing.includeLongshots) {
    const topLongshots = longshots.slice(0, routing.maxLongshots)
    for (const candidate of topLongshots) {
      cards.push({
        ...normalizeCandidate(candidate, options),
        Category: 'Longshot',
        'Longshot Type': textFrom(candidate, ['Longshot Type', 'Category']) || 'Longshot'
      })
    }
    routingSummary.longshots = topLongshots.length
    if (routing.maxLongshots && !topLongshots.length) warnings.push('Longshots were requested, but no verified longshot candidates were available.')
  }

  return {
    candidatePool: normalized,
    cards,
    warnings,
    routingSummary
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
      candidatePool: [],
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
      candidatePool: [],
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
  const rawCandidatePool = Array.isArray(engine.ai.candidatePool) && engine.ai.candidatePool.length
    ? engine.ai.candidatePool
    : (Array.isArray(engine.ai.cards) ? engine.ai.cards : [])
  const routed = routeCandidatePool(rawCandidatePool, {
    date,
    mode,
    access,
    sport: param(options, 'sport', ''),
    league: param(options, 'league', ''),
    routing
  })
  warnings.push(...routed.warnings)
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
      searchesRun: engine.searchesRun,
      sourcesUsed: engine.sourcesUsed,
      candidatePool: routed.candidatePool,
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
      searchesRun: engine.searchesRun,
      sourcesUsed: engine.sourcesUsed,
      candidatePool: routed.candidatePool,
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
    searchesRun: engine.searchesRun,
    sourcesUsed: engine.sourcesUsed,
    candidatePool: routed.candidatePool,
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
