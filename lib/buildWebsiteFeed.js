import { listActiveAirtablePicksWithWarnings, logSyncAction } from './airtableClient.js'
import { sanitizeCustomerFacingAnalysis, sanitizePublicWriteup } from './customerFacingAnalysis.js'
import { sanitizeCustomerFacingCopy, sanitizeCustomerFacingTitle } from './customerFacingTitle.js'
import { isActiveVisible, routePickCategory, rowDateKey, todayEasternKey } from './routePickCategory.js'
import { buildRecordKey, withRecordKey } from './recordKey.js'

function newestFirst(a, b) {
  return String(b.date || '').localeCompare(String(a.date || '')) ||
    String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
}

function access(row = {}) {
  return String(row.access || row.Access || row.Tier || row['Access Tier'] || '').toLowerCase()
}

function firstText(...values) {
  return values
    .map(value => String(value ?? '').trim())
    .find(Boolean) || ''
}

function sourceVerification(value) {
  const text = String(value ?? '').trim()
  return !text || /^(?:false|true)$/i.test(text)
    ? 'Manual sportsbook/source confirmation required before final release'
    : text
}

function americanOdds(value) {
  const odds = String(value ?? '').trim()
  return /^\d+$/.test(odds) && Number(odds) > 0 ? `+${odds}` : odds
}

function isVipAccess(row = {}) {
  const value = access(row)
  return value.includes('vip') || value.includes('premium')
}

function pickOfDay(row = {}) {
  const value = [
    row.category,
    row.Category,
    row.cardTitle,
    row['Card Title'],
    row.Featured,
    row.featured,
    row.Tag,
    row.tag
  ].filter(Boolean).join(' ').toLowerCase()
  return /\b(pick of the day|pick of day|pod|free play|public pick)\b/.test(value)
}

function analysisPreview(row = {}) {
  return row.writeup ||
    row.description ||
    row.cardTitle ||
    (row.pick ? `${row.pick} is live on the public card.` : 'No picks released yet.')
}

function homePreview(row = {}) {
  const preview = String(analysisPreview(row) || '').replace(/\s+/g, ' ').trim()
  if (preview.length <= 280) return preview

  const clipped = preview.slice(0, 277)
  const boundary = clipped.lastIndexOf(' ')
  return `${clipped.slice(0, boundary >= 220 ? boundary : 277).trim()}...`
}

function publicCard(row = {}) {
  const next = {
    ...row,
    homePreview: homePreview(row),
    analysisPreview: analysisPreview(row),
    fullAnalysisLocked: true
  }
  delete next.fullAnalysis
  return next
}

function vipCard(row = {}) {
  return {
    ...row,
    fullAnalysisLocked: false
  }
}

function tableName(row = {}) {
  return String(row.__table || row.Table || '').toLowerCase()
}

function isPropsTable(row = {}) {
  return /props? lab|props? results?/.test(tableName(row))
}

function isLottoTable(row = {}) {
  return /lotto|lottery|parlays?/.test(tableName(row))
}

function deriveSparseTitle(row = {}, route = {}) {
  const section = route.websiteSection
  if (section === 'props' || isPropsTable(row)) {
    const player = firstText(row.Player, row.Athlete, row['Player Name'])
    const prop = firstText(row.Prop, row.Market, row['Bet Type'], row.Type)
    return firstText(
      row.Pick,
      row.Selection,
      row['Card Title'],
      row.Name,
      row.Title,
      player && prop ? `${player} ${prop}` : '',
      player,
      row.Game,
      row.League
    )
  }

  if (section === 'lotto' || isLottoTable(row)) {
    return firstText(
      row.Pick,
      row.Selection,
      row['Card Title'],
      row.Name,
      row.Title,
      row['Parlay Type'],
      row['Parlay Name'],
      row.Legs,
      row.Game,
      row.League,
      row.Sport,
      'Lotto Parlay'
    )
  }

  return firstText(row.Pick, row.Selection, row.pick, row['Card Title'], row.Name, row.Title, row.Game, row.League)
}

