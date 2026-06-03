import { recalculateClv, requestedDateKey } from '../lib/clvSettlementAutomation.js'

function parseBody(req) {
  if (!req.body) return {}
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}')
  return req.body
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET' && req.query?.confirm !== 'CLV') {
      const date = requestedDateKey(req.query?.date)
      res.status(200).json({
        success: true,
        endpoint: 'recalculate-clv',
        message: 'Add ?confirm=CLV to recalculate CLV fields for Master Picks, or POST JSON { "date": "YYYY-MM-DD" }.',
        defaultDateTimezone: 'America/New_York',
        date,
        confirmUrl: `/api/recalculate-clv?date=${date}&confirm=CLV`,
        updates: ['Closing Line Value', 'CLV%', 'CLV Result'],
        note: 'This endpoint patches fields only; it does not change Airtable field types.'
      })
      return
    }

    if (!['GET', 'POST'].includes(req.method)) {
      res.status(405).json({ success: false, error: 'Use GET or POST.' })
      return
    }

    const body = req.method === 'POST' ? parseBody(req) : {}
    const result = await recalculateClv({
      date: body.date || req.query?.date
    })
    res.status(200).json(result)
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error.message || String(error) })
  }
}
