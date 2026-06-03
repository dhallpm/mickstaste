const AIRTABLE_API_ROOT = 'https://api.airtable.com/v0'
const DEFAULT_BASE_ID = 'appsVhMax3qWQ1odj'
const DEFAULT_MASTER_TABLE = 'tblB0LZW6ATToi8tF'

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

function baseId() {
  return String(process.env.AIRTABLE_VERIFIED_BASE_ID || process.env.AIRTABLE_BASE_ID || DEFAULT_BASE_ID).trim()
}

function masterTable() {
  return String(process.env.AIRTABLE_MASTER_PICKS_TABLE_ID || process.env.AIRTABLE_MASTER_PICKS_TABLE || DEFAULT_MASTER_TABLE).trim()
}

export function todayEasternKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

export function requestedDateKey(value) {
  const raw = String(value || '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  if (raw) {
    const parsed = new Date(raw)
    if (!Number.isNaN(parsed.getTime())) return todayEasternKey(parsed)
  }
  return todayEasternKey()
}

function firstValue(row = {}, keys = []) {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') return value
  }
  return ''
}

function text(value) {
  return String(value ?? '').trim()
}

export function parseNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN
  const cleaned = String(value ?? '')
    .replace(/,/g, '')
    .match(/[+-]?\d+(?:\.\d+)?/)
  return cleaned ? Number(cleaned[0]) : NaN
}

export function parseAmericanOdds(value) {
  const parsed = parseNumber(value)
  return Number.isFinite(parsed) && parsed !== 0 ? parsed : NaN
}

export function americanToDecimal(odds) {
  const value = parseAmericanOdds(odds)
  if (!Number.isFinite(value)) return NaN
  return value > 0 ? 1 + value / 100 : 1 + 100 / Math.abs(value)
}

function rowDateKey(row = {}) {
  const value = firstValue(row, ['Date', 'date', 'Game Date', 'Posted Time', 'Timestamp'])
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(text(value))) return text(value)
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? text(value).slice(0, 10) : todayEasternKey(parsed)
}

function resultLabel(value) {
  const result = text(value).toLowerCase()
  if (/^(win|won|w)$/.test(result)) return 'Win'
  if (/^(loss|lost|l)$/.test(result)) return 'Loss'
  if (/^(push|void|cancelled|canceled|no action)$/.test(result)) return 'Push'
  if (!result || /^pending$/.test(result)) return ''
  return ''
}

function clvResult(value) {
  if (!Number.isFinite(value)) return 'Insufficient Data'
  if (value > 0.25) return 'Positive'
  if (value < -0.25) return 'Negative'
  return 'Neutral'
}

function pointClvResult(value) {
  if (!Number.isFinite(value)) return 'Insufficient Data'
  if (value > 0) return 'Positive'
  if (value < 0) return 'Negative'
  return 'Neutral'
}

function lineDirection(row = {}) {
  const value = [
    firstValue(row, ['Pick', 'Selection', 'Team', 'Side']),
    firstValue(row, ['Bet Type', 'Type', 'Market', 'Prop'])
  ].join(' ').toLowerCase()
  if (/\bover\b/.test(value)) return 'over'
  if (/\bunder\b/.test(value)) return 'under'
  if (/\bmoney\s*line\b|\bmoneyline\b|\bml\b/.test(value)) return 'moneyline'
  return ''
}

