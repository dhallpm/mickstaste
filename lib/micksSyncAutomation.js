import { calculateProfitLossUnits } from './calculateProfitLossUnits.js'
import { sanitizeCustomerFacingAnalysis, sanitizePublicWriteup } from './customerFacingAnalysis.js'
import { sanitizeCustomerFacingCopy, sanitizeCustomerFacingTitle } from './customerFacingTitle.js'
import { getSheetRows } from './googleSheetsClient.js'
import { buildRecordKey, withRecordKey } from './recordKey.js'
import { isClosedOrGraded } from './routePickCategory.js'

const SOURCE_TABS = [
  'Active Picks',
  'Free Picks',
  'VIP Picks',
  'Props Lab',
  'Lotto Props',
  'Lotto Parlays',
  'Micks LongShots',
  'Longshots'
]

const HISTORICAL_TABS = ['Results Archive']


const SHEET_BY_TABLE = {
  'Master Picks': 'Active Picks',
  'Props Lab': 'Props Lab',
  'Lotto Parlays': 'Lotto Parlays',
  'Lotto Props': 'Lotto Props',
  Longshots: 'Micks LongShots',
  'Results Archive': 'Results Archive'
}

const FIELD_SETS = {
  'Master Picks': [
    'Record Key', 'Date', 'Posted Time', 'Sport', 'League', 'Game', 'Pick', 'Bet Type', 'Category', 'Access',
    'Odds', 'Sportsbook', 'Units', 'Grade', 'Confidence', 'EV Edge', 'Best Number', 'No Bet Cutoff', 'Status',
    'Release Status', 'Result', 'Profit/Loss', 'Closing Number', 'Verified Closing Number', 'Closing Source',
    'CLV', 'Market Notes', 'Injury Notes', 'Writeup', 'Short Take', 'Why This Play',
    'Matchup Edge', 'Projection Edge', 'Key Metrics', 'Risk', 'Final Take', 'Full Analysis', 'Source Verification',
    'A Grade Gate Result', 'A Grade Evidence Count', 'Market Misprice Reason', 'Unresolved Conflict',
    'A-Hunt Source Notes', 'Park/Weather Risk', 'Blow-Up Risk', 'Volatility Capped', 'Tags', 'Archive Status',
    'Last Synced From Airtable', 'Last Synced From Google Sheets', 'Sync Status', 'Needs Fallback'
  ],
  'Props Lab': [
    'Record Key', 'Date', 'Player', 'Team', 'Opponent', 'League', 'Game', 'Prop Type', 'Line', 'Odds',
    'Sportsbook', 'Units', 'Grade', 'Confidence', 'EV Edge', 'Status', 'Result', 'Profit/Loss', 'Injury Notes',
    'Market Notes', 'Writeup', 'Short Take', 'Why This Play', 'Matchup Edge', 'Projection Edge',
    'Key Metrics', 'Risk', 'Final Take', 'Full Analysis', 'Source Verification',
    'A Grade Gate Result', 'A Grade Evidence Count', 'Market Misprice Reason', 'Unresolved Conflict',
    'A-Hunt Source Notes', 'Park/Weather Risk', 'Blow-Up Risk', 'Volatility Capped', 'Tags', 'Closing Number', 'Verified Closing Number', 'Closing Source',
    'Archive Status', 'Sync Status'
  ],
  'Lotto Parlays': [
    'Record Key', 'Date', 'Parlay Type', 'Leg Count', 'Legs', 'Odds', 'Sportsbook', 'Units', 'Grade',
    'Confidence', 'Status', 'Result', 'Profit/Loss', 'Short Take', 'Why This Play', 'Matchup Edge',
    'Projection Edge', 'Key Metrics', 'Risk', 'Final Take', 'Full Analysis', 'A Grade Gate Result',
    'A Grade Evidence Count', 'Market Misprice Reason', 'Unresolved Conflict', 'A-Hunt Source Notes',
    'Park/Weather Risk', 'Blow-Up Risk', 'Volatility Capped', 'Tags', 'Archive Status', 'Sync Status'
  ],
  'Lotto Props': [
    'Record Key', 'Date', 'Parlay Type', 'Leg Count', 'Legs', 'Odds', 'Sportsbook', 'Units', 'Grade',
    'Confidence', 'Status', 'Result', 'Profit/Loss', 'Short Take', 'Why This Play', 'Matchup Edge',
    'Projection Edge', 'Key Metrics', 'Risk', 'Final Take', 'Full Analysis', 'A Grade Gate Result',
    'A Grade Evidence Count', 'Market Misprice Reason', 'Unresolved Conflict', 'A-Hunt Source Notes',
    'Park/Weather Risk', 'Blow-Up Risk', 'Volatility Capped', 'Tags', 'Archive Status', 'Sync Status'
  ],
  Longshots: [
    'Record Key', 'Date', 'Sport', 'League', 'Longshot Type', 'Pick', 'Legs', 'Odds', 'Sportsbook', 'Units',
    'Grade', 'Confidence', 'Status', 'Result', 'Profit/Loss', 'Short Take', 'Why This Play',
    'Matchup Edge', 'Projection Edge', 'Key Metrics', 'Risk', 'Final Take', 'Full Analysis', 'A Grade Gate Result',
    'A Grade Evidence Count', 'Market Misprice Reason', 'Unresolved Conflict', 'A-Hunt Source Notes',
    'Park/Weather Risk', 'Blow-Up Risk', 'Volatility Capped', 'Tags', 'Archive Status', 'Sync Status'
  ],
  'Results Archive': [
    'Record Key', 'Original Table', 'Date', 'Sport', 'League', 'Game', 'Pick', 'Bet Type', 'Odds', 'Units',
    'Sportsbook', 'Grade', 'Result', 'Profit/Loss', 'Profit/Loss Units', 'Closing Number', 'Verified Closing Number', 'CLV', 'Access', 'Source Verification',
    'A Grade Gate Result', 'A Grade Evidence Count', 'Market Misprice Reason', 'Unresolved Conflict',
    'A-Hunt Source Notes', 'Park/Weather Risk', 'Blow-Up Risk', 'Volatility Capped', 'Tags', 'Archive Timestamp', 'Notes', 'Sync Status'
  ]
}

