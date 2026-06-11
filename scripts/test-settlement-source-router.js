import assert from 'node:assert/strict'
import { providerForUrl, sourceNameForUrl } from '../lib/settlement/resultSources.js'
import { routeSettlementSources } from '../lib/settlement/sourceRouter.js'

const officialMlbUrl = 'https://www.mlb.com/gameday/box-score'
const nbaUrl = 'https://www.nba.com/game/box-score'
const espnUrl = 'https://www.espn.com/nba/boxscore/_/gameId/1'
const cbsUrl = 'https://www.cbssports.com/mlb/gametracker/boxscore'
const nhlUrl = 'https://www.nhl.com/gamecenter/boxscore'

assert.equal(providerForUrl(officialMlbUrl).id, 'official-box-score')
assert.equal(sourceNameForUrl(officialMlbUrl), 'MLB official box score')
assert.equal(sourceNameForUrl(espnUrl), 'ESPN box score')

const side = await routeSettlementSources({
  Game: 'Knicks vs Spurs',
  Pick: 'Knicks +5.5',
  'Box Score URL': nbaUrl
}, {
  urls: [nbaUrl],
  sourceTextByUrl: {
    [nbaUrl]: 'Box Score Final: Knicks 101 Spurs 99 points'
  }
})
assert.equal(side.status, 'verified')
assert.equal(side.result, 'Win')
assert.equal(side.sourceName, 'NBA official box score')

const conflict = await routeSettlementSources({
  Game: 'Knicks vs Spurs',
  Pick: 'Knicks +5.5',
  'Box Score URL': nbaUrl,
  'ESPN Box Score URL': espnUrl
}, {
  urls: [nbaUrl, espnUrl],
  sourceTextByUrl: {
    [nbaUrl]: 'Box Score Final: Knicks 101 Spurs 99 points',
    [espnUrl]: 'Box Score Final: Knicks 90 Spurs 99 points'
  }
})
assert.equal(conflict.status, 'needs_review')
assert.match(conflict.notes, /Source conflict/)

const recap = await routeSettlementSources({
  Game: 'Knicks vs Spurs',
  Pick: 'Knicks +5.5',
  'CBS Box Score URL': cbsUrl
}, {
  urls: [cbsUrl],
  sourceTextByUrl: {
    [cbsUrl]: 'Recap: Knicks played well against Spurs, but this story has no stat table.'
  }
})
assert.equal(recap.status, 'needs_review')
assert.match(recap.notes, /recap-only/)

const strikeouts = await routeSettlementSources({
  Player: 'Nick Martinez',
  Pick: 'Nick Martinez Over 5.5 Strikeouts',
  'Box Score URL': officialMlbUrl
}, {
  urls: [officialMlbUrl],
  sourceTextByUrl: {
    [officialMlbUrl]: 'Box Score Pitching Nick Martinez strikeouts 6'
  }
})
assert.equal(strikeouts.status, 'verified')
assert.equal(strikeouts.result, 'Win')

const strikeoutsAtLeast = await routeSettlementSources({
  Player: 'Nick Martinez',
  Pick: 'Nick Martinez 5+ Strikeouts',
  'Box Score URL': officialMlbUrl
}, {
  urls: [officialMlbUrl],
  sourceTextByUrl: {
    [officialMlbUrl]: 'Box Score Pitching Nick Martinez strikeouts 5'
  }
})
assert.equal(strikeoutsAtLeast.status, 'verified')
assert.equal(strikeoutsAtLeast.result, 'Win')

const teamTotal = await routeSettlementSources({
  Game: 'Cubs vs Brewers',
  Pick: 'Cubs Team Total Over 5.5',
  'Box Score URL': officialMlbUrl
}, {
  urls: [officialMlbUrl],
  sourceTextByUrl: {
    [officialMlbUrl]: 'Box Score Final: Cubs 6 Brewers 2 runs'
  }
})
assert.equal(teamTotal.status, 'verified')
assert.equal(teamTotal.result, 'Win')

const firstFiveSpread = await routeSettlementSources({
  Game: 'Atlanta Braves vs New York Mets',
  Pick: 'Braves 1st 5 -0.5',
  'Box Score URL': officialMlbUrl
}, {
  urls: [officialMlbUrl],
  sourceTextByUrl: {
    [officialMlbUrl]: 'First 5 Final: Atlanta Braves 3, New York Mets 1 runs. Box Score Final: Atlanta Braves 5, New York Mets 4 runs'
  }
})
assert.equal(firstFiveSpread.status, 'verified')
assert.equal(firstFiveSpread.result, 'Win')