export function cleanWebsiteRow(row = {}) {
  const keyed = withRecordKey(row)
  const route = routePickCategory(keyed)
  const isLotto = route.websiteSection === 'lotto'
  const rawPick = deriveSparseTitle(keyed, route)
  const pick = sanitizeCustomerFacingTitle(rawPick)
  const cardTitle = sanitizeCustomerFacingTitle(firstText(keyed['Card Title'], pick, keyed.Selection, keyed.Name, keyed.Title, keyed.Player, keyed.League, keyed.Sport))
  const customerFacing = {
    ...keyed,
    Pick: pick,
    'Card Title': cardTitle,
    'Source Verification': sourceVerification(keyed['Source Verification'])
  }
  return {
    id: keyed.airtableRecordId || keyed.id || '',
    recordKey: buildRecordKey(customerFacing),
    source: keyed.source || 'Airtable',
    section: route.websiteSection,
    date: rowDateKey(keyed),
    updatedAt: keyed['Last Modified'] || keyed['Updated At'] || keyed.Timestamp || '',
    league: keyed.League || keyed.Sport || keyed.league || '',
    game: keyed.Game || keyed.Matchup || keyed.game || (isLotto ? firstText(keyed['Parlay Type'], cardTitle, pick, keyed.Legs, keyed.League) : ''),
    pick,
    betType: keyed['Bet Type'] || keyed.Type || keyed.Market || (isLotto ? 'Parlay' : (isPropsTable(keyed) ? 'Player Prop' : '')),
    category: keyed.Category || keyed.Type || keyed['Parlay Type'] || '',
    market: keyed.Market || keyed['Bet Type'] || keyed.Type || keyed.Prop || '',
    odds: americanOdds(keyed.Odds),
    grade: firstText(keyed['Card Grade'], keyed.Grade, keyed.grade),
    units: keyed.Units ?? keyed['Units to Commit'] ?? '',
    bestNumber: keyed['Best Number'] || keyed.Line || keyed.Number || '',
    noBetCutoff: keyed['No Bet Cutoff'] || '',
    status: keyed.Status || keyed['Release Status'] || keyed['Display Status'] || '',
    releaseStatus: keyed['Release Status'] ||
      keyed['Display Release Status'] ||
      (isLotto && /^active$/i.test(String(keyed.Status || '').trim()) && firstText(keyed.Sportsbook, keyed.Book)
        ? 'Released'
        : ''),
    access: keyed.Access || keyed.Tier || keyed['Access Tier'] || 'Free',
    featured: keyed.Featured || keyed['Featured?'] || '',
    cardTitle,
    lineNumber: keyed['Line / Number'] || keyed.Line || keyed.Number || '',
    sportsbook: keyed.Sportsbook || keyed.Book || keyed['Card Sportsbook'] || '',
    parlayType: keyed['Parlay Type'] || (isLotto ? 'Lotto Parlay' : ''),
    legCount: keyed['Leg Count'] ?? '',
    legs: keyed.Legs || pick,
    writeup: sanitizeCustomerFacingCopy(sanitizePublicWriteup(customerFacing)),
    marketNotes: keyed['Market Notes'] || '',
    injuryNotes: keyed['Injury Notes'] || '',
    sourceVerification: sourceVerification(keyed['Source Verification']),
    fullAnalysis: sanitizeCustomerFacingCopy(sanitizeCustomerFacingAnalysis(customerFacing)),
    description: sanitizeCustomerFacingCopy(sanitizePublicWriteup(customerFacing)),
    originalTable: keyed.__table || ''
  }
}

function sourceLabel() {
  return 'Airtable'
}

function requestedDate(options = {}) {
  const raw = String(options.date || '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return {
      key: raw,
      date: new Date(`${raw}T12:00:00Z`)
    }
  }

  if (raw) {
    const parsed = new Date(raw)
    if (!Number.isNaN(parsed.getTime())) {
      const key = rowDateKey({ Date: parsed })
      return {
        key,
        date: new Date(`${key}T12:00:00Z`)
      }
    }
  }

  const now = new Date()
  return {
    key: rowDateKey({ Date: now }),
    date: now
  }
}

function requestedLeague(options = {}) {
  const raw = Array.isArray(options.league) ? options.league[0] : options.league
  const value = String(raw || '').trim().toUpperCase()
  return ['NBA', 'WNBA', 'MLB', 'NFL', 'NHL', 'UFC'].includes(value) ? value : ''
}

function leagueCode(row = {}) {
  const league = String(row.league || row.League || '').trim().toUpperCase()
  const sport = String(row.sport || row.Sport || '').trim().toUpperCase()
  if (league === 'WNBA' || sport === 'WNBA') return 'WNBA'
  if (league === 'NBA' || sport === 'NBA') return 'NBA'
  if (league === 'MLB' || sport === 'MLB') return 'MLB'
  if (league === 'NFL' || sport === 'NFL') return 'NFL'
  if (league === 'NHL' || sport === 'NHL') return 'NHL'
  if (league === 'UFC' || sport === 'UFC') return 'UFC'
  return ''
}

function leagueMatches(row = {}, requested = '') {
  return !requested || leagueCode(row) === requested
}

async function getSourceRows() {
  const warnings = []

  try {
    const activeResult = await listActiveAirtablePicksWithWarnings()
    warnings.push(...(activeResult.warnings || []))
    if (activeResult.needsFallback) {
      warnings.push('Airtable setup incomplete; live website feed failed closed instead of using Google Sheets fallback.')
    }
    return {
      source: 'airtable',
      sourceOfTruth: sourceLabel(),
      warnings,
      rows: activeResult.rows || []
    }
  } catch (error) {
    warnings.push(`Airtable read failed; live website feed failed closed. ${error.message}`)
    return {
      source: 'airtable',
      sourceOfTruth: sourceLabel(),
      warnings,
      rows: []
    }
  }
}

