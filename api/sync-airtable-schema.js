import { AIRTABLE_TABLES, resolveAirtableBaseIds, isAirtableTableId } from '../lib/airtableClient.js'
import { sendError } from '../lib/syncAuth.js'

const META_ROOT = 'https://api.airtable.com/v0/meta'
const CONFIRM = 'ADD_MICKS_FIELDS'

const FIELD_TYPES = {
  Date: { type: 'date', options: { dateFormat: { name: 'iso' } } },
  Sport: { type: 'singleLineText' },
  League: { type: 'singleLineText' },
  Game: { type: 'singleLineText' },
  Pick: { type: 'singleLineText' },
  Player: { type: 'singleLineText' },
  Prop: { type: 'singleLineText' },
  'Bet Type': { type: 'singleLineText' },
  Odds: { type: 'singleLineText' },
  Sportsbook: { type: 'singleLineText' },
  Grade: { type: 'singleLineText' },
  Units: { type: 'number', options: { precision: 2 } },
  'Best Number': { type: 'singleLineText' },
  'No Bet Cutoff': { type: 'singleLineText' },
  Confidence: { type: 'singleLineText' },
  Status: { type: 'singleLineText' },
  Access: { type: 'singleLineText' },
  Featured: { type: 'singleLineText' },
  Longshot: { type: 'singleLineText' },
  'Parlay Group': { type: 'singleLineText' },
  Writeup: { type: 'multilineText' },
  'Market Notes': { type: 'multilineText' },
  'Injury Notes': { type: 'multilineText' },
  'Source Verification': { type: 'multilineText' },
  'Full Analysis': { type: 'multilineText' }
}

const TABLE_FIELDS = {
  propsLab: [
    'Date', 'Player', 'Prop', 'Sport', 'League', 'Game', 'Grade', 'Units', 'Status',
    'Odds', 'Sportsbook', 'Best Number', 'No Bet Cutoff', 'Confidence', 'Access',
    'Featured', 'Writeup', 'Market Notes', 'Injury Notes', 'Source Verification', 'Full Analysis'
  ],
  lottoParlays: [
    'Date', 'Sport', 'League', 'Game', 'Pick', 'Bet Type', 'Odds', 'Sportsbook',
    'Grade', 'Units', 'Best Number', 'No Bet Cutoff', 'Confidence', 'Status',
    'Access', 'Featured', 'Parlay Group', 'Writeup', 'Market Notes', 'Injury Notes',
    'Source Verification', 'Full Analysis'
  ],
  longshots: [
    'Date', 'Sport', 'League', 'Game', 'Pick', 'Bet Type', 'Odds', 'Sportsbook',
    'Grade', 'Units', 'Best Number', 'No Bet Cutoff', 'Confidence', 'Status',
    'Access', 'Featured', 'Longshot', 'Writeup', 'Market Notes', 'Injury Notes',
    'Source Verification', 'Full Analysis'
  ]
}

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

function authHeaders() {
  return {
    Authorization: `Bearer ${requiredEnv('AIRTABLE_API_KEY')}`,
    'Content-Type': 'application/json'
  }
}

function tableCandidates(key) {
  if (key === 'propsLab') return [process.env.AIRTABLE_PROPS_TABLE_ID, process.env.AIRTABLE_PROPS_TABLE, AIRTABLE_TABLES.propsLab, 'Props Lab', 'Props', 'Active Props', 'Player Props'].filter(Boolean)
  if (key === 'lottoParlays') return [process.env.AIRTABLE_LOTTO_TABLE_ID, process.env.AIRTABLE_LOTTO_TABLE, AIRTABLE_TABLES.lottoParlays, 'Lotto Parlays', 'Parlays', 'Safe Lotto Parlays'].filter(Boolean)
  if (key === 'longshots') return [process.env.AIRTABLE_LONGSHOTS_TABLE_ID, process.env.AIRTABLE_LONGSHOTS_TABLE, AIRTABLE_TABLES.longshots, 'Longshots', 'Micks LongShots', 'Longshot Picks'].filter(Boolean)
  return []
}

async function metaFetch(path, options = {}) {
  const response = await fetch(`${META_ROOT}${path}`, {
    method: options.method || 'GET',
    headers: authHeaders(),
    body: options.body ? JSON.stringify(options.body) : undefined
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = payload?.error?.message || payload?.error?.type || response.statusText
    throw new Error(`Airtable metadata ${response.status}: ${message}`)
  }
  return payload
}

async function getBaseSchema(baseId) {
  return metaFetch(`/bases/${baseId}/tables`)
}

function resolveTable(schema, key) {
  const candidates = tableCandidates(key).map(value => String(value || '').trim()).filter(Boolean)
  return schema.tables.find(table => candidates.some(candidate => {
    if (isAirtableTableId(candidate)) return table.id === candidate
    return table.name.toLowerCase() === candidate.toLowerCase()
  }))
}

async function createField(baseId, tableId, fieldName) {
  const definition = FIELD_TYPES[fieldName] || { type: 'singleLineText' }
  return metaFetch(`/bases/${baseId}/tables/${tableId}/fields`, {
    method: 'POST',
    body: { name: fieldName, ...definition }
  })
}

async function syncTable(baseId, schema, key) {
  const table = resolveTable(schema, key)
  if (!table) {
    return { key, table: null, error: `Table not found for ${key}`, created: [], existing: [] }
  }

  const existingNames = new Set((table.fields || []).map(field => String(field.name || '').toLowerCase()))
  const created = []
  const existing = []
  const failed = []

  for (const fieldName of TABLE_FIELDS[key] || []) {
    if (existingNames.has(fieldName.toLowerCase())) {
      existing.push(fieldName)
      continue
    }

    try {
      await createField(baseId, table.id, fieldName)
      created.push(fieldName)
      existingNames.add(fieldName.toLowerCase())
    } catch (error) {
      failed.push({ fieldName, error: error.message })
    }
  }

  return { key, table: table.name, tableId: table.id, existing, created, failed }
}

export default async function handler(req, res) {
  try {
    const baseId = resolveAirtableBaseIds()[0]
    if (!baseId) throw new Error('No Airtable base ID configured')

    const schema = await getBaseSchema(baseId)
    const confirmed = String(req.query?.confirm || '') === CONFIRM
    const planned = Object.keys(TABLE_FIELDS).map(key => {
      const table = resolveTable(schema, key)
      const existingNames = new Set((table?.fields || []).map(field => String(field.name || '').toLowerCase()))
      const missing = (TABLE_FIELDS[key] || []).filter(fieldName => !existingNames.has(fieldName.toLowerCase()))
      return { key, table: table?.name || null, tableId: table?.id || null, missing }
    })

    if (!confirmed) {
      res.status(200).json({
        success: true,
        dryRun: true,
        message: 'Preview only. Add ?confirm=ADD_MICKS_FIELDS to create missing Airtable fields.',
        baseId,
        planned
      })
      return
    }

    const results = []
    // Refresh schema only once; we also track fields locally per table during sync.
    for (const key of Object.keys(TABLE_FIELDS)) {
      results.push(await syncTable(baseId, schema, key))
    }

    res.status(200).json({
      success: true,
      dryRun: false,
      message: 'Airtable schema sync completed.',
      baseId,
      results
    })
  } catch (error) {
    console.error(error)
    sendError(res, error)
  }
}
