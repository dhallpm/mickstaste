import { collectResultSourceUrls, sourceNameForUrl, sourcePriorityForUrl } from './resultSources.js'

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

function dateKey(value) {
  const raw = text(value)
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString().slice(0, 10)
}

function compactDate(value) {
  return dateKey(value).replace(/-/g, '')
}

function normalize(value = '') {
  return text(value).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim()
}

const TEAM_ALIASES = new Map(Object.entries({
  'new york yankees': 'yankees',
  yankees: 'yankees',
  'cleveland guardians': 'guardians',
  guardians: 'guardians',
  'boston red sox': 'red sox',
  'red sox': 'red sox',
  'tampa bay rays': 'rays',
  rays: 'rays',
  'milwaukee brewers': 'brewers',
  brewers: 'brewers',
  'oakland athletics': 'athletics',
  'athletics': 'athletics',
  'a s': 'athletics',
  'baltimore orioles': 'orioles',
  orioles: 'orioles',
  'atlanta braves': 'braves',
  braves: 'braves',
  'new york mets': 'mets',
  mets: 'mets',
  'seattle mariners': 'mariners',
  mariners: 'mariners',
  'los angeles dodgers': 'dodgers',
  dodgers: 'dodgers',
  'chicago cubs': 'cubs',
  cubs: 'cubs',
  'chicago sky': 'sky',
  sky: 'sky',
  'toronto tempo': 'tempo',
  tempo: 'tempo',
  'connecticut sun': 'sun',
  sun: 'sun',
  'minnesota lynx': 'lynx',
  lynx: 'lynx',
  'carolina hurricanes': 'hurricanes',
  hurricanes: 'hurricanes',
  'florida panthers': 'panthers',
  panthers: 'panthers',
  'edmonton oilers': 'oilers',
  oilers: 'oilers',
  'vegas golden knights': 'golden knights',
  'golden knights': 'golden knights',
  knights: 'golden knights',
  vegas: 'golden knights',
  'south korea': 'south korea',
  korea: 'south korea',
  czechia: 'czechia',
  'czech republic': 'czechia',
  canada: 'canada',
  'bosnia and herzegovina': 'bosnia and herzegovina',
  bosnia: 'bosnia and herzegovina'
}))

const TEAM_LEAGUE_ALIASES = new Map(Object.entries({
  yankees: 'MLB',
  guardians: 'MLB',
  'red sox': 'MLB',
  rays: 'MLB',
  brewers: 'MLB',
  athletics: 'MLB',
  orioles: 'MLB',
  braves: 'MLB',
  mets: 'MLB',
  mariners: 'MLB',
  dodgers: 'MLB',
  cubs: 'MLB',
  sky: 'WNBA',
  tempo: 'WNBA',
  sun: 'WNBA',
  lynx: 'WNBA',
  hurricanes: 'NHL',
  panthers: 'NHL',
  oilers: 'NHL',
  'golden knights': 'NHL'
}))

export function normalizeTeamName(name = '') {
  const cleaned = normalize(name)
  return TEAM_ALIASES.get(cleaned) || cleaned
}

function tokenSet(value = '') {
  return new Set(normalizeTeamName(value).split(/\s+/).filter(Boolean))
}

function teamScore(query = '', candidate = '') {
  const left = tokenSet(query)
  const right = tokenSet(candidate)
  if (!left.size || !right.size) return 0
  const leftText = Array.from(left).join(' ')
  const rightText = Array.from(right).join(' ')
  if (leftText === rightText) return 1
  if (leftText.includes(rightText) || rightText.includes(leftText)) return 0.9
  let hits = 0
  for (const token of left) if (right.has(token)) hits += 1
  return hits / Math.max(left.size, right.size)
}

export function inferTeamsFromGame(game = '') {
  const raw = text(game)
  if (!raw) return []
  const cleaned = raw
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(?:under|over|total|moneyline|ml|spread|watchlist|pass)\b.*$/i, '')
    .trim()
  const parts = cleaned
    .split(/\s+(?:vs\.?|versus|at|@)\s+|\s+-\s+|\s+\/\s+|\//i)
    .map(part => text(part))
    .filter(part => part && !/^[+-]?\d+(?:\.\d+)?$/.test(part))
  return parts.length >= 2 ? [parts[0], parts[1]] : []
}

