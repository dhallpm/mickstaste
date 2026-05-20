const AIRTABLE_API_ROOT = 'https://api.airtable.com/v0'

export const AIRTABLE_TABLES = {
  masterPicks: process.env.AIRTABLE_MASTER_PICKS_TABLE || 'Master Picks',
  propsLab: process.env.AIRTABLE_PROPS_TABLE || 'Props Lab',
  lottoParlays: process.env.AIRTABLE_LOTTO_TABLE || 'Lotto Parlays',
  longshots: process.env.AIRTABLE_LONGSHOTS_TABLE || 'Longshots',
  resultsArchive: process.env.AIRTABLE_RESULTS_TABLE || 'Results Archive',
  propsResults: 'Props Results',
  lottoArchive: 'Lotto Parlays Archive',
  longshotsHistory: 'Longshots History',
  websiteFeed: 'Website Feed',
  syncLog: process.env.AIRTABLE_SYNC_LOG_TABLE || 'Sync Log'
}

export const ACTIVE_AIRTABLE_TABLES = [
  AIRTABLE_TABLES.masterPicks,
  AIRTABLE_TABLES.propsLab,
  AIRTABLE_TABLES.lottoParlays,
  AIRTABLE_TABLES.longshots
]

export const ACTIVE_AIRTABLE_TABLE_CONFIG = [
  { tableName: AIRTABLE_TABLES.masterPicks, envVar: 'AIRTABLE_MASTER_PICKS_TABLE', required: true },
  { tableName: AIRTABLE_TABLES.propsLab, envVar: 'AIRTABLE_PROPS_TABLE', required: false },
  { tableName: AIRTABLE_TABLES.lottoParlays, envVar: 'AIRTABLE_LOTTO_TABLE', required: false },
  { tableName: AIRTABLE_TABLES.longshots, envVar: 'AIRTABLE_LONGSHOTS_TABLE', required: false }
]

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

function airtableBasePrefix() {
  const baseId = process.env.AIRTABLE_BASE_ID || ''
  return baseId ? `${baseId.slice(0, 6)}...` : ''
}

function tableEnvVar(tableName) {
  const configured = {
    [AIRTABLE_TABLES.masterPicks]: 'AIRTABLE_MASTER_PICKS_TABLE',
    [AIRTABLE_TABLES.propsLab]: 'AIRTABLE_PROPS_TABLE',
    [AIRTABLE_TABLES.lottoParlays]: 'AIRTABLE_LOTTO_TABLE',
    [AIRTABLE_TABLES.longshots]: 'AIRTABLE_LONGSHOTS_TABLE',
    [AIRTABLE_TABLES.resultsArchive]: 'AIRTABLE_RESULTS_TABLE',
    [AIRTABLE_TABLES.syncLog]: 'AIRTABLE_SYNC_LOG_TABLE'
  }

  if (configured[tableName]) return configured[tableName]

  return ACTIVE_AIRTABLE_TABLE_CONFIG.find(config => config.tableName === tableName)?.envVar ||
    ''
}

export function airtableMissingTableDetails(tableName) {
  const envVar = tableEnvVar(tableName)
  return {
    requestedTable: tableName,
    airtableBaseIdPrefix: airtableBasePrefix(),
    envVar,
    suggestedFix: envVar
      ? `Rename the Airtable table to "${tableName}" or set ${envVar} to the exact table name in Vercel. Also confirm the token can access this base.`
      : `Rename the Airtable table to "${tableName}" or configure the matching table-name environment variable. Also confirm the token can access this base.`
  }
}

export function isAirtableMissingTableError(error) {
  return error?.code === 'AIRTABLE_TABLE_NOT_FOUND'
}

function airtableUrl(tableName, params = {}) {
  const baseId = requiredEnv('AIRTABLE_BASE_ID')
  const url = new URL(`${AIRTABLE_API_ROOT}/${baseId}/${encodeURIComponent(tableName)}`)
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value)
  })
  return url
}

function airtableRecordUrl(tableName, recordId) {
  const baseId = requiredEnv('AIRTABLE_BASE_ID')
  return `${AIRTABLE_API_ROOT}/${baseId}/${encodeURIComponent(tableName)}/${recordId}`
}

