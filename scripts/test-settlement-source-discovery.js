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

const wnbaDiscovery = await discoverTrustedSourcesForPick({
  Date: '2026-06-09',
  League: 'WNBA',
  Game: 'Chicago Sky vs Minnesota Lynx',
  Pick: 'Chicago Sky +7.5'
}, { fetchImpl })

assert.equal(wnbaDiscovery.urls.length, 1)
assert.match(wnbaDiscovery.urls[0], /espn\.com/)
assert.match(wnbaDiscovery.sourceTextByUrl[wnbaDiscovery.urls[0]], /Chicago Sky 88, Minnesota Lynx 92 points/)

const prefilled = await discoverTrustedSourcesForPick({
  'Source URL': 'https://www.espn.com/nba/boxscore/_/gameId/1'
}, { fetchImpl })
assert.equal(prefilled.urls[0], 'https://www.espn.com/nba/boxscore/_/gameId/1')
assert.equal(prefilled.discoveredSources[0].discoveryMethod, 'prefilled')

console.log('Settlement source discovery tests passed.')
