import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../api/results.js', import.meta.url), 'utf8')

assert.match(source, /\[403, 404\]\.includes\(error\.statusCode\)/)
assert.match(source, /Optional results table unavailable:/)

console.log('Results API optional archive fallback regression test passed.')
