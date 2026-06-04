const AIRTABLE_API_ROOT = 'https://api.airtable.com/v0'
const DEFAULT_BASE_ID = 'appsVhMax3qWQ1odj'

const TABLE_CONFIGS = {
  masterPicks: {
    label: 'Master Picks',
    table: () => process.env.AIRTABLE_MASTER_PICKS_TABLE_ID || process.env.AIRTABLE_MASTER_PICKS_TABLE || 'tblB0LZW6ATToi8tF'
  },
  propsLab: {
    label: 'Props Lab',
    table: () => process.env.AIRTABLE_PROPS_TABLE_ID || process.env.AIRTABLE_PROPS_TABLE || 'tblPdZG1sTbjD74mx'
  },
  lottoParlays: {
    label: 'Lotto Parlays',
    table: () => process.env.AIRTABLE_LOTTO_TABLE_ID || process.env.AIRTABLE_LOTTO_TABLE || 'tbllr4X5WVUxtmQyL'
  },
  longshots: {
    label: 'Longshots',
    table: () => process.env.AIRTABLE_LONGSHOTS_TABLE_ID || process.env.AIRTABLE_LONGSHOTS_TABLE || 'tblE2H2iiKoFqQXHl'
  }
}

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

function baseId() {
  return String(process.env.AIRTABLE_VERIFIED_BASE_ID || process.env.AIRTABLE_BASE_ID || DEFAULT_BASE_ID).trim()
}

function masterTable() {
  return TABLE_CONFIGS.masterPicks.table()
}

function tableIdFor(key) {
  return TABLE_CONFIGS[key]?.table?.() || key
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
  if (/^\d{4}-\d{2}-\d{2}/.test(text(value))) return text(value).slice(0, 10)
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

function lineDirection(row = {}) {
  const value = [
    firstValue(row, ['Pick', 'Selection', 'Team', 'Side', 'Prop']),
    firstValue(row, ['Bet Type', 'Type', 'Market'])
  ].join(' ').toLowerCase()
  if (/\bover\b/.test(value)) return 'over'
  if (/\bunder\b/.test(value)) return 'under'
  if (/\bmoney\s*line\b|\bmoneyline\b|\bml\b/.test(value)) return 'moneyline'
  return ''
}

function isMoneylinePick(row = {}) {
  const value = [
    firstValue(row, ['Pick', 'Selection', 'Team', 'Side', 'Prop']),
    firstValue(row, ['Bet Type', 'Type', 'Market'])
  ].join(' ').toLowerCase()
  return /\bmoney\s*line\b|\bmoneyline\b|\bml\b/.test(value)
}

function clvField(decimalValue) {
  if (!Number.isFinite(decimalValue)) return {}
  return { '%CLV': Number(decimalValue.toFixed(4)) }
}

export function calculateClvFields(row = {}) {
  const direction = lineDirection(row)
  const moneyline = direction === 'moneyline' || isMoneylinePick(row)
  const postedNumber = parseNumber(firstValue(row, ['Closing Number']))
  const verifiedClosingNumber = parseNumber(firstValue(row, ['Verified Closing Number']))
  const postedOdds = parseAmericanOdds(firstValue(row, ['Odds', 'Posted Odds', 'American Odds']))
  const closingOdds = parseAmericanOdds(firstValue(row, ['Closing Odds', 'Closing Price']))

  if (moneyline) {
    if (Number.isFinite(postedOdds) && Number.isFinite(closingOdds)) {
      const postedDecimal = americanToDecimal(postedOdds)
      const closingDecimal = americanToDecimal(closingOdds)
      if (Number.isFinite(postedDecimal) && Number.isFinite(closingDecimal) && closingDecimal > 0) {
        return { fields: clvField((postedDecimal / closingDecimal) - 1), reason: 'moneyline odds' }
      }
    }
    return { fields: {}, reason: 'moneyline needs Odds and Closing Odds' }
  }

  if (Number.isFinite(verifiedClosingNumber) && Number.isFinite(postedNumber)) {
    if (Math.abs(verifiedClosingNumber) >= 100 && Math.abs(postedNumber) < 50) {
      return { fields: {}, reason: 'closing odds appear to be entered in Verified Closing Number field' }
    }
    if (postedNumber === 0) {
      return { fields: {}, reason: 'Closing Number cannot be zero for percent CLV' }
    }

    let pointValue
    if (direction === 'over') pointValue = verifiedClosingNumber - postedNumber
    else if (direction === 'under') pointValue = postedNumber - verifiedClosingNumber
    else if (postedNumber < 0 || verifiedClosingNumber < 0) pointValue = Math.abs(verifiedClosingNumber) - Math.abs(postedNumber)
    else if (postedNumber > 0 || verifiedClosingNumber > 0) pointValue = postedNumber - verifiedClosingNumber
    else pointValue = verifiedClosingNumber - postedNumber

    const denominator = Math.abs(postedNumber)
    if (!Number.isFinite(denominator) || denominator === 0) {
      return { fields: {}, reason: 'Invalid Closing Number for percent CLV' }
    }

    return { fields: clvField(pointValue / denominator), reason: 'line percent' }
  }

  return { fields: {}, reason: 'insufficient' }
}

export function calculateSettlementFields(row = {}, now = new Date()) {
  const result = resultLabel(firstValue(row, ['Result', 'Outcome']))
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
      Result: result,
      Outcome: result,
      Status: 'Closed',
      'Profit/Loss': Number(profitLoss.toFixed(2)),
      ROI: Number(((profitLoss / units) * 100).toFixed(2)),
      'Settled At': now.toISOString()
    },
    skipped: false,
    reason: result
  }
}

