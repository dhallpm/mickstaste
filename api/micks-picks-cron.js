import { runClosingOddsWorker } from '../lib/closingOddsWorker.js'
import { syncAirtableToSheets } from '../lib/syncAirtableToSheets.js'
import { archiveClosedBets } from '../lib/archiveClosedBets.js'
import { assertSyncAuthorized, sendError } from '../lib/syncAuth.js'

export default async function handler(req, res) {
  try {
    assertSyncAuthorized(req)
    const now = new Date()
    const closingOddsDue = now.getUTCHours() % 6 === 0

    const [airtableSync, archiveResult, closingOdds] = await Promise.all([
      syncAirtableToSheets({ dryRun: req.query?.dryRun === '1' }),
      archiveClosedBets({ dryRun: req.query?.dryRun === '1' }),
      closingOddsDue
        ? runClosingOddsWorker({ dryRun: req.query?.dryRun === '1' })
        : Promise.resolve({ skipped: true, reason: 'Closing odds worker runs every 6 UTC hours' })
    ])

    res.status(200).json({
      success: true,
      sourceOfTruth: 'Airtable',
      airtableSync,
      archiveResult,
      closingOdds
    })
  } catch (error) {
    console.error(error)
    sendError(res, error)
  }
}
