const AIRTABLE_META_ROOT = 'https://api.airtable.com/v0/meta'
const AIRTABLE_API_ROOT = 'https://api.airtable.com/v0'

const SELECT_CHOICES = {
  Access: ['Free', 'VIP', 'Premium'],
  'Archive Status': ['Active', 'Ready to Archive', 'Archived'],
  Grade: ['A+', 'A', 'A-', 'B+', 'B', 'C+', 'C', 'Lean'],
  'Release Status': ['Draft', 'Pregame', 'Released', 'Held'],
  Result: ['Pending', 'Win', 'Loss', 'Push', 'Void', 'Cancelled'],
  Status: ['Draft', 'Active', 'Posted', 'Released', 'Pregame', 'Closed', 'Graded', 'Archived'],
  'Sync Status': ['Synced', 'Needs Fallback', 'Needs Airtable Review', 'Error']
}

const STARTER_VIEWS = {
  'Master Picks': ['Grid view', 'Today', 'Needs Fallback', 'Ready to Archive'],
  'Props Lab': ['Grid view', 'Active Props', 'Ready to Archive'],
  'Lotto Parlays': ['Grid view', 'Active Lotto', 'Ready to Archive'],
  Longshots: ['Grid view', 'Active Longshots', 'Ready to Archive'],
  'Results Archive': ['Grid view', 'Newest Results'],
  'Sync Log': ['Grid view', 'Recent Syncs', 'Errors']
}

export const REQUIRED_AIRTABLE_SCHEMA = {
  'Master Picks': [
    'Record Key', 'Date', 'Posted Time', 'Sport', 'League', 'Game', 'Pick', 'Bet Type', 'Category', 'Access',
    'Odds', 'Sportsbook', 'Units', 'Grade', 'Confidence', 'EV Edge', 'Best Number', 'No Bet Cutoff', 'Status',
    'Release Status', 'Result', 'Profit/Loss', 'Closing Number', 'Verified Closing Number', 'Closing Source',
    'CLV', 'Market Notes', 'Injury Notes', 'Writeup', 'Full Analysis', 'Source Verification',
    'A Grade Gate Result', 'A Grade Evidence Count', 'Market Misprice Reason', 'Unresolved Conflict',
    'A-Hunt Source Notes', 'Archive Status',
    'Last Synced From Airtable', 'Last Synced From Google Sheets', 'Sync Status', 'Needs Fallback'
  ],
  'Props Lab': [
    'Record Key', 'Date', 'Player', 'Team', 'Opponent', 'League', 'Game', 'Prop Type', 'Line', 'Odds',
    'Sportsbook', 'Units', 'Grade', 'Confidence', 'EV Edge', 'Status', 'Result', 'Profit/Loss', 'Injury Notes',
    'Market Notes', 'Full Analysis', 'Source Verification', 'A Grade Gate Result', 'A Grade Evidence Count',
    'Market Misprice Reason', 'Unresolved Conflict', 'A-Hunt Source Notes', 'Closing Number', 'Verified Closing Number', 'Closing Source',
    'Archive Status', 'Sync Status'
  ],
  'Lotto Parlays': [
    'Record Key', 'Date', 'Parlay Type', 'Leg Count', 'Legs', 'Odds', 'Sportsbook', 'Units', 'Grade',
    'Confidence', 'Status', 'Result', 'Profit/Loss', 'Full Analysis', 'A Grade Gate Result',
    'A Grade Evidence Count', 'Market Misprice Reason', 'Unresolved Conflict', 'A-Hunt Source Notes',
    'Archive Status', 'Sync Status'
  ],
  Longshots: [
    'Record Key', 'Date', 'Sport', 'League', 'Longshot Type', 'Pick', 'Legs', 'Odds', 'Sportsbook', 'Units',
    'Grade', 'Confidence', 'Status', 'Result', 'Profit/Loss', 'Full Analysis', 'A Grade Gate Result',
    'A Grade Evidence Count', 'Market Misprice Reason', 'Unresolved Conflict', 'A-Hunt Source Notes',
    'Archive Status', 'Sync Status'
  ],
  'Results Archive': [
    'Record Key', 'Original Table', 'Date', 'Sport', 'League', 'Game', 'Pick', 'Bet Type', 'Odds', 'Units',
    'Result', 'Profit/Loss', 'Closing Number', 'Verified Closing Number', 'CLV', 'Access', 'Source Verification',
    'A Grade Gate Result', 'A Grade Evidence Count', 'Market Misprice Reason', 'Unresolved Conflict',
    'A-Hunt Source Notes', 'Archive Timestamp', 'Notes', 'Sync Status'
  ],
  'Sync Log': [
    'Timestamp', 'Direction', 'Source', 'Destination', 'Table', 'Record Key', 'Action', 'Status', 'Error Message',
    'Changed Fields', 'Sync Batch ID'
  ]
}