const moneylineWithPrice = await routeSettlementSources({
  Game: 'New York Yankees vs Cleveland Guardians',
  Pick: 'Guardians ML +108 or better',
  'Box Score URL': officialMlbUrl
}, {
  urls: [officialMlbUrl],
  sourceTextByUrl: {
    [officialMlbUrl]: 'Box Score Final: New York Yankees 3, Cleveland Guardians 4 runs'
  }
})
assert.equal(moneylineWithPrice.status, 'verified')
assert.equal(moneylineWithPrice.result, 'Win')

const hrr = await routeSettlementSources({
  Player: 'Colton Cowser',
  Pick: 'Colton Cowser Over 0.5 HRR',
  'Box Score URL': officialMlbUrl
}, {
  urls: [officialMlbUrl],
  sourceTextByUrl: {
    [officialMlbUrl]: 'Box Score Batting Colton Cowser hits 1 runs 0 RBI 0'
  }
})
assert.equal(hrr.status, 'verified')
assert.equal(hrr.result, 'Win')

const goal = await routeSettlementSources({
  Player: 'Seth Jarvis',
  Pick: 'Seth Jarvis Anytime Goal',
  'Box Score URL': nhlUrl
}, {
  urls: [nhlUrl],
  sourceTextByUrl: {
    [nhlUrl]: 'Scoring Summary Seth Jarvis goals 1'
  }
})
assert.equal(goal.status, 'verified')
assert.equal(goal.result, 'Win')

const parlay = await routeSettlementSources({
  Game: 'Knicks vs Spurs',
  Pick: 'Knicks ML | Under 205.5',
  'Bet Type': 'Parlay',
  Legs: 'Knicks ML | Under 205.5',
  'Box Score URL': nbaUrl
}, {
  urls: [nbaUrl],
  sourceTextByUrl: {
    [nbaUrl]: 'Box Score Final: Knicks 101 Spurs 99 points'
  }
})
assert.equal(parlay.status, 'verified')
assert.equal(parlay.result, 'Win')
assert.equal(parlay.legResults.length, 2)

const mixedParlay = await routeSettlementSources({
  Date: '2026-06-09',
  Pick: 'Yankees/Guardians Under 8.5 | Hurricanes ML',
  'Bet Type': 'Parlay',
  Legs: 'Yankees/Guardians Under 8.5 | Hurricanes ML'
}, {
  urls: [officialMlbUrl, nhlUrl],
  sourceTextByUrl: {
    [officialMlbUrl]: 'Box Score Final: New York Yankees 3, Cleveland Guardians 2 runs',
    [nhlUrl]: 'Box Score Final: Carolina Hurricanes 5, Vegas Golden Knights 3 goals'
  }
})
assert.equal(mixedParlay.status, 'verified')
assert.equal(mixedParlay.result, 'Win')
assert.equal(mixedParlay.legResults.length, 2)

const bravesF5Url = 'https://statsapi.mlb.com/api/v1/game/111/linescore'
const marinersUrl = 'https://statsapi.mlb.com/api/v1/game/222/boxscore'
const ohtaniUrl = 'https://statsapi.mlb.com/api/v1/game/333/boxscore'
const wnbaUrl = 'https://www.wnba.com/game/box-score'
const plusParlay = await routeSettlementSources({
  Date: '2026-06-10',
  Pick: 'Braves 1st 5 -0.5 + Toronto Tempo -8 + Mariners ML + Tempo/Sun Under 169 + Ohtani Over 6.5 Ks',
  'Bet Type': 'Parlay'
}, {
  urls: [bravesF5Url, wnbaUrl, marinersUrl, ohtaniUrl],
  sourceTextByUrl: {
    [bravesF5Url]: 'First 5 Final: Atlanta Braves 2, New York Mets 3 runs. Box Score Final: Atlanta Braves 7, New York Mets 4 runs',
    [wnbaUrl]: 'Box Score Final: Toronto Tempo 88, Connecticut Sun 79 points',
    [marinersUrl]: 'Box Score Final: Seattle Mariners 4, Oakland Athletics 2 runs',
    [ohtaniUrl]: 'Box Score Pitching Ohtani strikeouts 7'
  }
})
assert.equal(plusParlay.status, 'verified')
assert.equal(plusParlay.result, 'Loss')
assert.equal(plusParlay.legResults.length, 5)
assert.deepEqual(plusParlay.legResults.map(leg => leg.leg), [
  'Braves 1st 5 -0.5',
  'Toronto Tempo -8',
  'Mariners ML',
  'Tempo/Sun Under 169',
  'Ohtani Over 6.5 Ks'
])
assert.equal(plusParlay.legResults[0].result, 'Loss')

console.log('Settlement source router tests passed.')
