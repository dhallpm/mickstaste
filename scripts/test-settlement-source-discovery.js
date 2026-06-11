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
assert.equal(normalizeTeamName('New York Yankees'), 'yankees')

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
  if (value.includes('api-web.nhle.com/v1/gamecenter/2025030414/play-by-play')) {
    return {
      ok: true,
      json: async () => ({
        rosterSpots: [
          { playerId: 8478427, firstName: { default: 'Seth' }, lastName: { default: 'Jarvis' } }
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

const wnbaDiscovery = await discoverTrustedSourcesForPick({
  Date: '2026-06-09',
  League: 'WNBA',
  Game: 'Chicago Sky vs Minnesota Lynx',
  Pick: 'Chicago Sky +7.5'
}, { fetchImpl })

assert.equal(wnbaDiscovery.urls.length, 1)
assert.match(wnbaDiscovery.urls[0], /espn\.com/)
assert.match(wnbaDiscovery.sourceTextByUrl[wnbaDiscovery.urls[0]], /Chicago Sky 88, Minnesota Lynx 92 points/)

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

const prefilled = await discoverTrustedSourcesForPick({
  'Source URL': 'https://www.espn.com/nba/boxscore/_/gameId/1'
}, { fetchImpl })
assert.equal(prefilled.urls[0], 'https://www.espn.com/nba/boxscore/_/gameId/1')
assert.equal(prefilled.discoveredSources[0].discoveryMethod, 'prefilled')

console.log('Settlement source discovery tests passed.')
