import {
  AIRTABLE_TABLES,
  listAirtableRecords,
  resolveAirtableBaseIds
} from '../lib/airtableClient.js'
import { sendError } from '../lib/syncAuth.js'

const AIRTABLE_API_ROOT = 'https://api.airtable.com/v0'

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
  'Airtable Record ID',
  'Posted Time'
])

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

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

function identityForTable(tableAlias = '', fields = {}) {
  const alias = String(tableAlias || '').toLowerCase()
  let parts

  if (alias.includes('props')) {
    parts = [fields.Date, fields.Player, fields.Game, fields.League]
  } else if (alias.includes('lotto') || alias.includes('parlay')) {
    parts = [fields.Date, fields.League, fields.Grade, fields.Units, fields.Status]
  } else if (alias.includes('longshot')) {
    parts = [fields.Date, fields.Pick || fields.Selection || fields.Name || fields.Title, fields.League]
  } else {
    parts = [fields.Date, fields.Pick || fields.Selection || fields.Name || fields.Title, fields.Game, fields.League]
  }

  return parts.map(value => normalizeText(value).toLowerCase()).join('|')
}

function resolveTable(input = '') {
  const key = TABLE_ALIASES[String(input || '').trim()] || String(input || '').trim()
  return AIRTABLE_TABLES[key] || key
}

function airtableUrl(tableName, baseId) {
  return `${AIRTABLE_API_ROOT}/${baseId}/${encodeURIComponent(tableName)}`
}

async function rawAirtableBatch(tableName, records, method, warnings = []) {
  if (!records.length) return []
  const baseId = resolveAirtableBaseIds()[0]
  const createdOrUpdated = []

  for (let i = 0; i < records.length; i += 10) {
    let body = {
      records: records.slice(i, i + 10),
      typecast: true
    }
    const removedFields = new Set()

    for (;;) {
      const response = await fetch(airtableUrl(tableName, baseId), {
        method,
        headers: {
          Authorization: `Bearer ${requiredEnv('AIRTABLE_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })
      const payload = await response.json().catch(() => ({}))

      if (response.ok) {
        for (const fieldName of removedFields) {
          warnings.push(`Removed Airtable-incompatible field ${fieldName} and retried successfully.`)
        }
        createdOrUpdated.push(...(payload.records || []))
        break
      }

      const message = String(payload?.error?.message || payload?.error?.type || response.statusText || '')
      const fieldName = message.match(/field\s+name:\s*"([^"]+)"/i)?.[1] ||
        message.match(/field\s+"([^"]+)"/i)?.[1]

      if (!fieldName || removedFields.has(fieldName) || removedFields.size >= 20) {
        throw new Error(`Airtable ${tableName} ${method} ${response.status}: ${message}`)
      }

      removedFields.add(fieldName)
      body = {
        ...body,
        records: body.records.map(record => {
          if (!Object.hasOwn(record.fields || {}, fieldName)) return record
          const fields = { ...record.fields }
          delete fields[fieldName]
          return { ...record, fields }
        })
      }
    }
  }

  return createdOrUpdated
}

async function upsertRecords(tableAlias, tableName, rawRecords = []) {
  const records = rawRecords
    .map(cleanImportFields)
    .filter(fields => Object.keys(fields).length)

  const existingRecords = await listAirtableRecords(tableName).catch(() => [])
  const existingByKey = new Map(existingRecords.map(record => [identityForTable(tableAlias, record.fields || {}), record]))
  const toCreate = []
  const toUpdate = []

  for (const fields of records) {
    const key = identityForTable(tableAlias, fields)
    const existing = existingByKey.get(key)
    if (existing?.id) {
      toUpdate.push({ id: existing.id, fields })
    } else {
      toCreate.push({ fields })
    }
  }

  const warnings = []
  const updated = await rawAirtableBatch(tableName, toUpdate, 'PATCH', warnings)
  const created = await rawAirtableBatch(tableName, toCreate, 'POST', warnings)

  return {
    tableName,
    requested: records.length,
    updated: updated.length,
    created: created.length,
    skippedExisting: 0,
    warnings
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(200).json({
        success: true,
        message: 'POST JSON with { table: "propsLab", records: [...] }. Result/Outcome fields are stripped automatically. Existing matching records are updated.'
      })
      return
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const batches = Array.isArray(body.batches)
      ? body.batches
      : [{ table: body.table, records: body.records || [] }]

    const results = []
    for (const batch of batches) {
      const tableAlias = TABLE_ALIASES[String(batch.table || '').trim()] || String(batch.table || '').trim()
      const tableName = resolveTable(batch.table)
      if (!tableName) throw new Error('Missing Airtable table name or alias')
      results.push(await upsertRecords(tableAlias, tableName, batch.records || []))
    }

    res.status(200).json({
      success: true,
      message: 'Records upserted. Result/Outcome fields were intentionally not sent.',
      results
    })
  } catch (error) {
    console.error(error)
    sendError(res, error)
  }
}
