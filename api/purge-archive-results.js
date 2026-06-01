import { purgeArchiveResults } from '../lib/purgeArchiveResults.js'
import { assertSyncAuthorized, sendError } from '../lib/syncAuth.js'

function boolParam(value) {
  return value === true || ['1', 'true', 'yes'].includes(String(value || '').toLowerCase())
}

export default async function handler(req, res) {
  try {
    assertSyncAuthorized(req)
    const dryRun = req.query?.dryRun === undefined ? true : boolParam(req.query?.dryRun)
    const result = await purgeArchiveResults({
      dryRun,
      confirm: req.query?.confirm || req.body?.confirm || ''
    })
    res.status(result.success === false ? 400 : 200).json({
      action: 'purge-archive-results',
      ...result
    })
  } catch (error) {
    console.error(error)
    sendError(res, error)
  }
}