const SHEET_HEADERS = [
  'Record Key', 'Date', 'Sport', 'League', 'Game', 'Pick', 'Bet Type', 'Category', 'Access', 'Odds',
  'Sportsbook', 'Units', 'Status', 'Release Status', 'Result', 'Profit/Loss', 'Closing Number',
  'Verified Closing Number', 'Closing Source', 'CLV', 'Market Notes', 'Injury Notes', 'Writeup',
  'Short Take', 'Why This Play', 'Matchup Edge', 'Projection Edge', 'Key Metrics', 'Risk',
  'Final Take', 'Full Analysis', 'Source Verification', 'A Grade Gate Result', 'A Grade Evidence Count',
  'Market Misprice Reason', 'Unresolved Conflict', 'A-Hunt Source Notes', 'Park/Weather Risk',
  'Blow-Up Risk', 'Volatility Capped', 'Tags', 'Archive Status',
  'Sync Status', 'Needs Fallback',
  'Suggested Line', 'Missing Fields', 'Manual Odds Needed', 'Sportsbook Needed', 'Manual Odds',
  'Manual Sportsbook', 'Manual Line', 'Manual Confirmed', 'Manual Submitted', 'Manual Submit Time',
  'Release Approved', 'Implied Probability', 'Last Synced From Airtable', 'Last Synced From Google Sheets'
]

function text(row, keys) {
  return keys.map(key => row?.[key]).find(value => value !== undefined && value !== null && value !== '') || ''
}

