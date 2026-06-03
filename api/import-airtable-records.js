const AIRTABLE_API_ROOT = 'https://api.airtable.com/v0'
const DEFAULT_BASE_ID = 'appsVhMax3qWQ1odj'

const TABLES = {
  picks: process.env.AIRTABLE_MASTER_PICKS_TABLE_ID || process.env.AIRTABLE_MASTER_PICKS_TABLE || 'tblB0LZW6ATToi8tF',
  master: process.env.AIRTABLE_MASTER_PICKS_TABLE_ID || process.env.AIRTABLE_MASTER_PICKS_TABLE || 'tblB0LZW6ATToi8tF',
  masterPicks: process.env.AIRTABLE_MASTER_PICKS_TABLE_ID || process.env.AIRTABLE_MASTER_PICKS_TABLE || 'tblB0LZW6ATToi8tF',
  props: process.env.AIRTABLE_PROPS_TABLE_ID || process.env.AIRTABLE_PROPS_TABLE || 'tblPdZG1sTbjD74mx',
  propsLab: process.env.AIRTABLE_PROPS_TABLE_ID || process.env.AIRTABLE_PROPS_TABLE || 'tblPdZG1sTbjD74mx',
  lotto: process.env.AIRTABLE_LOTTO_TABLE_ID || process.env.AIRTABLE_LOTTO_TABLE || 'tbllr4X5WVUxtmQyL',
  parlays: process.env.AIRTABLE_LOTTO_TABLE_ID || process.env.AIRTABLE_LOTTO_TABLE || 'tbllr4X5WVUxtmQyL',
  lottoParlays: process.env.AIRTABLE_LOTTO_TABLE_ID || process.env.AIRTABLE_LOTTO_TABLE || 'tbllr4X5WVUxtmQyL',
  longshot: process.env.AIRTABLE_LONGSHOTS_TABLE_ID || process.env.AIRTABLE_LONGSHOTS_TABLE || 'tblE2H2iiKoFqQXHl',
  longshots: process.env.AIRTABLE_LONGSHOTS_TABLE_ID || process.env.AIRTABLE_LONGSHOTS_TABLE || 'tblE2H2iiKoFqQXHl'
}

const BLOCKED_FIELDS = new Set([
  'Result',
  'Outcome',
  'Profit/Loss',
  'P/L',
  'PL',
  'Profit Loss',
  'Record ID',
  'Airtable Record ID',
  'id',
  'airtableRecordId',
  '__table'
])

const TABLE_ALLOWED_FIELDS = {
  picks: new Set([
    'Date','Sport','League','Game','Pick','Bet Type','Odds','Sportsbook','Grade','Units','Best Number','No Bet Cutoff','Implied Probability','EV Edge','True Probability','Model Probability','Closing Number','Closing Odds','CLV%','CLV Result','Closing Line Value','Closing Line','Confidence','Status','Access','Writeup','Market Notes','Injury Notes','Source Verification','Posted Time','Full Analysis'
  ]),
  propsLab: new Set([
    'Date','Player','Prop','Sport','League','Game','Grade','Units','Status','Odds','Sportsbook','Best Number','No Bet Cutoff','Confidence','Access','Featured','Writeup','Market Notes','Injury Notes','Source Verification','Full Analysis'
  ]),
  lottoParlays: new Set([
    'Date','Sport','League','Game','Pick','Bet Type','Odds','Sportsbook','Grade','Units','Best Number','No Bet Cutoff','Confidence','Status','Access','Featured','Parlay Group','Writeup','Market Notes','Injury Notes','Source Verification','Full Analysis'
  ]),
  longshots: new Set([
    'Date','Sport','League','Game','Pick','Bet Type','Odds','Sportsbook','Grade','Units','Best Number','No Bet Cutoff','Confidence','Status','Access','Featured','Longshot','Writeup','Market Notes','Injury Notes','Source Verification','Full Analysis'
  ])
}

function baseId() {
  return String(process.env.AIRTABLE_VERIFIED_BASE_ID || process.env.AIRTABLE_BASE_ID || DEFAULT_BASE_ID).trim()
}

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

function canonicalTable(alias = '') {
  const key = String(alias || '').trim()
  if (key === 'master' || key === 'masterPicks' || key === 'picks') return 'picks'
  if (key === 'props' || key === 'propsLab') return 'propsLab'
  if (key === 'lotto' || key === 'parlays' || key === 'lottoParlays') return 'lottoParlays'
  if (key === 'longshot' || key === 'longshots') return 'longshots'
  return key
}

function tableRef(alias = '') {
  const key = String(alias || '').trim()
  return TABLES[key] || TABLES[canonicalTable(key)] || key
}

function cleanText(value) {
  return String(value ?? '')
    .replace(/\ufeff/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00a0/g, ' ')
    .trim()
}

function cleanValue(value) {
  if (typeof value === 'string') return cleanText(value)
  return value
}

function gradeValue(fields = {}) {
  return cleanText(fields.Grade || fields['Card Grade'] || fields.grade || '').toUpperCase()
}

function isAOrBetter(fields = {}) {
  const grade = gradeValue(fields)
  return grade === 'A' || grade === 'A+'
}