export function calculateClvFields(row = {}) {
  const postedNumber = parseNumber(firstValue(row, ['Best Number', 'Posted Number', 'Line', 'Number', 'Suggested Line', 'No Bet Cutoff']))
  const closingNumber = parseNumber(firstValue(row, ['Closing Number', 'Closing Line', 'Verified Closing Number']))
  const postedOdds = parseAmericanOdds(firstValue(row, ['Odds', 'Posted Odds', 'American Odds']))
  const closingOdds = parseAmericanOdds(firstValue(row, ['Closing Odds', 'Closing Price']))
  const direction = lineDirection(row)

  if (Number.isFinite(closingNumber) && Number.isFinite(postedNumber)) {
    let value
    if (direction === 'over') value = closingNumber - postedNumber
    else if (direction === 'under') value = postedNumber - closingNumber
    else if (postedNumber < 0 || closingNumber < 0) value = Math.abs(closingNumber) - Math.abs(postedNumber)
    else if (postedNumber > 0 || closingNumber > 0) value = postedNumber - closingNumber
    else value = closingNumber - postedNumber

    return {
      fields: {
        'Closing Line Value': Number(value.toFixed(2)),
        'CLV%': `${value >= 0 ? '+' : ''}${value.toFixed(1)} pts`,
        'CLV Result': pointClvResult(value)
      },
      reason: 'line'
    }
  }

  if (Number.isFinite(postedOdds) && Number.isFinite(closingOdds)) {
    const postedDecimal = americanToDecimal(postedOdds)
    const closingDecimal = americanToDecimal(closingOdds)
    if (Number.isFinite(postedDecimal) && Number.isFinite(closingDecimal) && closingDecimal > 0) {
      const percent = (postedDecimal / closingDecimal - 1) * 100
      return {
        fields: {
          'CLV%': Number(percent.toFixed(2)),
          'CLV Result': clvResult(percent)
        },
        reason: 'odds'
      }
    }
  }

  return {
    fields: {
      'CLV Result': 'Insufficient Data'
    },
    reason: 'insufficient'
  }
}

export function calculateSettlementFields(row = {}, now = new Date()) {
  const result = resultLabel(firstValue(row, ['Result', 'Outcome', 'Grade']))
  if (!result) return { fields: {}, skipped: true, reason: 'Pending or unsupported result' }

  const units = parseNumber(firstValue(row, ['Units', 'Units to Commit', 'Stake']))
  const odds = parseAmericanOdds(firstValue(row, ['Odds', 'Posted Odds', 'American Odds']))
  if (!Number.isFinite(units) || units <= 0) return { fields: {}, skipped: true, reason: 'Missing units' }

  let profitLoss
  if (result === 'Win') {
    if (!Number.isFinite(odds)) return { fields: {}, skipped: true, reason: 'Missing odds for win settlement' }
    profitLoss = odds > 0 ? units * odds / 100 : units * 100 / Math.abs(odds)
  } else if (result === 'Loss') {
    profitLoss = -units
  } else {
    profitLoss = 0
  }

  return {
    fields: {
      'Profit/Loss': Number(profitLoss.toFixed(2)),
      ROI: Number(((profitLoss / units) * 100).toFixed(2)),
      'Settled At': now.toISOString()
    },
    skipped: false,
    reason: result
  }
}

