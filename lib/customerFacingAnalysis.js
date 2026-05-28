const INTERNAL_ANALYSIS_PATTERNS = [
  /held manual review card from run micks picks/i,
  /missing fields?:/i,
  /do not release until/i,
  /manual odds needed/i,
  /sportsbook needed/i,
  /sourceconfidence/i,
  /manualconfirmationrequired/i,
  /rawopenaipreview/i,
  /parseerrortype/i,
  /responseid/i,
  /syncbatchid/i,
  /\brouting\b/i,
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
  const rawMarketNotes = value(row, ['Market Notes', 'marketNotes', 'summary'])
  const rawInjuryNotes = value(row, ['Injury Notes', 'injuryNotes'])
  const writeup = value(row, ['Writeup', 'writeup', 'Card Description', 'description'])
  const rawSource = value(row, ['Source Verification', 'sourceVerification'])
  const marketNotes = containsInternalAnalysisText(rawMarketNotes) ? '' : rawMarketNotes
  const injuryNotes = containsInternalAnalysisText(rawInjuryNotes) ? '' : rawInjuryNotes
  const source = containsInternalAnalysisText(rawSource) ? '' : rawSource

  const lines = [
    `${pick} qualifies as a VIP review play for ${game} because the current ${betType} profile lines up with the Micks Picks matchup and market framework.`,
    sentence(writeup) || `The angle starts with the matchup shape: ${pick} has to fit the game script, pace, and efficiency edge before it becomes playable.`,
    injuryNotes
      ? `Injury and availability context: ${sentence(injuryNotes)}`
      : 'Injury and availability context should be checked close to release so late lineup news does not change the edge.',
    marketNotes
      ? `Market and line context: ${sentence(marketNotes)}`
      : 'Market and line context matters here; the play should stay inside the preferred number before release.',
    bestNumber
      ? `Best number: ${bestNumber}${noBetCutoff ? `, with a no-bet cutoff of ${noBetCutoff}` : ''}.`
      : noBetCutoff
      ? `No-bet cutoff: ${noBetCutoff}.`
      : 'Risk note: if the number moves away from the edge, this should be downgraded or passed.',
    odds || sportsbook
      ? `Final betting context: ${[sportsbook, odds].filter(Boolean).join(' ')}.`
      : 'Manual confirmation note: confirm the final sportsbook price before release.',
    source ? `Source check: ${sentence(source)}` : ''
  ].filter(Boolean)

  return lines.join('\n\n')
}

export function sanitizeCustomerFacingAnalysis(row = {}) {
  const current = value(row, ['Full Analysis', 'fullAnalysis', 'Analysis', 'VIP Analysis'])
  if (current && !containsInternalAnalysisText(current)) return current
  return buildCustomerFacingAnalysis(row)
}

export default sanitizeCustomerFacingAnalysis
