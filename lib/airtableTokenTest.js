const AIRTABLE_API_ROOT = 'https://api.airtable.com/v0'
const EXACT_BASE_ID = 'appsVhMax3qWQ1odj'
const EXACT_MASTER_TABLE_ID = 'tblB0LZW6ATToi8tF'
const BAD_TABLE_REF = 'tblBadPermissionProbe'

function prefix(value = '', length = 6) {
  const text = String(value || '')
  return text ? `${text.slice(0, length)}...` : ''
}

function sanitize(value = '') {
  return String(value)
    .replace(process.env.AIRTABLE_API_KEY || '__NO_AIRTABLE_KEY__', '[redacted-token]')
    .replace(EXACT_BASE_ID, prefix(EXACT_BASE_ID))
    .replace(process.env.AIRTABLE_BASE_ID || '__NO_BASE_ID__', prefix(process.env.AIRTABLE_BASE_ID || ''))
    .replace(EXACT_MASTER_TABLE_ID, prefix(EXACT_MASTER_TABLE_ID))
    .replace(process.env.AIRTABLE_MASTER_PICKS_TABLE_ID || '__NO_TABLE_ID__', prefix(process.env.AIRTABLE_MASTER_PICKS_TABLE_ID || ''))
    .replace(/app[a-zA-Z0-9]{10,}/g, match => prefix(match))
    .replace(/tbl[a-zA-Z0-9]{10,}/g, match => prefix(match))
    .replace(/pat[a-zA-Z0-9._-]+/g, '[redacted-token]')
}

function urlPathSanitized(baseId, tableRef) {
  return `/v0/${prefix(baseId)}/${sanitize(tableRef)}`
}

function recordsUrl(baseId, tableRef) {
  const url = new URL(`${AIRTABLE_API_ROOT}/${baseId}/${encodeURIComponent(tableRef)}`)
  url.searchParams.set('maxRecords', '1')
  return url
}

function envReport() {
  const key = process.env.AIRTABLE_API_KEY || ''
  const baseId = process.env.AIRTABLE_BASE_ID || ''
  const tableId = process.env.AIRTABLE_MASTER_PICKS_TABLE_ID || ''
  return {
    hasAirtableApiKey: Boolean(key),
    airtableApiKeyPrefix: key ? prefix(key) : '',
    baseId: baseId ? prefix(baseId) : '',
    hasMasterTableId: Boolean(tableId),
    masterTableIdPrefix: tableId ? prefix(tableId) : ''
  }
}

function hasSensitiveLeak(value = '') {
  const text = String(value)
  const key = process.env.AIRTABLE_API_KEY || ''
  const baseId = process.env.AIRTABLE_BASE_ID || ''
  const tableId = process.env.AIRTABLE_MASTER_PICKS_TABLE_ID || ''
  return Boolean(
    (key && text.includes(key)) ||
    (baseId && text.includes(baseId)) ||
    (tableId && text.includes(tableId)) ||
    text.includes(EXACT_BASE_ID) ||
    text.includes(EXACT_MASTER_TABLE_ID)
  )
}

async function runRecordsProbe({ name, baseId, tableRef, skipReason = '' }) {
  const test = {
    name,
    urlPathSanitized: baseId && tableRef ? urlPathSanitized(baseId, tableRef) : '',
    ok: false,
    status: null,
    airtableError: '',
    skipped: Boolean(skipReason),
    skipReason
  }

  if (skipReason) return test

  try {
    const response = await fetch(recordsUrl(baseId, tableRef), {
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
        Accept: 'application/json'
      }
    })
    const payload = await response.json().catch(() => ({}))
    test.ok = response.ok
    test.status = response.status
    test.airtableError = sanitize(payload?.error?.type || payload?.error?.message || payload?.error || '')
    test.recordCountSampled = response.ok ? (payload.records || []).length : 0
  } catch (error) {
    test.airtableError = sanitize(error?.message || 'Network or fetch error')
  }

  return test
}