async function listMasterRecords() {
  const records = []
  let offset
  do {
    const url = new URL(`${AIRTABLE_API_ROOT}/${baseId()}/${encodeURIComponent(masterTable())}`)
    url.searchParams.set('pageSize', '100')
    if (offset) url.searchParams.set('offset', offset)
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${requiredEnv('AIRTABLE_API_KEY')}`,
        'Content-Type': 'application/json'
      }
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      const message = payload?.error?.message || payload?.error?.type || response.statusText
      throw new Error(`Airtable Master Picks ${response.status}: ${message}`)
    }
    records.push(...(payload.records || []))
    offset = payload.offset
  } while (offset)
  return records
}

function rejectedField(payload = {}) {
  const message = String(payload?.error?.message || payload?.error?.type || payload?.error || '')
  return message.match(/field\s+name:\s*"([^"]+)"/i)?.[1] ||
    message.match(/field\s+"([^"]+)"/i)?.[1] ||
    message.match(/Unknown field name:\s*"([^"]+)"/i)?.[1] ||
    ''
}

function removeField(records, fieldName) {
  let removed = false
  const next = records.map(record => {
    if (!Object.hasOwn(record.fields || {}, fieldName)) return record
    const fields = { ...record.fields }
    delete fields[fieldName]
    removed = true
    return { ...record, fields }
  }).filter(record => Object.keys(record.fields || {}).length)
  return { records: next, removed }
}

async function patchMasterRecords(records = [], warnings = []) {
  const updated = []
  for (const record of records) {
    let body = { records: [record] }
    const removed = new Set()

    while (body.records.length) {
      const response = await fetch(`${AIRTABLE_API_ROOT}/${baseId()}/${encodeURIComponent(masterTable())}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${requiredEnv('AIRTABLE_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })
      const payload = await response.json().catch(() => ({}))
      if (response.ok) {
        updated.push(...(payload.records || []))
        for (const fieldName of removed) warnings.push(`Airtable rejected ${fieldName}; retried without it.`)
        break
      }

      const fieldName = rejectedField(payload)
      if (!fieldName || removed.has(fieldName) || removed.size >= 20) {
        throw new Error(payload?.error?.message || payload?.error?.type || response.statusText)
      }
      const next = removeField(body.records, fieldName)
      if (!next.removed) throw new Error(payload?.error?.message || payload?.error?.type || response.statusText)
      removed.add(fieldName)
      body = { records: next.records }
    }
  }
  return updated
}

function publicRecord(record, fields) {
  return {
    id: record.id,
    pick: firstValue(record.fields || {}, ['Pick', 'Selection', 'Game']),
    fields
  }
}

export async function recalculateClv(options = {}) {
  const date = requestedDateKey(options.date)
  const warnings = []
  const records = await listMasterRecords()
  const matched = []
  const skipped = []

  for (const record of records) {
    const fields = record.fields || {}
    if (rowDateKey(fields) !== date) continue
    const hasClosing = text(firstValue(fields, ['Closing Number', 'Closing Line', 'Verified Closing Number'])) ||
      text(firstValue(fields, ['Closing Odds', 'Closing Price']))
    if (!hasClosing) {
      skipped.push({ id: record.id, reason: 'No Closing Number or Closing Odds' })
      continue
    }
    const calculated = calculateClvFields(fields)
    if (!Object.keys(calculated.fields).length) {
      skipped.push({ id: record.id, reason: calculated.reason })
      continue
    }
    matched.push({ record, fields: calculated.fields, reason: calculated.reason })
  }

  const updates = matched.map(item => ({ id: item.record.id, fields: item.fields }))
  const updated = options.dryRun ? [] : await patchMasterRecords(updates, warnings)

  return {
    success: true,
    date,
    table: masterTable(),
    dryRun: Boolean(options.dryRun),
    scanned: records.length,
    matched: matched.length,
    updated: options.dryRun ? 0 : updated.length,
    skipped: skipped.length,
    warnings,
    records: matched.map(item => publicRecord(item.record, item.fields))
  }
}

export async function settleResults(options = {}) {
  const date = requestedDateKey(options.date)
  const warnings = []
  const records = await listMasterRecords()
  const matched = []
  const skipped = []

  for (const record of records) {
    const fields = record.fields || {}
    if (rowDateKey(fields) !== date) continue
    const result = text(firstValue(fields, ['Result', 'Outcome']))
    if (!result || /^pending$/i.test(result)) {
      skipped.push({ id: record.id, reason: 'Pending or blank Result' })
      continue
    }
    const calculated = calculateSettlementFields(fields)
    if (calculated.skipped) {
      skipped.push({ id: record.id, reason: calculated.reason })
      continue
    }
    matched.push({ record, fields: calculated.fields, reason: calculated.reason })
  }

  const updates = matched.map(item => ({ id: item.record.id, fields: item.fields }))
  const updated = options.dryRun ? [] : await patchMasterRecords(updates, warnings)

  return {
    success: true,
    date,
    table: masterTable(),
    dryRun: Boolean(options.dryRun),
    scanned: records.length,
    matched: matched.length,
    updated: options.dryRun ? 0 : updated.length,
    skipped: skipped.length,
    warnings,
    records: matched.map(item => publicRecord(item.record, item.fields))
  }
}
