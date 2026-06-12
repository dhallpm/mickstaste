import assert from 'node:assert/strict'
import {
  discoverTrustedSourcesForPick,
  inferPlayerFromPick,
  inferTeamsFromGame,
  normalizeTeamName
} from '../lib/settlement/sourceDiscovery.js'

assert.deepEqual(inferTeamsFromGame('Boston Red Sox vs Tampa Bay Rays'), ['Boston Red Sox', 'Tampa Bay Rays'])
assert.deepEqual(inferTeamsFromGame('Yankees/Guardians Under 8.5'), ['Yankees', 'Guardians'])
assert.equal(inferPlayerFromPick({ Pick: 'Colton Cowser HRR Over 0.5' }), 'Colton Cowser')
assert.equal(inferPlayerFromPick({ Pick: 'Nick Martinez 5+ Strikeouts' }), 'Nick Martinez')
assert.equal(inferPlayerFromPick({ Pick: 'Jordan Staal - Over 1.5 Shots on Goal' }), 'Jordan Staal')
assert.equal(normalizeTeamName('New York Yankees'), 'yankees')
assert.equal(normalizeTeamName('Czech Republic'), 'czechia')

const fetchImpl = async url => {
  const value = String(url)
  if (value.includes('/api/v1/schedule')) {
    return {
      ok: true,
      json: async () => ({
        dates: [{
          games: [{
            gamePk: 12345,
            teams: {
              away: { score: 4, team: { name: 'Baltimore Orioles', teamName: 'Orioles' } },
              home: { score: 2, team: { name: 'Boston Red Sox', teamName: 'Red Sox' } }
            }
          }, {
            gamePk: 67890,
            teams: {
              away: { score: 5, team: { name: 'Atlanta Braves', teamName: 'Braves' } },
              home: { score: 4, team: { name: 'New York Mets', teamName: 'Mets' } }
            }
          }, {
            gamePk: 99999,
            teams: {
              away: { score: 6, team: { name: 'Los Angeles Dodgers', teamName: 'Dodgers' } },
              home: { score: 2, team: { name: 'San Diego Padres', teamName: 'Padres' } }
            }
          }]
        }]
      })
    }
  }
  if (value.includes('/api/v1/game/12345/boxscore')) {
    return {
      ok: true,
      json: async () => ({
        teams: {
          away: {
            players: {
              ID1: {
                person: { fullName: 'Colton Cowser' },
                stats: { batting: { hits: 1, runs: 0, rbi: 0 } }
              }
            }
          },
          home: {
            players: {
              ID2: {
                person: { fullName: 'Nick Martinez' },
                stats: { pitching: { strikeOuts: 5 } }
              }
            }
          }
        }
      })
    }
  }
  if (value.includes('/api/v1/game/67890/linescore')) {
    return {
      ok: true,
      json: async () => ({
        innings: [
          { num: 1, away: { runs: 1 }, home: { runs: 0 } },
          { num: 2, away: { runs: 0 }, home: { runs: 0 } },
          { num: 3, away: { runs: 1 }, home: { runs: 0 } },
          { num: 4, away: { runs: 0 }, home: { runs: 1 } },
          { num: 5, away: { runs: 1 }, home: { runs: 0 } },
          { num: 6, away: { runs: 2 }, home: { runs: 3 } }
        ]
      })
    }
  }
  if (value.includes('/api/v1/game/67890/boxscore')) {
    return {
      ok: true,
      json: async () => ({ teams: { away: { players: {} }, home: { players: {} } } })
    }
  }
  if (value.includes('/api/v1/game/99999/boxscore')) {
    return {
      ok: true,
      json: async () => ({
        teams: {
          away: {
            players: {
              ID17: {
                person: { fullName: 'Shohei Ohtani' },
                stats: { pitching: { strikeOuts: 7 } }
              }
            }
          },
          home: { players: {} }
        }
      })
    }
  }
  if (value.includes('/basketball/wnba/scoreboard')) {
    return {
      ok: true,
      json: async () => ({
        events: [{
          id: 'wnba-1',
          competitions: [{
            competitors: [
              { score: '88', team: { displayName: 'Chicago Sky', name: 'Sky', abbreviation: 'CHI' } },
              { score: '92', team: { displayName: 'Minnesota Lynx', name: 'Lynx', abbreviation: 'MIN' } }
            ]
          }]
        }]
      })
    }
  }
  if (value.includes('/basketball/wnba/summary')) {
    return {
      ok: true,
      json: async () => ({ boxscore: { players: [] } })
    }
  }
  if (value.includes('/soccer/fifa.world/scoreboard')) {
    return {
      ok: true,
      json: async () => ({
        events: [{
          id: 'soccer-1',
          competitions: [{
            competitors: [
              { score: '2', team: { displayName: 'South Korea', name: 'South Korea', abbreviation: 'KOR' } },
              { score: '1', team: { displayName: 'Czechia', name: 'Czechia', abbreviation: 'CZE' } }
            ]
          }]
        }]
      })
    }
  }
  if (value.includes('/soccer/fifa.world/summary')) {
    return {
      ok: true,
      json: async () => ({ boxscore: { players: [] } })
    }
  }
  if (value.includes('api-web.nhle.com/v1/schedule')) {
    return {
      ok: true,
      json: async () => ({
        gameWeek: [{
          games: [{
            id: 2025030414,
            awayTeam: {
              commonName: { default: 'Hurricanes' },
              placeName: { default: 'Carolina' },
              abbrev: 'CAR',
              score: 5
            },
            homeTeam: {
              commonName: { default: 'Golden Knights' },
              placeName: { default: 'Vegas' },
              abbrev: 'VGK',
              score: 3
            }
          }]
        }]
      })
    }
  }
  if (value.includes('api-web.nhle.com/v1/gamecenter/2025030414/boxscore')) {
    return {
      ok: true,
      json: async () => ({
        playerByGameStats: {
          awayTeam: {
            forwards: [
              { name: { default: 'S. Jarvis' }, goals: 1, sog: 4 }
            ],
            defense: []
          },
          homeTeam: {
            forwards: [
              { name: { default: 'J. Staal' }, goals: 1, sog: 3 }
            ],
            defense: []
          }
        }
      })
    }
  }
  if (value.includes('api-web.nhle.com/v1/gamecenter/2025030414/play-by-play')) {
    return {
      ok: true,
      json: async () => ({
        rosterSpots: [
          { playerId: 8478427, firstName: { default: 'Seth' }, lastName: { default: 'Jarvis' } },
          { playerId: 8473533, firstName: { default: 'Jordan' }, lastName: { default: 'Staal' } }
        ],
        plays: [
          { typeDescKey: 'goal', details: { scoringPlayerId: 8478427 } }
        ]
      })
    }
  }
  throw new Error(`Unexpected fetch: ${value}`)
}

