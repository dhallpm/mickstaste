import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { cleanWebsiteRow, categorizeWebsiteRows, isPublicOddsRow } from '../lib/buildWebsiteFeed.js'

const vipPick = cleanWebsiteRow({
  id: 'rec-test-vip-odds',
  Date: '2026-06-04',
  Sport: 'NBA',
  League: 'NBA',
  Game: 'Dummy VIP Game',
  Pick: 'Dummy VIP Side -4.5',
  Odds: '-110',
  Access: 'VIP',
  Grade: 'A',
  Featured: 'VIP',
  Status: 'Pregame'
})

const freePick = cleanWebsiteRow({
  id: 'rec-test-free-odds',
  Date: '2026-06-04',
  Sport: 'MLB',
  League: 'MLB',
  Game: 'Dummy Free Game',
  Pick: 'Dummy Free Side +3.5',
  Odds: '+105',
  Access: 'Free',
  Grade: 'B',
  Featured: 'Free',
  Status: 'Pregame'
})

const blockedRows = [
  vipPick,
  cleanWebsiteRow({ ...freePick, id: 'rec-test-premium-odds', Access: 'Premium' }),
  cleanWebsiteRow({ ...freePick, id: 'rec-test-grade-a-odds', Grade: 'A' }),
  cleanWebsiteRow({ ...freePick, id: 'rec-test-grade-aplus-odds', Grade: 'A+' }),
  cleanWebsiteRow({ ...freePick, id: 'rec-test-featured-vip-odds', Featured: 'VIP' }),
  cleanWebsiteRow({ ...freePick, id: 'rec-test-closed-odds', Status: 'Closed' })
]

for (const row of blockedRows) {
  assert.equal(isPublicOddsRow(row), false, `${row.id} should be excluded from Odds`)
}
assert.equal(isPublicOddsRow(freePick), true, 'Free non-closed pick should remain Odds-eligible')

const grouped = categorizeWebsiteRows([vipPick, freePick])
assert.equal(grouped.vip.some(row => row.pick === 'Dummy VIP Side -4.5'), true, 'dummy VIP pick should appear in VIP feed')

const oddsCandidates = [
  ...(grouped.free || []),
  ...(grouped.vip || []),
  ...(grouped.props || []),
  ...(grouped.lottoParlays || []),
  ...(grouped.longshots || [])
].filter(isPublicOddsRow)

assert.equal(oddsCandidates.some(row => row.pick === 'Dummy VIP Side -4.5'), false, 'dummy VIP pick should not appear in Odds')
assert.equal(oddsCandidates.some(row => row.pick === 'Dummy Free Side +3.5'), true, 'dummy Free pick should still appear in Odds')

const [html, oddsApi] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../api/odds-feed.js', import.meta.url), 'utf8')
])

assert.match(html, /function isOddsEligible/, 'index.html should define a client-side Odds eligibility guard')
assert.match(html, /activeRows\.filter\(isOddsEligible\)/, 'Odds renderer should filter todays-picks rows before rendering')
assert.doesNotMatch(oddsApi, /\.\.\.\(feed\.vip \|\| \[\]\)/, 'Odds API should not source rows from feed.vip')
assert.match(oddsApi, /\.filter\(isPublicOddsRow\)/, 'Odds API should apply the public Odds filter')

console.log('Odds VIP filter regression passed.')
