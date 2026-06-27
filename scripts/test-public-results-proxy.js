import assert from 'node:assert/strict'
import handler from '../api/results.js'

const originalFetch = globalThis.fetch
let fetchUrl = ''
let fetchOptions = null

globalThis.fetch = async (url, options) => {
  fetchUrl = String(url)
  fetchOptions = options
  return {
    ok: true,
    json: async () => ({
      success: true,
      source: 'weekly-results',
      weeklyResults: [{ Date: '2026-06-24', Pick: 'Dodgers ML', Result: 'Win' }]
    })
  }
}

const headers = new Map()
let statusCode = 0
let body = null
const response = {
  setHeader(name, value) {
    headers.set(name.toLowerCase(), value)
  },
  status(value) {
    statusCode = value
    return this
  },
  json(value) {
    body = value
  }
}

try {
  await handler({ query: { days: '3650' } }, response)
} finally {
  globalThis.fetch = originalFetch
}

assert.equal(statusCode, 200)
assert.equal(body.success, true)
assert.equal(body.proxiedBy, 'mickstaste-public-results')
assert.equal(body.weeklyResults[0].Pick, 'Dodgers ML')
assert.match(fetchUrl, /^https:\/\/mickspicks-vip\.vercel\.app\/api\/results\?days=3650&cache=\d+$/)
assert.equal(fetchOptions.cache, 'no-store')
assert.equal(fetchOptions.headers.Accept, 'application/json')
assert.match(headers.get('cache-control'), /no-store/)
assert.equal(headers.get('pragma'), 'no-cache')

console.log('Public results proxy regression test passed.')