function buildTests() {
  const hasKey = Boolean(process.env.AIRTABLE_API_KEY)
  const envBaseId = process.env.AIRTABLE_BASE_ID || ''
  const envTableId = process.env.AIRTABLE_MASTER_PICKS_TABLE_ID || EXACT_MASTER_TABLE_ID
  const envTableName = process.env.AIRTABLE_MASTER_PICKS_TABLE || ''
  const missingKeyReason = hasKey ? '' : 'AIRTABLE_API_KEY is missing; Records API tests were not sent.'

  return [
    {
      name: 'exact_base_exact_table_id',
      baseId: EXACT_BASE_ID,
      tableRef: EXACT_MASTER_TABLE_ID,
      skipReason: missingKeyReason
    },
    {
      name: 'env_base_env_or_default_table_id',
      baseId: envBaseId,
      tableRef: envTableId,
      skipReason: missingKeyReason || (!envBaseId ? 'AIRTABLE_BASE_ID is missing.' : '')
    },
    {
      name: 'env_master_table_name',
      baseId: envBaseId,
      tableRef: envTableName,
      skipReason: missingKeyReason || (!envBaseId ? 'AIRTABLE_BASE_ID is missing.' : '') || (!envTableName ? 'AIRTABLE_MASTER_PICKS_TABLE is not set.' : '')
    },
    {
      name: 'known_bad_table_ref',
      baseId: envBaseId || EXACT_BASE_ID,
      tableRef: BAD_TABLE_REF,
      skipReason: missingKeyReason
    }
  ]
}

function interpret(tests, env) {
  if (!env.hasAirtableApiKey) {
    return 'AIRTABLE_API_KEY is missing in this Vercel environment, so no Airtable Records API calls were sent.'
  }

  const exact = tests.find(test => test.name === 'exact_base_exact_table_id')
  const envId = tests.find(test => test.name === 'env_base_env_or_default_table_id')
  const bad = tests.find(test => test.name === 'known_bad_table_ref')
  const readable = tests.find(test => test.ok)
  const authFailure = tests.find(test => [401, 403].includes(test.status))

  if (exact?.ok && envId && !envId.ok) {
    return `exact_base_exact_table_id succeeded, but env_base_env_or_default_table_id returned ${envId.status}. The token can read the known Micks Picks base/table, and AIRTABLE_BASE_ID or AIRTABLE_MASTER_PICKS_TABLE_ID is likely stale, mismatched, or pointing to a different Airtable object. Diagnostics and today's picks can use the verified exact fallback without exposing secrets.`
  }

  if (readable) {
    return `${readable.name} succeeded. The Airtable Records API can read the tested base/table reference. Existing diagnostics and /api/todays-picks already try table ID env vars before names and aliases.`
  }

  if (authFailure) {
    return 'Airtable returned 401/403. The token is invalid, stale in production, or lacks data.records:read access for the tested base/table.'
  }

  if (exact?.status === 404 || envId?.status === 404) {
    return 'Airtable returned 404 for the exact base/table Records API test. The token likely cannot access that base/table despite UI settings, or the base/table belongs to a different workspace/account.'
  }

  if (bad && bad.status !== 404 && !bad.skipped) {
    return 'The known bad table reference did not return Airtable 404, so Airtable error parsing or the base/token configuration may be behaving unexpectedly.'
  }

  return 'No Records API test succeeded. Compare the per-test statuses to determine whether the issue is missing env, auth, base ID, table ID, or Airtable access.'
}

export async function runAirtableTokenTest() {
  const env = envReport()
  const tests = []

  for (const probe of buildTests()) {
    tests.push(await runRecordsProbe(probe))
  }

  return {
    success: true,
    env,
    tests,
    interpretation: interpret(tests, env),
    secretsExposed: hasSensitiveLeak(JSON.stringify({ env, tests })),
    checkedAt: new Date().toISOString()
  }
}

export default runAirtableTokenTest
