function text(row, keys) {
  return keys.map(key => row?.[key]).filter(Boolean).join(' ')
}

function has(pattern, value) {
  return pattern.test(String(value || ''))
}

export function todayEasternKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

export function rowDateKey(row = {}) {
  const value = row.Date || row.date || row['Game Date'] || row.Timestamp
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
  return todayEasternKey(date)
}

export function isClosedOrGraded(row = {}) {
  const status = text(row, ['Status', 'Pick Status', 'Display Status', 'Result', 'Grade'])
  return has(/\b(final|closed|graded|settled|archived|win|loss|lost|push|void|cancelled|canceled)\b/i, status)
}

export function isActiveVisible(row = {}, now = new Date()) {
  const status = text(row, ['Status', 'Release Status', 'Display Status'])
  const result = text(row, ['Result', 'Outcome'])
  const archive = text(row, ['Archive Status'])
  const currentCard = row['Current Card'] === true || String(row['Current Card'] || '').toLowerCase() === 'true'
  const statusOk = !status || has(/\b(active|posted|released|open|pregame)\b/i, status)
  const resultOk = !result || has(/\b(pending)\b/i, result)
  const dateOk = currentCard || rowDateKey(row) === todayEasternKey(now)

  return dateOk &&
    statusOk &&
    resultOk &&
    !has(/\b(archived)\b/i, archive) &&
    !isClosedOrGraded(row)
}

export function isTruePlayerProp(row = {}) {
  const value = text(row, ['Category', 'Type', 'Market', 'Bet Type', 'Pick', 'Description'])
  if (has(/\b(parlay|lotto|longshot|long shot|same game|sgp|round robin|teaser)\b/i, value)) return false
  if (has(/\b(player prop|points|rebounds|assists|\bpra\b|\bpa\b|\bra\b|threes|3s|hits|runs|rbis|strikeouts|total bases|home run|saves|shots on goal|sog|goals|passing yards|rushing yards|receiving yards|steals|blocks)\b/i, value)) return true
  return Boolean(row.Player || row.Athlete || row['Player Name'])
}

export function isSafeLottoParlay(row = {}) {
  const value = text(row, ['Category', 'Type', 'Market', 'Bet Type', 'Pick', 'Description'])
  const legCount = Number(row.Legs || row['Leg Count'] || String(value).match(/\b([5-8])[- ]?leg/i)?.[1])
  return legCount >= 5 && legCount <= 8 && has(/\b(lotto|safe lotto|parlay)\b/i, value)
}

export function isParlayOrLotto(row = {}) {
  const value = text(row, ['Category', 'Type', 'Market', 'Bet Type', 'Pick', 'Description'])
  return has(/\b(parlay|same game|sgp|lotto|round robin|teaser)\b/i, value)
}

export function isLongshot(row = {}) {
  const value = text(row, ['Category', 'Type', 'Market', 'Bet Type', 'Pick', 'Description'])
  return has(/\b(longshot|long shot|ladder|plus-money|plus money)\b/i, value)
}

export function routePickCategory(row = {}) {
  if (isSafeLottoParlay(row) || isParlayOrLotto(row)) {
    return { activeTable: 'Lotto Parlays', archiveTable: 'Lotto Parlays Archive', websiteSection: 'lotto' }
  }

  if (isLongshot(row)) {
    return { activeTable: 'Longshots', archiveTable: 'Longshots History', websiteSection: 'longshots' }
  }

  if (isTruePlayerProp(row)) {
    return { activeTable: 'Props Lab', archiveTable: 'Props Results', websiteSection: 'props' }
  }

  return { activeTable: 'Master Picks', archiveTable: 'Results Archive', websiteSection: 'picks' }
}

export default routePickCategory
