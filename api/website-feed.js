import { generateWebsiteFeed } from '../lib/websiteFeedGenerator.js'

export default async function handler(req, res) {
  try {
    const result = await generateWebsiteFeed({ date: req.query?.date })
    res.status(200).json({
      success: true,
      sourceOfTruth: 'Airtable',
      ...result,
      count: result.rows.length
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error?.message || 'Unknown error' })
  }
}
