function todayET() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
}

function summary() {
  return { wins: 0, losses: 0, pushes: 0, voids: 0, unitsRisked: 0, profitLoss: 0, roi: 0 }
}

function payload(days = 180) {
  return {
    success: true,
    source: 'public-results-off',
    sourceOfTruth: 'public-results-off',
    spreadsheetId: '',
    loadedTabs: [],
    date: todayET(),
    days,
    warnings: ['Public results display is off.'],
    scanned: {},
    scannedRowCounts: {},
    resultRowCounts: {},
    resultCounts: { total: 0, byOutcome: {}, bySection: {}, byDate: {} },
    recentSettledRows: [],
    diagnostics: { publicResultsOff: true, resultCounts: { total: 0, byOutcome: {}, bySection: {}, byDate: {} } },
    summary: {
      overall: summary(),
      masterPicks: summary(),
      officialStraight: summary(),
      vip: summary(),
      propsLab: summary(),
      lottoParlays: summary(),
      longshots: summary()
    },
    byDate: {},
    records: [],
    rows: [],
    free: [],
    vip: [],
    props: [],
    lotto: [],
    longshots: [],
    counts: { records: 0, rows: 0, free: 0, vip: 0, props: 0, lotto: 0, longshots: 0 }
  }
}

export function shouldIncludeResultRecord() { return false }
export function normalizeRecord(record = {}) { return record }
export function normalizeRow(row = {}) { return row }
export function hasPositiveUnits() { return false }
export function buildResultsPayload(_source = {}, options = {}) {
  const days = Math.min(Math.max(Number(options.days || 180), 1), 3650)
  return payload(days)
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  const days = Math.min(Math.max(Number(req.query?.days || 180), 1), 3650)
  res.status(200).json(payload(days))
}
