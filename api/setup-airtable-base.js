import { setupAirtableBase } from '../lib/airtableSetup.js'
import { assertSyncAuthorized, sendError } from '../lib/syncAuth.js'

export default async function handler(req, res) {
  try {
    assertSyncAuthorized(req)
    const dryRun = req.query?.dryRun === '1' || req.query?.dryRun === 'true'
    const result = await setupAirtableBase({ dryRun })
    res.status(200).json(result)
  } catch (error) {
    console.error(error)
    sendError(res, error)
  }
}
