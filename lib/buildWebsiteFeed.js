import {
  googleSheetsSpreadsheetId,
  isGoogleSheetsSettledPickRow,
  listActiveGoogleSheetsPicksWithWarnings
} from './googleSheetsPickStore.js'
import { sanitizePublicWriteup } from './customerFacingAnalysis.js'
import { sanitizeCustomerFacingCopy, sanitizeCustomerFacingTitle } from './customerFacingTitle.js'
import { isActiveVisible, routePickCategory, rowDateKey, todayEasternKey } from './routePickCategory.js'
import { buildRecordKey, withRecordKey } from './recordKey.js'

function firstText(...values) {
  return values.map(value => String(value ?? '').trim()).find(Boolean) || ''
}

function normalized(value = '') {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
}

function access(row = {}) {
  return normalized(firstText(row.access, row.Access, row.Tier, row['Access Tier']))
}

function isVipAccess(row = {}) {
  const value = access(row)
  return value.includes('vip') || value.includes('premium') || row.section === 'vip'
}

function newestTimestamp(row = {}) {
  const parsed = Date.parse(firstText(row.updatedAt, row['Updated At'], row.Timestamp, row.date, row.Date))
  return Number.isNaN(parsed) ? 0 : parsed
}

function newestFirst(a, b) {
  return newestTimestamp(b) - newestTimestamp(a) || String(b.date || '').localeCompare(String(a.date || ''))
}

function statusText(row = {}) {
  return normalized(firstText(row.Status, row.status, row['Display Status'], row['Release Status'], row.releaseStatus))
}

function resultText(row = {}) {
  return normalized(firstText(row.Result, row.Outcome, row.result, row.outcome))
}

function releaseText(row = {}) {
  return normalized(firstText(row['Release Status'], row.releaseStatus, row['Display Release Status']))
}

function isFinalOrPass(row = {}) {
  return /\b(win|won|loss|lost|push|void|settled|graded|closed|cancelled|canceled|pass)\b/i.test([
    row.Status,
    row['Display Status'],
    row.Result,
    row.Outcome,
    row.Grade
  ].join(' '))
}

function isNoBetOrHeld(row = {}) {
  const value = statusText(row)
  return /\b(no bet|do not bet|no release|not released|draft|held|archived|duplicate)\b/i.test(value)
}

function sourceVipReady(row = {}) {
  if (!/\b(vip|premium)\b/i.test(firstText(row.Access, row.access, row.Tier, row['Access Tier']))) return true
  const release = releaseText(row)
  const status = statusText(row)
  return release === 'vip released' && /^(pending|released|active|vip released)$/i.test(status || 'active')
}

function tableName(row = {}) {
  return normalized(row.__table || row.Table || '')
}

function isPropsTable(row = {}) {
  return /props? lab|props? results?/.test(tableName(row))
}

function isLottoTable(row = {}) {
  return /lotto|lottery|parlays?/.test(tableName(row))
}

function americanOdds(value) {
  const odds = firstText(value)
  return /^\d+$/.test(odds) && Number(odds) > 0 ? `+${odds}` : odds
}

function noBetCutoffValue(row = {}) {
  return firstText(row['No-Bet Cutoff'], row['No Bet Cutoff'], row.Cutoff, row.noBetCutoff)
}

function derivePick(row = {}) {
  return sanitizeCustomerFacingTitle(firstText(row.Pick, row.Selection, row.pick, row['Card Title'], row.Name, row.Title, row.Player, row.League, row.Sport))
}

function analysisPreview(row = {}) {
  return firstText(row.writeup, row.description, row.cardTitle, row.pick ? `${row.pick} is live on the card.` : '')
}

function homePreview(row = {}) {
  const preview = analysisPreview(row).replace(/\s+/g, ' ').trim()
  if (preview.length <= 280) return preview
  const clipped = preview.slice(0, 277)
  const boundary = clipped.lastIndexOf(' ')
  return `${clipped.slice(0, boundary >= 220 ? boundary : 277).trim()}...`
}

function publicCard(row = {}) {
  return {
    ...row,
    access: row.access || 'Free',
    homePreview: homePreview(row),
    analysisPreview: analysisPreview(row),
    fullAnalysis: 'VIP Only',
    fullAnalysisLocked: true,
    analysisQualityStatus: 'VIP Only',
    analysisQualityIssues: []
  }
}

function vipCard(row = {}) {
  return {
    ...row,
    fullAnalysisLocked: false
  }
}

export function isPublicOddsRow(row = {}) {
  const rowAccess = access(row)
  const grade = firstText(row.grade, row.Grade, row['Card Grade']).toUpperCase()
  return !rowAccess.includes('vip') && !rowAccess.includes('premium') && grade !== 'A' && grade !== 'A+'
}

