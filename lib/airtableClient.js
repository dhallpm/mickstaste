const AIRTABLE_API_ROOT = 'https://api.airtable.com/v0'
const KNOWN_AIRTABLE_BASE_ID = 'appsVhMax3qWQ1odj'
const KNOWN_MASTER_PICKS_TABLE_ID = 'tblB0LZW6ATToi8tF'

export const AIRTABLE_TABLES = {
  masterPicks: process.env.AIRTABLE_MASTER_PICKS_TABLE_ID || process.env.AIRTABLE_MASTER_PICKS_TABLE || KNOWN_MASTER_PICKS_TABLE_ID,
  propsLab: process.env.AIRTABLE_PROPS_TABLE_ID || process.env.AIRTABLE_PROPS_TABLE || 'Props Lab',
  lottoParlays: process.env.AIRTABLE_LOTTO_TABLE_ID || process.env.AIRTABLE_LOTTO_TABLE || 'Lotto Parlays',
  longshots: process.env.AIRTABLE_LONGSHOTS_TABLE_ID || process.env.AIRTABLE_LONGSHOTS_TABLE || 'Longshots',
  resultsArchive: process.env.AIRTABLE_RESULTS_TABLE_ID || process.env.AIRTABLE_RESULTS_TABLE || 'Results Archive',
  propsResults: 'Props Results',
  lottoArchive: 'Lotto Parlays Archive',
  longshotsHistory: 'Longshots History',
  websiteFeed: 'Website Feed',
  syncLog: process.env.AIRTABLE_SYNC_LOG_TABLE_ID || process.env.AIRTABLE_SYNC_LOG_TABLE || 'Sync Log'
}

export const AIRTABLE_TABLE_RESOLVERS = {
  masterPicks: {
    key: 'masterPicks',
    preferredIdEnvVar: 'AIRTABLE_MASTER_PICKS_TABLE_ID',
    preferredEnvVar: 'AIRTABLE_MASTER_PICKS_TABLE',
    defaultName: 'Master Picks',
    defaultId: KNOWN_MASTER_PICKS_TABLE_ID,
    aliases: ['Active Picks', 'Picks', 'Website Feed', 'Today’s Picks', 'Todays Picks', 'Main Picks'],
    required: true
  },
  propsLab: {
    key: 'propsLab',
    preferredIdEnvVar: 'AIRTABLE_PROPS_TABLE_ID',
    preferredEnvVar: 'AIRTABLE_PROPS_TABLE',
    defaultName: 'Props Lab',
    aliases: ['Props', 'Active Props', 'Player Props'],
    required: false
  },
  lottoParlays: {
    key: 'lottoParlays',
    preferredIdEnvVar: 'AIRTABLE_LOTTO_TABLE_ID',
    preferredEnvVar: 'AIRTABLE_LOTTO_TABLE',
    defaultName: 'Lotto Parlays',
    aliases: ['Lotto Props', 'Parlays', 'Safe Lotto Parlays'],
    required: false
  },
  longshots: {
    key: 'longshots',
    preferredIdEnvVar: 'AIRTABLE_LONGSHOTS_TABLE_ID',
    preferredEnvVar: 'AIRTABLE_LONGSHOTS_TABLE',
    defaultName: 'Longshots',
    aliases: ['Micks LongShots', 'Longshot Picks'],
    required: false
  },
  resultsArchive: {
    key: 'resultsArchive',
    preferredIdEnvVar: 'AIRTABLE_RESULTS_TABLE_ID',
    preferredEnvVar: 'AIRTABLE_RESULTS_TABLE',
    defaultName: 'Results Archive',
    aliases: ['Results', 'Archive'],
    required: false
  },
  syncLog: {
    key: 'syncLog',
    preferredIdEnvVar: 'AIRTABLE_SYNC_LOG_TABLE_ID',
    preferredEnvVar: 'AIRTABLE_SYNC_LOG_TABLE',
    defaultName: 'Sync Log',
    aliases: ['Airtable Sync Log'],
    required: false
  }
}

export const ACTIVE_AIRTABLE_TABLES = [
  AIRTABLE_TABLES.masterPicks,
  AIRTABLE_TABLES.propsLab,
  AIRTABLE_TABLES.lottoParlays,
  AIRTABLE_TABLES.longshots
]

