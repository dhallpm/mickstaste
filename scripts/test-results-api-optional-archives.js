import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { normalizeRow } from '../api/results.js'

const source = await readFile(new URL('../api/results.js', import.meta.url), 'utf8')

assert.match(source, /\[403, 404\]\.includes\(error\.statusCode\)/)
assert.match(source, /Optional results table unavailable:/)

const wemby = normalizeRow({
  'Record Key': '2026-05-30|nba|spurs @ thunder|victor wembanyama over 9.5 rebounds|prop|vip|-110',
  'Original Table': 'Props Lab',
  Result: 'Loss',
  Units: '0.75'
}, 'Results Archive')

const sga = normalizeRow({
  'Record Key': '2026-05-30|nba|thunder @ pacers|shai gilgeous-alexander over 29.5 points|prop|vip|-167',
  'Original Table': 'Props Lab',
  Result: 'Win',
  Units: '0.75'
}, 'Results Archive')

assert.equal(wemby.Pick, 'Victor Wembanyama Over 9.5 Rebounds')
assert.equal(wemby.__section, 'props')
assert.equal(wemby.Access, 'VIP')
assert.equal(wemby['Profit/Loss'], '-0.75u')
assert.equal(sga.Pick, 'Shai Gilgeous-Alexander Over 29.5 Points')
assert.equal(sga.__section, 'props')
assert.equal(sga.Access, 'VIP')
assert.equal(sga['Profit/Loss'], '+0.45u')

console.log('Results API optional archive fallback regression test passed.')
