import { archiveClosedBets } from '../lib/archiveClosedBets.js'
import { assertSyncAuthorized, sendError } from '../lib/syncAuth.js'

export default async function handler(req, res) {
  try {
    assertSyncAuthorized(req)
    const result = await archiveClosedBets({ dryRun: req.query?.dryRun === '1' })
    res.status(200).json({ success: true, result })
  } catch (error) {
    console.error(error)
    sendError(res, error)
  }
}
