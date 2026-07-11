const empty = []

export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  res.status(200).json({
    ok: true,
    success: true,
    source: 'active-card-cleared-after-july-10-grading',
    date: '2026-07-11',
    vip: empty,
    vipPicks: empty,
    vipVault: empty,
    free: empty,
    freePicks: empty,
    props: empty,
    propsLab: empty,
    lottoParlays: empty,
    lotto: empty,
    parlays: empty,
    longshots: empty,
    mainPicks: empty,
    activePicks: empty,
    rows: empty,
    records: empty,
    picks: empty,
    allRows: empty,
    publicRows: empty,
    message: 'July 10 card graded and archived.'
  })
}
