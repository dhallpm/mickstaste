const AIRTABLE_API_ROOT = 'https://api.airtable.com/v0'
const DEFAULT_BASE_ID = 'appsVhMax3qWQ1odj'

function firstEnv(...names) {
  for (const name of names) {
    const value = String(process.env[name] || '').trim()
    if (value) return value
  }
  return ''
}

const TABLES = {
  picks: firstEnv('AIRTABLE_PICKS_TABLE_ID', 'AIRTABLE_PICKS_TABLE_NAME', 'AIRTABLE_PICKS_TABLE', 'AIRTABLE_MASTER_PICKS_TABLE_ID', 'AIRTABLE_MASTER_PICKS_TABLE_NAME', 'AIRTABLE_MASTER_PICKS_TABLE') || 'tblB0LZW6ATToi8tF',
  master: firstEnv('AIRTABLE_PICKS_TABLE_ID', 'AIRTABLE_PICKS_TABLE_NAME', 'AIRTABLE_PICKS_TABLE', 'AIRTABLE_MASTER_PICKS_TABLE_ID', 'AIRTABLE_MASTER_PICKS_TABLE_NAME', 'AIRTABLE_MASTER_PICKS_TABLE') || 'tblB0LZW6ATToi8tF',
  masterPicks: firstEnv('AIRTABLE_PICKS_TABLE_ID', 'AIRTABLE_PICKS_TABLE_NAME', 'AIRTABLE_PICKS_TABLE', 'AIRTABLE_MASTER_PICKS_TABLE_ID', 'AIRTABLE_MASTER_PICKS_TABLE_NAME', 'AIRTABLE_MASTER_PICKS_TABLE') || 'tblB0LZW6ATToi8tF',
  props: firstEnv('AIRTABLE_PROPS_TABLE_ID', 'AIRTABLE_PROPS_TABLE_NAME', 'AIRTABLE_PROPS_TABLE', 'AIRTABLE_PROPS_LAB_TABLE_ID', 'AIRTABLE_PROPS_LAB_TABLE_NAME') || 'tblPdZG1sTbjD74mx',
  propsLab: firstEnv('AIRTABLE_PROPS_TABLE_ID', 'AIRTABLE_PROPS_TABLE_NAME', 'AIRTABLE_PROPS_TABLE', 'AIRTABLE_PROPS_LAB_TABLE_ID', 'AIRTABLE_PROPS_LAB_TABLE_NAME') || 'tblPdZG1sTbjD74mx',
  lotto: firstEnv('AIRTABLE_PARLAYS_TABLE_ID', 'AIRTABLE_PARLAYS_TABLE_NAME', 'AIRTABLE_LOTTO_PARLAYS_TABLE_ID', 'AIRTABLE_LOTTO_PARLAYS_TABLE_NAME', 'AIRTABLE_LOTTO_TABLE_ID', 'AIRTABLE_LOTTO_TABLE_NAME', 'AIRTABLE_LOTTO_TABLE') || 'tbllr4X5WVUxtmQyL',
  parlays: firstEnv('AIRTABLE_PARLAYS_TABLE_ID', 'AIRTABLE_PARLAYS_TABLE_NAME', 'AIRTABLE_LOTTO_PARLAYS_TABLE_ID', 'AIRTABLE_LOTTO_PARLAYS_TABLE_NAME', 'AIRTABLE_LOTTO_TABLE_ID', 'AIRTABLE_LOTTO_TABLE_NAME', 'AIRTABLE_LOTTO_TABLE') || 'tbllr4X5WVUxtmQyL',
  lottoParlays: firstEnv('AIRTABLE_PARLAYS_TABLE_ID', 'AIRTABLE_PARLAYS_TABLE_NAME', 'AIRTABLE_LOTTO_PARLAYS_TABLE_ID', 'AIRTABLE_LOTTO_PARLAYS_TABLE_NAME', 'AIRTABLE_LOTTO_TABLE_ID', 'AIRTABLE_LOTTO_TABLE_NAME', 'AIRTABLE_LOTTO_TABLE') || 'tbllr4X5WVUxtmQyL',
  longshot: firstEnv('AIRTABLE_LONGSHOTS_TABLE_ID', 'AIRTABLE_LONGSHOTS_TABLE_NAME', 'AIRTABLE_LONGSHOTS_TABLE') || 'tblE2H2iiKoFqQXHl',
  longshots: firstEnv('AIRTABLE_LONGSHOTS_TABLE_ID', 'AIRTABLE_LONGSHOTS_TABLE_NAME', 'AIRTABLE_LONGSHOTS_TABLE') || 'tblE2H2iiKoFqQXHl'
}

