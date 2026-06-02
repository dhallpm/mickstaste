const ROOT = 'https://api.airtable.com/v0'
const BASE_ID = 'appsVhMax3qWQ1odj'
const TABLE_ID = 'tblPdZG1sTbjD74mx'

function env(name) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

function todayET() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
}

function text(value) {
  return String(value ?? '').trim()
}

function isBelowA(fields = {}) {
  const grade = text(fields.Grade || fields.grade).toUpperCase()
  return grade !== 'A' && grade !== 'A+'
}

function hasVip(fields = {}) {
  return text(fields.Access || fields.Tier || fields['Access Tier']).toLowerCase().includes('vip')
}

async function airtable(path, options = {}) {
  const response = await fetch(`${ROOT}/${process.env.AIRTABLE_BASE_ID || BASE_ID}/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${env('AIRTABLE_API_KEY')}`,
      'Content-Type': 'application/json'
    }
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.error?.message || data?.error?.type || response.statusText)
  return data
}

async function listRows(date) {
  const table = encodeURIComponent(process.env.AIRTABLE_PROPS_TABLE_ID || TABLE_ID)
  const filter = encodeURIComponent(`DATETIME_FORMAT({Date}, 'YYYY-MM-DD') = '${date}'`)
  const rows = []
  let offset = ''
  do {
    const data = await airtable(`${table}?pageSize=100&filterByFormula=${filter}${offset ? `&offset=${encodeURIComponent(offset)}` : ''}`)
    rows.push(...(data.records || []))
    offset = data.offset || ''
  } while (offset)
  return rows
}

async function updateRows(rows) {
  const table = encodeURIComponent(process.env.AIRTABLE_PROPS_TABLE_ID || TABLE_ID)
  const updated = []
  for (let i = 0; i < rows.length; i += 10) {
    const chunk = rows.slice(i, i + 10).map(row => ({ id: row.id, fields: { Access: 'Free' } }))
    const data = await airtable(table, {
      method: 'PATCH',
      body: JSON.stringify({ records: chunk, typecast: true })
    })
    updated.push(...(data.records || []))
  }
  return updated
}

export default async function handler(req, res) {
  try {
    const date = text(req.query?.date) || todayET()
    if (req.method !== 'POST' && text(req.query?.confirm) !== 'NORMALIZE') {
      return res.status(200).json({
        success: true,
        message: 'Use ?confirm=NORMALIZE to set below-A Props Lab rows to Access=Free.',
        endpoint: `/api/normalize-props-access?date=${date}&confirm=NORMALIZE`,
        date
      })
    }

    const rows = await listRows(date)
    const targets = rows.filter(row => isBelowA(row.fields || {}) && hasVip(row.fields || {}))
    const updated = await updateRows(targets)
    res.status(200).json({
      success: true,
      date,
      scanned: rows.length,
      matched: targets.length,
      updated: updated.length,
      fields: { Access: 'Free' },
      records: updated.map(row => ({ id: row.id, fields: row.fields }))
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || String(error) })
  }
}
