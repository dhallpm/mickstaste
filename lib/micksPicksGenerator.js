import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ingestPicksToAirtable, syncAirtableOperatorToSheets } from './micksSyncAutomation.js'

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'
const DEFAULT_AI_MODEL = 'gpt-5.5'
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
const REQUIRED_CARD_FIELDS = ['Game', 'Pick', 'Odds', 'Sportsbook', 'Source Verification']

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

function frameworkPrompt(framework = []) {
  return framework
    .map(item => `# FILE: ${item.file}\n${item.content || '[file unavailable in runtime bundle]'}`)
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

  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      searchesRun: { type: ['number', 'string'] },
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
    required: ['searchesRun', 'cards', 'passes', 'warnings', 'sources']
  }
}

function openAiRequestBody({ model, date, sport, league, mode, maxPicks, access, framework }) {
  const scope = [
    `Date: ${date}`,
    sport ? `Sport filter: ${sport}` : '',
    league ? `League filter: ${league}` : '',
    `Mode: ${mode}`,
    `Max picks: ${maxPicks}`,
    `Access default: ${access}`
  ].filter(Boolean).join('\n')

  return {
    model,
    input: [{
      role: 'user',
      content: [{
        type: 'input_text',
        text: [
          'Run Micks Picks for today using live web research.',
          scope,
          '',
          'Full Micks Picks framework:',
          frameworkPrompt(framework),
          '',
          optionalManualContext(),
          '',
          'Research requirements:',
          '- Use web search for today\'s games, odds/lines, injuries/news, market context, matchup stats, and sportsbook prices.',
          '- Use real current data only. Do not invent games, odds, injuries, sportsbooks, or fake teams.',
          '- If a candidate lacks verified odds, sportsbook, game, pick, or source verification, put it in passes instead of cards.',
          '- Include source URLs for odds/news/stat claims.',
          '- Output JSON only using the requested schema.'
        ].join('\n')
      }]
    }],
    instructions: 'You are the Micks Picks betting engine. Apply the supplied framework strictly. Never fabricate data. Return only valid JSON.',
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

async function callOpenAiEngine({ date, sport, league, mode, maxPicks, access, framework }) {
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
    body: JSON.stringify(openAiRequestBody({ model, date, sport, league, mode, maxPicks, access, framework }))
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
    'Full Analysis': card['Full Analysis'] || ''
  }
}

function validateCard(card = {}) {
  const missing = REQUIRED_CARD_FIELDS.filter(field => {
    const value = card[field]
    return value === undefined || value === null || String(value).trim() === ''
  })
  if (card.Odds !== '' && !Number.isFinite(numberValue(card.Odds, NaN))) missing.push('Odds')
  return missing.length ? [`Missing required field(s): ${Array.from(new Set(missing)).join(', ')}`] : []
}

export async function generateMicksPicks(options = {}) {
  const date = String(param(options, 'date', todayKey()))
  const defaultMode = options.command === 'run-micks-picks' && truthyEnv('MICKS_PICKS_AUTO_PUBLISH')
    ? 'publish'
    : 'review'
  const mode = String(param(options, 'mode', defaultMode)).toLowerCase()
  const access = String(param(options, 'access', 'auto'))
  const normalizedAccess = access.toLowerCase()
  const maxPicks = Math.max(1, Math.min(25, numberValue(param(options, 'maxPicks', 3), 3)))
  const allowSample = boolValue(options.allowSample)
  const framework = await loadFrameworkFiles()
  const provider = configuredProvider()
  const providerStatus = provider
    ? { configured: true, type: provider.type, source: provider.label, role: 'manual override/context only' }
    : { configured: false, role: 'OpenAI web search is primary source' }

  if (!ALLOWED_MODES.has(mode)) return { success: false, error: 'Invalid mode. Use draft, review, or publish.' }
  if (!ALLOWED_ACCESS.has(normalizedAccess)) return { success: false, error: 'Invalid access. Use Free, VIP, Premium, or auto.' }

  let engine
  try {
    engine = await callOpenAiEngine({
      date,
      sport: param(options, 'sport', ''),
      league: param(options, 'league', ''),
      mode,
      maxPicks,
      access,
      framework
    })
  } catch (error) {
    return {
      success: false,
      mode,
      frameworkLoaded: frameworkLoadedNames(framework),
      searchesRun: 0,
      sourcesUsed: [],
      cards: [],
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
  const rawCards = Array.isArray(engine.ai.cards) ? engine.ai.cards : []
  const validated = []
  const errors = []

  for (const rawCard of rawCards.slice(0, maxPicks)) {
    const card = normalizeAiCard(rawCard, { date, mode, access, sport: param(options, 'sport', ''), league: param(options, 'league', '') })
    const cardErrors = validateCard(card)
    if (appearsSampleCard(card) && !allowSample) cardErrors.push('Provider data appears to be sample/test data.')
    if (cardErrors.length) {
      passes.push({ card: card.Pick || rawCard.Pick || 'Rejected card', reason: cardErrors.join(' ') })
      errors.push({ card: card.Pick || rawCard.Pick || '', message: cardErrors.join(' ') })
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
      cards: validated,
      passes,
      warnings,
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
      cards: [],
      passes,
      warnings,
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
    cards: validated,
    passes,
    warnings,
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
