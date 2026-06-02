import { clearAirtablePicks } from '../lib/clearAirtablePicks.js'
import { assertSyncAuthorized, sendError } from '../lib/syncAuth.js'

function boolParam(value) {
  return value === true || ['1', 'true', 'yes'].includes(String(value || '').toLowerCase())
}

export default async function handler(req, res) {
  try {
    assertSyncAuthorized(req)
    const dryRun = req.query?.dryRun === undefined ? true : boolParam(req.query?.dryRun)
    const result = await clearAirtablePicks({
      dryRun,
      confirm: req.query?.confirm || req.body?.confirm || ''
    })
    res.status(result.success === false ? 400 : 200).json({
      action: 'clear-airtable-picks',
      ...result
    })
  } catch (error) {
    console.error(error)
    sendError(res, error)
  }
}