const BLOCKED_FIELDS = new Set([
  'Result',
  'Outcome',
  'Profit/Loss',
  'P/L',
  'PL',
  'Profit Loss',
  'Record ID',
  'Airtable Record ID',
  'id',
  'airtableRecordId',
  '__table'
])

const TABLE_ALLOWED_FIELDS = {
  picks: new Set([
    'Date','Sport','League','Game','Pick','Bet Type','Odds','Sportsbook','Grade','Units','Best Number','No Bet Cutoff','Implied Probability','EV Edge','True Probability','Model Probability','Closing Number','Closing Odds','CLV%','CLV Result','Closing Line Value','Closing Line','Confidence','Status','Access','Writeup','Short Take','Why This Play','Matchup Edge','Projection Edge','Key Metrics','Risk','Final Take','Market Notes','Injury Notes','Source Verification','Posted Time','Full Analysis','A Grade Gate Result','A Grade Evidence Count','Market Misprice Reason','Unresolved Conflict','A-Hunt Source Notes','Park/Weather Risk','Blow-Up Risk','Volatility Capped','Tags'
  ]),
  propsLab: new Set([
    'Date','Player','Prop','Sport','League','Game','Grade','Units','Status','Odds','Sportsbook','Best Number','No Bet Cutoff','Confidence','Access','Featured','Writeup','Short Take','Why This Play','Matchup Edge','Projection Edge','Key Metrics','Risk','Final Take','Market Notes','Injury Notes','Source Verification','Full Analysis','A Grade Gate Result','A Grade Evidence Count','Market Misprice Reason','Unresolved Conflict','A-Hunt Source Notes','Park/Weather Risk','Blow-Up Risk','Volatility Capped','Tags'
  ]),
  lottoParlays: new Set([
    'Date','Sport','League','Game','Pick','Bet Type','Odds','Sportsbook','Grade','Units','Best Number','No Bet Cutoff','Confidence','Status','Access','Featured','Parlay Group','Writeup','Short Take','Why This Play','Matchup Edge','Projection Edge','Key Metrics','Risk','Final Take','Market Notes','Injury Notes','Source Verification','Full Analysis','A Grade Gate Result','A Grade Evidence Count','Market Misprice Reason','Unresolved Conflict','A-Hunt Source Notes','Park/Weather Risk','Blow-Up Risk','Volatility Capped','Tags'
  ]),
  longshots: new Set([
    'Date','Sport','League','Game','Pick','Bet Type','Odds','Sportsbook','Grade','Units','Best Number','No Bet Cutoff','Confidence','Status','Access','Featured','Longshot','Writeup','Short Take','Why This Play','Matchup Edge','Projection Edge','Key Metrics','Risk','Final Take','Market Notes','Injury Notes','Source Verification','Full Analysis','A Grade Gate Result','A Grade Evidence Count','Market Misprice Reason','Unresolved Conflict','A-Hunt Source Notes','Park/Weather Risk','Blow-Up Risk','Volatility Capped','Tags'
  ])
}

function baseId() {
  return String(process.env.AIRTABLE_VERIFIED_BASE_ID || process.env.AIRTABLE_BASE_ID || DEFAULT_BASE_ID).trim()
}

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

function canonicalTable(alias = '') {
  const key = String(alias || '').trim()
  if (key === 'master' || key === 'masterPicks' || key === 'picks') return 'picks'
  if (key === 'props' || key === 'propsLab') return 'propsLab'
  if (key === 'lotto' || key === 'parlays' || key === 'lottoParlays') return 'lottoParlays'
  if (key === 'longshot' || key === 'longshots') return 'longshots'
  return key
}

function tableRef(alias = '') {
  const key = String(alias || '').trim()
  return TABLES[key] || TABLES[canonicalTable(key)] || key
}

function recordIdsFromCreated(records = []) {
  return (Array.isArray(records) ? records : [])
    .map(record => String(record?.id || '').trim())
    .filter(id => /^rec[A-Za-z0-9]{8,}$/.test(id))
}

function truthy(value) {
  return value === true || /^(1|true|yes|y|preview|dryrun|dry run)$/i.test(String(value || '').trim())
}

function cleanText(value) {
  return String(value ?? '')
    .replace(/\ufeff/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00a0/g, ' ')
    .trim()
}

function cleanValue(value) {
  if (typeof value === 'string') return cleanText(value)
  return value
}

function gradeValue(fields = {}) {
  return cleanText(fields.Grade || fields['Card Grade'] || fields.grade || '').toUpperCase()
}

