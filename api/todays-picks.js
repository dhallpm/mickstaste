const CARD_DATE = '2026-07-13'
const SETTLED = new Set(['graded','settled','final','completed','complete','win','won','loss','lost','push','void','voided','cancelled','canceled'])
const norm = value => String(value || '').trim().toLowerCase()

function easternCardDate(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false
  }).formatToParts(now).filter(part => part.type !== 'literal').map(part => [part.type, part.value]))

  const current = `${parts.year}-${parts.month}-${parts.day}`
  if (Number(parts.hour) >= 2) return current

  const prior = new Date(`${current}T12:00:00Z`)
  prior.setUTCDate(prior.getUTCDate() - 1)
  return prior.toISOString().slice(0, 10)
}

function active(row) {
  const status = norm(row.Status || row.status || row['Release Status'])
  const result = norm(row.Result || row.result || row.Outcome || row.outcome)
  return !SETTLED.has(status) && !SETTLED.has(result) && norm(row['Official Bet'] || row.officialBet) !== 'no'
}

function imported(row, section, access = 'Free') {
  const matchup = row.Matchup || row.Game || ''
  const pick = row.Pick || ''
  const sport = row.Sport || row.League || ''
  const line = row.Line || row.Odds || ''

  return {
    ...row,
    Date: CARD_DATE,
    date: CARD_DATE,
    Section: section,
    section,
    Access: access,
    access: access.toLowerCase(),
    Sport: sport,
    sport,
    League: sport,
    league: sport,
    Matchup: matchup,
    matchup,
    Game: matchup,
    game: matchup,
    Pick: pick,
    pick,
    Line: line,
    line,
    Odds: line,
    odds: line,
    Grade: row.Grade,
    grade: row.Grade,
    Units: Number(row.Units || 0),
    units: Number(row.Units || 0),
    Status: row.Status || 'Pending',
    status: row.Status || 'Pending',
    Writeup: row.Writeup || '',
    writeup: row.Writeup || '',
    'Full Analysis': row['Full Analysis'] || '',
    fullAnalysis: row['Full Analysis'] || '',
    full: row['Full Analysis'] || '',
    'Best Number': row['Best Number'] || '',
    bestNumber: row['Best Number'] || '',
    best: row['Best Number'] || '',
    'No-Bet Cutoff': row['No-Bet Cutoff'] || '',
    noBetCutoff: row['No-Bet Cutoff'] || '',
    cutoff: row['No-Bet Cutoff'] || '',
    'Official Bet': row['Official Bet'] || row.officialBet || 'Yes',
    officialBet: row['Official Bet'] || row.officialBet || 'Yes'
  }
}

const rawVip = []
const rawFree = []
const rawProps = []
const rawLotto = []
const rawLongshots = []

export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')

  const validDate = easternCardDate() === CARD_DATE
  const vip = validDate ? rawVip.map(row => imported(row, 'VIP', 'VIP')).filter(active) : []
  const free = validDate ? rawFree.map(row => imported(row, 'Free Picks')).filter(active) : []
  const propsLab = validDate ? rawProps.map(row => imported(row, 'Props Lab')).filter(active) : []
  const lottoParlays = validDate ? rawLotto.map(row => imported(row, 'Lotto Parlays')).filter(active) : []
  const longshots = validDate ? rawLongshots.map(row => imported(row, 'Longshots')).filter(active) : []
  const publicRows = [...free, ...propsLab, ...lottoParlays, ...longshots]
  const allRows = [...vip, ...publicRows]
  const totalUnits = allRows.reduce((sum, row) => sum + Number(row.Units || 0), 0)

  res.status(200).json({
    ok: true,
    success: true,
    source: 'micks-picks-july-13-graded',
    date: CARD_DATE,
    expiresAt: '2026-07-14T02:00:00-04:00',
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
    totalUnits: Number(totalUnits.toFixed(2)),
    message: 'No active picks. The July 13 card has been graded and archived to Results.'
  })
}