function normalizeNumber(value) {
  if (value === undefined || value === null || value === '') return ''
  const number = Number(String(value).replace(/[^\d.+-]/g, ''))
  return Number.isFinite(number) ? number : ''
}

function truthy(value) {
  return value === true || ['true', 'yes', 'y', '1'].includes(String(value || '').trim().toLowerCase())
}

function normalizeRecordKey(row = {}) {
  return String(row['Record Key'] || buildRecordKey(row)).trim().replace(/\s+/g, ' ').toLowerCase()
}

function pickValue(row, keys) {
  return String(text(row, keys) || '').trim()
}

export function isValidPickRow(row = {}) {
  const date = pickValue(row, ['Date', 'Game Date', 'date'])
  const game = pickValue(row, ['Game', 'Matchup', 'Event', 'game'])
  const pick = pickValue(row, ['Pick', 'Selection', 'Play', 'pick'])
  const odds = text(row, ['Odds', 'Price', 'American Odds', 'odds'])
  const market = pickValue(row, ['Sport', 'League', 'Bet Type', 'Type', 'Market', 'Category', 'sport', 'league', 'betType'])
  return Boolean(date && game && pick && odds !== '' && odds !== undefined && odds !== null && market)
}

function isManualReviewRow(row = {}) {
  const date = pickValue(row, ['Date', 'Game Date', 'date'])
  const game = pickValue(row, ['Game', 'Matchup', 'Event', 'game'])
  const pick = pickValue(row, ['Pick', 'Selection', 'Play', 'pick'])
  const market = pickValue(row, ['Sport', 'League', 'Bet Type', 'Type', 'Market', 'Category', 'sport', 'league', 'betType'])
  const manual = truthy(row['Manual Odds Needed']) ||
    truthy(row['Sportsbook Needed']) ||
    /manual review/i.test(String(row.Category || row.Access || row['Release Status'] || ''))
  return Boolean(manual && date && game && pick && market)
}

function isAmericanOdds(value) {
  return /^[+-]?\d{2,5}$/.test(String(value ?? '').trim())
}

function impliedProbabilityFromAmerican(value) {
  const odds = Number(String(value ?? '').trim())
  if (!Number.isFinite(odds) || odds === 0) return ''
  const probability = odds > 0 ? 100 / (odds + 100) : Math.abs(odds) / (Math.abs(odds) + 100)
  return Number((probability * 100).toFixed(2))
}

function hasVerifiedClosing(row = {}) {
  return truthy(row['Verified Closing Number']) || truthy(row['Closing Verified']) || truthy(row['Verified Closing'])
}

function normalizeClosingFields(fields, sourceRow = {}) {
  const closingNumber = normalizeNumber(text(sourceRow, ['Closing Number', 'Close', 'Closing Line']))
  if (closingNumber !== '' && hasVerifiedClosing(sourceRow)) {
    fields['Closing Number'] = closingNumber
    fields['Verified Closing Number'] = true
    fields['Closing Source'] = text(sourceRow, ['Closing Source', 'Closing Book']) || fields['Closing Source'] || ''
    return
  }

  fields['Closing Number'] = ''
  fields['Verified Closing Number'] = false
  fields['Closing Source'] = fields['Closing Source'] || 'Needs Lookup'
  fields['Needs Fallback'] = true
}

function appendTextBlock(current, lines = []) {
  const additions = lines.map(line => String(line || '').trim()).filter(Boolean)
  if (!additions.length) return current || ''
  const existing = String(current || '').trim()
  return [existing, ...additions].filter(Boolean).join('\n')
}

