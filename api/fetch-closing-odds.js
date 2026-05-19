import { runClosingOddsWorker } from '../lib/closingOddsWorker.js'

export default async function handler(req, res) {
  try {
    const result = await runClosingOddsWorker({
      dryRun: req.query?.dryRun === '1'
    })

    res.status(200).json({
      success: true,
      result
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      success: false,
      error: error?.message || 'Unknown error'
    })
  }
}