function isAOrBetter(fields = {}) {
  const grade = gradeValue(fields)
  return grade === 'A' || grade === 'A+'
}

function normalizeAccessByGrade(fields = {}, tableAlias = '') {
  const canonical = canonicalTable(tableAlias)
  const next = { ...fields }

  if (canonical === 'propsLab') {
    const access = cleanText(next.Access).toLowerCase()
    if (access.includes('vip') && !isAOrBetter(next)) {
      next.Access = 'Free'
    }
  }

  if (canonical === 'picks') {
    const access = cleanText(next.Access).toLowerCase()
    if (access.includes('vip') && !isAOrBetter(next)) {
      next.Access = 'Free'
    }
  }

  return next
}

function cleanFields(fields = {}, tableAlias = '') {
  const canonical = canonicalTable(tableAlias)
  const allowed = TABLE_ALLOWED_FIELDS[canonical]
  const cleaned = {}

  for (const [rawKey, rawValue] of Object.entries(fields || {})) {
    const key = cleanText(rawKey)
    if (!key || BLOCKED_FIELDS.has(key)) continue
    if (allowed && !allowed.has(key)) continue
    const value = cleanValue(rawValue)
    if (value === '' || value === null || value === undefined) continue
    cleaned[key] = value
  }

  return normalizeAccessByGrade(cleaned, tableAlias)
}

function extractRejectedField(payload = {}) {
  const message = String(payload?.error?.message || payload?.error?.type || payload?.error || '')
  return message.match(/field\s+name:\s*"([^"]+)"/i)?.[1] ||
    message.match(/field\s+"([^"]+)"/i)?.[1] ||
    message.match(/Unknown field name:\s*"([^"]+)"/i)?.[1] ||
    ''
}

function removeField(records = [], fieldName = '') {
  let removed = false
  const next = records.map(record => {
    if (!Object.hasOwn(record.fields || {}, fieldName)) return record
    removed = true
    const fields = { ...record.fields }
    delete fields[fieldName]
    return { ...record, fields }
  })
  return { records: next, removed }
}

