import { buildWebsiteFeed } from '../lib/buildWebsiteFeed.js'
import { sendError } from '../lib/syncAuth.js'

export default async function handler(req, res) {
  try {
    const result = await buildWebsiteFeed({
      date: req.query?.date,
      league: req.query?.league
    })
    res.status(200).json({
      success: true,
      ...result,
      count: result.rows.length
    })
  } catch (error) {
    console.error(error)
    sendError(res, error)
  }
}
