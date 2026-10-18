import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const engine = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(s => s.includes('async function boot()'))
const runtime = fs.readFileSync(new URL('../micks-runtime-rules.js', import.meta.url), 'utf8')
const data = JSON.parse(fs.readFileSync(new URL('../data/todays-picks.json', import.meta.url), 'utf8'))
const tickets = data.lottoParlays.filter(r => r.id?.startsWith('planned-') && r.date === '2026-10-18')
assert.equal(tickets.length, 9)

async function renderAt(instant) {
  const nodes = new Map(), errors = [], requests = []
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, { innerHTML: '', textContent: '', value: '', dataset: {}, classList: { toggle() {}, remove() {} }, addEventListener() {} })
    return nodes.get(id)
  }
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [instant])) }
    static now() { return new Date(instant).getTime() }
  }
  const context = vm.createContext({
    Date: Clock, Intl, URL, location: { hostname: 'localhost', hash: '' },
    document: { getElementById: node, querySelectorAll: () => [] },
    history: { replaceState() {} }, scrollTo() {}, addEventListener() {},
    console: { log() {}, warn: (...args) => errors.push(args), error: (...args) => errors.push(args) },
    fetch: async url => {
      requests.push(url)
      if (url.startsWith('/api/todays-picks')) return { ok: true, json: async () => ({ lottoParlays: tickets }) }
      if (url === '/data/results.json') return { ok: true, json: async () => ({ results: [] }) }
      return { ok: true, text: async () => '' }
    }
  })
  context.window = context
  // Actual script order: boot starts its fetch, then the runtime replaces isActive
  // before that fetch resolves. Testing the inline filter alone misses the bug.
  vm.runInContext(engine, context, { filename: 'index.html' })
  vm.runInContext(runtime, context, { filename: 'micks-runtime-rules.js' })
  await new Promise(resolve => setImmediate(resolve))
  assert.deepEqual(errors, [], 'boot and pickCard must not silently skip rows')
  assert.ok(requests.some(url => url.startsWith('/api/todays-picks?cache=')))
  return { context, markup: node('longshotsCards').innerHTML }
}

for (const instant of ['2026-10-18T19:00:00-04:00', '2026-10-19T01:59:00-04:00']) {
  const { context, markup } = await renderAt(instant)
  assert.equal((markup.match(/<article /g) || []).length, 9, `all nine planned tickets render at ${instant}`)
  for (const ticket of tickets) assert.ok(markup.includes(vm.runInContext('esc', context)(ticket.cardTitle)), ticket.id)
  assert.ok(!markup.includes('No picks released yet'))
  const base = { ...tickets[0], __section: 'lottoParlays' }
  for (const betPlaced of [false, 'False']) assert.equal(context.isActive({ ...base, betPlaced }), true)
  for (const status of ['Graded', 'Closed', 'Removed', 'Cancelled', 'Settled']) {
    assert.equal(context.isActive({ ...base, status, Status: status }), false, status)
  }
  assert.equal(context.isActive({ ...base, result: 'Loss', Result: 'Loss' }), false)
  assert.equal(context.isActive({ ...base, section: 'Free', Section: 'Free', __section: 'free' }), false, 'planned exception is Lotto Parlays only')
  assert.equal(context.isActive({ ...base, date: '2026-10-17', Date: '2026-10-17' }), false)
}
const expired = await renderAt('2026-10-19T02:00:00-04:00')
assert.equal((expired.markup.match(/<article /g) || []).length, 0, 'tickets expire at 2 a.m. ET')
console.log('PASS full frontend boot + runtime: nine planned lotto cards render; final states, section scope and 2 a.m. expiry preserved')
