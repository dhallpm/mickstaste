import { buildWebsiteFeed } from '../lib/buildWebsiteFeed.js'
import { sendError } from '../lib/syncAuth.js'

export default async function handler(req, res) {
  try {
    const result = await buildWebsiteFeed({ date: req.query?.date })

    res.status(200).json({
      success: true,
      sourceOfTruth: 'Airtable',
      date: result.date,
      free: result.free,
      vip: result.vip,
      props: result.props,
      lottoParlays: result.lottoParlays,
      longshots: result.longshots
    })
  } catch (error) {
    console.error(error)
    sendError(res, error)
  }
}
