const AIRTABLE_META_ROOT = 'https://api.airtable.com/v0/meta'
const AIRTABLE_API_ROOT = 'https://api.airtable.com/v0'

export const REQUIRED_AIRTABLE_SCHEMA = {
  'Master Picks': [
    'Record Key', 'Date', 'Posted Time', 'Sport', 'League', 'Game', 'Pick', 'Bet Type', 'Category', 'Access',
    'Odds', 'Sportsbook', 'Units', 'Grade', 'Confidence', 'EV Edge', 'Best Number', 'No Bet Cutoff', 'Status',
    'Release Status', 'Result', 'Profit/Loss', 'Closing Number', 'Verified Closing Number', 'Closing Source',
    'CLV', 'Market Notes', 'Injury Notes', 'Writeup', 'Full Analysis', 'Source Verification', 'Archive Status',
    'Last Synced From Airtable', 'Last Synced From Google Sheets', 'Sync Status', 'Needs Fallback'
  ],
  'Props Lab': [
    'Record Key', 'Date', 'Player', 'Team', 'Opponent', 'League', 'Game', 'Prop Type', 'Line', 'Odds',
    'Sportsbook', 'Units', 'Grade', 'Confidence', 'EV Edge', 'Status', 'Result', 'Profit/Loss', 'Injury Notes',
    'Market Notes', 'Full Analysis', 'Closing Number', 'Verified Closing Number', 'Closing Source',
    'Archive Status', 'Sync Status'
  ],
  'Lotto Parlays': [
    'Record Key', 'Date', 'Parlay Type', 'Leg Count', 'Legs', 'Odds', 'Sportsbook', 'Units', 'Grade',
    'Confidence', 'Status', 'Result', 'Profit/Loss', 'Full Analysis', 'Archive Status', 'Sync Status'
  ],
  Longshots: [
    'Record Key', 'Date', 'Sport', 'League', 'Longshot Type', 'Pick', 'Legs', 'Odds', 'Sportsbook', 'Units',
    'Grade', 'Confidence', 'Status', 'Result', 'Profit/Loss', 'Full Analysis', 'Archive Status', 'Sync Status'
  ],
  'Results Archive': [
    'Record Key', 'Original Table', 'Date', 'Sport', 'League', 'Game', 'Pick', 'Bet Type', 'Odds', 'Units',
    'Result', 'Profit/Loss', 'Closing Number', 'Verified Closing Number', 'CLV', 'Access', 'Source Verification',
    'Archive Timestamp', 'Notes', 'Sync Status'
  ],
  'Sync Log': [
    'Timestamp', 'Direction', 'Source', 'Destination', 'Table', 'Record Key', 'Action', 'Status', 'Error Message',
    'Changed Fields', 'Sync Batch ID'
  ]
}

const LONG_TEXT_FIELDS = new Set([
  'Changed Fields',
  'Error Message',
  'Full Analysis',
  'Injury Notes',
  'Legs',
  'Market Notes',
  'Notes',
  'Source Verification',
  'Writeup'
])

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

function redactedBaseId() {
  const baseId = process.env.AIRTABLE_BASE_ID || ''
  return baseId ? `${baseId.slice(0, 6)}...` : ''
}

function setupInstructions(missingTables = [], missingFields = []) {
  const tables = missingTables.length
    ? missingTables
    : Object.keys(REQUIRED_AIRTABLE_SCHEMA)
  const lines = [
    'Open Airtable and select the Micks Picks base.',
    'Create these tables exactly as named:',
    ...tables.map(tableName => `- ${tableName}`)
  ]

  lines.push('', 'Add these fields to each table. Use "Single line text" for most fields; use "Long text" for analysis, notes, writeup, legs, source verification, error message, and changed fields.')
  for (const [tableName, fields] of Object.entries(REQUIRED_AIRTABLE_SCHEMA)) {
    const missingForTable = missingFields.find(item => item.table === tableName)?.fields
    const fieldsToShow = missingForTable?.length ? missingForTable : fields
    if (!missingTables.includes(tableName) && !missingForTable?.length && missingTables.length) continue
    lines.push('', `${tableName}:`, fieldsToShow.join(', '))
  }

  lines.push('', 'Keep Google Sheets fallback enabled until this endpoint returns setupComplete: true.')
  return lines.join('\n')
}

function fieldDefinition(name) {
  return {
    name,
    type: LONG_TEXT_FIELDS.has(name) ? 'multilineText' : 'singleLineText'
  }
}