const mlbDiscovery = await discoverTrustedSourcesForPick({
  Date: '2026-06-09',
  League: 'MLB',
  Game: 'Baltimore Orioles vs Boston Red Sox',
  Pick: 'Colton Cowser HRR Over 0.5',
  Player: 'Colton Cowser'
}, { fetchImpl })

assert.equal(mlbDiscovery.urls.length, 1)
assert.match(mlbDiscovery.urls[0], /statsapi\.mlb\.com/)
assert.match(mlbDiscovery.sourceTextByUrl[mlbDiscovery.urls[0]], /Box Score Final: Baltimore Orioles 4, Boston Red Sox 2 runs/)
assert.match(mlbDiscovery.sourceTextByUrl[mlbDiscovery.urls[0]], /Batting Colton Cowser hits 1 runs 0 RBI 0/)

const firstFiveDiscovery = await discoverTrustedSourcesForPick({
  Date: '2026-06-09',
  League: 'MLB',
  Game: 'Atlanta Braves vs New York Mets',
  Pick: 'Braves 1st 5 -0.5'
}, { fetchImpl })

assert.equal(firstFiveDiscovery.urls.length, 1)
assert.match(firstFiveDiscovery.urls[0], /statsapi\.mlb\.com\/api\/v1\/game\/67890\/linescore/)
assert.match(firstFiveDiscovery.sourceTextByUrl[firstFiveDiscovery.urls[0]], /First 5 Final: Atlanta Braves 3, New York Mets 1 runs/)

const playerOnlyMlbDiscovery = await discoverTrustedSourcesForPick({
  Date: '2026-06-09',
  Pick: 'Ohtani Over 6.5 Ks'
}, { fetchImpl })

