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
  /this confirms airtable-first ingestion/i
]

function value(row = {}, keys = []) {
  for (const key of keys) {
    const next = row?.[key]
    if (next !== undefined && next !== null && String(next).trim() !== '') return String(next).trim()
  }
  return ''
}

function sentence(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  if (!clean) return ''
  return /[.!?]$/.test(clean) ? clean : `${clean}.`
}

function paragraphize(parts = []) {
  return parts
    .map(part => String(part || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map(sentence)
    .join('\n\n')
}

function paragraphs(text = '') {
  return String(text || '')
    .split(/\n\s*\n/)
    .map(part => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function wordCount(text = '') {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length
}

const VIP_SECTION_HEADING = /\b(?:Opening thesis|Matchup breakdown|Market and (?:number|line context)|Risk and variance(?: notes)?|Micks Picks verdict|Full Analysis)\s*:/i

function clipSentenceText(text = '', maxLength = 600) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  if (clean.length <= maxLength) return clean
  const clipped = clean.slice(0, maxLength - 3)
  const sentenceBoundary = Math.max(clipped.lastIndexOf('. '), clipped.lastIndexOf('! '), clipped.lastIndexOf('? '))
  if (sentenceBoundary >= 120) return clipped.slice(0, sentenceBoundary + 1).trim()
  const wordBoundary = clipped.lastIndexOf(' ')
  return `${clipped.slice(0, wordBoundary >= 120 ? wordBoundary : maxLength - 3).trim()}...`
}

function publicWriteupText(text = '') {
  const firstPublicBlock = String(text || '')
    .split(/\n\s*\n|(?=\b(?:Opening thesis|Matchup breakdown|Market and (?:number|line context)|Risk and variance(?: notes)?|Micks Picks verdict|Full Analysis)\s*:)/i)[0]
  return clipSentenceText(firstPublicBlock)
}

function cleanCustomerText(text = '') {
  const raw = String(text || '').trim()
  if (!raw || /^(?:false|true)$/i.test(raw) || containsInternalAnalysisText(raw)) return ''
  return raw
}

function marketFamily(row = {}) {
  const text = [
    value(row, ['Bet Type', 'betType', 'Market', 'market', 'Prop Type']),
    value(row, ['Pick', 'pick']),
    value(row, ['Category', 'category'])
  ].join(' ').toLowerCase()
  if (/prop|points|rebounds|assists|pra|strikeouts|total bases|sog|saves|home run|\bhr\b/.test(text)) return 'prop'
  if (/total|over|under/.test(text)) return 'total'
  if (/moneyline|\bml\b/.test(text)) return 'moneyline'
  if (/parlay|lotto|leg/.test(text)) return 'parlay'
  if (/spread|run line|puck line|\+|-/.test(text)) return 'spread'
  return 'market'
}

function marketLanguage(row = {}) {
  const family = marketFamily(row)
  if (family === 'prop') {
    return 'This is a role-and-usage handicap first: minutes, matchup assignment, stat environment, and late news matter more than the name value on the ticket.'
  }
  if (family === 'total') {
    return 'The total depends on pace, shot quality, empty possessions, foul pressure, bullpen or rotation usage, and whether the market is pricing the scoring environment correctly.'
  }
  if (family === 'moneyline') {
    return 'The moneyline case has to be built around a clean win condition: matchup control, late-game execution, and whether the price is still fair for the true win probability.'
  }
  if (family === 'parlay') {
    return 'The parlay case is about correlation and leg quality, not just payout size; every leg has to carry its own edge while avoiding duplicated matchup risk.'
  }
  if (family === 'spread') {
    return 'The spread case is about margin protection: possession quality, late-game foul dynamics, turnover pressure, and whether the number leaves enough room for normal variance.'
  }
  return 'The handicap is built around whether the listed market still gives enough price protection after matchup, injury, and number sensitivity are accounted for.'
}

function manualReviewLanguage(row = {}) {
  const text = [
    value(row, ['Release Status', 'releaseStatus']),
    value(row, ['Status', 'status']),
    value(row, ['Access', 'access']),
    value(row, ['Grade', 'grade']),
    value(row, ['Category', 'category']),
    row.manualConfirmationRequired
  ].join(' ').toLowerCase()
  return /held|review|true|watchlist/.test(text)
}

function marketLine(row = {}) {
  const odds = value(row, ['Odds', 'odds'])
  const sportsbook = value(row, ['Sportsbook', 'sportsbook', 'Book', 'book'])
  const bestNumber = value(row, ['Best Number', 'bestNumber', 'Line', 'line', 'Suggested Line'])
  const cutoff = value(row, ['No Bet Cutoff', 'noBetCutoff'])
  const pieces = []
  if (sportsbook || odds) pieces.push(`listed at ${[sportsbook, odds].filter(Boolean).join(' ')}`)
  if (bestNumber) pieces.push(`best number ${bestNumber}`)
  if (cutoff) pieces.push(`no-bet cutoff ${cutoff}`)
  return pieces.length ? pieces.join(', ') : ''
}

export function containsInternalAnalysisText(text = '') {
  const next = String(text || '')
  return INTERNAL_ANALYSIS_PATTERNS.some(pattern => pattern.test(next))
}

export function containsGenericAnalysisText(text = '') {
  const next = String(text || '')
  return GENERIC_ANALYSIS_PATTERNS.some(pattern => pattern.test(next))
}

export function hasStrongPublicPreview(text = '') {
  const clean = String(text || '').trim()
  return Boolean(clean) &&
    clean.length <= 600 &&
    paragraphs(clean).length === 1 &&
    !VIP_SECTION_HEADING.test(clean) &&
    !containsInternalAnalysisText(text) &&
    !containsGenericAnalysisText(text)
}

export function hasStrongVipAnalysis(text = '') {
  const parts = paragraphs(text)
  return parts.length >= 5 &&
    wordCount(text) >= 170 &&
    !containsInternalAnalysisText(text) &&
    !containsGenericAnalysisText(text)
}

export function buildPublicPreview(row = {}) {
  const game = value(row, ['Game', 'game']) || 'this matchup'
  const pick = value(row, ['Pick', 'pick']) || 'this pick'
  const current = publicWriteupText(cleanCustomerText(value(row, ['Writeup', 'writeup', 'Card Description', 'description'])))
  if (current && !VIP_SECTION_HEADING.test(current)) return current
  return `${pick} is on the public card for ${game}. Check the listed number and sportsbook close to lock before placing a wager.`
}

export function sanitizePublicWriteup(row = {}) {
  const current = value(row, ['Writeup', 'writeup', 'Card Description', 'description'])
  const publicText = publicWriteupText(current)
  return hasStrongPublicPreview(publicText) ? publicText : buildPublicPreview(row)
}

export function buildCustomerFacingAnalysis(row = {}) {
  const game = value(row, ['Game', 'game']) || 'this matchup'
  const pick = value(row, ['Pick', 'pick']) || 'this pick'
  const betType = value(row, ['Bet Type', 'betType', 'Market', 'market', 'Prop Type']) || 'market'
  const writeup = cleanCustomerText(value(row, ['Writeup', 'writeup', 'Card Description', 'description']))
  const marketNotes = cleanCustomerText(value(row, ['Market Notes', 'marketNotes', 'summary']))
  const injuryNotes = cleanCustomerText(value(row, ['Injury Notes', 'injuryNotes']))
  const source = cleanCustomerText(value(row, ['Source Verification', 'sourceVerification']))
  const line = marketLine(row)
  const review = manualReviewLanguage(row)
  const access = value(row, ['Access', 'access'])
  const cardLabel = access ? `${access} card` : 'card'
  const verdict = review
    ? 'Micks Picks verdict: this is a Held Review position, not an auto-release. The betting idea is worth preserving, but the final market confirmation has to be completed before a customer should treat it as a released play.'
    : `Micks Picks verdict: this belongs on the ${cardLabel} only if the available number stays inside the playable range and the market does not move past the cutoff.`

  return paragraphize([
    `Opening thesis: ${pick} is the focus for ${game} because the ${betType} price creates a specific handicap, not just a lean. ${writeup ? sentence(writeup) : 'The play has to be judged through matchup fit, number discipline, and the amount of variance attached to this market.'}`,
    `Matchup breakdown: ${marketLanguage(row)} The key is whether the matchup gives ${pick} enough paths to cash without needing an outlier result. For sides and totals, that means possession quality, scoring pressure, defensive resistance, and late-game state. For props, it means role stability, usage, minutes, and opponent scheme.`,
    `Market and line context: ${line ? `The current betting context is ${line}.` : 'The current betting context still needs a final live-board check before release.'} ${marketNotes ? `Market notes: ${sentence(marketNotes)}` : 'The number matters as much as the pick; if the market moves away from the target, the edge should be reduced or removed rather than chased.'}`,
    `Injury and availability context: ${injuryNotes ? sentence(injuryNotes) : 'Availability should be checked close to lock because one rotation change, goalie/pitcher change, or minutes limit can turn a playable number into a pass.'} ${source ? `Verified source context: ${sentence(source)}` : 'The analysis should stay tied to verified board and availability information rather than unsupported assumptions.'}`,
    `Risk and variance notes: the bet can fail if the expected game script breaks, if efficiency swings against the position, if late fouling or bullpen/rotation decisions distort the final margin, or if the market number closes worse than the playable price. Backdoor outcomes, blowout paths, and stale-line risk are part of the handicap here.`,
    verdict
  ])
}

export function sanitizeCustomerFacingAnalysis(row = {}) {
  const current = value(row, ['Full Analysis', 'fullAnalysis', 'Analysis', 'VIP Analysis'])
  const cleanCurrent = cleanCustomerText(current)
  if (hasStrongVipAnalysis(cleanCurrent)) return cleanCurrent
  if (cleanCurrent && wordCount(cleanCurrent) >= 6 && !containsGenericAnalysisText(cleanCurrent)) return cleanCurrent
  return buildCustomerFacingAnalysis(row)
}

export default sanitizeCustomerFacingAnalysis
