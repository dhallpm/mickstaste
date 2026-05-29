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
  /backend/i
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

function cleanCustomerText(text = '') {
  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  return clean && !containsInternalAnalysisText(clean) ? clean : ''
}

function paragraphCount(text = '') {
  return String(text || '')
    .split(/\n\s*\n/)
    .map(part => part.trim())
    .filter(Boolean)
    .length
}

export function containsInternalAnalysisText(text = '') {
  const value = String(text || '')
  return INTERNAL_ANALYSIS_PATTERNS.some(pattern => pattern.test(value))
}

export function buildCustomerFacingAnalysis(row = {}) {
  const game = value(row, ['Game', 'game']) || 'this matchup'
  const pick = value(row, ['Pick', 'pick']) || 'this pick'
  const betType = value(row, ['Bet Type', 'betType', 'Market', 'market']) || 'market'
  const bestNumber = value(row, ['Best Number', 'Line', 'line', 'Suggested Line'])
  const noBetCutoff = value(row, ['No Bet Cutoff', 'noBetCutoff'])
  const odds = value(row, ['Odds', 'odds'])
  const sportsbook = value(row, ['Sportsbook', 'sportsbook'])
  const marketNotes = cleanCustomerText(value(row, ['Market Notes', 'marketNotes', 'summary']))
  const injuryNotes = cleanCustomerText(value(row, ['Injury Notes', 'injuryNotes']))
  const writeup = cleanCustomerText(value(row, ['Writeup', 'writeup', 'Card Description', 'description']))
  const source = cleanCustomerText(value(row, ['Source Verification', 'sourceVerification']))
  const confirmationNotes = cleanCustomerText(value(row, ['Manual Confirmation Notes', 'manualConfirmationNotes', 'Confirmation Notes']))
  const priceParts = [
    sportsbook ? `${sportsbook}` : '',
    odds ? `${odds}` : '',
    bestNumber ? `at ${bestNumber}` : ''
  ].filter(Boolean).join(' ')

  const paragraphs = [
    `${pick} qualifies for ${game} because the current ${betType} market lines up with the Micks Picks matchup, price, and risk framework${source ? `, with the source check supporting the listed number` : ''}.`,
    sentence(writeup) || `The matchup angle starts with how ${pick} fits the expected game script, pace, and efficiency profile before price movement is considered.`,
    injuryNotes
      ? `Injury and availability context: ${sentence(injuryNotes)}`
      : 'Injury and availability context remains part of the handicap because late lineup news can change the matchup edge and playable number.',
    marketNotes
      ? `Market and line context: ${sentence(marketNotes)}${priceParts ? ` The current betting context is ${priceParts}.` : ''}`
      : `Market and line context matters here${priceParts ? `; the current betting context is ${priceParts}` : ''}.`,
    noBetCutoff
      ? `Risk note: the best number is ${bestNumber || 'the listed line'}, with a no-bet cutoff of ${noBetCutoff}; beyond that point, the edge is no longer strong enough for the card.${confirmationNotes ? ` Manual confirmation still needed: ${sentence(confirmationNotes)}` : ''}`
      : bestNumber
      ? `Risk note: ${bestNumber} is the preferred number, and meaningful movement away from that price should reduce the edge.${confirmationNotes ? ` Manual confirmation still needed: ${sentence(confirmationNotes)}` : ''}`
      : `Risk note: the play depends on the listed market staying close to the current edge, so aggressive line movement should be treated cautiously.${confirmationNotes ? ` Manual confirmation still needed: ${sentence(confirmationNotes)}` : ''}`,
    source ? `Source and price check: ${sentence(source)}` : ''
  ].filter(Boolean)

  return paragraphs.slice(0, 6).join('\n\n')
}

export function sanitizeCustomerFacingAnalysis(row = {}) {
  const current = value(row, ['Full Analysis', 'fullAnalysis', 'Analysis', 'VIP Analysis'])
  if (current && !containsInternalAnalysisText(current) && paragraphCount(current) >= 3 && paragraphCount(current) <= 6) return current
  return buildCustomerFacingAnalysis(row)
}

export default sanitizeCustomerFacingAnalysis