async function airtableFetch(tableName, options = {}) {
  const response = await fetch(airtableUrl(tableName, options.query), {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${requiredEnv('AIRTABLE_API_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = payload?.error?.message || payload?.error || response.statusText
    const error = new Error(response.status === 404
      ? `Airtable table not found: "${tableName}"`
      : `Airtable ${tableName} ${response.status}: ${message}`)
    error.statusCode = response.status
    error.airtableStatus = response.status
    if (response.status === 404) {
      error.code = 'AIRTABLE_TABLE_NOT_FOUND'
      error.details = airtableMissingTableDetails(tableName)
    }
    throw error
  }

  return payload
}

export async function listAirtableRecords(tableName, options = {}) {
  const records = []
  let offset

  do {
    const payload = await airtableFetch(tableName, {
      query: {
        pageSize: 100,
        view: options.view,
        filterByFormula: options.filterByFormula,
        offset
      }
    })
    records.push(...(payload.records || []))
    offset = payload.offset
  } while (offset)

  return records
}

export function flattenRecord(record, sourceTable) {
  return {
    id: record.id,
    airtableRecordId: record.id,
    __table: sourceTable,
    ...(record.fields || {})
  }
}

export function cleanAirtableFields(fields = {}) {
  const cleaned = { ...fields }
  delete cleaned.id
  delete cleaned.airtableRecordId
  delete cleaned.__table
  delete cleaned['Airtable Record ID']
  return cleaned
}

export async function createAirtableRecords(tableName, fieldsList) {
  if (!fieldsList.length) return []
  const created = []
  for (let i = 0; i < fieldsList.length; i += 10) {
    const payload = await airtableFetch(tableName, {
      method: 'POST',
      body: { records: fieldsList.slice(i, i + 10).map(fields => ({ fields: cleanAirtableFields(fields) })) }
    })
    created.push(...(payload.records || []))
  }
  return created
}

export async function updateAirtableRecords(tableName, records) {
  if (!records.length) return []
  const updated = []
  for (let i = 0; i < records.length; i += 10) {
    const payload = await airtableFetch(tableName, {
      method: 'PATCH',
      body: { records: records.slice(i, i + 10).map(record => ({ id: record.id, fields: cleanAirtableFields(record.fields) })) }
    })
    updated.push(...(payload.records || []))
  }
  return updated
}

export async function deleteAirtableRecord(tableName, recordId) {
  const response = await fetch(airtableRecordUrl(tableName, recordId), {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${requiredEnv('AIRTABLE_API_KEY')}`,
      'Content-Type': 'application/json'
    }
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = payload?.error?.message || payload?.error || response.statusText
    throw new Error(`Airtable ${tableName} delete ${response.status}: ${message}`)
  }

  return payload
}

export async function logSyncAction(action, details = {}) {
  const fields = {
    Timestamp: new Date().toISOString(),
    Action: action,
    Source: details.source || 'vercel',
    Destination: details.destination || '',
    Status: details.status || 'Success',
    Message: details.message || '',
    Count: details.count || 0
  }

  try {
    await createAirtableRecords(AIRTABLE_TABLES.syncLog, [fields])
  } catch (error) {
    console.error('Sync Log write failed:', error)
  }
}

export function airtableWins(airtableFields = {}, sheetFields = {}) {
  const needsFallback = String(airtableFields['Sync Status'] || '').toLowerCase() === 'needs fallback'
  const allowOverride = airtableFields['Allow Sheet Override'] === true ||
    String(airtableFields['Allow Sheet Override'] || '').toLowerCase() === 'true'

  if (needsFallback || allowOverride) return { ...airtableFields, ...sheetFields }

  const merged = { ...airtableFields }
  Object.entries(sheetFields).forEach(([key, value]) => {
    if ((merged[key] === undefined || merged[key] === null || merged[key] === '') && value !== '') {
      merged[key] = value
    }
  })
  return merged
}

export async function listActiveAirtablePicks() {
  const result = await listActiveAirtablePicksWithWarnings()
  return result.rows
}

export async function listActiveAirtablePicksWithWarnings() {
  const rows = []
  const warnings = []

  for (const config of ACTIVE_AIRTABLE_TABLE_CONFIG) {
    try {
      const records = await listAirtableRecords(config.tableName)
      rows.push(...records.map(record => flattenRecord(record, config.tableName)))
    } catch (error) {
      if (!config.required && isAirtableMissingTableError(error)) {
        warnings.push({
          type: 'optional_airtable_table_missing',
          ...error.details
        })
        continue
      }
      throw error
    }
  }

  return { rows, warnings }
}

export async function listTodayAirtablePicks(date = new Date()) {
  const { isActiveVisible } = await import('./routePickCategory.js')
  const records = await listActiveAirtablePicks()
  return records.filter(row => isActiveVisible(row, date))
}

export async function listWebsiteFeedRecords() {
  const records = await listAirtableRecords(AIRTABLE_TABLES.websiteFeed)
  return records.map(record => flattenRecord(record, AIRTABLE_TABLES.websiteFeed))
}
