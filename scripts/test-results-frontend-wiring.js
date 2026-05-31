import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')
const runtimeRules = await readFile(new URL('../micks-runtime-rules.js', import.meta.url), 'utf8')

assert.match(html, /fetch\('\/api\/results\?days=180'/)
assert.match(html, /Results feed failed; using Google Sheets fallback:/)
assert.match(html, /rows:group\('rows'\),free:group\('free'\),vip:group\('vip'\),props:group\('props'\),lotto:group\('lotto'\),longshots:group\('longshots'\)/)
assert.match(html, /freeResults=airtableResults\?dedupe\(airtableResults\.free\):sheetFreeResults/)
assert.match(html, /vipResults=airtableResults\?dedupe\(airtableResults\.vip\):sheetVipResults/)
assert.match(html, /propsRows=airtableResults\?dedupe\(airtableResults\.props\):sheetPropsRows/)
assert.match(html, /longshotRows=airtableResults\?dedupe\(airtableResults\.lotto\.concat\(airtableResults\.longshots\)\):sheetLongshotRows/)
assert.match(html, /overallRows=airtableResults\?dedupe\(airtableResults\.rows\):sheetOverallRows/)
assert.match(html, /renderResultsSummary\('resultsRows',overallRows\)/)
assert.match(runtimeRules, /if \(id === 'resultsRows'\) cells\.splice\(2, 1\)/)

console.log('Airtable results frontend wiring regression test passed.')
