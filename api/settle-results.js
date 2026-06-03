import { requestedDateKey, settleResults } from '../lib/clvSettlementAutomation.js'

function parseBody(req) {
  if (!req.body) return {}
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}')
  return req.body
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET' && req.query?.confirm !== 'SETTLE') {
      const date = requestedDateKey(req.query?.date)
      res.status(200).json({
        success: true,
        endpoint: 'settle-results',
        message: 'Add ?confirm=SETTLE to settle Master Picks with Result filled, or POST JSON { "date": "YYYY-MM-DD" }.',
        defaultDateTimezone: 'America/New_York',
        date,
        confirmUrl: `/api/settle-results?date=${date}&confirm=SETTLE`,
        updates: ['Profit/Loss', 'ROI if accepted by Airtable', 'Settled At if accepted by Airtable'],
        note: 'This endpoint writes numeric Profit/Loss values and does not change Airtable field types.'
      })
      return
    }

    if (!['GET', 'POST'].includes(req.method)) {
      res.status(405).json({ success: false, error: 'Use GET or POST.' })
      return
    }

    const body = req.method === 'POST' ? parseBody(req) : {}
    const result = await settleResults({
      date: body.date || req.query?.date
    })
    res.status(200).json(result)
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error.message || String(error) })
  }
}