export function cleanWebsiteRow(row = {}) {
  const keyed = withRecordKey(row)
  const route = routePickCategory(keyed)
  const pick = derivePick(keyed)
  const cardTitle = sanitizeCustomerFacingTitle(firstText(keyed['Card Title'], pick, keyed.Name, keyed.Title, keyed.League, keyed.Sport))
  const customerFacing = { ...keyed, Pick: pick, 'Card Title': cardTitle }

  return {
    id: keyed.airtableRecordId || keyed.id || '',
    recordKey: firstText(keyed['Record Key'], keyed.recordKey, buildRecordKey(customerFacing)),
    source: keyed.source || 'Google Sheets',
    section: route.websiteSection,
    date: rowDateKey(keyed),
    updatedAt: firstText(keyed['Last Modified'], keyed['Updated At'], keyed.Timestamp),
    league: firstText(keyed.League, keyed.Sport, keyed.league),
    game: firstText(keyed.Game, keyed.Matchup, keyed.game, isLottoTable(keyed) ? firstText(keyed['Parlay Type'], cardTitle, pick, keyed.Legs) : ''),
    pick,
    betType: firstText(keyed['Bet Type'], keyed.Type, keyed.Market, keyed.Prop, isLottoTable(keyed) ? 'Parlay' : (isPropsTable(keyed) ? 'Player Prop' : '')),
    category: firstText(keyed.Category, keyed.Type, keyed['Parlay Type']),
    market: firstText(keyed.Market, keyed['Bet Type'], keyed.Type, keyed.Prop),
    betLine: firstText(keyed.Pick, keyed.Prop, keyed.Market, keyed['Bet Type'], keyed.Legs),
    prop: firstText(keyed.Prop, keyed['Prop Type'], keyed.Market),
    player: firstText(keyed.Player, keyed.Athlete, keyed['Player Name']),
    odds: americanOdds(firstText(keyed.Odds, keyed.Price, keyed['American Odds'], keyed['Best Odds'])),
    impliedProbability: firstText(keyed['Implied Probability'], keyed.impliedProbability),
    evEdge: firstText(keyed['EV Edge'], keyed.evEdge),
    trueProbability: firstText(keyed['True Probability'], keyed['Model Probability'], keyed.trueProbability, keyed.modelProbability),
    grade: firstText(keyed['Card Grade'], keyed.Grade, keyed.grade),
    units: keyed.Units ?? keyed['Units to Commit'] ?? '',
    bestNumber: firstText(keyed['Best Number'], keyed.Line, keyed.Number),
    noBetCutoff: noBetCutoffValue(keyed),
    status: firstText(keyed.Status, keyed['Release Status'], keyed['Display Status']),
    officialBet: firstText(keyed['Official Bet'], keyed.officialBet),
    releaseStatus: firstText(keyed['Release Status'], keyed['Display Release Status']),
    access: firstText(keyed.Access, keyed.Tier, keyed['Access Tier'], 'Free'),
    featured: firstText(keyed.Featured, keyed['Featured?']),
    cardTitle,
    lineNumber: firstText(keyed['Line / Number'], keyed.Line, keyed.Number),
    sportsbook: firstText(keyed.Sportsbook, keyed.Book, keyed['Card Sportsbook']),
    parlayType: firstText(keyed['Parlay Type'], isLottoTable(keyed) ? 'Lotto Parlay' : ''),
    legCount: keyed['Leg Count'] ?? '',
    legs: firstText(keyed.Legs, pick),
    writeup: sanitizeCustomerFacingCopy(sanitizePublicWriteup(customerFacing)),
    shortTake: sanitizeCustomerFacingCopy(firstText(keyed['Short Take'], keyed.shortTake)),
    whyThisPlay: sanitizeCustomerFacingCopy(firstText(keyed['Why This Play'], keyed.whyThisPlay, keyed.Writeup, keyed.writeup)),
    matchupEdge: sanitizeCustomerFacingCopy(firstText(keyed['Matchup Edge'], keyed.matchupEdge)),
    projectionEdge: sanitizeCustomerFacingCopy(firstText(keyed['Projection Edge'], keyed.projectionEdge, keyed['Projected Edge'])),
    keyMetrics: sanitizeCustomerFacingCopy(firstText(keyed['Key Metrics'], keyed.keyMetrics, keyed['Full Analysis'])),
    analysis: sanitizeCustomerFacingCopy(firstText(keyed.Analysis, keyed.analysis)),
    notes: sanitizeCustomerFacingCopy(firstText(keyed.Notes, keyed.notes)),
    risk: sanitizeCustomerFacingCopy(firstText(keyed.Risk, keyed.risk, keyed['Risk Tier'])),
    finalTake: sanitizeCustomerFacingCopy(firstText(keyed['Final Take'], keyed.finalTake)),
    marketNotes: firstText(keyed['Market Notes']),
    injuryNotes: firstText(keyed['Injury Notes']),
    sourceVerification: firstText(keyed['Source Verification'], 'Manual sportsbook/source confirmation required before final release'),
    fullAnalysis: sanitizeCustomerFacingCopy(firstText(keyed['Full Analysis'], keyed.fullAnalysis)),
    description: sanitizeCustomerFacingCopy(sanitizePublicWriteup(customerFacing)),
    originalTable: keyed.__table || ''
  }
}

