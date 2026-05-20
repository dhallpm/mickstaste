function clean(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
}

export function buildRecordKey(row = {}) {
  return [
    row.Date || row.date || row['Game Date'] || '',
    row.League || row.league || row.Sport || '',
    row.Game || row.game || row.Matchup || '',
    row.Pick || row.pick || row.Selection || '',
    row['Bet Type'] || row.BetType || row.Type || row.Market || '',
    row.Access || row.Tier || row['Access Tier'] || '',
    row.Odds ?? row.odds ?? ''
  ].map(clean).join('|').toLowerCase()
}

export function withRecordKey(row = {}) {
  return {
    ...row,
    'Record Key': row['Record Key'] || buildRecordKey(row)
  }
}