const MULTILINE_FIELDS = new Set([
  'Changed Fields',
  'Error Message',
  'Full Analysis',
  'Injury Notes',
  'Legs',
  'Market Notes',
  'Market Misprice Reason',
  'Notes',
  'Source Verification',
  'A Grade Gate Result',
  'A-Hunt Source Notes',
  'Unresolved Conflict',
  'Writeup'
])

const NUMBER_FIELDS = new Set([
  'Best Number',
  'CLV',
  'Closing Number',
  'Confidence',
  'EV Edge',
  'A Grade Evidence Count',
  'Leg Count',
  'Line',
  'No Bet Cutoff',
  'Odds',
  'Units',
  'Verified Closing Number'
])

const DATE_FIELDS = new Set(['Date'])
const DATE_TIME_FIELDS = new Set([
  'Archive Timestamp',
  'Last Synced From Airtable',
  'Last Synced From Google Sheets',
  'Posted Time',
  'Timestamp'
])

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) {
    const error = new Error(`${name} is required`)
    error.statusCode = 500
    throw error
  }
  return value
}

function redactBaseId() {
  const baseId = process.env.AIRTABLE_BASE_ID || ''
  return baseId ? `${baseId.slice(0, 6)}...` : ''
}

function sanitizeError(error) {
  return {
    message: String(error?.message || 'Unknown Airtable setup error')
      .replace(process.env.AIRTABLE_API_KEY || '__NO_KEY__', '[redacted]')
      .replace(process.env.AIRTABLE_BASE_ID || '__NO_BASE__', '[redacted]'),
    statusCode: error?.statusCode || error?.airtableStatus || 500,
    airtableErrorType: error?.airtableErrorType || undefined
  }
}

function isMetadataNotFound(error) {
  return error?.statusCode === 404 || error?.airtableStatus === 404
}

function selectOptions(fieldName) {
  return {
    choices: (SELECT_CHOICES[fieldName] || []).map(name => ({ name }))
  }
}

export function fieldDefinition(name) {
  if (DATE_TIME_FIELDS.has(name)) {
    return {
      name,
      type: 'dateTime',
      options: {
        dateFormat: { name: 'iso' },
        timeFormat: { name: '24hour' },
        timeZone: 'America/New_York'
      }
    }
  }

  if (DATE_FIELDS.has(name)) {
    return {
      name,
      type: 'date',
      options: { dateFormat: { name: 'iso' } }
    }
  }

  if (NUMBER_FIELDS.has(name)) {
    return {
      name,
      type: 'number',
      options: { precision: name === 'Leg Count' ? 0 : 2 }
    }
  }

  if (SELECT_CHOICES[name]) {
    return {
      name,
      type: 'singleSelect',
      options: selectOptions(name)
    }
  }

  if (MULTILINE_FIELDS.has(name)) {
    return { name, type: 'multilineText' }
  }

  if (name === 'Needs Fallback') {
    return {
      name,
      type: 'checkbox',
      options: { icon: 'check', color: 'greenBright' }
    }
  }

  return { name, type: 'singleLineText' }
}

function fieldTypeLabel(fieldName) {
  const definition = fieldDefinition(fieldName)
  if (definition.type === 'singleSelect') {
    return `single select (${(SELECT_CHOICES[fieldName] || []).join(', ')})`
  }
  if (definition.type === 'dateTime') return 'date/time'
  if (definition.type === 'multilineText') return 'long text'
  if (definition.type === 'singleLineText') return 'single line text'
  return definition.type
}

