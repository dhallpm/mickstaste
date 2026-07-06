function emptyPayload() {
  return {
    success: true,
    source: 'public-board-cleared-after-july-5-grading',
    sourceOfTruth: 'Micks Picks API override',
    date: '2026-07-06',
    warnings: [],
    free: [],
    vip: [],
    vipVault: [],
    props: [],
    propsLab: [],
    lottoParlays: [],
    lotto: [],
    parlays: [],
    longshots: [],
    activePicks: [],
    rows: [],
    records: [],
    picks: [],
    mainPicks: [],
    allRows: []
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  res.status(200).json(emptyPayload())
}