async function listRecordsForTable(tableId) {
  const records = []
  let offset
  do {
    const url = new URL(`${AIRTABLE_API_ROOT}/${baseId()}/${encodeURIComponent(tableId)}`)
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
      throw new Error(`Airtable table ${tableId} ${response.status}: ${message}`)
    }
    records.push(...(payload.records || []))
    offset = payload.offset
  } while (offset)
  return records
}

async function listMasterRecords() {
  return listRecordsForTable(masterTable())
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

async function patchRecordsForTable(tableId, records = [], warnings = []) {
  const updated = []
  for (const record of records) {
    let body = { records: [record], typecast: true }
    const removed = new Set()

    while (body.records.length) {
      const response = await fetch(`${AIRTABLE_API_ROOT}/${baseId()}/${encodeURIComponent(tableId)}`, {
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
        for (const fieldName of removed) warnings.push(`Airtable rejected ${fieldName} on ${tableId}; retried without it.`)
        break
      }

      const fieldName = rejectedField(payload)
      if (!fieldName || removed.has(fieldName) || removed.size >= 20) {
        warnings.push(`Could not patch ${record.id} in ${tableId}: ${payload?.error?.message || payload?.error?.type || response.statusText}`)
        break
      }
      const next = removeField(body.records, fieldName)
      if (!next.removed) {
        warnings.push(`Airtable rejected ${fieldName} on ${tableId}, but it was not in payload for ${record.id}.`)
        break
      }
      removed.add(fieldName)
      body = { records: next.records, typecast: true }
    }

    if (!body.records.length && removed.size) {
      for (const fieldName of removed) warnings.push(`Airtable rejected ${fieldName}; no remaining fields were available to patch record ${record.id} in ${tableId}.`)
    }
  }
  return updated
}

async function patchMasterRecords(records = [], warnings = []) {
  return patchRecordsForTable(masterTable(), records, warnings)
}

function publicRecord(record, fields, extra = {}) {
  return {
    id: record.id,
    pick: firstValue(record.fields || {}, ['Pick', 'Selection', 'Game', 'Prop', 'Player']),
    fields,
    date: rowDateKey(record.fields || {}),
    result: firstValue(record.fields || {}, ['Result', 'Outcome']),
    ...extra
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
    const hasClosing = (text(firstValue(fields, ['Closing Number'])) && text(firstValue(fields, ['Verified Closing Number']))) ||
      text(firstValue(fields, ['Closing Odds', 'Closing Price']))
    if (!hasClosing) {
      skipped.push({ id: record.id, date: rowDateKey(fields), reason: 'No line pair or Closing Odds' })
      continue
    }
    const calculated = calculateClvFields(fields)
    if (!Object.keys(calculated.fields).length) {
      skipped.push({ id: record.id, date: rowDateKey(fields), reason: calculated.reason })
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
    records: matched.map(item => publicRecord(item.record, item.fields, { reason: item.reason })),
    skippedRecords: skipped
  }
}

function dateMatches(recordDate, requestedDate, settleAll) {
  return settleAll || recordDate === requestedDate
}

async function settleTable(key, config, date, now, options = {}) {
  const tableId = tableIdFor(key)
  const warnings = []
  const records = await listRecordsForTable(tableId)
  const matched = []
  const skipped = []
  const availableDates = new Set()
  const resultCounts = {}
  const settleAll = Boolean(options.settleAll)

  for (const record of records) {
    const fields = record.fields || {}
    const recordDate = rowDateKey(fields)
    if (recordDate) availableDates.add(recordDate)
    const rawResult = text(firstValue(fields, ['Result', 'Outcome']))
    if (rawResult) resultCounts[rawResult] = (resultCounts[rawResult] || 0) + 1

    if (!dateMatches(recordDate, date, settleAll)) continue
    if (!rawResult || /^pending$/i.test(rawResult)) {
      skipped.push({ id: record.id, date: recordDate, result: rawResult || '', reason: 'Pending or blank Result' })
      continue
    }
    const calculated = calculateSettlementFields(fields, now)
    if (calculated.skipped) {
      skipped.push({ id: record.id, date: recordDate, result: rawResult, reason: calculated.reason })
      continue
    }
    matched.push({ record, fields: calculated.fields, reason: calculated.reason })
  }

  const updates = matched.map(item => ({ id: item.record.id, fields: item.fields }))
  const updated = options.dryRun ? [] : await patchRecordsForTable(tableId, updates, warnings)

  return {
    key,
    label: config.label,
    table: tableId,
    scanned: records.length,
    matched: matched.length,
    updated: options.dryRun ? 0 : updated.length,
    skipped: skipped.length,
    availableDates: Array.from(availableDates).sort(),
    resultCounts,
    warnings,
    records: matched.map(item => publicRecord(item.record, item.fields, { table: tableId, section: key }))
  }
}

export async function settleResults(options = {}) {
  const rawDate = String(options.date || '').trim().toLowerCase()
  const settleAll = rawDate === 'all'
  const date = settleAll ? 'all' : requestedDateKey(options.date)
  const now = new Date()
  const sections = []
  const warnings = []

  for (const [key, config] of Object.entries(TABLE_CONFIGS)) {
    try {
      const result = await settleTable(key, config, date, now, { ...options, settleAll })
      sections.push(result)
      warnings.push(...result.warnings)
    } catch (error) {
      sections.push({
        key,
        label: config.label,
        table: tableIdFor(key),
        scanned: 0,
        matched: 0,
        updated: 0,
        skipped: 0,
        availableDates: [],
        resultCounts: {},
        warnings: [error.message || String(error)],
        records: []
      })
      warnings.push(`${config.label}: ${error.message || String(error)}`)
    }
  }

  return {
    success: true,
    date,
    settleAll,
    dryRun: Boolean(options.dryRun),
    scanned: sections.reduce((sum, section) => sum + section.scanned, 0),
    matched: sections.reduce((sum, section) => sum + section.matched, 0),
    updated: sections.reduce((sum, section) => sum + section.updated, 0),
    skipped: sections.reduce((sum, section) => sum + section.skipped, 0),
    availableDates: Array.from(new Set(sections.flatMap(section => section.availableDates || []))).sort(),
    warnings,
    sections,
    records: sections.flatMap(section => section.records)
  }
}