function isFinalOrPass(row = {}) {
  const value = [row.Status, row['Display Status'], row.Result, row.Outcome, row.Grade].join(' ')
  return /\b(win|won|loss|lost|push|void|settled|graded|closed|cancelled|canceled|pass)\b/i.test(value)
}

function isActiveTable(row = {}) {
  const table = String(row.__table || '').toLowerCase()
  return /props? lab|lotto parlays?|longshots?/.test(table)
}

function activeTableFallbackVisible(row = {}, targetDate = new Date()) {
  const hasDate = Boolean(row.Date || row.date || row['Game Date'] || row.Timestamp)
  const dateOk = !hasDate || rowDateKey(row) === todayEasternKey(targetDate)
  return isActiveTable(row) && dateOk && !isFinalOrPass(row)
}

function sourceRowVisible(row = {}, targetDate = new Date()) {
  return isActiveVisible(row, targetDate) || activeTableFallbackVisible(row, targetDate)
}

function lottoExclusionWarning(sourceRows = [], websiteRows = [], targetDate = new Date()) {
  if (websiteRows.some(row => row.section === 'lotto')) return ''

  const lottoRows = sourceRows.filter(row => {
    const table = String(row.__table || '').toLowerCase()
    return /\b(lotto|lottery)\b/.test(table) ||
      row['Parlay Type'] !== undefined ||
      row['Leg Count'] !== undefined
  })
  if (!lottoRows.length) return ''

  const diagnostics = lottoRows.slice(0, 4).map(row => ({
    table: row.__table || '',
    date: rowDateKey(row),
    activeVisible: isActiveVisible(row, targetDate),
    fallbackVisible: activeTableFallbackVisible(row, targetDate),
    route: routePickCategory(row).websiteSection,
    hasParlayType: Boolean(firstText(row['Parlay Type'])),
    hasStatus: Boolean(firstText(row.Status, row['Display Status'])),
    hasReleaseStatus: Boolean(firstText(row['Release Status'], row['Display Release Status'])),
    hasResult: Boolean(firstText(row.Result, row.Outcome)),
    hasArchiveStatus: Boolean(firstText(row['Archive Status'])),
    hasOdds: row.Odds !== undefined && row.Odds !== null && String(row.Odds).trim() !== '',
    hasSportsbook: Boolean(firstText(row.Sportsbook, row.Book))
  }))

  return `Lotto Parlays fetched but excluded from website feed: ${JSON.stringify(diagnostics)}`
}

export function categorizeWebsiteRows(rows = []) {
  return rows.reduce((groups, row) => {
    if (row.section === 'props') groups.props.push(row)
    else if (row.section === 'lotto') groups.lottoParlays.push(row)
    else if (row.section === 'longshots') groups.longshots.push(row)
    else if (isVipAccess(row)) {
      const card = vipCard(row)
      groups.vip.push(card)
      groups.vipVault.push(card)
      if (pickOfDay(row)) groups.free.push(publicCard(row))
    }
    else {
      groups.free.push(publicCard(row))
      groups.vipVault.push(vipCard(row))
    }
    return groups
  }, { free: [], vip: [], vipVault: [], props: [], lottoParlays: [], longshots: [] })
}

export async function buildWebsiteFeed(options = {}) {
  const target = requestedDate(options)
  const league = requestedLeague(options)
  const sourceResult = await getSourceRows()
  const rows = sourceResult.rows
    .filter(row => sourceRowVisible(row, target.date))
    .map(cleanWebsiteRow)
    .map(row => ({ ...row, date: row.date || target.key }))
    .filter(row => leagueMatches(row, league))
    .filter(row => row.pick && row.date)
  const warnings = [...(sourceResult.warnings || [])]
  const lottoWarning = lottoExclusionWarning(sourceResult.rows, rows, target.date)
  if (lottoWarning) warnings.push(lottoWarning)

  const deduped = Array.from(new Map(rows.map(row => [row.recordKey, row])).values())
    .sort(newestFirst)
  const categorized = categorizeWebsiteRows(deduped)
  const feedRows = deduped.map(row => isVipAccess(row) ? vipCard(row) : publicCard(row))

  await logSyncAction('Generate website feed', {
    source: sourceResult.sourceOfTruth,
    destination: 'Website API',
    count: deduped.length,
    message: 'Generated clean non-stale website feed rows'
  })

  return {
    source: sourceResult.source,
    sourceOfTruth: sourceResult.sourceOfTruth,
    date: target.key,
    league: league || undefined,
    warnings,
    rows: feedRows,
    ...categorized
  }
}

export default buildWebsiteFeed
