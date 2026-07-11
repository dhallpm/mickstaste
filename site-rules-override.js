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
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]))

  const first = (row, names) => {
    for (const name of names) {
      if (row && row[name] !== undefined && String(row[name]).trim()) return String(row[name]).trim()
    }
    return ''
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

  const JULY_11_PARLAYS = [
    {
      Date: '2026-07-11',
      League: 'World Cup',
      Game: 'England vs Norway; Argentina vs Switzerland',
      Pick: 'England to Advance + Argentina to Advance',
      Grade: 'B+',
      Units: '0.50',
      Odds: 'Shop best available',
      'Best Number': 'Use current to-advance prices within listed cutoffs',
      'No-Bet Cutoff': 'Do not play if either leg exceeds its cutoff',
      Sportsbook: 'Best Available',
      Writeup: 'This is the safer two-leg card built from the two strongest knockout positions. Both legs use the to-advance market, which protects against a draw after 90 minutes and keeps extra time and penalties live as additional paths to cash. The price will be shorter than a regulation-moneyline parlay, but the structure is materially safer and better aligned with the original handicaps. Risk is concentrated in knockout variance, so the stake stays at 0.50u.'
    },
    {
      Date: '2026-07-11',
      League: 'NBA Summer League / WNBA',
      Game: 'Nuggets vs Timberwolves; Mercury vs Aces',
      Pick: 'Timberwolves -4.5 + Mercury/Aces Over 170.5',
      Grade: 'B',
      Units: '0.25',
      Odds: 'Shop best available',
      'Best Number': 'Minnesota -4.5 and total 170.5',
      'No-Bet Cutoff': 'Minnesota -5.5 or total 172',
      Sportsbook: 'Best Available',
      Writeup: 'The value parlay combines the improved Minnesota spread with the cleaner WNBA total. Moving to Timberwolves -4.5 protects against a five-point result, while the Mercury-Aces over avoids forcing a side where outside opinions conflict. These legs come from separate games, reducing direct correlation, but parlay variance remains high. Keep the exposure at 0.25u and do not chase worse numbers.'
    }
  ]

  function pickCard(row, label) {
    return `<article class="card pick-card glass">
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class="text-xs uppercase tracking-[.16em] text-[#ffe391] font-black">${esc(league(row))} | ${esc(label)}</div>
          <h3 class="pick-title mt-2">${esc(cardTitle(row))}</h3>
          <p class="mt-2 text-[#cbbf9d]">${esc(game(row))}</p>
        </div>
        <div class="grade">${esc(grade(row))}</div>
      </div>
      <div class="tech-labels">
        <span class="tech-label"><i data-lucide="scan-line"></i>AI Market Scan</span>
        <span class="tech-label"><i data-lucide="activity"></i>Line Check</span>
      </div>
      <div class="line-box"><span>Line / Number</span><b>${esc(line(row))}</b><span>${esc(label)} | Odds: ${esc(odds(row))}</span></div>
      <div class="grid metric-grid gap-2 mt-4">
        <div class="stat"><b class="!text-lg">${esc(grade(row))}</b><span>Grade</span></div>
        <div class="stat"><b class="!text-lg">${esc(odds(row))}</b><span>Odds</span></div>
        <div class="stat"><b class="!text-lg">${esc(sportsbook(row))}</b><span>Sportsbook</span></div>
        <div class="stat"><b class="!text-lg">${esc(units(row))}</b><span>Units</span></div>
      </div>
      <div class="flex flex-wrap gap-2 mt-4"><span class="pill">${esc(cutoff(row))}</span><span class="pill">Active</span></div>
      <div class="mt-4 leading-7 text-[#f4ead4]"><p>${esc(writeup(row))}</p></div>
    </article>`
  }

  function emptyState(message) {
    return `<div class="empty-picks glass premium-empty"><div class="empty-kicker">Dashboard waiting on live card</div><h3 class="pick-title mt-2">${esc(message)}</h3><p class="mt-3 text-[#cbbf9d] leading-7">Released cards appear here automatically when the daily board is ready.</p></div>`
  }

  function renderSpecialTab(id, rows, label, empty) {
    const el = document.getElementById(id)
    if (!el) return
    const liveRows = Array.isArray(rows) ? rows.filter(row => cardTitle(row)) : []
    el.innerHTML = liveRows.length ? liveRows.map(row => pickCard(row, label)).join('') : emptyState(empty)
  }

  async function hydrateSpecialTabs() {
    try {
      const res = await fetch(`/api/todays-picks?specialTabs=1&cache=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`todays-picks ${res.status}`)
      const data = await res.json()
      renderSpecialTab('propsCards', data.props || data.propsLab || data.playerProps || [], 'Props Lab', 'No props released yet.')
      const apiParlays = data.lottoParlays || data.lotto || data.parlays || []
      renderSpecialTab('longshotsCards', Array.isArray(apiParlays) && apiParlays.length ? apiParlays : JULY_11_PARLAYS, 'Lotto Parlay', 'No lotto parlays released yet.')
      if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons()
    } catch (error) {
      console.warn('Special tab hydration failed:', error)
      renderSpecialTab('longshotsCards', JULY_11_PARLAYS, 'Lotto Parlay', 'No lotto parlays released yet.')
      if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons()
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(hydrateSpecialTabs, 600))
  else setTimeout(hydrateSpecialTabs, 600)
})()