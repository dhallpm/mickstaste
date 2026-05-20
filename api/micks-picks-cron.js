import { runClosingOddsWorker } from '../lib/closingOddsWorker.js'
import { runMicksSync } from '../lib/micksSyncAutomation.js'
import { assertSyncAuthorized, sendError } from '../lib/syncAuth.js'

export default async function handler(req, res) {
  try {
    assertSyncAuthorized(req)
    const now = new Date()
    const closingOddsDue = now.getUTCHours() % 6 === 0

    const [syncResult, closingOdds] = await Promise.all([
      runMicksSync({ dryRun: req.query?.dryRun === '1' }),
      closingOddsDue
        ? runClosingOddsWorker({ dryRun: req.query?.dryRun === '1' })
        : Promise.resolve({ skipped: true, reason: 'Closing odds worker runs every 6 UTC hours' })
    ])

    res.status(200).json({
      success: true,
      sourceOfTruth: 'airtable_operator_google_sheets_backend',
      syncResult,
      closingOdds
    })
  } catch (error) {
    console.error(error)
    sendError(res, error)
  }
}