function requestedDate(options = {}) {
  const raw = firstText(options.date)
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { key: raw, date: new Date(`${raw}T12:00:00Z`) }
  const now = raw && !Number.isNaN(Date.parse(raw)) ? new Date(raw) : new Date()
  const key = rowDateKey({ Date: now })
  return { key, date: now }
}

function requestedLeague(options = {}) {
  const raw = Array.isArray(options.league) ? options.league[0] : options.league
  const value = firstText(raw).toUpperCase()
  return ['NBA', 'WNBA', 'MLB', 'NFL', 'NHL', 'UFC'].includes(value) ? value : ''
}

function leagueCode(row = {}) {
  const value = firstText(row.league, row.League, row.sport, row.Sport).toUpperCase()
  return ['NBA', 'WNBA', 'MLB', 'NFL', 'NHL', 'UFC'].find(code => value.includes(code)) || ''
}

function leagueMatches(row = {}, requested = '') {
  return !requested || leagueCode(row) === requested
}

async function getSourceRows() {
  const warnings = []
  try {
    const activeResult = await listActiveGoogleSheetsPicksWithWarnings()
    warnings.push(...(activeResult.warnings || []))
    return { source: 'google-sheets', sourceOfTruth: 'Google Sheets', spreadsheetId: activeResult.spreadsheetId, warnings, rows: activeResult.rows || [] }
  } catch (error) {
    warnings.push(`Google Sheets read failed; live website feed failed closed. ${error.message}`)
    return { source: 'google-sheets', sourceOfTruth: 'Google Sheets', spreadsheetId: googleSheetsSpreadsheetId(), warnings, rows: [] }
  }
}

function isActiveTable(row = {}) {
  return /props? lab|lotto parlays?|longshots?/.test(tableName(row))
}

function activeTableFallbackVisible(row = {}, targetDate = new Date()) {
  const hasDate = Boolean(row.Date || row.date || row['Game Date'] || row.Timestamp)
  const dateOk = !hasDate || rowDateKey(row) === todayEasternKey(targetDate)
  return isActiveTable(row) && dateOk && !isFinalOrPass(row)
}

export function sourceRowVisible(row = {}, targetDate = new Date()) {
  if (isGoogleSheetsSettledPickRow(row)) return false
  if (isFinalOrPass(row) || isNoBetOrHeld(row)) return false
  if (!sourceVipReady(row)) return false
  const result = resultText(row)
  if (result && !/\b(pending|watchlist|waitlist|lean|conditional|open|active)\b/i.test(result)) return false
  return isActiveVisible(row, targetDate) || activeTableFallbackVisible(row, targetDate)
}

function identityKey(value = '') {
  return normalized(value)
}

function fallbackPickKey(row = {}) {
  return [row.date, row.game, row.pick].map(identityKey).filter(Boolean).join('|')
}

export function dedupeWebsiteRows(rows = []) {
  const seen = new Set()
  const sorted = [...rows].sort(newestFirst)
  const picked = []
  for (const row of sorted) {
    const keys = [identityKey(row.recordKey), fallbackPickKey(row)].filter(Boolean)
    if (keys.some(key => seen.has(key))) continue
    picked.push(row)
    keys.forEach(key => seen.add(key))
  }
  return picked.sort(newestFirst)
}

export function categorizeWebsiteRows(rows = []) {
  return rows.reduce((groups, row) => {
    if (row.section === 'props') groups.props.push(publicCard(row))
    else if (row.section === 'lotto') groups.lottoParlays.push(publicCard(row))
    else if (row.section === 'longshots') groups.longshots.push(publicCard(row))
    else if (row.section === 'vip' || isVipAccess(row)) {
      const card = vipCard(row)
      groups.vip.push(card)
      groups.vipVault.push(card)
    } else {
      groups.free.push(publicCard(row))
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
  const deduped = dedupeWebsiteRows(rows)
  const categorized = categorizeWebsiteRows(deduped)
  const feedRows = deduped.map(row => isVipAccess(row) ? vipCard(row) : publicCard(row))

  return {
    source: sourceResult.source,
    sourceOfTruth: sourceResult.sourceOfTruth,
    spreadsheetId: sourceResult.spreadsheetId || googleSheetsSpreadsheetId(),
    date: target.key,
    league: league || undefined,
    warnings: sourceResult.warnings || [],
    rows: feedRows,
    ...categorized
  }
}

export default buildWebsiteFeed
