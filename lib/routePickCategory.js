function text(row, keys) {
  return keys.map(key => row?.[key]).filter(Boolean).join(' ')
}

function has(pattern, value) {
  return pattern.test(String(value || ''))
}

function isGradeOnly(value = '') {
  return /^\s*(?:[ABCDF][+-]?|pass)\s*$/i.test(String(value || ''))
}

function isTable(row = {}, pattern) {
  return pattern.test(String(row.__table || row.Table || row.Source || ''))
}

export function normalizePickCategory(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\blottery\b/g, 'lotto')
}

function categoryText(row = {}) {
  return normalizePickCategory(text(row, ['__table', 'Parlay Type', 'Category', 'Type', 'Market', 'Bet Type', 'Prop Type', 'Pick', 'Description']))
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
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value).trim())) return String(value).trim()
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
  const statusOnly = text(row, ['Status', 'Display Status'])
  const result = text(row, ['Result', 'Outcome'])
  const archive = text(row, ['Archive Status'])
  const release = text(row, ['Release Status', 'Display Release Status'])
  const currentCard = row['Current Card'] === true || String(row['Current Card'] || '').toLowerCase() === 'true'
  const route = routePickCategory(row).websiteSection
  const lottoStatusHasGrade = isGradeOnly(statusOnly) && route === 'lotto'
  const statusOk = !status ||
    has(/\b(active|posted|released|open|pregame|pending|conditional|watchlist|waitlist|lean only|lean|monitor|manual approved|api pending|official)\b/i, status) ||
    lottoStatusHasGrade
  const releaseOk = !release || !has(/\b(held|draft)\b/i, release)
  const resultOk = !result || has(/\b(pending|watchlist|waitlist|lean|conditional)\b/i, result)
  const hasDate = Boolean(row.Date || row.date || row['Game Date'] || row.Timestamp)
  const dateOk = currentCard || !hasDate || rowDateKey(row) === todayEasternKey(now)

  return dateOk &&
    statusOk &&
    releaseOk &&
    resultOk &&
    !has(/\b(archived)\b/i, archive) &&
    !isClosedOrGraded(row)
}

export function isTruePlayerProp(row = {}) {
  if (isTable(row, /\bprops?\s*(lab|results?)\b/i)) return true
  const value = text(row, ['__table', 'Category', 'Type', 'Market', 'Bet Type', 'Prop Type', 'Player', 'Athlete', 'Player Name', 'Pick', 'Description'])
  if (has(/\b(parlay|lotto|longshot|long shot|same game|sgp|round robin|teaser)\b/i, value)) return false
  if (has(/\b(player prop|prop|points|rebounds|assists|\bpra\b|\bpa\b|\bra\b|threes|3s|hits|runs|rbis|strikeouts|total bases|home run|saves|shots on goal|sog|goals|passing yards|rushing yards|receiving yards|steals|blocks)\b/i, value)) return true
  return Boolean(row.Player || row.Athlete || row['Player Name'] || row['Prop Type'])
}

export function isSafeLottoParlay(row = {}) {
  const value = categoryText(row)
  const legCount = Number(row['Leg Count'] || String(value).match(/\b([5-8])[- ]?leg/i)?.[1])
  return legCount >= 5 && legCount <= 8 && has(/\b(lotto|safe lotto|parlays?)\b/i, value)
}

export function isParlayOrLotto(row = {}) {
  const value = categoryText(row)
  return has(/\b(parlays?|same game|sgp|lotto|round robin|teaser)\b/i, value)
}

export function isLongshot(row = {}) {
  const value = text(row, ['Category', 'Type', 'Market', 'Bet Type', 'Pick', 'Description'])
  return has(/\b(longshot|long shot|ladder|plus-money|plus money)\b/i, value)
}

export function routePickCategory(row = {}) {
  const configuredLottoProps = process.env.AIRTABLE_LOTTO_PROPS_TABLE_ID || process.env.AIRTABLE_LOTTO_PROPS_TABLE
  if (configuredLottoProps && has(/\blotto props?\b/i, categoryText(row))) {
    return { activeTable: 'Lotto Props', archiveTable: 'Lotto Props Archive', websiteSection: 'lotto' }
  }

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
