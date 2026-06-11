const INTERNAL_ANALYSIS_PATTERNS = [
  /held manual review card from run micks picks/i,
  /missing fields?:/i,
  /do not release until/i,
  /manual odds needed/i,
  /sportsbook needed/i,
  /manual entry/i,
  /manual workflow/i,
  /manual review required/i,
  /sourceconfidence/i,
  /manualconfirmationrequired/i,
  /rawopenaipreview/i,
  /parseerrortype/i,
  /responseid/i,
  /syncbatchid/i,
  /\brouting\b/i,
  /\bworkflow\b/i,
  /\bdebug\b/i,
  /\bjson\b/i,
  /field-?mapping/i,
  /airtable/i,
  /internal validation/i,
  /backend/i,
  /verified source context:\s*(?:false|true)\b/i
]

const GENERIC_ANALYSIS_PATTERNS = [
  /qualifies because the market lines up with the framework/i,
  /lines up with the micks picks matchup and market framework/i,
  /game script, pace, and efficiency edge/i,
  /real .{0,40} board game with injury context/i,
  /full analysis available in vip vault/i,
  /automated airtable ingest test card/i,
  /this confirms airtable-first ingestion/i,
  /projection variance indicates market inefficiency/i,
  /trend data supports this play/i,
  /model edge is present/i,
  /positive ev based on matchup indicators/i,
  /player profile aligns with historical hit rate/i,
  /strong statistical angle/i,
  /market indicators support/i,
  /historical hit rate/i
]

const SECTION_DEFS = [
  ['shortTake', 'Short Take', ['Short Take', 'shortTake', 'Analysis Preview Short', 'analysisPreviewShort']],
  ['whyThisPlay', 'Why This Play', ['Why This Play', 'whyThisPlay', 'Why', 'Card Description', 'Writeup', 'writeup']],
  ['matchupEdge', 'Matchup Edge', ['Matchup Edge', 'matchupEdge', 'Matchup Breakdown']],
  ['projectionEdge', 'Projection Edge', ['Projection Edge', 'projectionEdge', 'Projected Edge', 'Projection']],
  ['keyMetrics', 'Key Metrics', ['Key Metrics', 'keyMetrics', 'Metric Edge', 'Metrics']],
  ['risk', 'Risk', ['Risk', 'risk', 'Risk Notes', 'riskNotes', 'Risk/Variance Note']],
  ['finalTake', 'Final Take', ['Final Take', 'finalTake', 'Micks Picks Verdict', 'Verdict']]
]

const SECTION_BY_HEADING = new Map([
  ['short take', 'shortTake'],
  ['why this play', 'whyThisPlay'],
  ['why', 'whyThisPlay'],
  ['opening thesis', 'whyThisPlay'],
  ['matchup edge', 'matchupEdge'],
  ['matchup breakdown', 'matchupEdge'],
  ['projection edge', 'projectionEdge'],
  ['projected edge', 'projectionEdge'],
  ['market and line context', 'projectionEdge'],
  ['market and number context', 'projectionEdge'],
  ['key metrics', 'keyMetrics'],
  ['metrics', 'keyMetrics'],
  ['risk', 'risk'],
  ['risk and variance notes', 'risk'],
  ['risk and variance', 'risk'],
  ['final take', 'finalTake'],
  ['micks picks verdict', 'finalTake'],
  ['verdict', 'finalTake']
])

const SECTION_HEADING_RE = /(?:^|\n)\s*(Short Take|Why This Play|Why|Opening thesis|Matchup Edge|Matchup breakdown|Projection Edge|Projected Edge|Market and line context|Market and number context|Key Metrics|Metrics|Risk|Risk and variance notes|Risk and variance|Final Take|Micks Picks verdict|Verdict)\s*:/gi
const VIP_SECTION_HEADING = /\b(?:Short Take|Why This Play|Matchup Edge|Projection Edge|Key Metrics|Risk|Final Take|Opening thesis|Matchup breakdown|Market and (?:number|line) context|Risk and variance(?: notes)?|Micks Picks verdict|Full Analysis)\s*:/i

