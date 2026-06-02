import {
  AIRTABLE_TABLES,
  createAirtableRecords,
  listAirtableRecords
} from '../lib/airtableClient.js'
import { sendError } from '../lib/syncAuth.js'

const TABLE_ALIASES = {
  picks: 'masterPicks',
  master: 'masterPicks',
  masterPicks: 'masterPicks',
  props: 'propsLab',
  propsLab: 'propsLab',
  parlays: 'lottoParlays',
  lotto: 'lottoParlays',
  lottoParlays: 'lottoParlays',
  longshots: 'longshots',
  longshot: 'longshots'
}

const BLOCKED_IMPORT_FIELDS = new Set([
  'Result',
  'Outcome',
  'Profit/Loss',
  'Record ID',
  'Airtable Record ID'
])

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\ufeff/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00a0/g, ' ')
    .trim()
}

function cleanImportFields(fields = {}) {
  const cleaned = {}
  for (const [rawKey, rawValue] of Object.entries(fields || {})) {
    const key = normalizeText(rawKey)
    if (!key || BLOCKED_IMPORT_FIELDS.has(key)) continue
    const value = typeof rawValue === 'string' ? normalizeText(rawValue) : rawValue
    if (value === '' || value === null || value === undefined) continue
    cleaned[key] = value
  }
  return cleaned
}

function pickIdentity(fields = {}) {
  return [
    fields.Date || fields.date || '',
    fields.Player || '',
    fields.Prop || '',
    fields.Pick || fields.Selection || fields.Name || fields.Title || '',
    fields.Game || fields.Matchup || '',
    fields.Sport || '',
    fields.League || ''
  ].map(value => normalizeText(value).toLowerCase()).join('|')
}

function resolveTable(input = '') {
  const key = TABLE_ALIASES[String(input || '').trim()] || String(input || '').trim()
  return AIRTABLE_TABLES[key] || key
}

async function createMissing(tableName, rawRecords = []) {
  const records = rawRecords
    .map(cleanImportFields)
    .filter(fields => Object.keys(fields).length)

  const existingRecords = await listAirtableRecords(tableName).catch(() => [])
  const existingKeys = new Set(existingRecords.map(record => pickIdentity(record.fields || {})))
  const missing = records.filter(fields => !existingKeys.has(pickIdentity(fields)))
  const warnings = []
  const created = missing.length
    ? await createAirtableRecords(tableName, missing, { typecast: true, warnings })
    : []

  return {
    tableName,
    requested: records.length,
    skippedExisting: records.length - missing.length,
    created: created.length,
    warnings
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(200).json({
        success: true,
        message: 'POST JSON with { table: "propsLab", records: [...] }. Result/Outcome fields are stripped automatically.'
      })
      return
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const batches = Array.isArray(body.batches)
      ? body.batches
      : [{ table: body.table, records: body.records || [] }]

    const results = []
    for (const batch of batches) {
      const tableName = resolveTable(batch.table)
      if (!tableName) throw new Error('Missing Airtable table name or alias')
      results.push(await createMissing(tableName, batch.records || []))
    }

    res.status(200).json({
      success: true,
      message: 'Records imported. Result/Outcome fields were intentionally not sent.',
      results
    })
  } catch (error) {
    console.error(error)
    sendError(res, error)
  }
}
