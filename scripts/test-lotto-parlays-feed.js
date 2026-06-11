import assert from 'node:assert/strict'

import {
  AIRTABLE_TABLE_RESOLVERS,
  isBlankAirtableRecord
} from '../lib/airtableClient.js'
import {
  cleanWebsiteRow,
  categorizeWebsiteRows,
  buildWebsiteFeed
} from '../lib/buildWebsiteFeed.js'
import {
  normalizePickCategory,
  routePickCategory
} from '../lib/routePickCategory.js'

const emptyFirstRecord = { id: 'rec-empty', fields: {} }
const publishedLottoRecord = {
  id: 'rec-lotto',
  fields: {
    Date: '2026-05-30',
    'Parlay Type': '  Lottery   Parlay  ',
    'Leg Count': 5,
    Legs: 'Leg 1 | Leg 2 | Leg 3 | Leg 4 | Leg 5',
    Odds: '+425',
    Sportsbook: 'BetRivers',
    Status: 'Pregame',
    'Release Status': 'Released',
    Access: 'Free'
  }
}
const safeFiveLegRecord = {
  id: 'rec-safe-five-leg',
  fields: {
    Date: '2026-05-30',
    'Parlay Type': 'Safe 5-Leg',
    'Leg Count': 5,
    Legs: 'Leg 1 | Leg 2 | Leg 3 | Leg 4 | Leg 5',
    Odds: '+325',
    Sportsbook: 'BetRivers',
    Status: 'Pregame',
    'Release Status': 'Released'
  }
}
const dateLessLottoRecord = {
  id: 'rec-dateless-lotto',
  fields: {
    'Card Title': 'Ultra Safe 6-Leg Parlay',
    'Parlay Type': 'Lotto Parlay',
    'Leg Count': 6,
    Legs: 'Leg 1 | Leg 2 | Leg 3 | Leg 4 | Leg 5 | Leg 6',
    Odds: '+650',
    Sportsbook: 'BetRivers',
    Status: 'Active',
    'Release Status': 'Released',
    Access: 'VIP'
  }
}
const activeNumericOddsLottoRecord = {
  id: 'rec-active-numeric-odds-lotto',
  fields: {
    Date: '2026-05-30',
    Pick: 'Safe 5-Leg Parlay',
    'Parlay Type': 'Safe 5-Leg Parlay',
    'Leg Count': 5,
    Legs: 'Leg 1 | Leg 2 | Leg 3 | Leg 4 | Leg 5',
    Odds: 450,
    Sportsbook: 'Circa',
    Status: 'Active'
  }
}

assert.equal(isBlankAirtableRecord(emptyFirstRecord), true)
assert.equal(isBlankAirtableRecord({ id: 'rec-checkbox-only', fields: { Featured: false } }), true)
assert.equal(isBlankAirtableRecord(publishedLottoRecord), false)

const aliases = AIRTABLE_TABLE_RESOLVERS.lottoParlays.aliases
assert.equal(aliases.includes('Lotto Parlay'), true)
assert.equal(aliases.includes('Lottery Parlay'), true)
assert.equal(normalizePickCategory('  LOTTERY   PARLAY  '), 'lotto parlay')

const route = routePickCategory(publishedLottoRecord.fields)
assert.equal(route.websiteSection, 'lotto')
assert.equal(routePickCategory({ __table: 'Lotto Parlays', ...safeFiveLegRecord.fields }).websiteSection, 'lotto')

const card = cleanWebsiteRow({
  id: publishedLottoRecord.id,
  airtableRecordId: publishedLottoRecord.id,
  ...publishedLottoRecord.fields
})
assert.equal(card.section, 'lotto')
assert.equal(card.pick, 'Lottery Parlay')
assert.equal(card.game, 'Lottery   Parlay')
assert.equal(card.betType, 'Parlay')
assert.equal(card.legCount, 5)
assert.equal(card.legs, 'Leg 1 | Leg 2 | Leg 3 | Leg 4 | Leg 5')

const dateLessCard = cleanWebsiteRow({
  id: dateLessLottoRecord.id,
  airtableRecordId: dateLessLottoRecord.id,
  __table: 'Lotto Parlay',
  ...dateLessLottoRecord.fields
})
assert.equal(dateLessCard.section, 'lotto')
assert.equal(dateLessCard.pick, 'Ultra Safe 6-Leg Parlay')
assert.equal(dateLessCard.date, '')

const activeNumericOddsCard = cleanWebsiteRow({
  id: activeNumericOddsLottoRecord.id,
  airtableRecordId: activeNumericOddsLottoRecord.id,
  __table: 'Lotto Parlays',
  ...activeNumericOddsLottoRecord.fields
})
assert.equal(activeNumericOddsCard.odds, '+450')
assert.equal(activeNumericOddsCard.releaseStatus, 'Released')

