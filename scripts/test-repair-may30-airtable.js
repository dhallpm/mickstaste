import assert from 'node:assert/strict'
import { buildMay30RepairPlan } from '../lib/repairMay30Airtable.js'

const masterRows = [
  { id: 'spurs-keep', Date: '2026-05-30', Pick: 'Spurs +3.5', 'Record Key': 'spurs', 'Archive Status': 'Active' },
  { id: 'spurs-delete', Date: '2026-05-30', Pick: 'Spurs\u200B +3.5', 'Record Key': 'spurs', 'Archive Status': 'False' },
  { id: 'aces-keep', Date: '2026-05-30', Pick: 'Aces ML', 'Record Key': 'aces', 'Archive Status': 'Active' },
  { id: 'yankees-keep', Date: '2026-05-30', Pick: 'Yankees ML', 'Record Key': 'yankees', 'Archive Status': 'Active' }
]

const archiveRows = [
  { id: 'safe', 'Record Key': 'safe 5-leg parlay' },
  { id: 'ultra', 'Record Key': 'ultra safe 6-leg parlay' },
  { id: 'sga', 'Record Key': 'shai gilgeous-alexander over 29.5 points' },
  { id: 'wemby', 'Record Key': 'victor wembanyama over 9.5 rebounds' }
]

const plan = buildMay30RepairPlan(masterRows, archiveRows)

assert.equal(plan.duplicateDeletes.some(row => row.id === 'spurs-delete'), true)
assert.equal(plan.duplicateDeletes.some(row => row.id === 'recVIBazCqyLcaIbc'), true)
assert.deepEqual(plan.masterUpdates.map(row => [row.id, row.fields.Result]), [
  ['spurs-keep', 'Win'],
  ['yankees-keep', 'Loss']
])
assert.equal(plan.masterUpdates.some(row => row.id === 'aces-keep'), false)
assert.equal(plan.archiveUpdates.length, 4)
assert.equal(plan.archiveUpdates.find(row => row.id === 'safe').fields.Grade, 'A-')
assert.equal(plan.archiveUpdates.find(row => row.id === 'ultra').fields.Legs.split('\n').length, 6)
assert.equal(plan.archiveUpdates.find(row => row.id === 'sga').fields['Profit/Loss Units'], '+0.45u')
assert.equal(plan.archiveUpdates.find(row => row.id === 'wemby').fields.Pick, 'Victor Wembanyama Over 9.5 Rebounds')

console.log('May 30 Airtable repair planning regression test passed.')