async function metaFetch(path, options = {}) {
  const baseId = requiredEnv('AIRTABLE_BASE_ID')
  const response = await fetch(`${AIRTABLE_META_ROOT}/bases/${baseId}${path}`, {
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
    const error = new Error(`Airtable metadata ${response.status}: ${message}`)
    error.statusCode = response.status
    error.airtableStatus = response.status
    error.airtableErrorType = payload?.error?.type || ''
    throw error
  }

  return payload
}

async function dataFetch(tableName) {
  const baseId = requiredEnv('AIRTABLE_BASE_ID')
  const url = new URL(`${AIRTABLE_API_ROOT}/${baseId}/${encodeURIComponent(tableName)}`)
  url.searchParams.set('pageSize', '1')
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${requiredEnv('AIRTABLE_API_KEY')}`,
      'Content-Type': 'application/json'
    }
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = payload?.error?.message || payload?.error || response.statusText
    const error = new Error(`Airtable ${tableName} ${response.status}: ${message}`)
    error.statusCode = response.status
    error.airtableStatus = response.status
    throw error
  }

  return payload
}

function findTable(schemaTables, tableName) {
  return schemaTables.find(table => table.name === tableName)
}

function missingFieldsForTable(table, requiredFields) {
  const existing = new Set((table?.fields || []).map(field => field.name))
  return requiredFields.filter(fieldName => !existing.has(fieldName))
}

async function createMissingTable(tableName, fields) {
  const [primaryField, ...remainingFields] = fields
  return metaFetch('/tables', {
    method: 'POST',
    body: {
      name: tableName,
      fields: [
        fieldDefinition(primaryField),
        ...remainingFields.map(fieldDefinition)
      ]
    }
  })
}

async function createMissingField(tableId, fieldName) {
  return metaFetch(`/tables/${tableId}/fields`, {
    method: 'POST',
    body: fieldDefinition(fieldName)
  })
}

export async function setupAirtableBase(options = {}) {
  const startedAt = new Date().toISOString()
  const dryRun = options.dryRun === true
  const report = {
    baseIdPrefix: redactedBaseId(),
    requiredTables: Object.keys(REQUIRED_AIRTABLE_SCHEMA),
    existingTables: [],
    missingTables: [],
    missingFields: [],
    createdTables: [],
    createdFields: [],
    warnings: [],
    schemaCreationAttempted: false,
    schemaCreationAvailable: null,
    schemaReadAvailable: null,
    fieldVerificationAvailable: null,
    googleSheetsFallbackActive: true
  }

  let schema
  try {
    schema = await metaFetch('/tables')
    report.schemaReadAvailable = true
    report.fieldVerificationAvailable = true
  } catch (error) {
    report.schemaReadAvailable = false
    report.fieldVerificationAvailable = false
    report.schemaCreationAvailable = false
    report.warnings.push(`Airtable metadata schema read failed or is not available with this token scope: ${error.message}`)

    for (const tableName of Object.keys(REQUIRED_AIRTABLE_SCHEMA)) {
      try {
        await dataFetch(tableName)
        report.existingTables.push(tableName)
      } catch (tableError) {
        if (tableError.statusCode === 404) {
          report.missingTables.push(tableName)
        } else {
          report.warnings.push(`Could not verify Airtable table ${tableName}: ${tableError.message}`)
        }
      }
    }

    const setupComplete = report.missingTables.length === 0 && report.fieldVerificationAvailable === true
    return {
      success: true,
      setupComplete,
      dryRun,
      startedAt,
      finishedAt: new Date().toISOString(),
      ...report,
      instructions: setupInstructions(report.missingTables, report.missingFields)
    }
  }

  report.existingTables = (schema.tables || []).map(table => table.name)

  for (const [tableName, fields] of Object.entries(REQUIRED_AIRTABLE_SCHEMA)) {
    const table = findTable(schema.tables || [], tableName)
    if (!table) {
      report.missingTables.push(tableName)
      continue
    }

    const missing = missingFieldsForTable(table, fields)
    if (missing.length) report.missingFields.push({ table: tableName, fields: missing })
  }

  if (!dryRun && (report.missingTables.length || report.missingFields.length)) {
    report.schemaCreationAttempted = true
    try {
      for (const tableName of report.missingTables) {
        await createMissingTable(tableName, REQUIRED_AIRTABLE_SCHEMA[tableName])
        report.createdTables.push(tableName)
      }

      if (report.createdTables.length) {
        schema = await metaFetch('/tables')
      }

      for (const item of report.missingFields) {
        const table = findTable(schema.tables || [], item.table)
        if (!table) continue
        for (const fieldName of item.fields) {
          await createMissingField(table.id, fieldName)
          report.createdFields.push({ table: item.table, field: fieldName })
        }
      }

      report.schemaCreationAvailable = true
      schema = await metaFetch('/tables')
      report.existingTables = (schema.tables || []).map(table => table.name)
      report.missingTables = []
      report.missingFields = []
      for (const [tableName, fields] of Object.entries(REQUIRED_AIRTABLE_SCHEMA)) {
        const table = findTable(schema.tables || [], tableName)
        if (!table) {
          report.missingTables.push(tableName)
          continue
        }
        const missing = missingFieldsForTable(table, fields)
        if (missing.length) report.missingFields.push({ table: tableName, fields: missing })
      }
    } catch (error) {
      report.schemaCreationAvailable = false
      report.warnings.push(`Automatic schema creation failed or is not available with this token scope: ${error.message}`)
    }
  }

  const setupComplete = report.missingTables.length === 0 && report.missingFields.length === 0
  return {
    success: true,
    setupComplete,
    dryRun,
    startedAt,
    finishedAt: new Date().toISOString(),
    ...report,
    instructions: setupComplete
      ? 'Airtable setup is complete. Google Sheets fallback can remain available as a mirror.'
      : setupInstructions(report.missingTables, report.missingFields)
  }
}

export default setupAirtableBase