function manualReviewSummary(row = {}) {
  const suggestedLine = text(row, ['Suggested Line', 'Suggested Number', 'Line'])
  const missingFields = text(row, ['Missing Fields'])
  const manualOddsNeeded = truthy(row['Manual Odds Needed'])
  const sportsbookNeeded = truthy(row['Sportsbook Needed'])
  const lines = []
  if (suggestedLine) lines.push(`Suggested line: ${suggestedLine}`)
  if (missingFields) lines.push(`Missing manual fields: ${missingFields}`)
  if (manualOddsNeeded) lines.push('Manual odds needed before release.')
  if (sportsbookNeeded) lines.push('Sportsbook needed before release.')
  return lines
}

function applyManualReviewMapping(fields, row = {}) {
  const manualOdds = normalizeNumber(text(row, ['Manual Odds']))
  const manualSportsbook = text(row, ['Manual Sportsbook'])
  const manualLine = text(row, ['Manual Line'])
  const suggestedLine = text(row, ['Suggested Line', 'Suggested Number', 'Line'])
  const lines = manualReviewSummary(row)

  if (manualOdds !== '') fields.Odds = manualOdds
  if (manualSportsbook) fields.Sportsbook = manualSportsbook
  if (manualLine) fields['Best Number'] = manualLine
  else if (!fields['Best Number'] && suggestedLine) fields['Best Number'] = suggestedLine

  if (truthy(row['Release Approved'])) fields['Release Status'] = 'Released'
  if (lines.length) {
    fields['Market Notes'] = appendTextBlock(fields['Market Notes'], lines)
  }
}

