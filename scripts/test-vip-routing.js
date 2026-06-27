import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const canonicalVip = 'https://vip.mickspicks.us/'
const publicTabs = ['home', 'free', 'odds', 'sports', 'props', 'longshots', 'results']

async function webFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...await webFiles(path))
    else if (['.html', '.js'].includes(extname(entry.name)) && entry.name !== 'test-vip-routing.js') files.push(path)
  }
  return files
}

const index = await readFile(join(root, 'index.html'), 'utf8')
const override = await readFile(join(root, 'site-rules-override.js'), 'utf8')
const vercel = JSON.parse(await readFile(join(root, 'vercel.json'), 'utf8'))

for (const id of publicTabs) {
  assert.match(index, new RegExp(`href="https://www\\.mickspicks\\.us/#${id}"[^>]*data-tab-target="${id}"`))
}
assert.doesNotMatch(index, /href=["']#(?:home|free|odds|sports|props|longshots|results|vip)["']/i)
assert.doesNotMatch(index, /data-tab-target=["'](?:undefined|)["']/i)
assert.match(index, /PUBLIC_TAB_IDS\.has\(id\)/)
assert.match(index, /typeof id!==['"]string['"]/)
assert.doesNotMatch(index, /#\$\{(?:undefined|target)\}/)

for (const path of await webFiles(root)) {
  const source = await readFile(path, 'utf8')
  assert.ok(!source.includes(['mickspicks-vip', 'vercel.app'].join('.')), `${path} contains the retired VIP preview host`)
  assert.doesNotMatch(source, /href=["'](?:\.\/|\/)?premium\.html/i, `${path} links to premium.html`)
  assert.doesNotMatch(source, /href=["'](?:\.\/|\/)?index\.html/i, `${path} links to index.html`)
  assert.ok(!source.includes('#undefined'), `${path} contains #undefined`)
}

assert.match(index, new RegExp(`href="${canonicalVip.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`))
assert.doesNotMatch(override, /setTimeout|setInterval|removeAttribute|querySelectorAll\(['"]a\[href\]/)
assert.match(override, /PUBLIC_TABS\.has\(tab\)/)

for (const path of ['/vip', '/vip/(.*)', '/premium.html', '/vip.html']) {
  const redirect = vercel.redirects.find(rule => rule.source === path)
  assert.equal(redirect?.destination, canonicalVip)
  assert.equal(redirect?.permanent, true)
}
assert.equal(vercel.rewrites.some(rule => rule.has?.some(condition => condition.type === 'host')), false)

console.log('VIP routing source tests passed')
