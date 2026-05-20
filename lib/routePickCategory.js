function text(row, keys) {
  return keys.map(key => row?.[key]).filter(Boolean).join(' ')
}

function has(pattern, value) {
  return pattern.test(String(value || ''))
}

export function isClosedOrGraded(row = {}) {
  const status = text(row, ['Status', 'Pick Status', 'Display Status', 'Result', 'Grade'])
  return has(/\b(final|closed|graded|settled|archived|win|loss|lost|push|void|cancelled|canceled)\b/i, status)
}

export function isTruePlayerProp(row = {}) {
  const value = text(row, ['Category', 'Type', 'Market', 'Bet Type', 'Pick', 'Description'])
  if (has(/\b(parlay|lotto|longshot|long shot|same game|sgp|round robin|teaser)\b/i, value)) return false
  if (has(/\b(player prop|points|rebounds|assists|pra|threes|3s|hits|runs|rbis|strikeouts|saves|shots|goals)\b/i, value)) return true
  return Boolean(row.Player || row.Athlete || row['Player Name'])
}

export function isSafeLottoParlay(row = {}) {
  const value = text(row, ['Category', 'Type', 'Market', 'Bet Type', 'Pick', 'Description'])
  const legCount = Number(row.Legs || row['Leg Count'] || String(value).match(/\b([5-8])[- ]?leg/i)?.[1])
  return legCount >= 5 && legCount <= 8 && has(/\b(lotto|safe lotto|parlay)\b/i, value)
}

export function isLongshot(row = {}) {
  const value = text(row, ['Category', 'Type', 'Market', 'Bet Type', 'Pick', 'Description'])
  return has(/\b(longshot|long shot)\b/i, value)
}

export function routePickCategory(row = {}) {
  if (isSafeLottoParlay(row)) {
    return { activeTable: 'Lotto Parlays', archiveTable: 'Lotto Parlays Archive', websiteSection: 'lotto' }
  }

  if (isLongshot(row)) {
    return { activeTable: 'Longshots', archiveTable: 'Longshots History', websiteSection: 'longshots' }
  }

  if (isTruePlayerProp(row)) {
    return { activeTable: 'Props Lab', archiveTable: 'Props Results', websiteSection: 'props' }
  }

  return { activeTable: 'Active Picks', archiveTable: 'Results Archive', websiteSection: 'picks' }
}

export default routePickCategory
