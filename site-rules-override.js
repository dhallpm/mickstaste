(function () {
  const PUBLIC_ROOT = 'https://www.mickspicks.us/'
  const PUBLIC_TABS = new Set(['home', 'free', 'odds', 'sports', 'props', 'longshots', 'results', 'yahgi', 'about'])
  const host = location.hostname.toLowerCase()

  if (host === 'vip.mickspicks.us') {
    const tab = location.hash.slice(1).toLowerCase()
    location.replace(`${PUBLIC_ROOT}#${PUBLIC_TABS.has(tab) ? tab : 'home'}`)
    return
  }

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]))

  const first = (row, names) => {
    for (const name of names) {
      if (row && row[name] !== undefined && String(row[name]).trim()) return String(row[name]).trim()
    }
    return ''
  }

  function easternParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23'
    }).formatToParts(date)
    return Object.fromEntries(parts.map(part => [part.type, part.value]))
  }

  function effectiveCardDate() {
    const now = new Date()
    const parts = easternParts(now)
    if (Number(parts.hour) >= 2) return `${parts.year}-${parts.month}-${parts.day}`
    const previous = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const prior = easternParts(previous)
    return `${prior.year}-${prior.month}-${prior.day}`
  }

  const normalizedDate = value => {
    const text = String(value || '').trim()
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
    const us = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    return us ? `${us[3]}-${String(us[1]).padStart(2, '0')}-${String(us[2]).padStart(2, '0')}` : ''
  }

  const settled = row => /\b(win|won|loss|lost|push|void|voided|graded|settled|final|completed|complete|cancelled|canceled)\b/i.test([
    first(row, ['Status', 'status', 'Release Status']), first(row, ['Result', 'result', 'Outcome', 'outcome'])
  ].join(' '))

  function currentRows(rows, payloadDate = '') {
    const activeDate = effectiveCardDate()
    return (Array.isArray(rows) ? rows : []).filter(row => {
      if (settled(row)) return false
      const rowDate = normalizedDate(first(row, ['Date', 'date', 'Posted Date', 'postedDate']) || payloadDate)
      return rowDate ? rowDate === activeDate : normalizedDate(payloadDate) === activeDate
    })
  }

  const cardTitle = row => first(row, ['cardTitle', 'Card Title', 'pick', 'Pick', 'selection', 'Selection']) || 'Active pick'
  const game = row => first(row, ['game', 'Game', 'matchup', 'Matchup']) || 'Live Card'
  const league = row => first(row, ['league', 'League', 'sport', 'Sport']) || '--'
  const odds = row => first(row, ['odds', 'Odds', 'price', 'Price']) || 'Shop best price'
  const grade = row => first(row, ['grade', 'Grade']) || '--'
  const units = row => first(row, ['units', 'Units']) || '--'
  const line = row => first(row, ['lineNumber', 'Line / Number', 'bestNumber', 'Best Number', 'line', 'Line', 'prop', 'Prop']) || odds(row)
  const cutoff = row => first(row, ['noBetCutoff', 'No-Bet Cutoff', 'No Bet Cutoff']) || 'Number discipline required'
  const sportsbook = row => first(row, ['sportsbook', 'Sportsbook', 'book', 'Book']) || 'Best Available'
  const writeup = row => first(row, ['writeup', 'Writeup', 'analysis', 'Analysis', 'shortAnalysis', 'Short Analysis']) || 'Released to the live card.'

  function pickCard(row, label) {
    return `<article class="card pick-card glass"><div class="flex items-start justify-between gap-3"><div><div class="text-xs uppercase tracking-[.16em] text-[#ffe391] font-black">${esc(league(row))} | ${esc(label)}</div><h3 class="pick-title mt-2">${esc(cardTitle(row))}</h3><p class="mt-2 text-[#cbbf9d]">${esc(game(row))}</p></div><div class="grade">${esc(grade(row))}</div></div><div class="tech-labels"><span class="tech-label"><i data-lucide="scan-line"></i>AI Market Scan</span><span class="tech-label"><i data-lucide="activity"></i>Line Check</span></div><div class="line-box"><span>Line / Number</span><b>${esc(line(row))}</b><span>${esc(label)} | Odds: ${esc(odds(row))}</span></div><div class="grid metric-grid gap-2 mt-4"><div class="stat"><b class="!text-lg">${esc(grade(row))}</b><span>Grade</span></div><div class="stat"><b class="!text-lg">${esc(odds(row))}</b><span>Odds</span></div><div class="stat"><b class="!text-lg">${esc(sportsbook(row))}</b><span>Sportsbook</span></div><div class="stat"><b class="!text-lg">${esc(units(row))}</b><span>Units</span></div></div><div class="flex flex-wrap gap-2 mt-4"><span class="pill">${esc(cutoff(row))}</span><span class="pill">Active</span></div><div class="mt-4 leading-7 text-[#f4ead4]"><p>${esc(writeup(row))}</p></div></article>`
  }

  function emptyState(message) {
    return `<div class="empty-picks glass premium-empty"><div class="empty-kicker">Dashboard waiting on live card</div><h3 class="pick-title mt-2">${esc(message)}</h3><p class="mt-3 text-[#cbbf9d] leading-7">Graded cards disappear immediately. Unsettled cards expire automatically at 2:00 AM Eastern.</p></div>`
  }

  function renderSpecialTab(id, rows, label, empty) {
    const el = document.getElementById(id)
    if (!el) return
    el.innerHTML = rows.length ? rows.map(row => pickCard(row, label)).join('') : emptyState(empty)
  }

  function clearAllActiveCards(message) {
    ;['freeCards', 'vipCards', 'propsCards', 'longshotsCards'].forEach(id => {
      const el = document.getElementById(id)
      if (el) el.innerHTML = emptyState(message)
    })
    const featured = document.getElementById('featuredCard')
    if (featured) featured.innerHTML = `<h3 class="pick-title">${esc(message)}</h3><p class="mt-3 text-[#cbbf9d]">The prior card has moved to Results.</p>`
    const active = document.getElementById('homeActive')
    if (active) active.textContent = '0 picks'
  }

  async function enforceActiveCardRules() {
    try {
      const res = await fetch(`/api/todays-picks?expiryRules=1&cache=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`todays-picks ${res.status}`)
      const data = await res.json()
      const date = data.date || ''
      const free = currentRows(data.free || data.freePicks || [], date)
      const vip = currentRows(data.vip || data.vipPicks || data.vipVault || [], date)
      const props = currentRows(data.props || data.propsLab || data.playerProps || [], date)
      const parlays = currentRows(data.lottoParlays || data.lotto || data.parlays || [], date)
      const longshots = currentRows(data.longshots || [], date)
      const total = free.length + vip.length + props.length + parlays.length + longshots.length

      if (!total) clearAllActiveCards('No active picks. The previous card has expired or been graded.')
      else {
        renderSpecialTab('propsCards', props, 'Props Lab', 'No props released yet.')
        renderSpecialTab('longshotsCards', [...parlays, ...longshots], 'Lotto / Longshot', 'No lotto parlays or longshots released yet.')
      }
      if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons()
    } catch (error) {
      console.warn('Active-card expiry enforcement failed:', error)
      clearAllActiveCards('Active card temporarily unavailable.')
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(enforceActiveCardRules, 700))
  else setTimeout(enforceActiveCardRules, 700)
})()