const drawNoBetCard = cleanWebsiteRow({
  id: 'rec-south-korea-dnb',
  __table: 'Master Picks',
  Date: '2026-06-11',
  League: 'FIFA World Cup',
  Game: 'South Korea vs Czechia',
  Pick: 'South Korea Draw No Bet',
  'Bet Type': 'Draw No Bet',
  Market: 'Draw No Bet',
  Status: 'Pending',
  'Release Status': 'Free Released',
  'Official Bet': 'Yes',
  Units: 1,
  Grade: 'B'
})
assert.equal(drawNoBetCard.pick, 'South Korea Draw No Bet')
assert.equal(drawNoBetCard.betType, 'Draw No Bet')
assert.equal(drawNoBetCard.market, 'Draw No Bet')
assert.equal(drawNoBetCard.status, 'Pending')
assert.equal(drawNoBetCard.officialBet, 'Yes')

const noDrawCard = cleanWebsiteRow({
  id: 'rec-south-korea-no-draw',
  __table: 'Master Picks',
  Date: '2026-06-11',
  League: 'FIFA World Cup',
  Game: 'South Korea vs Czechia',
  Pick: 'South Korea No Draw',
  'Bet Type': 'No Draw',
  Market: 'No Draw',
  Status: 'Pending',
  'Official Bet': 'Yes',
  Units: 1,
  Grade: 'B'
})
assert.equal(noDrawCard.pick, 'South Korea No Draw')
assert.equal(noDrawCard.market, 'No Draw')
assert.notEqual(noDrawCard.status, 'No Bet')

const explicitPassCard = cleanWebsiteRow({
  id: 'rec-explicit-pass',
  __table: 'Master Picks',
  Pick: 'Heavy soccer favorite',
  Status: 'Pass',
  Grade: 'Pass'
})
assert.equal(explicitPassCard.status, 'Pass')
assert.equal(explicitPassCard.grade, 'Pass')

const propsPlayerCard = cleanWebsiteRow({
  id: 'rec-props-player',
  __table: 'Props Lab',
  Date: '2026-06-11',
  League: 'Stanley Cup Final',
  Game: 'Stanley Cup Final',
  Player: 'Jordan Staal',
  Pick: 'Over 1.5 Shots on Goal',
  Prop: 'Shots on Goal',
  'Bet Type': 'Player Prop',
  Odds: '-120',
  Units: 1,
  Grade: 'B+',
  'Best Number': 'Over 1.5',
  'No Bet Cutoff': 'Over 1.5 -145',
  Writeup: 'Jordan Staal has the shot-volume role to clear this number.',
  'Full Analysis': 'Jordan Staal projects for enough shot attempts to make Over 1.5 Shots on Goal playable at the listed price.',
  Notes: 'Props note should stay visible.'
})
assert.equal(propsPlayerCard.section, 'props')
assert.equal(propsPlayerCard.pick, 'Jordan Staal - Over 1.5 Shots on Goal')
assert.equal(propsPlayerCard.betLine, 'Over 1.5 Shots on Goal')
assert.equal(propsPlayerCard.player, 'Jordan Staal')
assert.equal(propsPlayerCard.prop, 'Shots on Goal')
assert.match(propsPlayerCard.writeup, /shot-volume role/)
assert.match(propsPlayerCard.fullAnalysis, /shot attempts/)
assert.match(propsPlayerCard.notes, /Props note/)

const propsFallbackCard = cleanWebsiteRow({
  id: 'rec-props-fallback',
  __table: 'Props Lab',
  Date: '2026-06-11',
  League: 'MLB',
  Pick: 'Shohei Ohtani Over 6.5 Strikeouts',
  'American Odds': '+113',
  Units: 0.5,
  Grade: 'B',
  Notes: 'Playable to +100; pass above -115.'
})
assert.equal(propsFallbackCard.pick, 'Shohei Ohtani Over 6.5 Strikeouts')
assert.equal(propsFallbackCard.betLine, 'Shohei Ohtani Over 6.5 Strikeouts')
assert.equal(propsFallbackCard.player, 'Shohei Ohtani')
assert.equal(propsFallbackCard.odds, '+113')
assert.match(propsFallbackCard.noBetCutoff, /pass above -115/i)

const feed = categorizeWebsiteRows([card, { ...dateLessCard, date: '2026-05-30' }])
assert.equal(feed.lottoParlays.length, 2)
assert.equal(feed.free.length, 0)
assert.equal(feed.vip.length, 0)

process.env.AIRTABLE_API_KEY = 'test-key'
const websiteFeed = await buildWebsiteFeed({ date: '2026-05-30' })
assert.equal(Array.isArray(websiteFeed.lottoParlays), true)

console.log('Lotto Parlays Airtable feed regression test passed.')