function inferGameFromPick(row = {}) {
  const game = firstValue(row, ['Game', 'Matchup', 'Event'])
  if (game) return text(game)
  const pick = firstValue(row, ['Pick', 'Selection', 'Play'])
  const teams = inferTeamsFromGame(pick)
  return teams.length >= 2 ? `${teams[0]} vs ${teams[1]}` : ''
}

function cleanedPickSide(value = '') {
  return normalize(value)
    .replace(/\bml\b|\bmoneyline\b|\bmoney\s*line\b|\bover\b|\bunder\b|\bteam\s+total\b|\btotal\b/g, ' ')
    .replace(/\b(?:first|1st|f5|five|innings?|inning)\b/g, ' ')
    .replace(/\bwatchlist\b|\bpass\b|\bno\s+release\b|\bfree\s+watchlist\b|\bor\s+better\b/g, ' ')
    .replace(/\b\d+(?:\.\d+)?\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function inferTeamFromText(value = '') {
  const cleaned = cleanedPickSide(value)
  if (!cleaned) return ''
  for (const [name, alias] of TEAM_ALIASES.entries()) {
    if (cleaned.includes(name) || cleaned.includes(alias)) return name
  }
  return ''
}

function inferTeamCandidates(row = {}) {
  const values = [
    firstValue(row, ['Team', 'Side']),
    firstValue(row, ['Game', 'Matchup', 'Event']),
    firstValue(row, ['Pick', 'Selection', 'Play'])
  ].filter(Boolean)
  const candidates = []
  for (const value of values) {
    const teams = inferTeamsFromGame(value)
    candidates.push(...teams)
    const team = inferTeamFromText(value)
    if (team) candidates.push(team)
  }
  return Array.from(new Set(candidates.map(candidate => text(candidate)).filter(Boolean)))
}

function hasPlusSeparatedLegs(value = '') {
  return text(value).split(/\s+\+\s+(?=[A-Z])/).filter(Boolean).length >= 2
}

function splitParlayLegs(row = {}) {
  const pick = firstValue(row, ['Pick', 'Selection', 'Play'])
  const explicitLegs = firstValue(row, ['Legs', 'Parlay Group'])
  const source = hasPlusSeparatedLegs(pick) ? pick : explicitLegs || pick
  return text(source)
    .split(/\s+\|\s+|\n|;\s+|\s+\+\s+(?=[A-Z])|\s+\/\s+|,\s+(?=[A-Z][a-z])/)
    .map(leg => text(leg))
    .filter(Boolean)
}

function isParlayPick(row = {}) {
  const value = normalize([
    firstValue(row, ['Pick', 'Selection', 'Play']),
    firstValue(row, ['Bet Type', 'Type', 'Market']),
    firstValue(row, ['Category']),
    firstValue(row, ['Legs', 'Parlay Group'])
  ].filter(Boolean).join(' '))
  return /\bparlay\b|\blegs?\b/.test(value) || /\|/.test(firstValue(row, ['Pick', 'Selection', 'Play'])) || hasPlusSeparatedLegs(firstValue(row, ['Pick', 'Selection', 'Play']))
}

function isFirstFivePick(value = '') {
  return /\b(?:first\s*5|first\s*five|1st\s*5|f5|5\s*innings?|five\s*innings?)\b/i.test(value)
}

function inferLeagueForPick(row = {}, fallback = '') {
  const explicit = firstValue(row, ['League', 'Sport'])
  if (leagueFamily(explicit) && !/[\/,+&]/.test(explicit)) return explicit
  const value = [
    firstValue(row, ['Pick', 'Selection', 'Play']),
    firstValue(row, ['Game', 'Matchup', 'Event']),
    fallback
  ].join(' ')
  for (const team of inferTeamCandidates({ ...row, Pick: value, Game: value })) {
    const league = TEAM_LEAGUE_ALIASES.get(normalizeTeamName(team))
    if (league) return league
  }
  if (/\bstrikeouts?\b|\bks?\b/.test(normalize(value))) return 'MLB'
  if (leagueFamily(fallback) && !/[\/,+&]/.test(fallback)) return fallback
  if (/\bdraw no bet\b|\bdnb\b|\bno draw\b|\bdouble chance\b|\bsoccer\b|\bfifa\b|\bworld cup\b/i.test(value)) return 'Soccer'
  return explicit
}

export function inferPlayerFromPick(row = {}) {
  const direct = firstValue(row, ['Player', 'Athlete', 'Player Name'])
  if (direct) return text(direct)
  const pick = firstValue(row, ['Pick', 'Selection', 'Play', 'Prop'])
  return text(pick)
    .replace(/\s*(?:-|\u2013)\s*/g, ' ')
    .replace(/\b(?:over|under)\b.*$/i, '')
    .replace(/\b\d+(?:\.\d+)?\s*\+\s*(?:strikeouts?|ks?|goals?|points?|rebounds?|assists?)\b.*$/i, '')
    .replace(/\b(?:hrr|hits?\s*\+\s*runs?\s*\+\s*rbi|anytime goal|to score|strikeouts?|ks?|shots?\s+on\s+goal|sog)\b.*$/i, '')
    .replace(/\b(?:ml|moneyline|spread|total|team total)\b.*$/i, '')
    .trim()
}

function rowLeague(row = {}) {
  return normalize(firstValue(row, ['League', 'Sport', 'Category', 'Bet Type']))
}

function isPlayerStatPick(row = {}) {
  const value = normalize([
    firstValue(row, ['Pick', 'Selection', 'Play', 'Prop']),
    firstValue(row, ['Bet Type', 'Type', 'Market']),
    firstValue(row, ['Category'])
  ].filter(Boolean).join(' '))
  return /\bstrikeouts?\b|\bks?\b|\bhrr\b|hits?\s+runs?\s+rbi|\banytime goal\b|\bto score\b|\bshots?\s+on\s+goal\b|\bsog\b/.test(value)
}

function leagueFamily(league = '') {
  const value = normalize(league)
  if (/\bmlb\b|baseball/.test(value)) return 'mlb'
  if (/\bwnba\b/.test(value)) return 'wnba'
  if (/\bnba\b|basketball/.test(value)) return 'nba'
  if (/\bnhl\b|hockey/.test(value)) return 'nhl'
  if (/\bsoccer\b|\bfifa\b|\bworld cup\b|\binternational friendly\b|\bdraw no bet\b|\bdnb\b|\bno draw\b|\bdouble chance\b/.test(value)) return 'soccer'
  return ''
}

function unitsLabel(family) {
  if (family === 'mlb') return 'runs'
  if (family === 'nhl') return 'goals'
  return 'points'
}

async function fetchJson(url, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch
  if (!fetchImpl) throw new Error('Fetch is unavailable for source discovery.')
  const response = await fetchImpl(url, { headers: { 'User-Agent': 'MicksPicksSettlement/1.0' } })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText || 'fetch failed'}`)
  return response.json()
}

function sourceResult(sourceUrl, rawText, notes = '') {
  return {
    sourceName: sourceNameForUrl(sourceUrl),
    sourceUrl,
    priority: sourcePriorityForUrl(sourceUrl),
    rawText,
    notes
  }
}

function competitorNames(competitor = {}) {
  const team = competitor.team || competitor
  return [
    team.displayName,
    team.name,
    team.shortDisplayName,
    team.location,
    team.abbreviation,
    competitor.displayName,
    competitor.name
  ].filter(Boolean).map(value => text(value))
}

function matchCompetitor(rowTeam, competitors = []) {
  let best = null
  for (const competitor of competitors) {
    const score = Math.max(...competitorNames(competitor).map(name => teamScore(rowTeam, name)), 0)
    if (!best || score > best.score) best = { competitor, score }
  }
  return best && best.score >= 0.45 ? best.competitor : null
}

function finalScoreText(rowTeams = [], competitors = [], family = '') {
  if (rowTeams.length < 2) {
    const [firstCompetitor, secondCompetitor] = competitors
    const firstName = competitorNames(firstCompetitor)[0]
    const secondName = competitorNames(secondCompetitor)[0]
    const firstScore = Number(firstCompetitor?.score ?? firstCompetitor?.team?.score)
    const secondScore = Number(secondCompetitor?.score ?? secondCompetitor?.team?.score)
    if (!firstName || !secondName || !Number.isFinite(firstScore) || !Number.isFinite(secondScore)) return ''
    return `Box Score Final: ${firstName} ${firstScore}, ${secondName} ${secondScore} ${unitsLabel(family)}.`
  }

  const first = matchCompetitor(rowTeams[0], competitors)
  const second = rowTeams[1] ? matchCompetitor(rowTeams[1], competitors) : competitors.find(competitor => competitor !== first)
  const firstScore = Number(first?.score ?? first?.team?.score)
  const secondScore = Number(second?.score ?? second?.team?.score)
  if (!Number.isFinite(firstScore) || !Number.isFinite(secondScore)) return ''
  return `Box Score Final: ${rowTeams[0]} ${firstScore}, ${rowTeams[1]} ${secondScore} ${unitsLabel(family)}.`
}

function eventMatchesGame(event, rowTeams = []) {
  if (!rowTeams.length) return false
  const competitors = event.competitions?.[0]?.competitors || []
  return rowTeams.every(team => matchCompetitor(team, competitors))
}

function mlbTeamNames(team = {}) {
  return [
    team.name,
    team.teamName,
    team.locationName,
    team.abbreviation,
    team.clubName
  ].filter(Boolean)
}

function matchMlbTeam(rowTeam, team = {}) {
  return Math.max(...mlbTeamNames(team).map(name => teamScore(rowTeam, name)), 0) >= 0.45
}

function mlbGameMatches(game, rowTeams = []) {
  if (!rowTeams.length) return false
  return [
    game.teams?.away?.team,
    game.teams?.home?.team
  ].every(Boolean) && rowTeams.every(rowTeam =>
    matchMlbTeam(rowTeam, game.teams.away.team) || matchMlbTeam(rowTeam, game.teams.home.team)
  )
}

function mlbScoreFor(rowTeam, game) {
  if (matchMlbTeam(rowTeam, game.teams?.away?.team)) return Number(game.teams?.away?.score)
  if (matchMlbTeam(rowTeam, game.teams?.home?.team)) return Number(game.teams?.home?.score)
  return NaN
}

function mlbFirstFiveScoreFor(rowTeam, game, linescore = {}) {
  const side = matchMlbTeam(rowTeam, game.teams?.away?.team) ? 'away' : matchMlbTeam(rowTeam, game.teams?.home?.team) ? 'home' : ''
  if (!side) return NaN
  const score = (linescore.innings || [])
    .filter(inning => Number(inning.num) >= 1 && Number(inning.num) <= 5)
    .reduce((sum, inning) => sum + Number(inning[side]?.runs || 0), 0)
  return Number.isFinite(score) ? score : NaN
}

function playerScore(query = '', candidate = '') {
  const left = normalize(query)
  const right = normalize(candidate)
  if (!left || !right) return 0
  if (left === right) return 1
  if (right.includes(left) || left.includes(right)) return 0.9
  const leftParts = left.split(/\s+/)
  const rightPartsArray = right.split(/\s+/)
  const rightParts = new Set(rightPartsArray)
  if (leftParts.length >= 2 && rightPartsArray.length >= 2) {
    const leftLast = leftParts.at(-1)
    const rightLast = rightPartsArray.at(-1)
    if (leftLast === rightLast && leftParts[0][0] === rightPartsArray[0][0]) return 0.95
  }
  return leftParts.filter(part => rightParts.has(part)).length / Math.max(leftParts.length, rightParts.size)
}

function matchPlayer(players = [], player = '') {
  let best = null
  for (const candidate of players) {
    const name = candidate.person?.fullName || candidate.fullName || candidate.displayName || candidate.athlete?.displayName || ''
    const score = playerScore(player, name)
    if (!best || score > best.score) best = { candidate, score }
  }
  return best && best.score >= 0.55 ? best.candidate : null
}

function mlbPlayerStatText(boxscore = {}, player = '') {
  if (!player) return ''
  const teams = [boxscore.teams?.away, boxscore.teams?.home].filter(Boolean)
  const players = teams.flatMap(team => Object.values(team.players || {}))
  const match = matchPlayer(players, player)
  if (!match) return ''
  const batting = match.stats?.batting || {}
  const pitching = match.stats?.pitching || {}
  const parts = []
  if (Number.isFinite(Number(pitching.strikeOuts))) {
    parts.push(`Pitching ${player} strikeouts ${Number(pitching.strikeOuts)}.`)
  }
  if ([batting.hits, batting.runs, batting.rbi].some(value => Number.isFinite(Number(value)))) {
    parts.push(`Batting ${player} hits ${Number(batting.hits || 0)} runs ${Number(batting.runs || 0)} RBI ${Number(batting.rbi || 0)}.`)
  }
  return parts.join(' ')
}

async function discoverMlbOfficial({ game, date, player, pick }, options = {}) {
  const rowTeams = inferTeamsFromGame(game)
  const teamCandidates = rowTeams.length ? rowTeams : inferTeamCandidates({ Game: game, Pick: game })
  if (!teamCandidates.length && !player) return []
  const scheduleUrl = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${encodeURIComponent(dateKey(date))}`
  const schedule = await fetchJson(scheduleUrl, options)
  const games = (schedule.dates || []).flatMap(day => day.games || [])
  let cachedBoxscore = null
  let gameMatch = teamCandidates.length
    ? games.find(candidate => mlbGameMatches(candidate, teamCandidates))
    : null

  if (!gameMatch && player) {
    for (const candidate of games) {
      try {
        const boxscore = await fetchJson(`https://statsapi.mlb.com/api/v1/game/${candidate.gamePk}/boxscore`, options)
        if (mlbPlayerStatText(boxscore, player)) {
          gameMatch = candidate
          cachedBoxscore = boxscore
          break
        }
      } catch {
        // Try the next MLB game on the date.
      }
    }
  }

  if (!gameMatch) return []
  const resolvedTeams = rowTeams.length >= 2 ? rowTeams : [
    gameMatch.teams?.away?.team?.name || gameMatch.teams?.away?.team?.teamName,
    gameMatch.teams?.home?.team?.name || gameMatch.teams?.home?.team?.teamName
  ].filter(Boolean)
  const firstScore = mlbScoreFor(resolvedTeams[0], gameMatch)
  const secondScore = mlbScoreFor(resolvedTeams[1], gameMatch)
  if (!Number.isFinite(firstScore) || !Number.isFinite(secondScore)) return []
  const firstFive = isFirstFivePick(pick)
  const sourceUrl = firstFive
    ? `https://statsapi.mlb.com/api/v1/game/${gameMatch.gamePk}/linescore`
    : `https://statsapi.mlb.com/api/v1/game/${gameMatch.gamePk}/boxscore`
  let rawText = `Box Score Final: ${resolvedTeams[0]} ${firstScore}, ${resolvedTeams[1]} ${secondScore} runs.`
  if (firstFive) {
    try {
      const linescore = await fetchJson(sourceUrl, options)
      const firstFiveFirst = mlbFirstFiveScoreFor(resolvedTeams[0], gameMatch, linescore)
      const firstFiveSecond = mlbFirstFiveScoreFor(resolvedTeams[1], gameMatch, linescore)
      if (Number.isFinite(firstFiveFirst) && Number.isFinite(firstFiveSecond)) {
        rawText = `First 5 Final: ${resolvedTeams[0]} ${firstFiveFirst}, ${resolvedTeams[1]} ${firstFiveSecond} runs. ${rawText}`
      }
    } catch {
      rawText = `First 5 linescore could not be loaded. ${rawText}`
    }
  }
  try {
    const boxscoreUrl = `https://statsapi.mlb.com/api/v1/game/${gameMatch.gamePk}/boxscore`
    const boxscore = cachedBoxscore || await fetchJson(boxscoreUrl, options)
    rawText = `${rawText} ${mlbPlayerStatText(boxscore, player)}`
  } catch {
    rawText = `${rawText} Player stat table could not be loaded.`
  }
  return [sourceResult(sourceUrl, rawText, 'Discovered from MLB Stats API schedule and box score.')]
}

const ESPN_PATHS = {
  mlb: 'baseball/mlb',
  nba: 'basketball/nba',
  wnba: 'basketball/wnba',
  nhl: 'hockey/nhl',
  soccer: [
    'soccer/fifa.world',
    'soccer/fifa.friendly',
    'soccer/fifa.worldq.uefa',
    'soccer/fifa.worldq.concacaf',
    'soccer/fifa.worldq.afc'
  ]
}

function espnEventUrl(family, eventId) {
  const path = Array.isArray(ESPN_PATHS[family]) ? ESPN_PATHS[family][0] : ESPN_PATHS[family]
  return `https://site.api.espn.com/apis/site/v2/sports/${path}/summary?event=${encodeURIComponent(eventId)}`
}

function espnScoreboardUrl(path, date) {
  return `https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard?dates=${compactDate(date)}`
}

function espnStatText(summary = {}, player = '') {
  if (!player) return ''
  const players = summary.boxscore?.players || []
  for (const team of players) {
    for (const group of team.statistics || []) {
      const labels = group.labels || group.names || []
      const athlete = matchPlayer(group.athletes || [], player)
      if (!athlete) continue
      const stats = athlete.stats || []
      const lookup = Object.fromEntries(labels.map((label, index) => [normalize(label), stats[index]]))
      const strikeouts = lookup.k ?? lookup.so ?? lookup.strikeouts
      const hits = lookup.h ?? lookup.hits
      const runs = lookup.r ?? lookup.runs
      const rbi = lookup.rbi
      const shotsOnGoal = lookup.sog ?? lookup.shotsongoal ?? lookup.shots
      const parts = []
      if (strikeouts !== undefined) parts.push(`Pitching ${player} strikeouts ${strikeouts}.`)
      if ([hits, runs, rbi].some(value => value !== undefined)) {
        parts.push(`Batting ${player} hits ${hits || 0} runs ${runs || 0} RBI ${rbi || 0}.`)
      }
      if (shotsOnGoal !== undefined) parts.push(`Player Stats ${player} shots on goal ${shotsOnGoal}.`)
      if (parts.length) return parts.join(' ')
    }
  }
  return ''
}

async function discoverEspn({ family, game, date, player }, options = {}) {
  const paths = Array.isArray(ESPN_PATHS[family]) ? ESPN_PATHS[family] : [ESPN_PATHS[family]]
  const rowTeams = inferTeamsFromGame(game)
  const teamCandidates = rowTeams.length ? rowTeams : inferTeamCandidates({ Game: game, Pick: game })
  if (!paths[0] || !teamCandidates.length) return []
  for (const path of paths) {
    const scoreboardUrl = espnScoreboardUrl(path, date)
    const scoreboard = await fetchJson(scoreboardUrl, options)
    const event = (scoreboard.events || []).find(candidate => eventMatchesGame(candidate, teamCandidates))
    if (!event) continue
    const competitors = event.competitions?.[0]?.competitors || []
    const scoreText = finalScoreText(rowTeams.length >= 2 ? rowTeams : [], competitors, family)
    if (!scoreText) continue
    const sourceUrl = `https://site.api.espn.com/apis/site/v2/sports/${path}/summary?event=${encodeURIComponent(event.id)}`
    let rawText = scoreText
    try {
      const summary = await fetchJson(sourceUrl, options)
      rawText = `${rawText} ${espnStatText(summary, player)}`
    } catch {
      rawText = `${rawText} ESPN summary stat table could not be loaded.`
    }
    return [sourceResult(sourceUrl, rawText, 'Discovered from ESPN scoreboard and summary.')]
  }
  return []
}

function nhlTeamNames(team = {}) {
  return [
    team.name?.default,
    team.commonName?.default,
    team.placeName?.default,
    team.abbrev
  ].filter(Boolean)
}

function matchNhlTeam(rowTeam, team = {}) {
  return Math.max(...nhlTeamNames(team).map(name => teamScore(rowTeam, name)), 0) >= 0.45
}

function nhlGameMatches(game, rowTeams = []) {
  return rowTeams.length >= 1 && rowTeams.every(rowTeam =>
    matchNhlTeam(rowTeam, game.awayTeam) || matchNhlTeam(rowTeam, game.homeTeam)
  )
}

function nhlScoreFor(rowTeam, game) {
  if (matchNhlTeam(rowTeam, game.awayTeam)) return Number(game.awayTeam?.score)
  if (matchNhlTeam(rowTeam, game.homeTeam)) return Number(game.homeTeam?.score)
  return NaN
}

function nhlRosterName(spot = {}) {
  return [spot.firstName?.default, spot.lastName?.default].filter(Boolean).join(' ')
}

function nhlGoalText(playByPlay = {}, player = '') {
  if (!player) return ''
  const roster = new Map((playByPlay.rosterSpots || []).map(spot => [spot.playerId, nhlRosterName(spot)]))
  let goals = 0
  for (const play of playByPlay.plays || []) {
    if (play.typeDescKey !== 'goal') continue
    const scorerId = play.details?.scoringPlayerId
    const scorerName = roster.get(scorerId) || ''
    if (playerScore(player, scorerName) >= 0.55) goals += 1
  }
  return `Scoring Summary ${player} goals ${goals}.`
}

function nhlRosterHasPlayer(playByPlay = {}, player = '') {
  if (!player) return false
  return (playByPlay.rosterSpots || []).some(spot => playerScore(player, nhlRosterName(spot)) >= 0.55)
}

function nhlPlayerStatText(boxscore = {}, player = '') {
  if (!player) return ''
  const groups = [
    boxscore.playerByGameStats?.awayTeam?.forwards,
    boxscore.playerByGameStats?.awayTeam?.defense,
    boxscore.playerByGameStats?.homeTeam?.forwards,
    boxscore.playerByGameStats?.homeTeam?.defense
  ].flatMap(group => Array.isArray(group) ? group : [])
  const match = groups.find(candidate => playerScore(player, candidate.name?.default || '') >= 0.55)
  if (!match) return ''
  const parts = []
  if (Number.isFinite(Number(match.goals))) parts.push(`Player Stats ${player} goals ${Number(match.goals)}.`)
  if (Number.isFinite(Number(match.sog))) parts.push(`Player Stats ${player} shots on goal ${Number(match.sog)}.`)
  return parts.join(' ')
}

async function discoverNhlOfficial({ game, date, player }, options = {}) {
  const rowTeams = inferTeamsFromGame(game)
  const teamCandidates = rowTeams.length ? rowTeams : inferTeamCandidates({ Game: game, Pick: game })
  if (!teamCandidates.length && !player) return []
  const scheduleUrl = `https://api-web.nhle.com/v1/schedule/${encodeURIComponent(dateKey(date))}`
  const schedule = await fetchJson(scheduleUrl, options)
  const games = (schedule.gameWeek || []).flatMap(day => day.games || [])
  let playByPlayForMatch = null
  let gameMatch = teamCandidates.length
    ? games.find(candidate => nhlGameMatches(candidate, teamCandidates))
    : null

  if (!gameMatch && player) {
    for (const candidate of games) {
      try {
        const playByPlay = await fetchJson(`https://api-web.nhle.com/v1/gamecenter/${candidate.id}/play-by-play`, options)
        if (nhlRosterHasPlayer(playByPlay, player)) {
          gameMatch = candidate
          playByPlayForMatch = playByPlay
          break
        }
      } catch {
        // Try the next game on the date.
      }
    }
  }

  if (!gameMatch) return []
  const resolvedTeams = rowTeams.length >= 2 ? rowTeams : [
    `${gameMatch.awayTeam?.placeName?.default || ''} ${gameMatch.awayTeam?.commonName?.default || ''}`.trim(),
    `${gameMatch.homeTeam?.placeName?.default || ''} ${gameMatch.homeTeam?.commonName?.default || ''}`.trim()
  ].filter(Boolean)
  const firstScore = nhlScoreFor(resolvedTeams[0], gameMatch)
  const secondScore = nhlScoreFor(resolvedTeams[1], gameMatch)
  if (!Number.isFinite(firstScore) || !Number.isFinite(secondScore)) return []
  const sourceUrl = `https://api-web.nhle.com/v1/gamecenter/${gameMatch.id}/boxscore`
  let rawText = `Box Score Final: ${resolvedTeams[0]} ${firstScore}, ${resolvedTeams[1]} ${secondScore} goals.`
  try {
    const boxscore = await fetchJson(sourceUrl, options)
    rawText = `${rawText} ${nhlPlayerStatText(boxscore, player)}`
  } catch {
    rawText = `${rawText} NHL player stat table could not be loaded.`
  }
  try {
    const playByPlay = playByPlayForMatch || await fetchJson(`https://api-web.nhle.com/v1/gamecenter/${gameMatch.id}/play-by-play`, options)
    rawText = `${rawText} ${nhlGoalText(playByPlay, player)}`
  } catch {
    rawText = `${rawText} NHL scoring summary could not be loaded.`
  }
  return [sourceResult(sourceUrl, rawText, 'Discovered from NHL schedule and gamecenter box score.')]
}

async function withDiscoveryFallbacks(tasks = []) {
  const found = []
  const errors = []
  for (const task of tasks) {
    try {
      const result = await task()
      found.push(...result)
    } catch (error) {
      errors.push(error.message || String(error))
    }
    if (found.length) break
  }
  return { found, errors }
}

export async function discoverGameBoxScoreSources({ league, game, date, pick }, options = {}) {
  const family = leagueFamily(league)
  if (!family || !dateKey(date)) return []
  const teamCandidates = inferTeamCandidates({ Game: game, Pick: game })
  if (!teamCandidates.length) return []

  const tasks = []
  if (family === 'mlb') tasks.push(() => discoverMlbOfficial({ game, date, pick }, options))
  if (family === 'nhl') tasks.push(() => discoverNhlOfficial({ game, date }, options))
  tasks.push(() => discoverEspn({ family, game, date }, options))

  const { found } = await withDiscoveryFallbacks(tasks)
  return found.sort((a, b) => a.priority - b.priority)
}

export async function discoverPlayerStatSources({ league, game, player, date, betType, prop }, options = {}) {
  const family = leagueFamily(`${league} ${betType} ${prop}`)
  const resolvedPlayer = text(player)
  const teamCandidates = inferTeamCandidates({ Game: game, Pick: `${game} ${prop}` })
  if (!family || !dateKey(date) || (!teamCandidates.length && !(['mlb', 'nhl'].includes(family) && resolvedPlayer))) return []

  const tasks = []
  if (family === 'mlb') tasks.push(() => discoverMlbOfficial({ game, date, player: resolvedPlayer, pick: prop }, options))
  if (family === 'nhl') tasks.push(() => discoverNhlOfficial({ game, date, player: resolvedPlayer }, options))
  tasks.push(() => discoverEspn({ family, game, date, player: resolvedPlayer }, options))

  const { found } = await withDiscoveryFallbacks(tasks)
  return found.sort((a, b) => a.priority - b.priority)
}

export async function discoverTrustedSourcesForPick(row = {}, options = {}) {
  const existingUrls = collectResultSourceUrls(row)
  if (existingUrls.length) {
    return {
      urls: existingUrls,
      sourceTextByUrl: {},
      discoveredSources: existingUrls.map(url => ({
        sourceName: sourceNameForUrl(url),
        sourceUrl: url,
        priority: sourcePriorityForUrl(url),
        discoveryMethod: 'prefilled'
      })),
      notes: 'Using prefilled result source URL.'
    }
  }

  const league = firstValue(row, ['League', 'Sport'])
  const game = inferGameFromPick(row)
  const date = firstValue(row, ['Date', 'Game Date', 'Posted Time', 'Timestamp'])
  const player = inferPlayerFromPick(row)
  const betType = firstValue(row, ['Bet Type', 'Type', 'Market', 'Category'])
  const prop = firstValue(row, ['Prop', 'Pick', 'Selection', 'Play'])

  if (isParlayPick(row)) {
    const urls = []
    const sourceTextByUrl = {}
    const discoveredSources = []
    for (const leg of splitParlayLegs(row)) {
      const legLeague = inferLeagueForPick({ Pick: leg, Game: leg }, league)
      const legRow = {
        ...row,
        Pick: leg,
        Selection: leg,
        Play: leg,
        Legs: '',
        'Parlay Group': '',
        'Bet Type': '',
        Type: '',
        Market: '',
        Category: '',
        League: legLeague,
        Sport: legLeague,
        Game: inferGameFromPick({ Pick: leg }) || leg
      }
      const discovery = await discoverTrustedSourcesForPick(legRow, options)
      for (const url of discovery.urls || []) {
        if (!urls.includes(url)) urls.push(url)
        if (discovery.sourceTextByUrl?.[url]) sourceTextByUrl[url] = discovery.sourceTextByUrl[url]
      }
      discoveredSources.push(...(discovery.discoveredSources || []).map(source => ({
        ...source,
        leg
      })))
    }
    return {
      urls,
      sourceTextByUrl,
      discoveredSources,
      notes: urls.length
        ? `Discovered ${urls.length} trusted result source${urls.length === 1 ? '' : 's'} across parlay legs.`
        : 'No trusted result source found for parlay legs.'
    }
  }

  const resolvedLeague = inferLeagueForPick(row, league)
  const resolvedGame = game || firstValue(row, ['Pick', 'Selection', 'Play'])
  const sources = isPlayerStatPick(row)
    ? await discoverPlayerStatSources({ league: resolvedLeague, game: resolvedGame, player, date, betType, prop }, options)
    : await discoverGameBoxScoreSources({ league: resolvedLeague, game: resolvedGame, date, pick: prop }, options)

  const urls = Array.from(new Set(sources.map(source => source.sourceUrl)))
  const sourceTextByUrl = Object.fromEntries(sources.map(source => [source.sourceUrl, source.rawText]))
  return {
    urls,
    sourceTextByUrl,
    discoveredSources: sources.map(source => ({
      sourceName: source.sourceName,
      sourceUrl: source.sourceUrl,
      priority: source.priority,
      notes: source.notes
    })),
    notes: urls.length
      ? `Discovered ${urls.length} trusted result source${urls.length === 1 ? '' : 's'}.`
      : 'No trusted result source found from league, game, date, pick, bet type, player, or prop.'
  }
}

export default discoverTrustedSourcesForPick
