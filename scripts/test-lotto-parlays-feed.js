import assert from 'node:assert/strict'

import {
  AIRTABLE_TABLE_RESOLVERS,
  isBlankAirtableRecord
} from '../lib/airtableClient.js'
import {
  cleanWebsiteRow,
  categorizeWebsiteRows
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
assert.equal(card.game, '  Lottery   Parlay  ')
assert.equal(card.betType, 'Parlay')
assert.equal(card.legCount, 5)
assert.equal(card.legs, 'Leg 1 | Leg 2 | Leg 3 | Leg 4 | Leg 5')

const feed = categorizeWebsiteRows([card])
assert.equal(feed.lottoParlays.length, 1)
assert.equal(feed.free.length, 0)
assert.equal(feed.vip.length, 0)

console.log('Lotto Parlays Airtable feed regression test passed.')
