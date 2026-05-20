import { syncSheetsToAirtableFallback } from '../lib/syncSheetsToAirtableFallback.js'
import { assertSyncAuthorized, sendError } from '../lib/syncAuth.js'

export default async function handler(req, res) {
  try {
    assertSyncAuthorized(req)
    const result = await syncSheetsToAirtableFallback({
      dryRun: req.query?.dryRun === '1',
      enableFallback: true
    })

    res.status(200).json({
      success: true,
      sourceOfTruth: 'Airtable',
      result
    })
  } catch (error) {
    console.error(error)
    sendError(res, error)
  }
}