assert.equal(playerOnlyMlbDiscovery.urls.length, 1)
assert.match(playerOnlyMlbDiscovery.urls[0], /statsapi\.mlb\.com\/api\/v1\/game\/99999\/boxscore/)
assert.match(playerOnlyMlbDiscovery.sourceTextByUrl[playerOnlyMlbDiscovery.urls[0]], /Pitching Ohtani strikeouts 7/)

const plusParlayDiscovery = await discoverTrustedSourcesForPick({
  Date: '2026-06-09',
  League: 'MLB',
  Pick: 'Braves 1st 5 -0.5 + Ohtani Over 6.5 Ks',
  Legs: '2',
  'Bet Type': 'Parlay'
}, { fetchImpl })

assert.equal(plusParlayDiscovery.urls.length, 2)
assert.equal(plusParlayDiscovery.discoveredSources.map(source => source.leg).join(' | '), 'Braves 1st 5 -0.5 | Ohtani Over 6.5 Ks')
assert.ok(plusParlayDiscovery.urls.some(url => /linescore/.test(url)))
assert.ok(plusParlayDiscovery.urls.some(url => /boxscore/.test(url)))

const wnbaDiscovery = await discoverTrustedSourcesForPick({
  Date: '2026-06-09',
  League: 'WNBA',
  Game: 'Chicago Sky vs Minnesota Lynx',
  Pick: 'Chicago Sky +7.5'
}, { fetchImpl })

assert.equal(wnbaDiscovery.urls.length, 1)
assert.match(wnbaDiscovery.urls[0], /espn\.com/)
assert.match(wnbaDiscovery.sourceTextByUrl[wnbaDiscovery.urls[0]], /Chicago Sky 88, Minnesota Lynx 92 points/)

const soccerDiscovery = await discoverTrustedSourcesForPick({
  Date: '2026-06-11',
  League: 'FIFA World Cup',
  Game: 'South Korea vs Czechia',
  Pick: 'South Korea Draw No Bet',
  'Bet Type': 'Draw No Bet'
}, { fetchImpl })

assert.equal(soccerDiscovery.urls.length, 1)
assert.match(soccerDiscovery.urls[0], /soccer\/fifa\.world\/summary/)
assert.match(soccerDiscovery.sourceTextByUrl[soccerDiscovery.urls[0]], /South Korea 2, Czechia 1 points/)

const nhlTeamDiscovery = await discoverTrustedSourcesForPick({
  Date: '2026-06-09',
  League: 'NHL',
  Pick: 'Carolina Hurricanes ML'
}, { fetchImpl })

assert.equal(nhlTeamDiscovery.urls.length, 1)
assert.match(nhlTeamDiscovery.urls[0], /api-web\.nhle\.com/)
assert.match(nhlTeamDiscovery.sourceTextByUrl[nhlTeamDiscovery.urls[0]], /Carolina Hurricanes 5, Vegas Golden Knights 3 goals/)

const nhlPlayerDiscovery = await discoverTrustedSourcesForPick({
  Date: '2026-06-09',
  League: 'NHL',
  Pick: 'Seth Jarvis Anytime Goal',
  Player: 'Seth Jarvis'
}, { fetchImpl })

assert.equal(nhlPlayerDiscovery.urls.length, 1)
assert.match(nhlPlayerDiscovery.sourceTextByUrl[nhlPlayerDiscovery.urls[0]], /Scoring Summary Seth Jarvis goals 1/)

const nhlShotsDiscovery = await discoverTrustedSourcesForPick({
  Date: '2026-06-09',
  League: 'NHL',
  Pick: 'Over 1.5 Shots on Goal',
  Player: 'Jordan Staal'
}, { fetchImpl })

assert.equal(nhlShotsDiscovery.urls.length, 1)
assert.match(nhlShotsDiscovery.sourceTextByUrl[nhlShotsDiscovery.urls[0]], /Player Stats Jordan Staal shots on goal 3/)

const prefilled = await discoverTrustedSourcesForPick({
  'Source URL': 'https://www.espn.com/nba/boxscore/_/gameId/1'
}, { fetchImpl })
assert.equal(prefilled.urls[0], 'https://www.espn.com/nba/boxscore/_/gameId/1')
assert.equal(prefilled.discoveredSources[0].discoveryMethod, 'prefilled')

console.log('Settlement source discovery tests passed.')
