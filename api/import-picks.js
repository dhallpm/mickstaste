import { googleSheetsBatchAppend, resolveGoogleSheetsPickTab } from '../lib/googleSheetsPickStore.js'

const SMOKE_TEST_ROW = {
  Pick: 'Google Sheets Smoke Test',
  Game: 'GOOGLE SHEETS IMPORT SMOKE TEST',
  Status: 'Pending',
  Access: 'Free',
  Grade: 'C',
  Units: 0,
  'Release Status': 'Free Released'
}

function truthy(value) {
  return value === true || /^(1|true|yes|y|preview|dryrun|dry run)$/i.test(String(value || '').trim())
}

function parseBody(req) {
  if (!req.body) return {}
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}')
  return req.body
}

function normalizeBatches(body = {}) {
  if (Array.isArray(body.batches)) {
    return body.batches.map(batch => ({
      table: batch.table,
      records: Array.isArray(batch.records) ? batch.records : []
    }))
  }

  return [{
    table: body.table,
    records: Array.isArray(body.records) ? body.records : []
  }]
}

function importSummary(results = [], dryRun = false) {
  const failed = results.filter(result => result.ok === false || result.error)
  const attempted = results.reduce((sum, result) => sum + Number(result.attempted || result.requested || 0), 0)
  const created = results.reduce((sum, result) => sum + Number(result.created || 0), 0)
  const ok = dryRun
    ? results.length > 0 && failed.length === 0
    : results.length > 0 && failed.length === 0 && created > 0

  return {
    ok,
    success: ok,
    destination: 'Google Sheets',
    dryRun,
    attempted,
    created,
    error: ok ? undefined : (failed[0]?.error || 'Google Sheets import did not append any rows.'),
    message: ok
      ? (dryRun ? 'DRY RUN - NO GOOGLE SHEETS WRITE' : 'Records imported to Google Sheets.')
      : 'Some sections failed. Successful sections may still have imported.',
    results
  }
}

async function runSmokeTest(dryRun = false) {
  const result = await googleSheetsBatchAppend('picks', [SMOKE_TEST_ROW], { dryRun })
  const ok = dryRun ? result.ok !== false : result.ok === true && result.created === 1
  return {
    ok,
    success: ok,
    destination: 'Google Sheets',
    dryRun,
    table: 'picks',
    tableName: result.tableName,
    attempted: 1,
    created: result.created || 0,
    error: ok ? undefined : (result.error || 'Google Sheets smoke test did not append one row.'),
    results: [result]
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(200).json({
        ok: true,
        success: true,
        destination: 'Google Sheets',
        message: 'POST JSON with { table: "picks", records: [...] } or { batches: [...] }. Result/Outcome/Profit-Loss fields are stripped automatically. VIP Access below A/A+ is normalized to Free. Customer-friendly imports should include Short Take, Why This Play, Matchup Edge, Projection Edge, Key Metrics, Risk, Final Take, and Full Analysis. Use smokeTest=true for a one-row Google Sheets smoke test.',
        spreadsheetIdEnv: 'GOOGLE_SHEETS_PICK_SHEET_ID',
        tables: {
          picks: resolveGoogleSheetsPickTab('picks'),
          propsLab: resolveGoogleSheetsPickTab('propsLab'),
          lottoParlays: resolveGoogleSheetsPickTab('lottoParlays'),
          longshots: resolveGoogleSheetsPickTab('longshots')
        },
        smokeTest: {
          method: 'POST',
          body: {
            smokeTest: true,
            dryRun: false,
            table: 'picks'
          },
          creates: SMOKE_TEST_ROW
        }
      })
      return
    }

    const body = parseBody(req)
    const dryRun = truthy(req.query?.dryRun) || truthy(req.query?.preview) || truthy(body.dryRun) || truthy(body.preview)

    if (body.smokeTest === true) {
      const result = await runSmokeTest(dryRun)
      res.status(result.ok ? 200 : 500).json(result)
      return
    }

    const batches = normalizeBatches(body)
    const results = []

    for (const batch of batches) {
      try {
        if (!batch.table) {
          results.push({
            ok: false,
            success: false,
            tableAlias: '',
            attempted: Array.isArray(batch.records) ? batch.records.length : 0,
            created: 0,
            destination: 'Google Sheets',
            error: 'Missing table alias.'
          })
          continue
        }

        if (!Array.isArray(batch.records) || batch.records.length === 0) {
          results.push({
            ok: false,
            success: false,
            tableAlias: batch.table,
            tableName: resolveGoogleSheetsPickTab(batch.table),
            attempted: 0,
            created: 0,
            destination: 'Google Sheets',
            error: 'Missing records array.'
          })
          continue
        }

        results.push(await googleSheetsBatchAppend(batch.table, batch.records, { dryRun }))
      } catch (error) {
        results.push({
          ok: false,
          success: false,
          tableAlias: batch.table || '',
          attempted: Array.isArray(batch.records) ? batch.records.length : 0,
          created: 0,
          destination: 'Google Sheets',
          error: error.message || String(error)
        })
      }
    }

    const summary = importSummary(results, dryRun)
    res.status(summary.ok ? 200 : 207).json(summary)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      ok: false,
      success: false,
      destination: 'Google Sheets',
      created: 0,
      results: [],
      error: error.message || String(error)
    })
  }
}