function normalizeAccessByGrade(fields = {}, tableAlias = '') {
  const canonical = canonicalTable(tableAlias)
  const next = { ...fields }

  if (canonical === 'propsLab') {
    const access = cleanText(next.Access).toLowerCase()
    if (access.includes('vip') && !isAOrBetter(next)) {
      next.Access = 'Free'
    }
  }

  if (canonical === 'picks') {
    const access = cleanText(next.Access).toLowerCase()
    if (access.includes('vip') && !isAOrBetter(next)) {
      next.Access = 'Free'
    }
  }

  return next
}

function cleanFields(fields = {}, tableAlias = '') {
  const canonical = canonicalTable(tableAlias)
  const allowed = TABLE_ALLOWED_FIELDS[canonical]
  const cleaned = {}

  for (const [rawKey, rawValue] of Object.entries(fields || {})) {
    const key = cleanText(rawKey)
    if (!key || BLOCKED_FIELDS.has(key)) continue
    if (allowed && !allowed.has(key)) continue
    const value = cleanValue(rawValue)
    if (value === '' || value === null || value === undefined) continue
    cleaned[key] = value
  }

  return normalizeAccessByGrade(cleaned, tableAlias)
}

function extractRejectedField(payload = {}) {
  const message = String(payload?.error?.message || payload?.error?.type || payload?.error || '')
  return message.match(/field\s+name:\s*"([^"]+)"/i)?.[1] ||
    message.match(/field\s+"([^"]+)"/i)?.[1] ||
    message.match(/Unknown field name:\s*"([^"]+)"/i)?.[1] ||
    ''
}

function removeField(records = [], fieldName = '') {
  let removed = false
  const next = records.map(record => {
    if (!Object.hasOwn(record.fields || {}, fieldName)) return record
    removed = true
    const fields = { ...record.fields }
    delete fields[fieldName]
    return { ...record, fields }
  })
  return { records: next, removed }
}

async function airtableBatchCreate(tableAlias, records = []) {
  const table = tableRef(tableAlias)
  const base = baseId()
  const warnings = []
  const created = []
  const skipped = []
  const prepared = records
    .map((fields, index) => ({ index, fields: cleanFields(fields, tableAlias) }))
    .filter(record => {
      const keep = Object.keys(record.fields).length > 0
      if (!keep) skipped.push({ index: record.index, reason: 'No valid fields after cleaning' })
      return keep
    })

  for (let i = 0; i < prepared.length; i += 10) {
    let body = {
      records: prepared.slice(i, i + 10).map(record => ({ fields: record.fields })),
      typecast: true
    }
    const removedFields = new Set()

    for (;;) {
      const response = await fetch(`${AIRTABLE_API_ROOT}/${base}/${encodeURIComponent(table)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${requiredEnv('AIRTABLE_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })
      const payload = await response.json().catch(() => ({}))

      if (response.ok) {
        created.push(...(payload.records || []))
        for (const field of removedFields) warnings.push(`Removed Airtable-incompatible field ${field} and retried successfully.`)
        break
      }

      const rejectedField = extractRejectedField(payload)
      if (!rejectedField || removedFields.has(rejectedField) || removedFields.size >= 20) {
        return {
          tableAlias,
          tableName: table,
          requested: records.length,
          created: created.length,
          skipped,
          warnings,
          error: payload?.error?.message || payload?.error?.type || response.statusText,
          status: response.status
        }
      }

      const next = removeField(body.records, rejectedField)
      if (!next.removed) {
        return {
          tableAlias,
          tableName: table,
          requested: records.length,
          created: created.length,
          skipped,
          warnings,
          error: `Airtable rejected field ${rejectedField}, but it was not present in payload`,
          status: response.status
        }
      }
      removedFields.add(rejectedField)
      body = { ...body, records: next.records }
    }
  }

  return {
    tableAlias,
    tableName: table,
    requested: records.length,
    cleaned: prepared.length,
    skipped,
    created: created.length,
    warnings
  }
}

function parseBody(req) {
  if (!req.body) return {}
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}')
  return req.body
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(200).json({
        success: true,
        message: 'POST JSON with { table: "propsLab", records: [...] } or { batches: [...] }. Result/Outcome/Profit-Loss fields are stripped automatically. Master Picks metric fields are accepted. Props Lab and Master Picks below A/A+ cannot import as VIP; they are normalized to Free.',
        baseId: baseId(),
        tables: {
          picks: tableRef('picks'),
          propsLab: tableRef('propsLab'),
          lottoParlays: tableRef('lottoParlays'),
          longshots: tableRef('longshots')
        }
      })
      return
    }

    const body = parseBody(req)
    const batches = Array.isArray(body.batches)
      ? body.batches
      : [{ table: body.table, records: body.records || [] }]

    const results = []
    for (const batch of batches) {
      const table = canonicalTable(batch.table || '')
      const records = Array.isArray(batch.records) ? batch.records : []
      if (!table) {
        results.push({ tableAlias: batch.table || '', requested: records.length, created: 0, error: 'Missing table alias' })
        continue
      }
      results.push(await airtableBatchCreate(table, records))
    }

    const failed = results.filter(result => result.error)
    res.status(failed.length ? 207 : 200).json({
      success: failed.length === 0,
      message: failed.length
        ? 'Some sections failed. Successful sections may still have imported.'
        : 'Records imported. Result/Outcome/Profit-Loss fields were intentionally not sent.',
      results
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error.message || String(error) })
  }
}
