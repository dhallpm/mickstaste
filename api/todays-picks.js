import { listTodayAirtablePicks, logSyncAction } from '../lib/airtableClient.js'

export default async function handler(req, res) {
  try {
    const date = req.query?.date ? new Date(req.query.date) : new Date()
    const picks = await listTodayAirtablePicks(date)

    await logSyncAction('Read todays picks', {
      source: 'Airtable',
      destination: 'API /api/todays-picks',
      count: picks.length,
      message: 'Returned today Airtable picks'
    })

    res.status(200).json({
      success: true,
      sourceOfTruth: 'Airtable',
      date: date.toISOString().slice(0, 10),
      count: picks.length,
      picks
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error?.message || 'Unknown error' })
  }
}