async function airtableBatchCreate(tableAlias, records = [], options = {}) {
  const table = tableRef(tableAlias)
  const base = baseId()
  const warnings = []
  const created = []
  const skipped = []
  const prepared = records
    .map((fields, index) => ({ index, fields: cleanFields(fields, tableAlias) }))
    .filter(record => {
      const keep = Object.keys(record.fields).length > 0
      if (!keep) skipped.push({ index: record.index, reason: 'No valid fields after cleaning' })
      return keep
    })

  console.log('[airtable-import] create records target', {
    baseId: base,
    tableAlias,
    tableName: table,
    recordCount: records.length,
    firstRecordKeys: Object.keys(records[0] || {})
  })

  if (options.dryRun) {
    return {
      ok: true,
      success: true,
      dryRun: true,
      tableAlias,
      tableName: table,
      attempted: records.length,
      requested: records.length,
      cleaned: prepared.length,
      skipped,
      created: 0,
      recordIds: [],
      warnings,
      message: 'DRY RUN - NO AIRTABLE WRITE',
      preview: prepared.slice(0, 10).map(record => record.fields)
    }
  }

  for (let i = 0; i < prepared.length; i += 10) {
    let body = {
      records: prepared.slice(i, i + 10).map(record => ({ fields: record.fields })),
      typecast: true
    }
    const removedFields = new Set()

    for (;;) {
      const response = await fetch(`${AIRTABLE_API_ROOT}/${base}/${encodeURIComponent(table)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${requiredEnv('AIRTABLE_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })
      const payload = await response.json().catch(() => ({}))

      if (response.ok) {
        created.push(...(payload.records || []))
        for (const field of removedFields) warnings.push(`Removed Airtable-incompatible field ${field} and retried successfully.`)
        break
      }

      const rejectedField = extractRejectedField(payload)
      if (!rejectedField || removedFields.has(rejectedField) || removedFields.size >= 20) {
        return {
          ok: false,
          success: false,
          tableAlias,
          tableName: table,
          attempted: records.length,
          requested: records.length,
          created: recordIdsFromCreated(created).length,
          recordIds: recordIdsFromCreated(created),
          skipped,
          warnings,
          error: payload?.error?.message || payload?.error?.type || response.statusText,
          status: response.status
        }
      }

      const next = removeField(body.records, rejectedField)
      if (!next.removed) {
        return {
          ok: false,
          success: false,
          tableAlias,
          tableName: table,
          attempted: records.length,
          requested: records.length,
          created: recordIdsFromCreated(created).length,
          recordIds: recordIdsFromCreated(created),
          skipped,
          warnings,
          error: `Airtable rejected field ${rejectedField}, but it was not present in payload`,
          status: response.status
        }
      }
      removedFields.add(rejectedField)
      body = { ...body, records: next.records }
    }
  }

  const recordIds = recordIdsFromCreated(created)
  const ok = prepared.length > 0 && recordIds.length === prepared.length
  return {
    ok,
    success: ok,
    tableAlias,
    tableName: table,
    attempted: records.length,
    requested: records.length,
    cleaned: prepared.length,
    skipped,
    created: recordIds.length,
    recordIds,
    warnings,
    ...(ok ? {} : { error: recordIds.length === 0 ? 'Airtable returned zero created records with record IDs.' : `Airtable returned ${recordIds.length} created record IDs for ${prepared.length} cleaned records.` })
  }
}

async function runSmokeTest() {
  const result = await airtableBatchCreate('picks', [{
    Pick: 'DELETE ME - Smoke Test Pick',
    Game: 'AIRTABLE IMPORT SMOKE TEST',
    Status: 'Pending'
  }], { dryRun: false })

  return {
    ok: result.ok,
    success: result.ok,
    table: 'picks',
    tableName: result.tableName,
    attempted: 1,
    created: result.created,
    recordIds: result.recordIds || [],
    ...(result.error ? { error: result.error } : {}),
    result
  }
}

function parseBody(req) {
  if (!req.body) return {}
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}')
  return req.body
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(200).json({
        ok: true,
        success: true,
        message: 'POST JSON with { table: "propsLab", records: [...] } or { batches: [...] }. Result/Outcome/Profit-Loss fields are stripped automatically. Customer-friendly imports should include Short Take, Why This Play, Matchup Edge, Projection Edge, Key Metrics, Risk, Final Take, and Full Analysis. Master Picks metric fields are accepted. Props Lab and Master Picks below A/A+ cannot import as VIP; they are normalized to Free. Use smokeTest=true for a one-row smoke test.',
        baseId: baseId(),
        smokeTest: {
          method: 'POST',
          body: {
            smokeTest: true,
            dryRun: false,
            table: 'picks'
          },
          creates: {
            Pick: 'DELETE ME - Smoke Test Pick',
            Game: 'AIRTABLE IMPORT SMOKE TEST',
            Status: 'Pending'
          }
        },
        tables: {
          picks: tableRef('picks'),
          propsLab: tableRef('propsLab'),
          lottoParlays: tableRef('lottoParlays'),
          longshots: tableRef('longshots')
        }
      })
      return
    }

    const body = parseBody(req)
    if (body.smokeTest === true) {
      const result = await runSmokeTest()
      res.status(result.ok ? 200 : 500).json(result)
      return
    }

    const dryRun = truthy(req.query?.dryRun) || truthy(req.query?.preview) || truthy(body.dryRun) || truthy(body.preview)
    const batches = Array.isArray(body.batches)
      ? body.batches
      : [{ table: body.table, records: body.records || [] }]

    const results = []
    for (const batch of batches) {
      const table = canonicalTable(batch.table || '')
      const records = Array.isArray(batch.records) ? batch.records : []
      if (!table) {
        results.push({ tableAlias: batch.table || '', requested: records.length, created: 0, error: 'Missing table alias' })
        continue
      }
      results.push(await airtableBatchCreate(table, records, { dryRun }))
    }

    const failed = results.filter(result => result.error)
    const attempted = results.reduce((sum, result) => sum + Number(result.attempted || result.requested || 0), 0)
    const created = results.reduce((sum, result) => sum + Number(result.created || 0), 0)
    const recordIds = results.flatMap(result => result.recordIds || [])
    const ok = dryRun
      ? results.length > 0 && failed.length === 0 && results.every(result => result.ok !== false)
      : results.length > 0 && failed.length === 0 && created > 0 && recordIds.length === created
    res.status(failed.length ? 207 : 200).json({
      ok,
      success: ok,
      dryRun,
      ...(results.length === 1 ? { table: results[0].tableAlias || body.table } : {}),
      attempted,
      created,
      recordIds,
      error: ok ? undefined : (failed[0]?.error || 'Airtable import did not return created record IDs.'),
      message: !ok
        ? 'Some sections failed. Successful sections may still have imported.'
        : (dryRun ? 'DRY RUN - NO AIRTABLE WRITE' : 'Records imported. Result/Outcome/Profit-Loss fields were intentionally not sent.'),
      results
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ ok: false, success: false, created: 0, recordIds: [], error: error.message || String(error) })
  }
}