function normalizeBaseRow(row = {}, sourceSheet = '') {
  const result = text(row, ['Result', 'Outcome', 'Grade'])
  const postedTime = text(row, ['Posted Time', 'Timestamp', 'Created At'])
  const pick = sanitizeCustomerFacingTitle(text(row, ['Pick', 'Selection', 'Play']))
  const fields = {
    'Record Key': normalizeRecordKey(row),
    Date: text(row, ['Date', 'Game Date']),
    'Posted Time': postedTime || (sourceSheet === 'Airtable Ingest' ? new Date().toISOString() : ''),
    Sport: text(row, ['Sport']),
    League: text(row, ['League', 'Sport']),
    Game: text(row, ['Game', 'Matchup', 'Event']),
    Pick: pick,
    'Bet Type': text(row, ['Bet Type', 'Type', 'Market']),
    Category: text(row, ['Category', 'Type']),
    Access: text(row, ['Access', 'Tier', 'Access Tier']) || (sourceSheet.includes('VIP') ? 'VIP' : 'Free'),
    Odds: normalizeNumber(text(row, ['Odds', 'Price', 'American Odds'])),
    Sportsbook: text(row, ['Sportsbook', 'Book', 'Card Sportsbook']),
    Units: normalizeNumber(text(row, ['Units', 'Units to Commit', 'Stake'])),
    Grade: text(row, ['Grade']),
    Confidence: normalizeNumber(text(row, ['Confidence'])),
    'EV Edge': normalizeNumber(text(row, ['EV Edge', 'EV'])),
    'Best Number': text(row, ['Best Number']),
    'No Bet Cutoff': text(row, ['No Bet Cutoff']),
    Status: text(row, ['Status', 'Pick Status', 'Display Status']) || 'Pregame',
    'Release Status': text(row, ['Release Status']) || 'Released',
    Result: result || 'Pending',
    'Profit/Loss': calculateProfitLossUnits({ ...row, Result: result }),
    CLV: normalizeNumber(text(row, ['CLV'])),
    'Market Notes': text(row, ['Market Notes', 'Market Note']),
    'Injury Notes': text(row, ['Injury Notes', 'Injury Note']),
    Writeup: sanitizeCustomerFacingCopy(text(row, ['Writeup', 'Card Description', 'Description'])),
    'Short Take': sanitizeCustomerFacingCopy(text(row, ['Short Take'])),
    'Why This Play': sanitizeCustomerFacingCopy(text(row, ['Why This Play'])),
    'Matchup Edge': sanitizeCustomerFacingCopy(text(row, ['Matchup Edge'])),
    'Projection Edge': sanitizeCustomerFacingCopy(text(row, ['Projection Edge'])),
    'Key Metrics': sanitizeCustomerFacingCopy(text(row, ['Key Metrics'])),
    Risk: sanitizeCustomerFacingCopy(text(row, ['Risk', 'Risk Notes'])),
    'Final Take': sanitizeCustomerFacingCopy(text(row, ['Final Take'])),
    'Full Analysis': sanitizeCustomerFacingCopy(text(row, ['Full Analysis', 'Analysis'])),
    'Source Verification': text(row, ['Source Verification', 'Verified Source']),
    'A Grade Gate Result': text(row, ['A Grade Gate Result']),
    'A Grade Evidence Count': normalizeNumber(text(row, ['A Grade Evidence Count'])),
    'Market Misprice Reason': text(row, ['Market Misprice Reason']),
    'Unresolved Conflict': text(row, ['Unresolved Conflict']),
    'A-Hunt Source Notes': text(row, ['A-Hunt Source Notes']),
    'Park/Weather Risk': text(row, ['Park/Weather Risk']),
    'Blow-Up Risk': text(row, ['Blow-Up Risk']),
    'Volatility Capped': text(row, ['Volatility Capped']),
    Tags: text(row, ['Tags']),
    'Archive Status': text(row, ['Archive Status']) || (isClosedOrGraded(row) ? 'Needs Archive' : 'Active'),
    'Suggested Line': text(row, ['Suggested Line', 'Suggested Number']),
    'Missing Fields': text(row, ['Missing Fields']),
    'Manual Odds Needed': truthy(row['Manual Odds Needed']),
    'Sportsbook Needed': truthy(row['Sportsbook Needed']),
    'Manual Odds': text(row, ['Manual Odds']),
    'Manual Sportsbook': text(row, ['Manual Sportsbook']),
    'Manual Line': text(row, ['Manual Line']),
    'Manual Confirmed': text(row, ['Manual Confirmed']),
    'Manual Submitted': truthy(row['Manual Submitted']),
    'Manual Submit Time': text(row, ['Manual Submit Time']),
    'Release Approved': truthy(row['Release Approved']),
    'Implied Probability': normalizeNumber(text(row, ['Implied Probability'])),
    'Last Synced From Airtable': sourceSheet === 'Airtable Ingest' ? new Date().toISOString() : '',
    'Last Synced From Google Sheets': sourceSheet === 'Airtable Ingest' ? '' : new Date().toISOString(),
    'Sync Status': text(row, ['Sync Status']) || 'Synced',
    'Needs Fallback': truthy(row['Needs Fallback'])
  }
  applyManualReviewMapping(fields, row)
  normalizeClosingFields(fields, row)
  return fields
}

function fieldsForTable(row = {}, tableName, sourceSheet = '') {
  const fields = normalizeBaseRow(row, sourceSheet)
  if (tableName === 'Props Lab') {
    fields.Player = text(row, ['Player', 'Athlete', 'Player Name'])
    fields.Team = text(row, ['Team'])
    fields.Opponent = text(row, ['Opponent'])
    fields['Prop Type'] = text(row, ['Prop Type', 'Market', 'Bet Type', 'Type'])
    fields.Line = text(row, ['Line', 'Number', 'Line / Number'])
  }
  if (tableName === 'Lotto Parlays' || tableName === 'Lotto Props') {
    fields['Parlay Type'] = text(row, ['Parlay Type', 'Category', 'Type']) || 'Lotto Parlay'
    fields['Leg Count'] = normalizeNumber(text(row, ['Leg Count', 'Legs Count', 'Legs']))
    fields.Legs = text(row, ['Legs', 'Pick', 'Selection'])
  }
  if (tableName === 'Longshots') {
    fields['Longshot Type'] = text(row, ['Longshot Type', 'Category', 'Type']) || 'Longshot'
    fields.Legs = text(row, ['Legs'])
  }
  if (tableName === 'Results Archive') {
    fields['Original Table'] = text(row, ['Original Table']) || sourceSheet
    fields['Archive Timestamp'] = text(row, ['Archive Timestamp']) || new Date().toISOString()
    fields.Notes = text(row, ['Notes', 'Market Notes', 'Writeup'])
  }

  return Object.fromEntries(
    FIELD_SETS[tableName]
      .map(field => [field, fields[field]])
      .filter(([, value]) => value !== undefined)
  )
}

