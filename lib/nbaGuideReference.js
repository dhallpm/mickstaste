import { readFileSync } from 'node:fs'

export const NBA_GUIDE = JSON.parse(readFileSync(new URL('../micks-framework/current/nba-2026-27-vsin-reference.json', import.meta.url), 'utf8'))
const value = (row, ...keys) => keys.map(key => row?.[key]).find(v => v !== undefined && v !== null && v !== '') ?? ''
export function isNbaReferenceCandidate(row = {}) {
  return /\bNBA\b/i.test([value(row, 'League', 'league'), value(row, 'Sport', 'sport')].join(' '))
}

export function nbaGuideCheckSchema() {
  const properties = {
    guideId: { type: 'string' },
    pages: { type: 'array', items: { type: 'integer' } },
    basis: { type: 'string', enum: ['ORIGINAL_PAGES', 'EXTRACTED_BASELINE'] },
    guideFinding: { type: 'string' }, currentFinding: { type: 'string' },
    currentSources: { type: 'array', items: { type: 'string' } },
    checkedAt: { type: 'string' },
    state: { type: 'string', enum: NBA_GUIDE.freshnessStates },
    influence: { type: 'string' }, countercase: { type: 'string' },
    materialConflictResolved: { type: 'boolean' }
  }
  return { type: ['object', 'null'], additionalProperties: false, properties, required: Object.keys(properties) }
}

export function nbaGuideContext({ sport = '', league = '' } = {}) {
  // An all-sports request may produce NBA rows. Never mistake WNBA for NBA.
  if (league || sport) {
    if (!isNbaReferenceCandidate({ sport, league }) && !/^(?:all|all sports|basketball)$/i.test(String(league || sport))) return ''
  }
  return [
    `MANDATORY NBA GUIDE: ${NBA_GUIDE.id}, ${NBA_GUIDE.title}, season ${NBA_GUIDE.season}.`,
    'Applies to every NBA candidate, including props, derivatives, futures, awards, watch/pass ideas and each NBA parlay leg; not WNBA.',
    'The following is an EXTRACTED_BASELINE, not access to original PDF pages or verified current facts. Do not claim ORIGINAL_PAGES unless actually retrieved and read. Missing material original context blocks release.',
    'For every NBA candidate return NBA Guide Check: guideId, pages (relevant team preview pages, plus applicable 4-13 sections), basis, guideFinding, currentFinding, currentSources (actual current URLs), checkedAt (ISO timestamp), state CURRENT/PARTIALLY_CURRENT/STALE/OVERRIDDEN, influence, countercase and materialConflictResolved. Non-NBA rows use null. Identify both teams for game markets, the current team for season-long awards.',
    'Cross-reference verified current roster/coaching/injuries, minutes/usage, rest/travel, pace/shot mix/efficiency, exact current line/odds and strongest opposing evidence. Guide assumptions and prices are dated. No automatic pick, probability, point-spread conversion or scoring bonus. Current verified evidence overrides the guide. Multiple VSiN authors/articles are ONE source family.',
    'Missing reconciliation or unresolved material conflict means WATCH/BLOCKED. Do not invent evidence to complete the object. Existing v2 110-point scoring and NBA release gates still control; do not create a new standalone probability/EV prerequisite.',
    'Pages 4-9: named futures opinions. Pages 10-11: MIP role/voter heuristics, not hard age/year rules. Page 12: claimed lottery reform/incentives, which require current official-rule verification. Page 13: dated Makinen ratings; no calibrated game-line formula is provided.',
    ...NBA_GUIDE.teams.map(t => `${t.code} ${t.team}: PDF p${t.pdfPage}; rating ${t.powerRating}; preview ${t.winTotalOpinion.direction} ${t.winTotalOpinion.line}; 2025-26 adjusted O/D/net ${t.historicalAdjustedRatings.metricsAsPrinted.offense}/${t.historicalAdjustedRatings.metricsAsPrinted.defense}/${t.historicalAdjustedRatings.metricsAsPrinted.net}. Check: ${t.verificationFocus}`),
    'SOURCE DIFFERENCES (preserve author, page and number; never call these live movement or independent consensus):',
    ...NBA_GUIDE.internalDifferences.map(d => `${d.team} p${d.pages.join('/')}: ${d.detail}`),
    'Silver Bulletin franchise rankings are a separate ten-season structural prior, not a direct current game projection. Keep their horizon separate from this one-season guide.'
  ].join('\n')
}

