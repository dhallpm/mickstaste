const SETTLED_VALUES = new Set([
  'graded', 'settled', 'final', 'completed', 'complete',
  'win', 'won', 'loss', 'lost', 'push', 'void', 'voided',
  'cancelled', 'canceled'
])

function normalized(value) {
  return String(value || '').trim().toLowerCase()
}

function isActivePick(row = {}) {
  const status = normalized(row.Status || row.status || row['Release Status'])
  const result = normalized(row.Result || row.result || row.Outcome || row.outcome)
  const official = normalized(row['Official Bet'] || row.officialBet)

  if (SETTLED_VALUES.has(status) || SETTLED_VALUES.has(result)) return false
  if (official === 'no') return false
  return true
}

// Only ungraded, currently released picks belong in these source arrays.
// Settled picks are retained exclusively in /api/results.
const rawVip = []
const rawFree = []
const rawPropsLab = []
const rawLottoParlays = []
const rawLongshots = []

const vip = rawVip.filter(isActivePick)
const free = rawFree.filter(isActivePick)
const propsLab = rawPropsLab.filter(isActivePick)
const lottoParlays = rawLottoParlays.filter(isActivePick)
const longshots = rawLongshots.filter(isActivePick)

const publicRows = [...free, ...propsLab, ...lottoParlays, ...longshots]
const allRows = [...vip, ...publicRows]
const straightAndPropsUnits = [...vip, ...free, ...propsLab]
  .reduce((sum, row) => sum + Number(row.Units || row.units || 0), 0)
const parlayUnits = lottoParlays
  .reduce((sum, row) => sum + Number(row.Units || row.units || 0), 0)
const totalUnits = straightAndPropsUnits + parlayUnits

export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')

  res.status(200).json({
    ok: true,
    success: true,
    source: 'micks-picks-active-card-auto-removal',
    date: null,
    vip,
    vipPicks: vip,
    vipVault: vip,
    free,
    freePicks: free,
    props: propsLab,
    propsLab,
    lottoParlays,
    lotto: lottoParlays,
    parlays: lottoParlays,
    longshots,
    mainPicks: [...vip, ...free],
    activePicks: allRows,
    rows: allRows,
    records: allRows,
    picks: allRows,
    allRows,
    publicRows,
    straightAndPropsUnits: Number(straightAndPropsUnits.toFixed(2)),
    parlayUnits: Number(parlayUnits.toFixed(2)),
    totalUnits: Number(totalUnits.toFixed(2)),
    message: 'No active picks. The previous card has been graded and moved to Results.'
  })
}
