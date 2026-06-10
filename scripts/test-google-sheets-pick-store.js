import assert from 'node:assert/strict'

import importPicksHandler from '../api/import-picks.js'
import { buildWebsiteFeed } from '../lib/buildWebsiteFeed.js'
import { googleSheetsBatchAppend } from '../lib/googleSheetsPickStore.js'

function apiCall(body) {
  return new Promise(resolve => {
    const req = { method: 'POST', query: {}, body }
    const res = {
      code: 200,
      status(value) {
        this.code = value
        return this
      },
      json(payload) {
        resolve({ status: this.code, payload })
      }
    }
    importPicksHandler(req, res)
  })
}

const bGradeVip = await googleSheetsBatchAppend('picks', [{
  Pick: 'Knicks +5.5',
  Game: 'Knicks vs Spurs',
  Grade: 'B',
  Access: 'VIP',
  Units: 0.5,
  Result: 'Win',
  'Profit/Loss': 0.5
}], { dryRun: true })

assert.equal(bGradeVip.ok, true)
assert.equal(bGradeVip.tableName, 'Master Picks')
assert.equal(bGradeVip.preview[0].Access, 'Free')
assert.equal(Object.hasOwn(bGradeVip.preview[0], 'Result'), false)
assert.equal(Object.hasOwn(bGradeVip.preview[0], 'Profit/Loss'), false)

const aGradeVip = await googleSheetsBatchAppend('propsLab', [{
  Pick: 'Caitlin Clark assists over',
  Game: 'Fever vs Sky',
  Grade: 'A',
  Access: 'VIP',
  Units: 1
}], { dryRun: true })

assert.equal(aGradeVip.tableName, 'Props Lab')
assert.equal(aGradeVip.preview[0].Access, 'VIP')

const smoke = await apiCall({ smokeTest: true, dryRun: true, table: 'picks' })
assert.equal(smoke.status, 200)
assert.equal(smoke.payload.destination, 'Google Sheets')
assert.equal(smoke.payload.tableName, 'Master Picks')
assert.equal(smoke.payload.results[0].preview[0].Pick, 'Google Sheets Smoke Test')

const feed = await buildWebsiteFeed({ date: '2026-06-10' })
assert.equal(feed.source, 'google-sheets')
assert.equal(feed.sourceOfTruth, 'Google Sheets')
assert.equal(Array.isArray(feed.free), true)

console.log('Google Sheets pick store regression passed.')
