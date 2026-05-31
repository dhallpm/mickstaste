import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

import {
  AIRTABLE_TABLE_RESOLVERS,
  listAirtableRecordsFromResolvedTable,
  updateAirtableRecords
} from '../lib/airtableClient.js'

const SAFE_5_WRITEUP = `This parlay is designed as a small-exposure lotto version of the strongest May 30 Micks Picks angles. It combines the Yankees team total run environment, Spurs key-number spread protection, Wembanyama rebound volume, Fever roster-quality ML edge, and Serrano’s safer ML profile.

The construction avoids the weakest straight-bet risk where possible. It does not ask Spurs to win outright, does not force Serrano KO method, and keeps Yankees exposure tied to offense rather than full-game win condition.

The risk is correlation across a long card and the natural fragility of any five-leg ticket. This should not be treated like a straight-bet unit.

Final verdict: A- lotto structure only, 0.25u. Must confirm final parlay price before release.`

const ULTRA_6_WRITEUP = `The Ultra Safe 6-Leg reduces individual leg volatility by using more ML structure and an alt rebound number for Wembanyama. The design is safer by leg type, but still carries six-leg parlay variance.

The strongest parts are Yankees ML, Braves ML, Spurs +3.5, and Fever ML. Wembanyama 8+ rebounds lowers the prop threshold, while Bivol ML is a parlay-only anchor.

The risk is price compression: safer legs can create a ticket that looks stable but pays poorly relative to the number of outcomes that must all hit.

Final verdict: B+ small parlay only, 0.15u. Must confirm final parlay price before release.`

const REPAIRS = [
  {
    label: 'Safe 5-Leg Parlay',
    match: /safe\s*5[-\s]?leg|small-exposure lotto|yankees team total run environment/i,
    fields: {
      Date: '2026-05-30',
      League: 'Mixed',
      Sport: 'Mixed',
      Game: 'Lotto Parlay',
      Pick: 'Safe 5-Leg Parlay',
      'Card Title': 'Safe 5-Leg Parlay',
      'Bet Type': 'Parlay',
      Category: 'Lotto Parlay',
      'Parlay Type': 'Safe 5-Leg Parlay',
      'Leg Count': 5,
      Sportsbook: 'Circa',
      Grade: 'A-',
      Units: 0.25,
      Status: 'Active',
      'Release Status': 'Released',
      Access: 'Free',
      Result: 'Pending',
      Odds: '+450',
      Writeup: SAFE_5_WRITEUP,
      'Full Analysis': SAFE_5_WRITEUP
    }
  },
  {
    label: 'Ultra Safe 6-Leg Parlay',
    match: /ultra\s*safe\s*6[-\s]?leg|wembanyama 8\+ rebounds|price compression/i,
    fields: {
      Date: '2026-05-30',
      League: 'Mixed',
      Sport: 'Mixed',
      Game: 'Lotto Parlay',
      Pick: 'Ultra Safe 6-Leg Parlay',
      'Card Title': 'Ultra Safe 6-Leg Parlay',
      'Bet Type': 'Parlay',
      Category: 'Lotto Parlay',
      'Parlay Type': 'Ultra Safe 6-Leg Parlay',
      'Leg Count': 6,
      Sportsbook: 'Circa',
      Grade: 'B+',
      Units: 0.15,
      Status: 'Active',
      'Release Status': 'Released',
      Access: 'Free',
      Result: 'Pending',
      Odds: '+300',
      Writeup: ULTRA_6_WRITEUP,
      'Full Analysis': ULTRA_6_WRITEUP
    }
  }
]

function haystack(row = {}) {
  return Object.values(row)
    .map(value => String(value || ''))
    .join(' ')
}

export async function fixLottoParlaysAirtable() {
  const result = await listAirtableRecordsFromResolvedTable(AIRTABLE_TABLE_RESOLVERS.lottoParlays)
  console.log(`Resolved Lotto Parlays table: ${result.tableName}`)
  console.log(`Resolved Airtable base: ${String(result.baseId).slice(0, 6)}...`)

  const updates = []
  const usedRecordIds = new Set()

  for (const repair of REPAIRS) {
    const row = result.rows.find(candidate => {
      if (usedRecordIds.has(candidate.id)) return false
      return repair.match.test(haystack(candidate))
    })

    assert(row, `Could not find Lotto Parlay row for ${repair.label}`)
    usedRecordIds.add(row.id)
    updates.push({ id: row.id, fields: repair.fields })
  }

  const updated = await updateAirtableRecords(result.tableName, updates, {
    baseId: result.baseId,
    typecast: true
  })

  console.log(`Updated ${updated.length} Lotto Parlay rows.`)
  for (const record of updated) {
    console.log(`- ${record.id}: ${record.fields?.Pick || record.fields?.['Card Title'] || 'updated'}`)
  }

  assert.equal(updated.length, REPAIRS.length, 'Not all Lotto Parlay rows were updated')
  console.log('Airtable Lotto Parlays repair complete.')
  return {
    updated: updated.length,
    picks: updated.map(record => record.fields?.Pick || record.fields?.['Card Title'] || 'updated')
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await fixLottoParlaysAirtable()
}
