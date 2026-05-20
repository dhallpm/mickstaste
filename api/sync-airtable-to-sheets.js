import { syncAirtableOperatorToSheets } from '../lib/micksSyncAutomation.js'
import { assertSyncAuthorized, sendError } from '../lib/syncAuth.js'

export default async function handler(req, res) {
  try {
    assertSyncAuthorized(req)
    const result = await syncAirtableOperatorToSheets({
      dryRun: req.query?.dryRun === '1'
    })
    res.status(200).json({
      success: result.errors.length === 0,
      sourceOfTruth: 'airtable_operator_google_sheets_backend',
      ...result
    })
  } catch (error) {
    console.error(error)
    sendError(res, error)
  }
}