export const CUSTOMER_ANALYSIS_REQUIRED_FIELDS = [
  'Short Take',
  'Why This Play',
  'Matchup Edge',
  'Projection Edge',
  'Key Metrics',
  'Risk',
  'Final Take',
  'Full Analysis'
]

function clean(value = '') {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function keyToken(value = '') {
  return clean(value).toLowerCase().replace(/[^a-z0-9]/g, '')
}

function value(row = {}, keys = []) {
  const entries = Object.entries(row || {})
  for (const key of keys) {
    const next = row?.[key]
    if (next !== undefined && next !== null && String(next).trim() !== '') return String(next).trim()
  }

  const wanted = new Set(keys.map(keyToken))
  for (const [key, next] of entries) {
    if (wanted.has(keyToken(key)) && next !== undefined && next !== null && String(next).trim() !== '') {
      return String(next).trim()
    }
  }
  return ''
}

function sentence(text) {
  const next = clean(text)
  if (!next) return ''
  return /[.!?]$/.test(next) ? next : `${next}.`
}

function paragraphs(text = '') {
  return String(text || '')
    .split(/\n\s*\n/)
    .map(part => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function wordCount(text = '') {
  return clean(text).split(/\s+/).filter(Boolean).length
}

function clipSentenceText(text = '', maxLength = 600) {
  const next = clean(text)
  if (next.length <= maxLength) return next
  const clipped = next.slice(0, maxLength - 3)
  const sentenceBoundary = Math.max(clipped.lastIndexOf('. '), clipped.lastIndexOf('! '), clipped.lastIndexOf('? '))
  if (sentenceBoundary >= 120) return clipped.slice(0, sentenceBoundary + 1).trim()
  const wordBoundary = clipped.lastIndexOf(' ')
  return `${clipped.slice(0, wordBoundary >= 120 ? wordBoundary : maxLength - 3).trim()}...`
}

function publicWriteupText(text = '') {
  const firstPublicBlock = String(text || '')
    .split(/\n\s*\n|(?=\b(?:Short Take|Why This Play|Matchup Edge|Projection Edge|Key Metrics|Risk|Final Take|Opening thesis|Matchup breakdown|Market and (?:number|line) context|Risk and variance(?: notes)?|Micks Picks verdict|Full Analysis)\s*:)/i)[0]
  return clipSentenceText(firstPublicBlock)
}

function cleanCustomerText(text = '') {
  const raw = String(text || '').trim()
  if (!raw || /^(?:false|true)$/i.test(raw) || containsInternalAnalysisText(raw)) return ''
  return raw
}

function splitGame(game = '') {
  const raw = clean(game)
  if (!raw) return []
  const match = raw.match(/^(.+?)\s+(?:vs\.?|v\.?|@|at)\s+(.+)$/i)
  if (!match) return []
  return [match[1].trim(), match[2].trim()].filter(Boolean)
}

function extractedPlayerFromPick(text = '') {
  const pick = clean(text)
  if (!pick) return ''
  const dash = pick.match(/^(.+?)\s*(?:-|\u2013)\s*(?:over|under|anytime|to score|[0-9.]+\+)/i)
  if (dash) return dash[1].trim()
  if (/^(?:over|under)\b/i.test(pick)) return ''
  const match = pick.match(/^(.+?)\s+(?:over|under|anytime|hrr\b|hits?\b|runs?\b|rbi\b|rbis\b|strikeouts?\b|ks?\b|shots?\b|sog\b|points?\b|rebounds?\b|assists?\b|saves?\b|goals?\b|[0-9.]+\+)/i)
  return match ? match[1].trim() : ''
}

function lineNumber(row = {}) {
  return value(row, [
    'Bet Line',
    'betLine',
    'Line',
    'line',
    'Line / Number',
    'Best Number',
    'bestNumber',
    'No Bet Cutoff',
    'noBetCutoff',
    'Pick',
    'pick',
    'Prop',
    'prop'
  ])
}

function projectedNumber(row = {}) {
  return value(row, [
    'Projection',
    'Projected Number',
    'Projected Stat',
    'Projected Result',
    'Projected Fair Number',
    'Projected Fair Spread',
    'Projected Total',
    'Projection Edge',
    'projectionEdge',
    'Estimated True Probability',
    'True Probability',
    'Model Probability'
  ])
}

function bestAndCutoff(row = {}) {
  return {
    best: value(row, ['Best Number', 'bestNumber', 'Line', 'line']),
    cutoff: value(row, ['No Bet Cutoff', 'No-Bet Cutoff', 'noBetCutoff', 'Cutoff'])
  }
}

function marketFamily(row = {}) {
  const text = [
    value(row, ['Bet Type', 'betType', 'Market', 'market', 'Prop Type', 'prop']),
    value(row, ['Pick', 'pick']),
    value(row, ['Category', 'category']),
    value(row, ['League', 'Sport'])
  ].join(' ').toLowerCase()
  if (/draw no bet|\bdnb\b|no draw|double chance|tie no bet/.test(text)) return 'soccer'
  if (/soccer|fifa|uefa|concacaf|premier|laliga|serie a|bundesliga|mls/.test(text)) return 'soccer'
  if (/prop|points|rebounds|assists|pra|strikeouts|total bases|sog|shots on goal|saves|home run|\bhr\b|hrr/.test(text)) return 'prop'
  if (/total|over|under/.test(text)) return 'total'
  if (/moneyline|\bml\b/.test(text)) return 'moneyline'
  if (/parlay|lotto|leg/.test(text)) return 'parlay'
  if (/spread|run line|puck line|\+|-/.test(text)) return 'spread'
  return 'market'
}

function playerName(row = {}) {
  return value(row, ['Player', 'player', 'Athlete', 'Name']) || extractedPlayerFromPick(value(row, ['Pick', 'pick']))
}

function teamName(row = {}) {
  const direct = value(row, ['Team', 'team'])
  if (direct) return direct
  const teams = splitGame(value(row, ['Game', 'game', 'Matchup', 'Event']))
  const pick = value(row, ['Pick', 'pick'])
  return teams.find(team => new RegExp(team.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(pick)) || ''
}

function opponentName(row = {}) {
  const direct = value(row, ['Opponent', 'opponent'])
  if (direct) return direct
  const teams = splitGame(value(row, ['Game', 'game', 'Matchup', 'Event']))
  if (teams.length < 2) return ''
  const subject = clean(teamName(row) || playerName(row) || value(row, ['Pick', 'pick'])).toLowerCase()
  if (subject && teams[0] && subject.includes(teams[0].toLowerCase())) return teams[1]
  if (subject && teams[1] && subject.includes(teams[1].toLowerCase())) return teams[0]
  return teams[1]
}

function subjectName(row = {}) {
  return playerName(row) || teamName(row) || value(row, ['Pick', 'pick']) || value(row, ['Game', 'game']) || 'this play'
}

function finalTake(row = {}) {
  const status = [
    value(row, ['Status', 'status']),
    value(row, ['Release Status', 'releaseStatus']),
    value(row, ['Category', 'category']),
    value(row, ['Grade', 'grade'])
  ].join(' ').toLowerCase()
  const section = String(row.section || row.__section || row.__table || '').toLowerCase()
  if (/pass|no release/.test(status)) return 'Pass.'
  if (/watchlist|live only/.test(status)) return 'Watchlist/live-only until the price and role confirm.'
  if (/longshot/.test(section)) return 'Longshot only.'
  if (/props/.test(section)) return 'Props Lab play.'
  if (/vip|premium/.test(String(value(row, ['Access', 'access'])))) return 'VIP play.'
  return 'Official play.'
}

function metricLines(row = {}) {
  const metrics = [
    ['Projection', projectedNumber(row)],
    ['Market line', lineNumber(row)],
    ['Edge', value(row, ['EV Edge', 'evEdge'])],
    ['True price', value(row, ['True Probability', 'Estimated True Probability', 'Model Probability'])],
    ['Best number', bestAndCutoff(row).best],
    ['Cutoff', bestAndCutoff(row).cutoff],
    ['Source', value(row, ['Source Verification', 'sourceVerification'])]
  ].filter(([, next]) => cleanCustomerText(next))
  return metrics.slice(0, 4).map(([label, next]) => `${label}: ${next}`).join(' ')
}

function fallbackSections(row = {}) {
  const pick = value(row, ['Pick', 'pick']) || 'this play'
  const game = value(row, ['Game', 'game']) || 'this matchup'
  const family = marketFamily(row)
  const player = playerName(row)
  const opponent = opponentName(row)
  const line = lineNumber(row)
  const projection = projectedNumber(row)
  const { best, cutoff } = bestAndCutoff(row)
  const marketNotes = cleanCustomerText(value(row, ['Market Notes', 'marketNotes', 'summary']))
  const injuryNotes = cleanCustomerText(value(row, ['Injury Notes', 'injuryNotes']))
  const riskNotes = cleanCustomerText(value(row, ['Risk Notes', 'riskNotes', 'Risk']))

  const subject = player || teamName(row) || pick
  const opponentText = opponent ? ` against ${opponent}` : ''
  const marketClarifier = family === 'soccer'
    ? 'For Draw No Bet / No Draw markets, the bet is on the listed side with the draw protected instead of being graded as a loss.'
    : ''

  return {
    shortTake: `${pick} is playable only if the listed number stays inside the cutoff.`,
    whyThisPlay: `${subject} is the focus${opponentText} because the listed market creates a concrete price-and-number decision, not a generic lean. ${marketNotes ? sentence(marketNotes) : sentence(marketClarifier || `The bet has to be judged against ${game}, the available line, and the role or team style behind the matchup.`)}`,
    matchupEdge: `${game}: ${player ? `${player}'s role, matchup, and expected volume drive the handicap.` : 'The matchup is about team style, pace, chance quality, and how the opponent can force the game away from the number.'} ${opponent ? `${opponent} is the opponent that has to be accounted for in the projection.` : 'Opponent context still needs to be stated clearly before this reads like a final customer card.'}`,
    projectionEdge: projection
      ? `Projected closer to ${projection} versus the market line ${line || 'shown on the card'}.`
      : `Projection edge needs a stated fair number versus the market line ${line || 'shown on the card'} before this card is fully customer-ready.`,
    keyMetrics: metricLines(row) || `Best number: ${best || 'not listed yet'}. Cutoff: ${cutoff || 'not listed yet'}.`,
    risk: riskNotes || injuryNotes || 'The bet can lose if the expected role or game script breaks, if the market moves past the playable number, or if late injury/lineup news changes the matchup.',
    finalTake: finalTake(row)
  }
}

function parseStructuredSections(text = '') {
  const raw = String(text || '').trim()
  if (!raw) return {}
  const matches = [...raw.matchAll(SECTION_HEADING_RE)]
  if (!matches.length) return {}

  const sections = {}
  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i]
    const heading = clean(match[1]).toLowerCase()
    const key = SECTION_BY_HEADING.get(heading)
    if (!key) continue
    const start = match.index + match[0].length
    const end = i + 1 < matches.length ? matches[i + 1].index : raw.length
    const body = raw.slice(start, end).replace(/^\s+|\s+$/g, '')
    if (body) sections[key] = body
  }
  return sections
}

export function containsInternalAnalysisText(text = '') {
  const next = String(text || '')
  return INTERNAL_ANALYSIS_PATTERNS.some(pattern => pattern.test(next))
}

export function containsGenericAnalysisText(text = '') {
  const next = String(text || '')
  return GENERIC_ANALYSIS_PATTERNS.some(pattern => pattern.test(next))
}

export function rawCustomerAnalysisSections(row = {}) {
  const sections = {}
  for (const [key, , aliases] of SECTION_DEFS) {
    const next = cleanCustomerText(value(row, aliases))
    if (next) sections[key] = next
  }

  const full = cleanCustomerText(value(row, ['Full Analysis', 'fullAnalysis', 'Analysis', 'VIP Analysis']))
  const parsed = parseStructuredSections(full)
  for (const [key, next] of Object.entries(parsed)) {
    if (!sections[key]) sections[key] = cleanCustomerText(next)
  }

  if (!sections.whyThisPlay && full && !VIP_SECTION_HEADING.test(full)) {
    sections.whyThisPlay = publicWriteupText(full)
  } else if (sections.whyThisPlay && full && !VIP_SECTION_HEADING.test(full) && !sections.keyMetrics) {
    sections.keyMetrics = publicWriteupText(full)
  }

  return Object.fromEntries(Object.entries(sections).filter(([, next]) => clean(next)))
}

export function customerAnalysisSections(row = {}) {
  const fallback = fallbackSections(row)
  const raw = rawCustomerAnalysisSections(row)
  const sections = { ...fallback, ...raw }
  if (!sections.shortTake) sections.shortTake = sections.whyThisPlay
  if (!sections.whyThisPlay) sections.whyThisPlay = sections.shortTake
  return sections
}

export function formatCustomerAnalysisSections(sections = {}) {
  return SECTION_DEFS
    .filter(([key]) => key !== 'shortTake')
    .map(([key, label]) => {
      const next = clean(sections[key])
      return next ? `${label}: ${sentence(next)}` : ''
    })
    .filter(Boolean)
    .join('\n\n')
}

export function hasStrongPublicPreview(text = '') {
  const next = String(text || '').trim()
  return Boolean(next) &&
    next.length <= 600 &&
    paragraphs(next).length === 1 &&
    !VIP_SECTION_HEADING.test(next) &&
    !containsInternalAnalysisText(next) &&
    !containsGenericAnalysisText(next)
}

export function hasStrongVipAnalysis(text = '') {
  const parts = paragraphs(text)
  return parts.length >= 5 &&
    wordCount(text) >= 170 &&
    !containsInternalAnalysisText(text) &&
    !containsGenericAnalysisText(text)
}

export function buildPublicPreview(row = {}) {
  const sections = rawCustomerAnalysisSections(row)
  const why = publicWriteupText(sections.shortTake || sections.whyThisPlay)
  if (hasStrongPublicPreview(why)) return why

  const game = value(row, ['Game', 'game']) || 'this matchup'
  const pick = value(row, ['Pick', 'pick']) || 'this pick'
  const current = publicWriteupText(cleanCustomerText(value(row, ['Writeup', 'writeup', 'Card Description', 'description'])))
  if (current && !VIP_SECTION_HEADING.test(current) && !containsGenericAnalysisText(current)) return current
  return `${pick} is on the public card for ${game}. Check the listed number and sportsbook close to lock before placing a wager.`
}

export function sanitizePublicWriteup(row = {}) {
  const current = value(row, ['Short Take', 'shortTake', 'Why This Play', 'whyThisPlay', 'Writeup', 'writeup', 'Card Description', 'description'])
  const publicText = publicWriteupText(current)
  return hasStrongPublicPreview(publicText) ? publicText : buildPublicPreview(row)
}

export function buildCustomerFacingAnalysis(row = {}) {
  return formatCustomerAnalysisSections(customerAnalysisSections(row))
}

function mentions(text = '', phrase = '') {
  const next = clean(text).toLowerCase()
  const target = clean(phrase).toLowerCase()
  return Boolean(target && next.includes(target))
}

function hasProjectionLanguage(text = '') {
  return /\b(project(?:ed|ion)?|fair|my number|my price|closer to|vs\.?|versus)\b/i.test(text) &&
    /(?:\d+(?:\.\d+)?|[+-]\d+)/.test(text)
}

function hasRiskLanguage(text = '') {
  return /\b(risk|can lose|can beat|fails?|if |unless|variance|pitch count|minutes|foul|injury|lineup|goalie|weather|game script)\b/i.test(text)
}

function hasBestOrCutoffLanguage(text = '', row = {}) {
  const { best, cutoff } = bestAndCutoff(row)
  return /\b(best number|cutoff|no-?bet|playable to|pass above|or better)\b/i.test(text) ||
    Boolean((best || cutoff) && /\b(best|cutoff|playable|pass)\b/i.test(text))
}

function hasLineReference(text = '', line = '') {
  const next = clean(text)
  const listed = clean(line)
  if (!listed) return true
  if (new RegExp(listed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(next)) return true
  const numbers = listed.match(/[+-]?\d+(?:\.\d+)?/g) || []
  return numbers.some(number => new RegExp(`(?:^|[^0-9])${number.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[^0-9]|$)`).test(next))
}

export function evaluateCustomerFriendlyAnalysis(row = {}) {
  const rawSections = rawCustomerAnalysisSections(row)
  const rawText = [
    ...Object.values(rawSections),
    value(row, ['Full Analysis', 'fullAnalysis', 'Analysis', 'VIP Analysis'])
  ].filter(Boolean).join('\n\n')
  const text = cleanCustomerText(rawText)
  const sections = customerAnalysisSections(row)
  const formatted = formatCustomerAnalysisSections(sections)
  const evaluationText = clean(text || formatted)
  const issues = []
  const family = marketFamily(row)
  const game = value(row, ['Game', 'game', 'Matchup', 'Event'])
  const teams = splitGame(game)
  const player = playerName(row)
  const subject = subjectName(row)
  const opponent = opponentName(row)
  const line = lineNumber(row)

  if (!evaluationText) issues.push('Full Analysis is blank.')
  if (containsInternalAnalysisText(evaluationText)) issues.push('Full Analysis includes internal workflow language.')
  if (containsGenericAnalysisText(evaluationText)) issues.push('Full Analysis uses generic trend/model language.')

  if (player) {
    if (!mentions(evaluationText, player)) issues.push('Full Analysis does not mention the actual player.')
  } else if (subject && !mentions(evaluationText, subject)) {
    issues.push('Full Analysis does not mention the actual team or pick.')
  }

  if (opponent && !mentions(evaluationText, opponent)) {
    issues.push('Full Analysis does not mention the opponent.')
  }

  if ((family === 'spread' || family === 'total' || family === 'moneyline') && teams.length === 2) {
    if (!mentions(evaluationText, teams[0]) || !mentions(evaluationText, teams[1])) {
      issues.push('Team side/total analysis must mention both teams.')
    }
  }

  if (family === 'soccer' && /draw no bet|\bdnb\b|no draw|double chance|tie no bet/i.test([value(row, ['Pick', 'pick']), value(row, ['Bet Type', 'Market', 'market'])].join(' '))) {
    if (!/draw protected|draw no bet|no draw|double chance|tie no bet|draw.*refund|draw.*push/i.test(evaluationText)) {
      issues.push('Draw No Bet / No Draw analysis must explain the market correctly.')
    }
  }

  if (line && !hasLineReference(evaluationText, line) && !/\b(line|market number)\b/i.test(evaluationText)) {
    issues.push('Full Analysis does not mention the betting line.')
  }

  if (!hasProjectionLanguage(evaluationText)) {
    issues.push('Full Analysis does not explain the projected edge versus the line.')
  }

  if (!hasBestOrCutoffLanguage(evaluationText, row)) {
    issues.push('Full Analysis does not include best number or cutoff.')
  }

  if (!hasRiskLanguage(evaluationText)) {
    issues.push('Full Analysis does not explain the risk.')
  }

  return {
    ok: issues.length === 0,
    status: issues.length ? 'Needs Customer-Friendly Rewrite' : 'Customer-Friendly',
    issues,
    sections
  }
}

export function sanitizeCustomerFacingAnalysis(row = {}) {
  return buildCustomerFacingAnalysis(row)
}

export default sanitizeCustomerFacingAnalysis
