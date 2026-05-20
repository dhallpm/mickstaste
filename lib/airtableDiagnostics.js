import {
  AIRTABLE_TABLE_RESOLVERS,
  isAirtableTableId,
  resolveAirtableTableName
} from './airtableClient.js'

const AIRTABLE_API_ROOT = 'https://api.airtable.com/v0'

const TABLE_ALIAS_GROUPS = {
  master: ['Master Picks', 'Active Picks', 'Picks', 'Website Feed', 'Today’s Picks', 'Todays Picks', 'Main Picks'],
  props: ['Props Lab', 'Props', 'Active Props', 'Player Props'],
  lotto: ['Lotto Parlays', 'Lotto Props', 'Parlays', 'Safe Lotto Parlays'],
  longshots: ['Longshots', 'Micks LongShots', 'Longshot Picks'],
  results: ['Results Archive', 'Results', 'Archive'],
  sync: ['Sync Log', 'Airtable Sync Log']
}

const TABLE_ALIAS_CONFIG = {
  master: AIRTABLE_TABLE_RESOLVERS.masterPicks,
  props: AIRTABLE_TABLE_RESOLVERS.propsLab,
  lotto: AIRTABLE_TABLE_RESOLVERS.lottoParlays,
  longshots: AIRTABLE_TABLE_RESOLVERS.longshots,
  results: AIRTABLE_TABLE_RESOLVERS.resultsArchive,
  sync: AIRTABLE_TABLE_RESOLVERS.syncLog
}

const LIKELY_CAUSES = [
  'AIRTABLE_BASE_ID points to the wrong base.',
  'The Airtable token has access to a different base.',
  'Airtable table names have hidden/trailing spaces or different spelling.',
  'Tables were created in a different Airtable base or workspace.'
]

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) {
    const error = new Error(`${name} is required`)
    error.statusCode = 500
    throw error
  }
  return value
}

function baseIdPrefix() {
  const baseId = process.env.AIRTABLE_BASE_ID || ''
  return baseId ? `${baseId.slice(0, 6)}...` : ''
}

function sanitizeMessage(message = '') {
  return String(message)
    .replace(process.env.AIRTABLE_API_KEY || '__NO_API_KEY__', '[redacted]')
    .replace(process.env.AIRTABLE_BASE_ID || '__NO_BASE_ID__', '[redacted]')
    .replace(/tbl[a-zA-Z0-9]{10,}/g, '[table-id]')
}

function displayTableRef(tableRef) {
  return isAirtableTableId(tableRef) ? `${String(tableRef).slice(0, 6)}...` : tableRef
}

function tableUrl(tableName) {
  const baseId = requiredEnv('AIRTABLE_BASE_ID')
  const url = new URL(`${AIRTABLE_API_ROOT}/${baseId}/${encodeURIComponent(tableName)}`)
  url.searchParams.set('pageSize', '1')
  return url
}

async function testRecordsApiTable(tableName) {
  const response = await fetch(tableUrl(tableName), {
    headers: {
      Authorization: `Bearer ${requiredEnv('AIRTABLE_API_KEY')}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = payload?.error?.message || payload?.error || response.statusText
    return {
      tableName: displayTableRef(tableName),
      tableRefType: isAirtableTableId(tableName) ? 'id' : 'name',
      ok: false,
      statusCode: response.status,
      errorType: payload?.error?.type || '',
      error: sanitizeMessage(message)
    }
  }

  return {
    tableName: displayTableRef(tableName),
    tableRefType: isAirtableTableId(tableName) ? 'id' : 'name',
    ok: true,
    statusCode: response.status,
    recordCountSampled: (payload.records || []).length
  }
}

async function diagnoseAliasGroup(aliasesOrConfig) {
  const aliases = Array.isArray(aliasesOrConfig)
    ? aliasesOrConfig
    : resolveAirtableTableName(aliasesOrConfig)
  const attempts = []

  for (const alias of aliases) {
    const result = await testRecordsApiTable(alias)
    attempts.push(result)
    if (result.ok) {
      return {
        found: true,
        tableName: displayTableRef(alias),
        tableRefType: isAirtableTableId(alias) ? 'id' : 'name',
        recordCountSampled: result.recordCountSampled,
        attempted: attempts.map(item => item.tableName),
        attempts
      }
    }
  }

  return {
    found: false,
    attempted: attempts.map(item => item.tableName),
    attempts
  }
}

function warningsFor(tables) {
  const warnings = []
  for (const [groupName, result] of Object.entries(tables)) {
    if (!result.found) {
      warnings.push(`No readable Airtable table found for ${groupName}; tried ${result.attempted.join(', ')}.`)
    }
  }
  return warnings
}

export async function runAirtableDiagnostics() {
  requiredEnv('AIRTABLE_API_KEY')
  requiredEnv('AIRTABLE_BASE_ID')

  const tables = {}
  for (const [groupName, config] of Object.entries(TABLE_ALIAS_CONFIG)) {
    tables[groupName] = await diagnoseAliasGroup(config)
  }

  const foundGroups = Object.values(tables).filter(result => result.found)
  const allExpectedAliasesFailed = foundGroups.length === 0

  return {
    success: true,
    baseIdPrefix: baseIdPrefix(),
    recordApiAvailable: foundGroups.length > 0,
    tables,
    warnings: warningsFor(tables),
    likelyCauses: allExpectedAliasesFailed ? LIKELY_CAUSES : [],
    checkedAt: new Date().toISOString()
  }
}

export { TABLE_ALIAS_GROUPS }
export default runAirtableDiagnostics
