import assert from 'node:assert/strict'

import { isAllowedVipRequest, makePublicVipTeaser, requestHost } from '../api/todays-picks.js'

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

assert.equal(requestHost({ headers: { host: 'mickspicks-vip.vercel.app' } }), 'mickspicks-vip.vercel.app')
assert.equal(requestHost({ headers: { 'x-forwarded-host': 'mickspicks-vip.vercel.app, example.com' } }), 'mickspicks-vip.vercel.app')
assert.equal(await isAllowedVipRequest({ headers: { host: 'mickspicks-vip.vercel.app' } }, {}), false)
assert.equal(await isAllowedVipRequest({ headers: { host: 'mickspicks-vip.vercel.app', 'cf-access-jwt-assertion': 'token' } }, {}), false)
assert.equal(await isAllowedVipRequest({ headers: { host: 'www.mickspicks.us', 'cf-access-jwt-assertion': 'token' } }, {}), false)
assert.equal(await isAllowedVipRequest({ headers: { host: 'localhost:3000' } }, {}), true)

console.log('VIP gate regression passed.')
