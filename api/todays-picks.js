import { buildWebsiteFeed } from '../lib/buildWebsiteFeed.js'
import { sendError } from '../lib/syncAuth.js'

export default async function handler(req, res) {
  try {
    const result = await buildWebsiteFeed({
      date: req.query?.date,
      league: req.query?.league
    })
    if (result.warnings?.length) {
      console.warn('Today picks Airtable diagnostics:', result.warnings)
    }

    res.status(200).json({
      success: true,
      source: result.source,
      sourceOfTruth: result.sourceOfTruth,
      date: result.date,
      warnings: result.warnings || [],
      free: result.free,
      vip: result.vip,
      vipVault: result.vipVault,
      props: result.props,
      lottoParlays: result.lottoParlays,
      longshots: result.longshots
    })
  } catch (error) {
    console.error(error)
    sendError(res, error)
  }
}
