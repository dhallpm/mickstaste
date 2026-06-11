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
  'Short Take': 'Knicks can stay inside this number if the half-court pace holds.',
  'Why This Play': 'The market is pricing Knicks vs Spurs too close to neutral despite the matchup pace.',
  'Matchup Edge': 'Knicks can slow Spurs transition chances enough to keep the spread live.',
  'Projection Edge': 'Projected fair spread closer to +4.5 vs available +5.5.',
  'Key Metrics': 'Half-court rate and rebounding profile both matter here.',
  Risk: 'The risk is Spurs transition scoring if Knicks turn it over.',
  'Final Take': 'Free play at +5.5 or better.',
  Result: 'Win',
  'Profit/Loss': 0.5
}], { dryRun: true })

assert.equal(bGradeVip.ok, true)
assert.equal(bGradeVip.tableName, 'Master Picks')
assert.equal(bGradeVip.preview[0].Access, 'Free')
assert.equal(bGradeVip.preview[0]['Short Take'], 'Knicks can stay inside this number if the half-court pace holds.')
assert.equal(bGradeVip.preview[0]['Why This Play'], 'The market is pricing Knicks vs Spurs too close to neutral despite the matchup pace.')
assert.equal(bGradeVip.preview[0]['Projection Edge'], 'Projected fair spread closer to +4.5 vs available +5.5.')
assert.equal(bGradeVip.preview[0].Risk, 'The risk is Spurs transition scoring if Knicks turn it over.')
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
