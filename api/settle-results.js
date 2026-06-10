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
        message: 'Add ?confirm=SETTLE to settle records with final Result/Outcome fields or trusted source URLs, or POST JSON { "date": "YYYY-MM-DD" }.',
        defaultDateTimezone: 'America/New_York',
        date,
        confirmUrl: `/api/settle-results?date=${date}&confirm=SETTLE`,
        trustedSourcePriority: [
          'Official league/team box score',
          'Sports Reference / Baseball Reference / Basketball Reference / Hockey Reference',
          'ESPN / CBS Sports / FOX Sports / Yahoo Sports box score',
          'Approved secondary source'
        ],
        updates: ['Result', 'Outcome', 'Profit/Loss', 'ROI', 'Settled At', 'Settlement Source', 'Settlement Status', 'Settlement Notes'],
        note: 'The source router grades only verified box-score/stat evidence. Conflicts or recap-only evidence are marked Needs Review.'
      })
      return
    }

    if (!['GET', 'POST'].includes(req.method)) {
      res.status(405).json({ success: false, error: 'Use GET or POST.' })
      return
    }

    const body = req.method === 'POST' ? parseBody(req) : {}
    const result = await settleResults({
      date: body.date || req.query?.date,
      dryRun: body.dryRun === true || req.query?.dryRun === 'true'
    })
    res.status(200).json(result)
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error.message || String(error) })
  }
}
