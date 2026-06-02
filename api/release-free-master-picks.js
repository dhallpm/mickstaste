const AIRTABLE_API_ROOT = 'https://api.airtable.com/v0'
const DEFAULT_BASE_ID = 'appsVhMax3qWQ1odj'
const DEFAULT_MASTER_TABLE = 'tblB0LZW6ATToi8tF'

function baseId() {
  return String(process.env.AIRTABLE_VERIFIED_BASE_ID || process.env.AIRTABLE_BASE_ID || DEFAULT_BASE_ID).trim()
}

function masterTable() {
  return String(process.env.AIRTABLE_MASTER_PICKS_TABLE_ID || process.env.AIRTABLE_MASTER_PICKS_TABLE || DEFAULT_MASTER_TABLE).trim()
}

function apiKey() {
  const key = process.env.AIRTABLE_API_KEY
  if (!key) throw new Error('AIRTABLE_API_KEY is required')
  return key
}

function todayEasternKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
}

function clean(value) {
  return String(value ?? '').trim()
}

function gradeValue(fields = {}) {
  return clean(fields.Grade || fields['Card Grade'] || fields.Rating || fields['Micks Grade']).toUpperCase()
}

function isAOrBetter(fields = {}) {
  const grade = gradeValue(fields)
  return grade === 'A' || grade === 'A+'
}

function isSameDate(fields = {}, dateKey = '') {
  const raw = fields.Date || fields.date || fields['Game Date'] || ''
  if (!raw) return false
  if (typeof raw === 'string' && raw.slice(0, 10) === dateKey) return true
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return false
  const key = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(parsed)
  return key === dateKey
}

function shouldReleaseAsFree(record = {}, dateKey = '') {
  const fields = record.fields || {}
  return isSameDate(fields, dateKey) && !isAOrBetter(fields)
}

async function airtableFetch(path, options = {}) {
  const response = await fetch(`${AIRTABLE_API_ROOT}/${baseId()}/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = payload?.error?.message || payload?.error?.type || response.statusText
    const error = new Error(message)
    error.status = response.status
    error.payload = payload
    throw error
  }
  return payload
}

async function listMasterRecords(dateKey) {
  const table = encodeURIComponent(masterTable())
  const records = []
  let offset = ''
  const formula = encodeURIComponent(`DATETIME_FORMAT({Date}, 'YYYY-MM-DD') = '${dateKey}'`)
  do {
    const query = `?pageSize=100&filterByFormula=${formula}${offset ? `&offset=${encodeURIComponent(offset)}` : ''}`
    const payload = await airtableFetch(`${table}${query}`)
    records.push(...(payload.records || []))
    offset = payload.offset || ''
  } while (offset)
  return records
}

async function patchRecords(records, fields, typecast = true) {
  const table = encodeURIComponent(masterTable())
  const updated = []
  for (let i = 0; i < records.length; i += 10) {
    const chunk = records.slice(i, i + 10).map(record => ({ id: record.id, fields }))
    const payload = await airtableFetch(table, {
      method: 'PATCH',
      body: JSON.stringify({ records: chunk, typecast })
    })
    updated.push(...(payload.records || []))
  }
  return updated
}

async function releaseFreeMasterPicks(dateKey) {
  const all = await listMasterRecords(dateKey)
  const candidates = all.filter(record => shouldReleaseAsFree(record, dateKey))
  if (!candidates.length) {
    return {
      date: dateKey,
      scanned: all.length,
      updated: 0,
      message: 'No below-A Master Picks found for this date.'
    }
  }

  try {
    const updated = await patchRecords(candidates, { Access: 'Free', Status: 'Released' }, true)
    return {
      date: dateKey,
      scanned: all.length,
      matched: candidates.length,
      updated: updated.length,
      fields: { Access: 'Free', Status: 'Released' },
      records: updated.map(record => ({ id: record.id, fields: record.fields }))
    }
  } catch (error) {
    const accessOnly = await patchRecords(candidates, { Access: 'Free' }, true)
    return {
      date: dateKey,
      scanned: all.length,
      matched: candidates.length,
      updated: accessOnly.length,
      fields: { Access: 'Free' },
      warning: `Airtable rejected Status = Released, so only Access was updated. ${error.message}`,
      rejectedStatusPayload: error.payload || null,
      records: accessOnly.map(record => ({ id: record.id, fields: record.fields }))
    }
  }
}

export default async function handler(req, res) {
  try {
    const date = clean(req.query?.date) || todayEasternKey()
    const confirm = clean(req.query?.confirm)
    if (req.method !== 'POST' && confirm !== 'RELEASE_FREE') {
      res.status(200).json({
        success: true,
        message: 'Use POST or add ?confirm=RELEASE_FREE to update below-A Master Picks to Access=Free and Status=Released.',
        date,
        endpoint: `/api/release-free-master-picks?date=${date}&confirm=RELEASE_FREE`,
        baseId: baseId(),
        masterTable: masterTable()
      })
      return
    }

    const result = await releaseFreeMasterPicks(date)
    res.status(200).json({ success: true, ...result })
  } catch (error) {
    console.error(error)
    res.status(error.status || 500).json({ success: false, error: error.message || String(error), payload: error.payload || null })
  }
}
