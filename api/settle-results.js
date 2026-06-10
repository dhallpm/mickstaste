import { requestedDateKey, settleResults } from '../lib/clvSettlementAutomation.js'

function parseBody(req) {
  if (!req.body) return {}
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}')
  return req.body
}

function queryValue(value) {
  return Array.isArray(value) ? value[0] : value
}

function truthyFlag(value) {
  const raw = String(queryValue(value) ?? '').trim().toLowerCase()
  return raw === 'true' || raw === '1'
}

function parseSettleAll(req, body = {}) {
  return truthyFlag(req.query?.settleAll) ||
    truthyFlag(req.query?.all) ||
    truthyFlag(req.query?.forceSettle) ||
    body.settleAll === true ||
    body.settleAll === 1 ||
    truthyFlag(body.settleAll) ||
    truthyFlag(body.all) ||
    truthyFlag(body.forceSettle)
}

export default async function handler(req, res) {
  try {
    const helpSettleAll = parseSettleAll(req)
    if (req.method === 'GET' && queryValue(req.query?.confirm) !== 'SETTLE') {
      const date = requestedDateKey(queryValue(req.query?.date))
      res.status(200).json({
        success: true,
        endpoint: 'settle-results',
        message: 'Add ?confirm=SETTLE to settle records with final Result/Outcome fields or trusted source URLs, or POST JSON { "date": "YYYY-MM-DD" }.',
        defaultDateTimezone: 'America/New_York',
        date,
        settleAll: helpSettleAll,
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
    const settleAll = parseSettleAll(req, body)
    const result = await settleResults({
      date: body.date || queryValue(req.query?.date),
      dryRun: body.dryRun === true || truthyFlag(req.query?.dryRun),
      settleAll
    })
    res.status(200).json(result)
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error.message || String(error) })
  }
}
