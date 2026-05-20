import { runMicksSync } from '../lib/micksSyncAutomation.js'
import { assertSyncAuthorized, sendError } from '../lib/syncAuth.js'

export default async function handler(req, res) {
  try {
    assertSyncAuthorized(req)
    const result = await runMicksSync({
      dryRun: req.query?.dryRun === '1',
      backfill: req.query?.backfill === '1' || req.body?.backfill === true
    })
    res.status(200).json(result)
  } catch (error) {
    console.error(error)
    sendError(res, error)
  }
}