export const ACTIVE_AIRTABLE_TABLE_CONFIG = [
  AIRTABLE_TABLE_RESOLVERS.masterPicks,
  AIRTABLE_TABLE_RESOLVERS.propsLab,
  AIRTABLE_TABLE_RESOLVERS.lottoParlays,
  AIRTABLE_TABLE_RESOLVERS.longshots
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

export function resolveAirtableBaseIds() {
  return Array.from(new Set([process.env.AIRTABLE_BASE_ID, KNOWN_AIRTABLE_BASE_ID]
    .map(baseId => String(baseId || '').trim())
    .filter(Boolean)))
}

function tableEnvVar(tableName) {
  const configured = {
    [AIRTABLE_TABLES.masterPicks]: isAirtableTableId(AIRTABLE_TABLES.masterPicks) ? 'AIRTABLE_MASTER_PICKS_TABLE_ID' : 'AIRTABLE_MASTER_PICKS_TABLE',
    [AIRTABLE_TABLES.propsLab]: isAirtableTableId(AIRTABLE_TABLES.propsLab) ? 'AIRTABLE_PROPS_TABLE_ID' : 'AIRTABLE_PROPS_TABLE',
    [AIRTABLE_TABLES.lottoParlays]: isAirtableTableId(AIRTABLE_TABLES.lottoParlays) ? 'AIRTABLE_LOTTO_TABLE_ID' : 'AIRTABLE_LOTTO_TABLE',
    [AIRTABLE_TABLES.longshots]: isAirtableTableId(AIRTABLE_TABLES.longshots) ? 'AIRTABLE_LONGSHOTS_TABLE_ID' : 'AIRTABLE_LONGSHOTS_TABLE',
    [AIRTABLE_TABLES.resultsArchive]: isAirtableTableId(AIRTABLE_TABLES.resultsArchive) ? 'AIRTABLE_RESULTS_TABLE_ID' : 'AIRTABLE_RESULTS_TABLE',
    [AIRTABLE_TABLES.syncLog]: isAirtableTableId(AIRTABLE_TABLES.syncLog) ? 'AIRTABLE_SYNC_LOG_TABLE_ID' : 'AIRTABLE_SYNC_LOG_TABLE'
  }

  if (configured[tableName]) return configured[tableName]

  return ACTIVE_AIRTABLE_TABLE_CONFIG.find(config => {
    const candidates = resolveAirtableTableName(config)
    return candidates.includes(tableName)
  })?.preferredEnvVar ||
    ''
}

export function resolveAirtableTableName({ preferredIdEnvVar, preferredEnvVar, defaultId, defaultName, aliases = [] }) {
  const configuredId = preferredIdEnvVar ? process.env[preferredIdEnvVar] : ''
  const configuredName = preferredEnvVar ? process.env[preferredEnvVar] : ''
  return Array.from(new Set([configuredId, configuredName, defaultId, defaultName, ...aliases]
    .map(name => String(name || '').trim())
    .filter(Boolean)))
}

export function isAirtableTableId(value) {
  return /^tbl[a-zA-Z0-9]{10,}$/.test(String(value || '').trim())
}

function tableRefForMessage(value) {
  return isAirtableTableId(value) ? `${String(value).slice(0, 6)}...` : value
}

export function airtableMissingTableDetails(tableName) {
  const envVar = tableEnvVar(tableName)
  const requestedTable = tableRefForMessage(tableName)
  return {
    requestedTable,
    airtableBaseIdPrefix: airtableBasePrefix(),
    envVar,
    suggestedFix: envVar
      ? `Rename the Airtable table to "${requestedTable}" or set ${envVar} to the exact table name/table ID in Vercel. Also confirm the token can access this base.`
      : `Rename the Airtable table to "${requestedTable}" or configure the matching table-name environment variable. Also confirm the token can access this base.`
  }
}

export function isAirtableMissingTableError(error) {
  return error?.code === 'AIRTABLE_TABLE_NOT_FOUND'
}

function airtableUrl(tableName, params = {}, baseId = requiredEnv('AIRTABLE_BASE_ID')) {
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
  const response = await fetch(airtableUrl(tableName, options.query, options.baseId), {
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
      baseId: options.baseId,
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

export async function listAirtableRecordsFromResolvedTable(config, options = {}) {
  const candidates = resolveAirtableTableName(config)
  const baseIds = resolveAirtableBaseIds()
  const warnings = []
  const missingTables = []
  let lastMissingError

  for (const baseId of baseIds) {
    for (const tableName of candidates) {
      try {
        const records = await listAirtableRecords(tableName, { ...options, baseId })
        if (baseId !== process.env.AIRTABLE_BASE_ID) {
          warnings.push(`Used verified Airtable base ${baseId.slice(0, 6)}... after AIRTABLE_BASE_ID returned 404.`)
        }
        if (tableName !== config.defaultName) {
          warnings.push(isAirtableTableId(tableName)
            ? `Used Airtable table ID ${tableRefForMessage(tableName)} for ${config.defaultName}.`
            : `Used Airtable table ${tableName} as ${config.defaultName} alias.`)
        }
        return {
          tableName,
          baseId,
          records,
          rows: records.map(record => flattenRecord(record, tableName)),
          warnings,
          missingTables
        }
      } catch (error) {
        if (!isAirtableMissingTableError(error)) throw error
        lastMissingError = error
        missingTables.push(`${baseId.slice(0, 6)}.../${tableRefForMessage(tableName)}`)
        warnings.push(`Airtable table ${tableRefForMessage(tableName)} not found in base ${baseId.slice(0, 6)}...; tried next alias.`)
      }
    }
  }

  const error = new Error(`No Airtable table found for ${config.defaultName}`)
  error.code = 'AIRTABLE_RESOLVED_TABLE_NOT_FOUND'
  error.statusCode = 404
  error.details = lastMissingError?.details || airtableMissingTableDetails(config.defaultName)
  error.warnings = warnings
  error.missingTables = missingTables
  throw error
}

export function flattenRecord(record, sourceTable) {
  return {
    id: record.id,
    airtableRecordId: record.id,
    __table: sourceTable,
    ...(record.fields || {})
  }
}

const AIRTABLE_DATE_TIME_FIELDS = new Set([
  'Posted Time',
  'Archive Timestamp',
  'Timestamp',
  'Last Synced From Airtable',
  'Last Synced From Google Sheets'
])

export function cleanAirtableFields(fields = {}) {
  const cleaned = { ...fields }
  delete cleaned.id
  delete cleaned.airtableRecordId
  delete cleaned.__table
  delete cleaned['Airtable Record ID']
  // Posted Time is optional and incompatible with the current Airtable schema.
  // Strip it from every create/update payload so it cannot block pick ingest.
  delete cleaned['Posted Time']
  for (const fieldName of AIRTABLE_DATE_TIME_FIELDS) {
    if (cleaned[fieldName] === '' || cleaned[fieldName] === null || cleaned[fieldName] === undefined) {
      delete cleaned[fieldName]
    }
  }
  return cleaned
}

export async function createAirtableRecords(tableName, fieldsList, options = {}) {
  if (!fieldsList.length) return []
  const created = []
  for (let i = 0; i < fieldsList.length; i += 10) {
    const payload = await airtableFetch(tableName, {
      baseId: options.baseId,
      method: 'POST',
      body: {
        records: fieldsList.slice(i, i + 10).map(fields => ({ fields: cleanAirtableFields(fields) })),
        ...(options.typecast ? { typecast: true } : {})
      }
    })
    created.push(...(payload.records || []))
  }
  return created
}

export async function updateAirtableRecords(tableName, records, options = {}) {
  if (!records.length) return []
  const updated = []
  for (let i = 0; i < records.length; i += 10) {
    const payload = await airtableFetch(tableName, {
      baseId: options.baseId,
      method: 'PATCH',
      body: {
        records: records.slice(i, i + 10).map(record => ({ id: record.id, fields: cleanAirtableFields(record.fields) })),
        ...(options.typecast ? { typecast: true } : {})
      }
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
    Direction: details.direction || '',
    Action: action,
    Source: details.source || 'vercel',
    Destination: details.destination || '',
    Table: details.table || details.tableName || '',
    'Record Key': details.recordKey || '',
    Status: details.status || 'Success',
    'Error Message': details.errorMessage || (details.status === 'Error' ? details.message : ''),
    'Changed Fields': details.changedFields || (details.count !== undefined ? `Count: ${details.count}` : details.message || ''),
    'Sync Batch ID': details.syncBatchId || ''
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
  const resolvedTables = {}
  const missingRequiredTables = []

  for (const config of ACTIVE_AIRTABLE_TABLE_CONFIG) {
    try {
      const result = await listAirtableRecordsFromResolvedTable(config)
      warnings.push(...result.warnings)
      rows.push(...result.rows)
      resolvedTables[config.key] = result.tableName
    } catch (error) {
      if (error.code === 'AIRTABLE_RESOLVED_TABLE_NOT_FOUND') {
        warnings.push(...(error.warnings || []))
        if (config.required) {
          missingRequiredTables.push(config.defaultName)
        } else {
          warnings.push(`Optional Airtable table ${config.defaultName} and aliases were not found.`)
        }
        continue
      }
      throw error
    }
  }

  return {
    rows,
    warnings,
    source: 'airtable',
    resolvedTables,
    missingRequiredTables,
    needsFallback: missingRequiredTables.length > 0
  }
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