function sameValue(left, right) {
  return String(left ?? '') === String(right ?? '')
}

function changedFields(existing = {}, next = {}) {
  return Object.keys(next).filter(key => !sameValue(existing[key], next[key]))
}

function isCurrentSyncCandidate(row = {}) {
  return isValidPickRow(row) && normalizeRecordKey(row) && !isClosedOrGraded(row)
}

async function loadSourceRows(options = {}) {
  const tabs = options.backfill ? [...SOURCE_TABS, ...HISTORICAL_TABS] : SOURCE_TABS
  const rows = []
  const warnings = []

  for (const sheetName of tabs) {
    try {
      const sheetRows = await getSheetRows(sheetName)
      rows.push(...sheetRows.map(row => ({ ...row, __sourceSheet: sheetName })))
    } catch (error) {
      warnings.push(`Google Sheets tab ${sheetName} could not be read: ${error.message}`)
    }
  }

  return { rows, warnings }
}

function normalizeIngestPick(pick = {}, defaults = {}) {
  const normalized = {
    Date: pick.date || pick.Date || defaults.date || '',
    Sport: pick.sport || pick.Sport || '',
    League: pick.league || pick.League || pick.sport || pick.Sport || '',
    Game: pick.game || pick.Game || pick.matchup || pick.Matchup || '',
    Pick: sanitizeCustomerFacingTitle(pick.pick || pick.Pick || pick.selection || pick.Selection || ''),
    'Bet Type': pick.betType || pick['Bet Type'] || pick.type || pick.Type || pick.market || pick.Market || '',
    Category: pick.category || pick.Category || '',
    Access: pick.access || pick.Access || 'Free',
    Odds: pick.odds ?? pick.Odds ?? '',
    Sportsbook: pick.sportsbook || pick.Sportsbook || pick.book || pick.Book || '',
    'Best Number': pick.bestNumber ?? pick['Best Number'] ?? '',
    'No Bet Cutoff': pick.noBetCutoff ?? pick['No Bet Cutoff'] ?? '',
    Units: pick.units ?? pick.Units ?? 1,
    Grade: pick.grade || pick.Grade || '',
    Confidence: pick.confidence ?? pick.Confidence ?? '',
    'EV Edge': pick.evEdge ?? pick['EV Edge'] ?? '',
    Status: pick.status || pick.Status || 'Active',
    'Release Status': pick.releaseStatus || pick['Release Status'] || 'Released',
    Result: pick.result || pick.Result || 'Pending',
    'Archive Status': pick.archiveStatus || pick['Archive Status'] || 'Active',
    Writeup: pick.writeup || pick.Writeup || '',
    'Short Take': pick.shortTake || pick['Short Take'] || '',
    'Why This Play': pick.whyThisPlay || pick['Why This Play'] || '',
    'Matchup Edge': pick.matchupEdge || pick['Matchup Edge'] || '',
    'Projection Edge': pick.projectionEdge || pick['Projection Edge'] || '',
    'Key Metrics': pick.keyMetrics || pick['Key Metrics'] || '',
    Risk: pick.risk || pick.Risk || '',
    'Final Take': pick.finalTake || pick['Final Take'] || '',
    'Full Analysis': pick.fullAnalysis || pick['Full Analysis'] || '',
    'Market Notes': pick.marketNotes || pick['Market Notes'] || '',
    'Injury Notes': pick.injuryNotes || pick['Injury Notes'] || '',
    'Source Verification': pick.sourceVerification || pick['Source Verification'] || '',
    'A Grade Gate Result': pick.aGradeGateResult || pick['A Grade Gate Result'] || '',
    'A Grade Evidence Count': pick.aGradeEvidenceCount ?? pick['A Grade Evidence Count'] ?? '',
    'Market Misprice Reason': pick.marketMispriceReason || pick['Market Misprice Reason'] || '',
    'Unresolved Conflict': pick.unresolvedConflict || pick['Unresolved Conflict'] || '',
    'A-Hunt Source Notes': pick.aHuntSourceNotes || pick['A-Hunt Source Notes'] || '',
    'Park/Weather Risk': pick.parkWeatherRisk || pick['Park/Weather Risk'] || '',
    'Blow-Up Risk': pick.blowUpRisk || pick['Blow-Up Risk'] || '',
    'Volatility Capped': pick.volatilityCapped || pick['Volatility Capped'] || '',
    Tags: pick.tags || pick.Tags || '',
    Player: pick.player || pick.Player || '',
    Team: pick.team || pick.Team || '',
    Opponent: pick.opponent || pick.Opponent || '',
    'Prop Type': pick.propType || pick['Prop Type'] || '',
    Line: pick.line ?? pick.Line ?? '',
    Legs: pick.legs || pick.Legs || '',
    'Leg Count': pick.legCount ?? pick['Leg Count'] ?? '',
    'Parlay Type': pick.parlayType || pick['Parlay Type'] || '',
    'Longshot Type': pick.longshotType || pick['Longshot Type'] || '',
    'Suggested Line': pick.suggestedLine ?? pick['Suggested Line'] ?? '',
    'Missing Fields': Array.isArray(pick.missingFields)
      ? pick.missingFields.join(', ')
      : (pick['Missing Fields'] || pick.missingFields || ''),
    'Manual Odds Needed': pick.manualOddsNeeded ?? pick['Manual Odds Needed'] ?? false,
    'Sportsbook Needed': pick.sportsbookNeeded ?? pick['Sportsbook Needed'] ?? false,
    'Manual Odds': pick.manualOdds ?? pick['Manual Odds'] ?? '',
    'Manual Sportsbook': pick.manualSportsbook || pick['Manual Sportsbook'] || '',
    'Manual Line': pick.manualLine ?? pick['Manual Line'] ?? '',
    'Manual Confirmed': pick.manualConfirmed || pick['Manual Confirmed'] || '',
    'Manual Submitted': pick.manualSubmitted ?? pick['Manual Submitted'] ?? false,
    'Manual Submit Time': pick.manualSubmitTime || pick['Manual Submit Time'] || '',
    'Release Approved': pick.releaseApproved ?? pick['Release Approved'] ?? false,
    'Implied Probability': pick.impliedProbability ?? pick['Implied Probability'] ?? '',
    'Sync Status': pick.syncStatus || pick['Sync Status'] || 'Synced'
  }
  normalized.Writeup = sanitizeCustomerFacingCopy(sanitizePublicWriteup(normalized))
  normalized['Full Analysis'] = sanitizeCustomerFacingCopy(sanitizeCustomerFacingAnalysis(normalized))
  return normalized
}

export async function runMicksSync(options = {}) {
  // Airtable sync removed 2026-10-13: Darren no longer uses Airtable.
  // Google Sheets is the source of truth; writes go through /api/import-picks.
  // The daily cron still calls this action (auth required); it performs no
  // external writes and burns no OpenAI budget.
  return {
    success: true,
    sourceOfTruth: 'google_sheets',
    ranAt: new Date().toISOString(),
    archived: 0,
    synced: 0,
    warnings: [
      'Airtable sync removed 2026-10-13; run-sync performs no external writes. Sheets writes go through /api/import-picks.'
    ],
    nextSteps: []
  }
}

export default runMicksSync
