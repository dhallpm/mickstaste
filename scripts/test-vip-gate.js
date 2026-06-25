import assert from 'node:assert/strict'

import { makePublicVipTeaser } from '../api/todays-picks.js'
import { isAllowedVipRequest, requestHost } from '../api/vip-picks.js'

const vipRow = {
  id: 'vip-1',
  recordKey: 'vip-key',
  date: '2026-06-25',
  league: 'WNBA',
  game: 'Toronto Tempo vs Atlanta Dream',
  pick: 'Tempo/Dream Under 172.5',
  cardTitle: 'Tempo/Dream Under 172.5',
  odds: '-110',
  units: '1.25',
  sportsbook: 'BetRivers',
  fullAnalysis: 'RAW FULL ANALYSIS MAIN: private VIP model edge',
  marketNotes: 'Private market note',
  injuryNotes: 'Private injury note'
}

const teaser = makePublicVipTeaser(vipRow)
const publicPayload = JSON.stringify(teaser)

assert.equal(teaser.pick, 'VIP Pick Locked')
assert.equal(teaser.fullAnalysisLocked, true)
assert.doesNotMatch(publicPayload, /Tempo\/Dream Under 172\.5/)
assert.doesNotMatch(publicPayload, /RAW FULL ANALYSIS MAIN/)
assert.doesNotMatch(publicPayload, /Private market note|Private injury note/)
assert.doesNotMatch(publicPayload, /BetRivers|-110|1\.25/)

assert.equal(requestHost({ headers: { host: 'vip.mickspicks.us' } }), 'vip.mickspicks.us')
assert.equal(requestHost({ headers: { 'x-forwarded-host': 'vip.mickspicks.us, example.com' } }), 'vip.mickspicks.us')
assert.equal(isAllowedVipRequest({ headers: { host: 'vip.mickspicks.us' } }), false)
assert.equal(isAllowedVipRequest({ headers: { host: 'vip.mickspicks.us', 'cf-access-jwt-assertion': 'token' } }), true)
assert.equal(isAllowedVipRequest({ headers: { host: 'www.mickspicks.us', 'cf-access-jwt-assertion': 'token' } }), false)
assert.equal(isAllowedVipRequest({ headers: { host: 'localhost:3000' } }), true)

console.log('VIP gate regression passed.')
