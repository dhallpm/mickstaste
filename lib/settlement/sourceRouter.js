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
  const parts = text(game)
    .split(/\s+(?:vs\.?|versus|at|@)\s+|\s+-\s+/i)
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

function classifyMarket(row = {}) {
  const value = normalize(pickText(row))
  if (/\bparlay\b|\bleg\b/.test(value) || firstValue(row, ['Legs', 'Parlay Group'])) return 'parlay'
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
  return teams.find(team => pick.includes(normalize(team)) || normalize(team).includes(pick.replace(/\bml\b|\bmoneyline\b|\bover\b|\bunder\b/g, '').trim())) || ''
}

function isTeamTotal(row = {}, teams = splitTeams(row)) {
  const value = normalize(pickText(row))
  if (/\bgame total\b|\bfull game total\b|\btotal points\b|\btotal runs\b|\btotal goals\b/.test(value)) return false
  if (/\bteam total\b/.test(value)) return true
  return Boolean(pickTeam(row, teams)) && /\btotal\b/.test(value) && /\b(?:over|under)\b/.test(value)
}

function parseExplicitResult(content = '') {
  const match = text(content).match(/\b(?:micks\s*)?(?:result|settlement result|pick result)\s*[:=-]\s*(win|loss|push|void|cancelled|canceled)\b/i)
  if (!match) return ''
  if (/^canceled$/i.test(match[1])) return 'Cancelled'
  return match[1].slice(0, 1).toUpperCase() + match[1].slice(1).toLowerCase()
}

function parseFinalScore(content = '', row = {}) {
  const teams = splitTeams(row)
  if (teams.length < 2) return {}
  const compact = text(content).replace(/\s+/g, ' ')
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
  if (actual === target) return 'Push'
  if (dir === 'over') return actual > target ? 'Win' : 'Loss'
  if (dir === 'under') return actual < target ? 'Win' : 'Loss'
  return ''
}

function resultFromScore(row = {}, finalScore = {}) {
  const teams = splitTeams(row)
  if (teams.length < 2) return ''
  const [away, home] = teams
  const awayScore = Number(finalScore[away])
  const homeScore = Number(finalScore[home])
  if (!Number.isFinite(awayScore) || !Number.isFinite(homeScore)) return ''

  const market = classifyMarket(row)
  const dir = direction(row)
  if (market === 'total' && dir) {
    if (isTeamTotal(row, teams)) {
      const team = pickTeam(row, teams)
      const teamScore = Number(finalScore[team])
      return compareOverUnder(teamScore, threshold(row), dir)
    }
    return compareOverUnder(awayScore + homeScore, threshold(row), dir)
  }

  const team = pickTeam(row, teams)
  if (!team) return ''
  const opponent = team === away ? home : away
  const teamScore = Number(finalScore[team])
  const opponentScore = Number(finalScore[opponent])
  if (!Number.isFinite(teamScore) || !Number.isFinite(opponentScore)) return ''

  const spread = parseNumber(firstValue(row, ['Pick', 'Selection', 'Play']))
  if (Number.isFinite(spread) && /[+-]\d/.test(firstValue(row, ['Pick', 'Selection', 'Play']))) {
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
    .split(/\s+\|\s+|\n|;\s+|,\s+(?=[A-Z][a-z])/)
    .map(leg => text(leg))
    .filter(Boolean)
}

function verifyRowAgainstProvider(row = {}, providerResult = {}, options = {}) {
  const rawText = providerResult.rawText || options.sourceText || ''
  const explicit = parseExplicitResult(rawText)
  const provider = providerForUrl(providerResult.sourceUrl)
  const boxScore = isBoxScoreLikeContent(rawText, provider)
  const recapOnly = isRecapOnlyContent(rawText, provider)
  const finalScore = Object.keys(providerResult.finalScore || {}).length ? providerResult.finalScore : parseFinalScore(rawText, row)
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
    if (legResults.some(leg => leg.status !== 'verified' || !leg.result)) {
      return { status: 'needs_review', result: '', finalScore, playerStats, legResults, notes: 'One or more parlay legs could not be verified.' }
    }
    if (legResults.some(leg => leg.result === 'Loss')) {
      return { status: 'verified', result: 'Loss', finalScore, playerStats, legResults, notes: 'At least one parlay leg lost.' }
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