export function evaluateNbaGuideCheck(row = {}, { now = new Date() } = {}) {
  if (!isNbaReferenceCandidate(row)) return { applicable: false, passed: true, reasons: [] }
  const audit = row['NBA Guide Check'] ?? row.nbaGuideCheck
  const reasons = []
  if (!audit || typeof audit !== 'object' || Array.isArray(audit)) return { applicable: true, passed: false, reasons: ['NBA guide reconciliation missing'] }
  if (audit.guideId !== NBA_GUIDE.id) reasons.push('NBA guide identity missing or incorrect')
  const pages = audit.pages
  if (!Array.isArray(pages) || !pages.length || pages.some(p => !Number.isInteger(p) || p < 1 || p > NBA_GUIDE.pdfPages)) reasons.push('NBA guide PDF page references missing or invalid')
  const matchup = [value(row, 'Game', 'game', 'Matchup', 'matchup'), value(row, 'Team', 'team'), value(row, 'Opponent', 'opponent'), value(row, 'Pick', 'pick')].join(' ').toLowerCase()
  const teams = NBA_GUIDE.teams.filter(t => {
    const nickname = t.team.split(' ').slice(t.team.startsWith('Portland') ? 1 : t.team.startsWith('Los Angeles') ? 2 : t.team.startsWith('Golden State') || t.team.startsWith('New York') || t.team.startsWith('New Orleans') || t.team.startsWith('San Antonio') || t.team.startsWith('Oklahoma City') ? 2 : 1).join(' ')
    return [t.team, nickname, t.code].some(alias => new RegExp(`(?:^|[^a-z])${alias.toLowerCase()}(?:$|[^a-z])`).test(matchup))
  })
  if (!teams.length) reasons.push('NBA team identity must be established for the guide cross-reference')
  const seasonMarket = /futures?|season|award|MVP|Most Improved|Sixth Man|Coach of the Year|Rookie of the Year|All-NBA/i.test([value(row, 'Bet Type', 'betType', 'Market', 'market'), value(row, 'Category', 'category'), value(row, 'Pick', 'pick')].join(' '))
  if (teams.length < 2 && !seasonMarket) reasons.push('NBA game-market reconciliation requires both teams')
  for (const team of teams) if (!Array.isArray(pages) || !pages.includes(team.pdfPage)) reasons.push(`NBA guide page ${team.pdfPage} missing for ${team.code}`)
  if (!['ORIGINAL_PAGES', 'EXTRACTED_BASELINE'].includes(audit.basis)) reasons.push('NBA guide access basis missing')
  if (!NBA_GUIDE.freshnessStates.includes(audit.state)) reasons.push('NBA guide freshness state missing')
  for (const field of ['guideFinding', 'currentFinding', 'influence', 'countercase']) {
    if (typeof audit[field] !== 'string' || !audit[field].trim()) reasons.push(`NBA guide ${field} missing`)
  }
  if (!Array.isArray(audit.currentSources) || !audit.currentSources.length || audit.currentSources.some(url => !/^https?:\/\/[^\s/]+\//.test(url))) reasons.push('NBA guide current source URLs missing or invalid')
  const checked = Date.parse(audit.checkedAt)
  if (!Number.isFinite(checked) || checked > +now + 5 * 60 * 1000 || +now - checked > 24 * 60 * 60 * 1000) reasons.push('NBA guide current-evidence timestamp missing, stale or future')
  if (audit.materialConflictResolved !== true) reasons.push('NBA guide material conflict unresolved')
  // Structure checks establish audit completeness, not factual verification of claimed sources.
  return { applicable: true, passed: !reasons.length, reasons, requiredTeamPages: teams.map(t => t.pdfPage) }
}