function csvEscape(value) {
  const text = String(value || '')
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function manualSetupTables() {
  return Object.entries(REQUIRED_AIRTABLE_SCHEMA).map(([tableName, fields]) => ({
    table: tableName,
    fieldList: fields.join(', '),
    csvHeader: fields.map(csvEscape).join(','),
    fields: fields.map(fieldName => ({
      name: fieldName,
      recommendedType: fieldTypeLabel(fieldName)
    })),
    starterViews: STARTER_VIEWS[tableName] || []
  }))
}

async function metaFetch(path, options = {}) {
  const baseId = requiredEnv('AIRTABLE_BASE_ID')
  const response = await fetch(`${AIRTABLE_META_ROOT}/bases/${baseId}${path}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${requiredEnv('AIRTABLE_API_KEY')}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
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
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = payload?.error?.message || payload?.error || response.statusText
    const error = new Error(`Airtable ${tableName} ${response.status}: ${message}`)
    error.statusCode = response.status
    error.airtableStatus = response.status
    error.airtableErrorType = payload?.error?.type || ''
    throw error
  }

  return payload
}

function tableByName(schemaTables = [], tableName) {
  return schemaTables.find(table => table.name === tableName)
}

function fieldByName(table, fieldName) {
  return (table?.fields || []).find(field => field.name === fieldName)
}

function viewNames(table) {
  return (table?.views || []).map(view => view.name)
}

function setupInstructions(missingTables = [], missingFields = [], missingViews = [], options = {}) {
  if (options.manualSetupMode) {
    return [
      'Airtable metadata/schema API returned 404, so this endpoint switched to manual setup mode.',
      'Keep Google Sheets fallback active while you create the Airtable tables.',
      'In Airtable, create each required table exactly as named below.',
      'For each table, either paste the csvHeader line as the first row/header row or create the listed fields manually.',
      'Use the recommended field types where Airtable lets you choose types. If unsure, single line text is safe and the app will still read the fields.',
      'After the tables exist, /api/todays-picks will prefer Airtable when it can read current rows and will continue falling back to Google Sheets while setup is incomplete.'
    ].join('\n')
  }

  const lines = [
    'Airtable setup is not complete yet.',
    'Use a Personal Access Token with schema.bases:read and schema.bases:write scopes for automatic setup.',
    'Keep Google Sheets fallback active until setupComplete is true.'
  ]

  if (missingTables.length) {
    lines.push('', 'Create these missing tables exactly as named:', ...missingTables.map(table => `- ${table}`))
  }

  if (missingFields.length) {
    lines.push('', 'Add these missing fields:')
    for (const item of missingFields) {
      lines.push(`- ${item.table}: ${item.fields.join(', ')}`)
    }
  }

  if (missingViews.length) {
    lines.push('', 'Create these starter filtered views manually in Airtable if you want the full operator workspace:')
    for (const item of missingViews) {
      lines.push(`- ${item.table}: ${item.views.join(', ')}`)
    }
  }

  return lines.join('\n')
}

function summarizeExisting(schemaTables = []) {
  const alreadyExists = []
  for (const [tableName, fields] of Object.entries(REQUIRED_AIRTABLE_SCHEMA)) {
    const table = tableByName(schemaTables, tableName)
    if (!table) continue
    alreadyExists.push({ type: 'table', table: tableName })
    for (const fieldName of fields) {
      if (fieldByName(table, fieldName)) {
        alreadyExists.push({ type: 'field', table: tableName, field: fieldName })
      }
    }
    for (const viewName of STARTER_VIEWS[tableName] || []) {
      if (viewNames(table).includes(viewName)) {
        alreadyExists.push({ type: 'view', table: tableName, view: viewName })
      }
    }
  }
  return alreadyExists
}

function schemaGaps(schemaTables = []) {
  const missingTables = []
  const missingFields = []
  const missingViews = []

  for (const [tableName, fields] of Object.entries(REQUIRED_AIRTABLE_SCHEMA)) {
    const table = tableByName(schemaTables, tableName)
    if (!table) {
      missingTables.push(tableName)
      continue
    }

    const fieldsMissing = fields.filter(fieldName => !fieldByName(table, fieldName))
    if (fieldsMissing.length) missingFields.push({ table: tableName, fields: fieldsMissing })

    const viewsMissing = (STARTER_VIEWS[tableName] || []).filter(viewName => !viewNames(table).includes(viewName))
    if (viewsMissing.length) missingViews.push({ table: tableName, views: viewsMissing })
  }

  return { missingTables, missingFields, missingViews }
}

async function createTable(tableName) {
  const fields = REQUIRED_AIRTABLE_SCHEMA[tableName]
  return metaFetch('/tables', {
    method: 'POST',
    body: {
      name: tableName,
      description: 'Micks Picks Airtable-first automation table. Default grid view is created by Airtable.',
      fields: fields.map(fieldDefinition)
    }
  })
}

async function createTableSkeleton(tableName) {
  return metaFetch('/tables', {
    method: 'POST',
    body: {
      name: tableName,
      description: 'Micks Picks Airtable-first automation table. Default grid view is created by Airtable.',
      fields: [fieldDefinition('Record Key')]
    }
  })
}

async function createField(tableId, fieldName) {
  return metaFetch(`/tables/${tableId}/fields`, {
    method: 'POST',
    body: fieldDefinition(fieldName)
  })
}

async function createFieldWithTextFallback(tableId, fieldName) {
  try {
    return {
      field: await createField(tableId, fieldName),
      fallbackUsed: false
    }
  } catch (error) {
    if (fieldDefinition(fieldName).type === 'singleLineText') throw error
    const field = await metaFetch(`/tables/${tableId}/fields`, {
      method: 'POST',
      body: MULTILINE_FIELDS.has(fieldName)
        ? { name: fieldName, type: 'multilineText' }
        : { name: fieldName, type: 'singleLineText' }
    })
    return { field, fallbackUsed: true, originalError: error }
  }
}

function nextStepsFor({ setupComplete, schemaReadAvailable, manualSetupMode, errors, missingTables, missingFields, missingViews }) {
  if (setupComplete) {
    return [
      'Airtable schema is complete.',
      '/api/todays-picks will use Airtable first and keep Google Sheets fallback as a mirror.',
      'Create optional filtered views in Airtable if you want operator-specific screens beyond the default grid views.'
    ]
  }

  const steps = [
    'Keep Google Sheets fallback active until setupComplete is true.',
    manualSetupMode
      ? 'Use manualSetup.tables[].csvHeader or manualSetup.tables[].fieldList to create the required Airtable tables.'
      : 'Re-run /api/micks-admin?action=setup-airtable-base after correcting Airtable token scopes or manual schema gaps.'
  ]

  if (!schemaReadAvailable && !manualSetupMode) {
    steps.unshift('Give the Airtable token metadata/schema scopes: schema.bases:read and schema.bases:write.')
  }

  if (manualSetupMode) {
    steps.unshift('Airtable metadata/schema API returned 404, so this response is in manual setup mode.')
  }

  if (missingTables.length) steps.push(`Missing tables: ${missingTables.join(', ')}`)
  if (missingFields.length) steps.push(`Missing field groups: ${missingFields.map(item => item.table).join(', ')}`)
  if (missingViews.length) steps.push('Starter filtered views may need to be created manually; Airtable table creation automatically creates a default grid view.')
  if (errors.length) steps.push('Review the errors array for Airtable API status codes. Secrets are redacted.')

  return steps
}

async function readSchemaWithFallback(report) {
  try {
    const schema = await metaFetch('/tables')
    report.schemaReadAvailable = true
    report.schemaWriteAvailable = null
    return schema
  } catch (error) {
    report.schemaReadAvailable = false
    report.schemaWriteAvailable = false
    report.manualSetupMode = isMetadataNotFound(error)
    report.manualSetupReason = report.manualSetupMode
      ? 'Airtable metadata/schema API returned 404. Manual setup mode is active.'
      : ''
    report.errors.push({
      action: 'read_schema',
      ...sanitizeError(error)
    })

    const schema = { tables: [] }
    for (const tableName of Object.keys(REQUIRED_AIRTABLE_SCHEMA)) {
      try {
        await dataFetch(tableName)
        schema.tables.push({ name: tableName, fields: [], views: [] })
      } catch (tableError) {
        if (tableError.statusCode !== 404) {
          report.errors.push({
            action: 'verify_table_without_metadata',
            table: tableName,
            ...sanitizeError(tableError)
          })
        }
      }
    }
    return schema
  }
}

export async function setupAirtableBase(options = {}) {
  requiredEnv('AIRTABLE_API_KEY')
  requiredEnv('AIRTABLE_BASE_ID')

  const startedAt = new Date().toISOString()
  const dryRun = options.dryRun === true
  const report = {
    success: true,
    setupComplete: false,
    dryRun,
    baseIdPrefix: redactBaseId(),
    tablesCreated: [],
    fieldsCreated: [],
    alreadyExists: [],
    errors: [],
    nextSteps: [],
    manualSetupMode: false,
    manualSetupReason: '',
    manualSetup: null,
    starterViews: [],
    missingTables: [],
    missingFields: [],
    missingViews: [],
    schemaReadAvailable: null,
    schemaWriteAvailable: null,
    googleSheetsFallbackActive: true,
    startedAt,
    finishedAt: null
  }

  let schema = await readSchemaWithFallback(report)
  report.alreadyExists = summarizeExisting(schema.tables || [])
  let gaps = schemaGaps(schema.tables || [])
  report.missingTables = gaps.missingTables
  report.missingFields = gaps.missingFields
  report.missingViews = gaps.missingViews

  if (!dryRun && report.schemaReadAvailable) {
    for (const tableName of gaps.missingTables) {
      try {
        const created = await createTable(tableName)
        report.tablesCreated.push({
          table: tableName,
          id: created.id || null,
          starterView: 'Grid view'
        })
        for (const field of created.fields || []) {
          report.fieldsCreated.push({
            table: tableName,
            field: field.name,
            id: field.id || null,
            type: field.type || fieldDefinition(field.name).type,
            createdWithTable: true
          })
        }
      } catch (error) {
        try {
          const created = await createTableSkeleton(tableName)
          report.tablesCreated.push({
            table: tableName,
            id: created.id || null,
            starterView: 'Grid view',
            fallbackUsed: true
          })
          report.fieldsCreated.push({
            table: tableName,
            field: 'Record Key',
            id: created.fields?.find(field => field.name === 'Record Key')?.id || null,
            type: 'singleLineText',
            createdWithTable: true
          })
          report.errors.push({
            action: 'create_table_typed_schema',
            table: tableName,
            recoveredWithFallback: true,
            ...sanitizeError(error)
          })
        } catch (fallbackError) {
          report.errors.push({
            action: 'create_table',
            table: tableName,
            ...sanitizeError(fallbackError)
          })
        }
      }
    }

    schema = await readSchemaWithFallback(report)
    gaps = schemaGaps(schema.tables || [])

    for (const item of gaps.missingFields) {
      const table = tableByName(schema.tables || [], item.table)
      if (!table?.id) continue
      for (const fieldName of item.fields) {
        if (fieldByName(table, fieldName)) continue
        try {
          const { field: created, fallbackUsed, originalError } = await createFieldWithTextFallback(table.id, fieldName)
          report.fieldsCreated.push({
            table: item.table,
            field: fieldName,
            id: created.id || null,
            type: created.type || fieldDefinition(fieldName).type,
            fallbackUsed
          })
          if (fallbackUsed) {
            report.errors.push({
              action: 'create_field_typed_schema',
              table: item.table,
              field: fieldName,
              recoveredWithFallback: true,
              ...sanitizeError(originalError)
            })
          }
        } catch (error) {
          report.errors.push({
            action: 'create_field',
            table: item.table,
            field: fieldName,
            ...sanitizeError(error)
          })
        }
      }
    }

    report.schemaWriteAvailable = !report.errors.some(error =>
      ['create_table', 'create_field'].includes(error.action) ||
      (['create_table_typed_schema', 'create_field_typed_schema'].includes(error.action) && !error.recoveredWithFallback)
    )
    schema = await readSchemaWithFallback(report)
    report.alreadyExists = summarizeExisting(schema.tables || [])
    gaps = schemaGaps(schema.tables || [])
    report.missingTables = gaps.missingTables
    report.missingFields = gaps.missingFields
    report.missingViews = gaps.missingViews
  }

  report.starterViews = Object.entries(STARTER_VIEWS).map(([table, views]) => ({
    table,
    views,
    note: 'Airtable creates Grid view automatically when this endpoint creates a table. Create the other filtered views manually if they are missing.'
  }))
  report.setupComplete = report.missingTables.length === 0 && report.missingFields.length === 0
  report.nextSteps = nextStepsFor({
    setupComplete: report.setupComplete,
    schemaReadAvailable: report.schemaReadAvailable,
    manualSetupMode: report.manualSetupMode,
    errors: report.errors,
    missingTables: report.missingTables,
    missingFields: report.missingFields,
    missingViews: report.missingViews
  })
  report.manualSetup = report.manualSetupMode
    ? {
        mode: true,
        reason: report.manualSetupReason,
        instructions: setupInstructions(report.missingTables, report.missingFields, report.missingViews, { manualSetupMode: true }),
        tables: manualSetupTables()
      }
    : null
  report.instructions = report.setupComplete
    ? 'Airtable tables and fields are complete. Google Sheets fallback remains active as a mirror.'
    : setupInstructions(report.missingTables, report.missingFields, report.missingViews, { manualSetupMode: report.manualSetupMode })
  report.finishedAt = new Date().toISOString()

  return report
}

export default setupAirtableBase
