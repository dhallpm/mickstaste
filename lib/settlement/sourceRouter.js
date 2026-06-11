import {
  collectResultSourceUrls,
  fetchResultSource,
  isBoxScoreLikeContent,
  isRecapOnlyContent,
  providerForUrl,
  sourceNameForUrl
} from './resultSources.js'

function text(value) {
  return String(value ?? '').trim()
}

function firstValue(row = {}, keys = []) {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && text(value)) return value
  }
  return ''
}

function parseNumber(value) {
  const match = String(value ?? '').replace(/,/g, '').match(/[+-]?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : NaN
}

function normalize(value = '') {
  return text(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function escapeRegExp(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function splitTeams(row = {}) {
  const game = firstValue(row, ['Game', 'Matchup', 'Event'])
  const cleaned = text(game)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(?:under|over|total|moneyline|ml|spread|watchlist|pass)\b.*$/i, '')
    .trim()
  const parts = cleaned
    .split(/\s+(?:vs\.?|versus|at|@)\s+|\s+-\s+|\s*\/\s*/i)
    .map(part => text(part))
    .filter(Boolean)
  return parts.length >= 2 ? [parts[0], parts[1]] : []
}

function playerName(row = {}) {
  const direct = firstValue(row, ['Player', 'Athlete', 'Player Name'])
  if (direct) return text(direct)
  const pick = firstValue(row, ['Pick', 'Selection', 'Play', 'Prop'])
  return text(pick).replace(/\b(over|under|anytime goal|strikeouts?|hrr|hits?\s*\+\s*runs?\s*\+\s*rbi).*$/i, '').trim()
}

function pickText(row = {}) {
  return [
    firstValue(row, ['Pick', 'Selection', 'Play', 'Prop']),
    firstValue(row, ['Bet Type', 'Type', 'Market']),
    firstValue(row, ['Category'])
  ].filter(Boolean).join(' ')
}

function hasPlusSeparatedLegs(value = '') {
  return text(value).split(/\s+\+\s+(?=[A-Z])/).filter(Boolean).length >= 2
}

function classifyMarket(row = {}) {
  const value = normalize(pickText(row))
  if (/\bparlay\b|\bleg\b/.test(value) || firstValue(row, ['Legs', 'Parlay Group']) || hasPlusSeparatedLegs(firstValue(row, ['Pick', 'Selection', 'Play']))) return 'parlay'
  if (/\bstrikeouts?\b|\bks?\b/.test(value)) return 'strikeouts'
  if (/\bhrr\b|hits?\s*\+\s*runs?\s*\+\s*rbi/.test(value)) return 'hrr'
  if (/\banytime goal\b|\bto score\b/.test(value)) return 'anytimeGoal'
  if (/\bover\b|\bunder\b/.test(value)) return 'total'
  if (/\bspread\b|\brun line\b|\bpuck line\b|\bmoneyline\b|\bmoney line\b|\bml\b|[+-]\d+(?:\.\d+)?/.test(value)) return 'side'
  return 'unknown'
}

function direction(row = {}) {
  const value = normalize(pickText(row))
  if (/\bover\b/.test(value)) return 'over'
  if (/\bunder\b/.test(value)) return 'under'
  if (/\b\d+(?:\.\d+)?\s*\+/.test(pickText(row))) return 'atLeast'
  return ''
}

function threshold(row = {}) {
  const value = pickText(row)
  const afterDirection = value.match(/\b(?:over|under)\s*([+-]?\d+(?:\.\d+)?)/i)
  if (afterDirection) return Number(afterDirection[1])
  const anyNumber = value.match(/([+-]?\d+(?:\.\d+)?)/)
  return anyNumber ? Number(anyNumber[1]) : NaN
}

function pickTeam(row = {}, teams = splitTeams(row)) {
  const pick = normalize(firstValue(row, ['Pick', 'Selection', 'Play', 'Team', 'Side']))
  const side = pick
    .replace(/\bml\b|\bmoneyline\b|\bmoney\s*line\b|\bover\b|\bunder\b/g, ' ')
    .replace(/\b(?:first|1st|f5|five|innings?|inning)\b/g, ' ')
    .replace(/[+-]\d+(?:\.\d+)?/g, ' ')
    .replace(/\b\d+(?:\.\d+)?\b/g, ' ')
    .replace(/\bor better\b|\bwatchlist\b|\bpass\b|\breleased\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return teams.find(team => {
    const normalizedTeam = normalize(team)
    return pick.includes(normalizedTeam) ||
      normalizedTeam.includes(side) ||
      (side && side.includes(normalizedTeam))
  }) || ''
}

function isTeamTotal(row = {}, teams = splitTeams(row)) {
  const value = normalize(pickText(row))
  if (/\bgame total\b|\bfull game total\b|\btotal points\b|\btotal runs\b|\btotal goals\b/.test(value)) return false
  if (/\bteam total\b/.test(value)) return true
  return Boolean(pickTeam(row, teams)) && /\btotal\b/.test(value) && /\b(?:over|under)\b/.test(value)
}

function isFirstFiveMarket(row = {}) {
  return /\b(?:first\s*5|first\s*five|1st\s*5|f5|5\s*innings?|five\s*innings?)\b/i.test(pickText(row))
}

function parseExplicitResult(content = '') {
  const match = text(content).match(/\b(?:micks\s*)?(?:result|settlement result|pick result)\s*[:=-]\s*(win|loss|push|void|cancelled|canceled)\b/i)
  if (!match) return ''
  if (/^canceled$/i.test(match[1])) return 'Cancelled'
  return match[1].slice(0, 1).toUpperCase() + match[1].slice(1).toLowerCase()
}

function parseFinalScore(content = '', row = {}) {
  const teams = splitTeams(row)
  const compact = text(content).replace(/\s+/g, ' ')
  const generic = compact.match(/\b(?:Box Score\s+)?Final\s*:?\s*([A-Z][A-Za-z .'-]+?)\s+(\d{1,3})\s*[,;-]\s*([A-Z][A-Za-z .'-]+?)\s+(\d{1,3})\b/i)
  if (teams.length < 2) {
    return generic
      ? {
          [text(generic[1])]: Number(generic[2]),
          [text(generic[3])]: Number(generic[4])
        }
      : {}
  }
  const [away, home] = teams
  const awayPattern = escapeRegExp(away)
  const homePattern = escapeRegExp(home)
  const patterns = [
    new RegExp(`${awayPattern}\\s+(\\d{1,3})\\s*[,;-]\\s*${homePattern}\\s+(\\d{1,3})`, 'i'),
    new RegExp(`${homePattern}\\s+(\\d{1,3})\\s*[,;-]\\s*${awayPattern}\\s+(\\d{1,3})`, 'i'),
    new RegExp(`Final\\s*:?\\s*${awayPattern}\\s+(\\d{1,3})\\s+${homePattern}\\s+(\\d{1,3})`, 'i'),
    new RegExp(`Final\\s*:?\\s*${homePattern}\\s+(\\d{1,3})\\s+${awayPattern}\\s+(\\d{1,3})`, 'i')
  ]

  for (const pattern of patterns) {
    const match = compact.match(pattern)
    if (!match) continue
    if (pattern.source.includes(homePattern) && pattern.source.indexOf(homePattern) < pattern.source.indexOf(awayPattern)) {
      return { [home]: Number(match[1]), [away]: Number(match[2]) }
    }
    return { [away]: Number(match[1]), [home]: Number(match[2]) }
  }

  if (generic) {
    return {
      [text(generic[1])]: Number(generic[2]),
      [text(generic[3])]: Number(generic[4])
    }
  }
  return {}
}

function parseFirstFiveScore(content = '', row = {}) {
  if (!isFirstFiveMarket(row)) return {}
  const teams = splitTeams(row)
  const compact = text(content).replace(/\s+/g, ' ')
  const generic = compact.match(/\b(?:First\s*5|F5|First\s*Five|5\s*Innings?)\s*(?:Score|Final|Linescore)?\s*:?\s*([A-Z][A-Za-z .'-]+?)\s+(\d{1,3})\s*[,;-]\s*([A-Z][A-Za-z .'-]+?)\s+(\d{1,3})\b/i)
  if (teams.length < 2) {
    return generic
      ? {
          [text(generic[1])]: Number(generic[2]),
          [text(generic[3])]: Number(generic[4])
        }
      : {}
  }

  const [away, home] = teams
  const awayPattern = escapeRegExp(away)
  const homePattern = escapeRegExp(home)
  const patterns = [
    new RegExp(`(?:First\\s*5|F5|First\\s*Five|5\\s*Innings?)\\s*(?:Score|Final|Linescore)?\\s*:?\\s*${awayPattern}\\s+(\\d{1,3})\\s*[,;-]\\s*${homePattern}\\s+(\\d{1,3})`, 'i'),
    new RegExp(`(?:First\\s*5|F5|First\\s*Five|5\\s*Innings?)\\s*(?:Score|Final|Linescore)?\\s*:?\\s*${homePattern}\\s+(\\d{1,3})\\s*[,;-]\\s*${awayPattern}\\s+(\\d{1,3})`, 'i')
  ]

  for (const pattern of patterns) {
    const match = compact.match(pattern)
    if (!match) continue
    if (pattern.source.indexOf(homePattern) < pattern.source.indexOf(awayPattern)) {
      return { [home]: Number(match[1]), [away]: Number(match[2]) }
    }
    return { [away]: Number(match[1]), [home]: Number(match[2]) }
  }

  if (generic) {
    return {
      [text(generic[1])]: Number(generic[2]),
      [text(generic[3])]: Number(generic[4])
    }
  }
  return {}
}

function playerWindow(content = '', player = '') {
  const body = text(content).replace(/\s+/g, ' ')
  if (!player) return body
  const index = body.toLowerCase().indexOf(player.toLowerCase())
  if (index < 0) return body
  return body.slice(Math.max(0, index - 80), index + player.length + 220)
}

function parsePlayerStats(content = '', row = {}) {
  const player = playerName(row)
  const window = playerWindow(content, player)
  const stats = {}

  const strikeouts = window.match(/\b(?:strikeouts?|so|ks?)\s*[:=-]?\s*(\d{1,2})\b/i) ||
    window.match(/\b(\d{1,2})\s*(?:strikeouts?|so|ks?)\b/i)
  if (strikeouts) stats.strikeouts = Number(strikeouts[1])

  const hits = window.match(/\b(?:hits?|h)\s*[:=-]?\s*(\d{1,2})\b/i)
  const runs = window.match(/\b(?:runs?|r)\s*[:=-]?\s*(\d{1,2})\b/i)
  const rbi = window.match(/\b(?:rbi)\s*[:=-]?\s*(\d{1,2})\b/i)
  if (hits) stats.hits = Number(hits[1])
  if (runs) stats.runs = Number(runs[1])
  if (rbi) stats.rbi = Number(rbi[1])

  const goals = window.match(/\b(?:goals?|g)\s*[:=-]?\s*(\d{1,2})\b/i) ||
    window.match(/\b(\d{1,2})\s*(?:goals?)\b/i)
  if (goals) stats.goals = Number(goals[1])

  return Object.keys(stats).length ? { [player || 'player']: stats } : {}
}

function statForPlayer(playerStats = {}, row = {}) {
  const player = playerName(row)
  return playerStats[player] || Object.values(playerStats)[0] || {}
}

function compareOverUnder(actual, target, dir) {
  if (!Number.isFinite(actual) || !Number.isFinite(target) || !dir) return ''
  if (dir === 'atLeast') return actual >= target ? 'Win' : 'Loss'
  if (actual === target) return 'Push'
  if (dir === 'over') return actual > target ? 'Win' : 'Loss'
  if (dir === 'under') return actual < target ? 'Win' : 'Loss'
  return ''
}

function isMoneylineMarket(row = {}) {
  return /\bmoney\s*line\b|\bmoneyline\b|\bml\b/i.test(pickText(row))
}

function scoreForTeam(finalScore = {}, team = '') {
  const direct = Number(finalScore[team])
  if (Number.isFinite(direct)) return direct
  const normalizedTeam = normalize(team)
  for (const [name, score] of Object.entries(finalScore)) {
    const normalizedName = normalize(name)
    if (normalizedName === normalizedTeam || normalizedName.includes(normalizedTeam) || normalizedTeam.includes(normalizedName)) {
      const value = Number(score)
      if (Number.isFinite(value)) return value
    }
  }
  return NaN
}

function spreadNumber(row = {}) {
  const value = firstValue(row, ['Pick', 'Selection', 'Play'])
  const signed = text(value).match(/(?:^|\s)([+-]\d+(?:\.\d+)?)(?:\s|$)/)
  return signed ? Number(signed[1]) : parseNumber(value)
}

function resultFromScore(row = {}, finalScore = {}) {
  let teams = splitTeams(row)
  if (teams.length < 2 && Object.keys(finalScore).length >= 2) {
    teams = Object.keys(finalScore).slice(0, 2)
  }
  if (teams.length < 2) return ''
  const [away, home] = teams
  const awayScore = scoreForTeam(finalScore, away)
  const homeScore = scoreForTeam(finalScore, home)
  if (!Number.isFinite(awayScore) || !Number.isFinite(homeScore)) return ''

  const market = classifyMarket(row)
  const dir = direction(row)
  if (market === 'total' && dir) {
    if (isTeamTotal(row, teams)) {
      const team = pickTeam(row, teams)
      const teamScore = scoreForTeam(finalScore, team)
      return compareOverUnder(teamScore, threshold(row), dir)
    }
    return compareOverUnder(awayScore + homeScore, threshold(row), dir)
  }

  const team = pickTeam(row, teams)
  if (!team) return ''
  const opponent = team === away ? home : away
  const teamScore = scoreForTeam(finalScore, team)
  const opponentScore = scoreForTeam(finalScore, opponent)
  if (!Number.isFinite(teamScore) || !Number.isFinite(opponentScore)) return ''

  const spread = spreadNumber(row)
  if (!isMoneylineMarket(row) && Number.isFinite(spread) && /[+-]\d/.test(firstValue(row, ['Pick', 'Selection', 'Play']))) {
    const adjusted = teamScore + spread
    if (adjusted === opponentScore) return 'Push'
    return adjusted > opponentScore ? 'Win' : 'Loss'
  }

  if (teamScore === opponentScore) return 'Push'
  return teamScore > opponentScore ? 'Win' : 'Loss'
}

function resultFromPlayerStats(row = {}, playerStats = {}) {
  const market = classifyMarket(row)
  const stats = statForPlayer(playerStats, row)
  if (market === 'strikeouts') return compareOverUnder(Number(stats.strikeouts), threshold(row), direction(row))
  if (market === 'hrr') {
    const hrr = Number(stats.hits || 0) + Number(stats.runs || 0) + Number(stats.rbi || 0)
    return compareOverUnder(hrr, threshold(row), direction(row))
  }
  if (market === 'anytimeGoal') return Number.isFinite(Number(stats.goals)) ? (Number(stats.goals) > 0 ? 'Win' : 'Loss') : ''
  return ''
}

function splitParlayLegs(row = {}) {
  const legs = firstValue(row, ['Legs', 'Parlay Group']) || firstValue(row, ['Pick', 'Selection', 'Play'])
  return text(legs)
    .split(/\s+\|\s+|\n|;\s+|\s+\+\s+(?=[A-Z])|,\s+(?=[A-Z][a-z])/)
    .map(leg => text(leg))
    .filter(Boolean)
}

function verifyRowAgainstProvider(row = {}, providerResult = {}, options = {}) {
  const rawText = providerResult.rawText || options.sourceText || ''
  const explicit = parseExplicitResult(rawText)
  const provider = providerForUrl(providerResult.sourceUrl)
  const boxScore = isBoxScoreLikeContent(rawText, provider)
  const recapOnly = isRecapOnlyContent(rawText, provider)
  const firstFiveScore = parseFirstFiveScore(rawText, row)
  const parsedFinalScore = Object.keys(firstFiveScore).length ? firstFiveScore : parseFinalScore(rawText, row)
  const finalScore = Object.keys(providerResult.finalScore || {}).length && !Object.keys(firstFiveScore).length
    ? providerResult.finalScore
    : parsedFinalScore
  const playerStats = Object.keys(providerResult.playerStats || {}).length ? providerResult.playerStats : parsePlayerStats(rawText, row)
  const market = classifyMarket(row)

  if (explicit) {
    return {
      status: 'verified',
      result: explicit,
      finalScore,
      playerStats,
      notes: `${providerResult.sourceName} explicitly confirmed ${explicit}.`
    }
  }

  if (recapOnly && !boxScore) {
    return {
      status: 'needs_review',
      result: '',
      finalScore,
      playerStats,
      notes: `${providerResult.sourceName} appears to be recap-only and did not explicitly confirm the needed result.`
    }
  }

  if (market === 'parlay') {
    const legResults = splitParlayLegs(row).map(leg => {
      const result = verifyRowAgainstProvider(
        { ...row, Pick: leg, Legs: '', 'Parlay Group': '', 'Bet Type': '', Type: '', Market: '', Category: '' },
        { ...providerResult, finalScore, playerStats, rawText },
        options
      )
      return { leg, result: result.result || '', status: result.status, notes: result.notes }
    })
    if (legResults.some(leg => leg.result === 'Loss')) {
      return { status: 'verified', result: 'Loss', finalScore, playerStats, legResults, notes: 'At least one parlay leg lost.' }
    }
    if (legResults.some(leg => leg.status !== 'verified' || !leg.result)) {
      return { status: 'needs_review', result: '', finalScore, playerStats, legResults, notes: 'One or more parlay legs could not be verified.' }
    }
    if (legResults.some(leg => leg.result === 'Push' || leg.result === 'Void')) {
      return { status: 'verified', result: 'Push', finalScore, playerStats, legResults, notes: 'Parlay has no losing legs but at least one push/void leg.' }
    }
    return { status: 'verified', result: 'Win', finalScore, playerStats, legResults, notes: 'All parlay legs verified as wins.' }
  }

  let result = ''
  if (['strikeouts', 'hrr', 'anytimeGoal'].includes(market)) {
    result = resultFromPlayerStats(row, playerStats)
    if (!result) {
      return {
        status: 'needs_review',
        result: '',
        finalScore,
        playerStats,
        notes: `${providerResult.sourceName} did not confirm the required player stat.`
      }
    }
  } else {
    result = resultFromScore(row, finalScore)
    if (!result) {
      return {
        status: 'needs_review',
        result: '',
        finalScore,
        playerStats,
        notes: `${providerResult.sourceName} did not confirm a usable final score.`
      }
    }
  }

  return {
    status: 'verified',
    result,
    finalScore,
    playerStats,
    notes: `${providerResult.sourceName} verified ${market} as ${result}.`
  }
}

function aggregateParlayResult(row = {}, providerResults = [], options = {}) {
  const legResults = splitParlayLegs(row).map(leg => {
    const legRow = {
      ...row,
      Pick: leg,
      Selection: leg,
      Play: leg,
      Game: leg,
      Legs: '',
      'Parlay Group': '',
      'Bet Type': '',
      Type: '',
      Market: '',
      Category: ''
    }
    const verified = providerResults
      .map(providerResult => ({
        providerResult,
        result: verifyRowAgainstProvider(legRow, providerResult, options)
      }))
      .filter(item => item.result.status === 'verified' && item.result.result)
      .sort((a, b) => providerForUrl(a.providerResult.sourceUrl).priority - providerForUrl(b.providerResult.sourceUrl).priority)[0]

    if (!verified) {
      return { leg, result: '', status: 'needs_review', notes: 'No trusted source verified this parlay leg.' }
    }

    return {
      leg,
      result: verified.result.result,
      status: 'verified',
      sourceName: verified.providerResult.sourceName,
      sourceUrl: verified.providerResult.sourceUrl,
      notes: verified.result.notes
    }
  })

  const sourceNames = Array.from(new Set(legResults.map(leg => leg.sourceName).filter(Boolean)))
  const sourceUrls = Array.from(new Set(legResults.map(leg => leg.sourceUrl).filter(Boolean)))
  const notes = `Parlay legs verified: ${legResults.map(leg => `${leg.leg}=${leg.result}`).join('; ')}.`

  if (legResults.some(leg => leg.result === 'Loss')) {
    return { status: 'verified', result: 'Loss', sourceName: sourceNames.join(' / '), sourceUrl: sourceUrls.join(' '), finalScore: {}, playerStats: {}, legResults, notes }
  }
  if (legResults.some(leg => leg.status !== 'verified' || !leg.result)) {
    return {
      status: 'needs_review',
      result: '',
      finalScore: {},
      playerStats: {},
      legResults,
      notes: 'One or more parlay legs could not be verified.'
    }
  }
  if (legResults.some(leg => leg.result === 'Push' || leg.result === 'Void')) {
    return { status: 'verified', result: 'Push', sourceName: sourceNames.join(' / '), sourceUrl: sourceUrls.join(' '), finalScore: {}, playerStats: {}, legResults, notes }
  }
  return { status: 'verified', result: 'Win', sourceName: sourceNames.join(' / '), sourceUrl: sourceUrls.join(' '), finalScore: {}, playerStats: {}, legResults, notes }
}

export async function routeSettlementSources(row = {}, options = {}) {
  const urls = options.urls || collectResultSourceUrls(row)
  if (!urls.length) {
    return {
      status: 'needs_review',
      sourceName: '',
      sourceUrl: '',
      finalScore: {},
      playerStats: {},
      notes: 'No trusted result source URL was provided.',
      providerResults: []
    }
  }

  const hasBoxScoreCandidate = urls.some(url => providerForUrl(url).trustedBoxScore)
  const providerResults = []
  for (const url of urls) {
    const provider = providerForUrl(url)
    const sourceText = options.sourceTextByUrl?.[url]
    const fetched = sourceText !== undefined
      ? {
          status: 'verified',
          sourceName: sourceNameForUrl(url),
          sourceUrl: url,
          finalScore: {},
          playerStats: {},
          notes: 'Source text supplied by caller.',
          rawText: sourceText
        }
      : await fetchResultSource(provider, url, options)

    if (provider.secondaryOnly && hasBoxScoreCandidate) {
      fetched.status = fetched.status === 'verified' ? 'needs_review' : fetched.status
      fetched.notes = `${fetched.notes} Secondary source held for corroboration behind box-score providers.`
    }

    const verified = verifyRowAgainstProvider(row, fetched, { ...options, sourceText })
    providerResults.push({
      ...fetched,
      ...verified,
      sourceName: fetched.sourceName,
      sourceUrl: fetched.sourceUrl,
      finalScore: verified.finalScore || fetched.finalScore || {},
      playerStats: verified.playerStats || fetched.playerStats || {},
      notes: verified.notes || fetched.notes
    })
  }

  const verified = providerResults.filter(result => result.status === 'verified' && result.result)
  if (classifyMarket(row) === 'parlay') {
    const parlay = aggregateParlayResult(row, providerResults, options)
    if (parlay.status === 'verified') return { ...parlay, providerResults }
    return {
      status: 'needs_review',
      result: '',
      sourceName: providerResults.map(result => result.sourceName).filter(Boolean).join(' / '),
      sourceUrl: providerResults.map(result => result.sourceUrl).filter(Boolean).join(' '),
      finalScore: {},
      playerStats: {},
      notes: parlay.notes,
      legResults: parlay.legResults || [],
      providerResults
    }
  }

  const uniqueResults = Array.from(new Set(verified.map(result => result.result)))
  if (uniqueResults.length > 1) {
    return {
      status: 'needs_review',
      sourceName: verified.map(result => result.sourceName).join(' / '),
      sourceUrl: verified.map(result => result.sourceUrl).join(' '),
      finalScore: verified[0]?.finalScore || {},
      playerStats: verified[0]?.playerStats || {},
      notes: `Source conflict: ${verified.map(result => `${result.sourceName}=${result.result}`).join('; ')}`,
      providerResults
    }
  }

  if (verified.length) {
    const best = verified.sort((a, b) => providerForUrl(a.sourceUrl).priority - providerForUrl(b.sourceUrl).priority)[0]
    return {
      status: 'verified',
      result: best.result,
      sourceName: best.sourceName,
      sourceUrl: best.sourceUrl,
      finalScore: best.finalScore || {},
      playerStats: best.playerStats || {},
      notes: best.notes,
      legResults: best.legResults || [],
      providerResults
    }
  }

  const bestReview = providerResults.sort((a, b) => providerForUrl(a.sourceUrl).priority - providerForUrl(b.sourceUrl).priority)[0]
  return {
    status: 'needs_review',
    result: '',
    sourceName: bestReview?.sourceName || '',
    sourceUrl: bestReview?.sourceUrl || '',
    finalScore: bestReview?.finalScore || {},
    playerStats: bestReview?.playerStats || {},
    notes: bestReview?.notes || 'No source confirmed the needed result.',
    providerResults
  }
}

export default routeSettlementSources
