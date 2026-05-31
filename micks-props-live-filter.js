// Micks Picks props/lotto live display guard
// Keeps #props focused on player props, keeps lotto/parlay/longshot cards visible,
// and repairs page placeholders from the live /api/todays-picks Airtable feed.
(function () {
  const TZ = 'America/New_York';
  const PROP_ROOT_SELECTORS = ['#props', '#propsCards', '#activePropsCards', '#propsResultsRows'];
  const CANDIDATE_SELECTORS = ['.pick-card', '.card', '[class*="card"]', 'tr'];

  function todayKey() {
    return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  }

  function clean(value) { return String(value || '').trim(); }
  function lower(value) { return clean(value).toLowerCase(); }
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  function parseDateKey(text) {
    const raw = clean(text);
    if (!raw) return '';
    const iso = raw.match(/\b\d{4}-\d{1,2}-\d{1,2}\b/);
    if (iso) {
      const parts = iso[0].split('-');
      return parts[0] + '-' + parts[1].padStart(2, '0') + '-' + parts[2].padStart(2, '0');
    }
    const slash = raw.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
    if (slash) {
      const year = slash[3].length === 2 ? '20' + slash[3] : slash[3];
      return year + '-' + slash[1].padStart(2, '0') + '-' + slash[2].padStart(2, '0');
    }
    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed)) return new Date(parsed).toLocaleDateString('en-CA', { timeZone: TZ });
    return '';
  }

  function text(el) { return String((el && el.textContent) || '').toLowerCase(); }

  function findDateKey(el) {
    if (!el) return '';
    for (const attr of ['data-date', 'data-posted-time', 'data-timestamp']) {
      const key = parseDateKey(el.getAttribute && el.getAttribute(attr));
      if (key) return key;
    }
    const time = el.querySelector && el.querySelector('time[datetime], [data-date], [data-posted-time], [data-timestamp]');
    if (time) {
      const key = parseDateKey(time.getAttribute('datetime') || time.dataset.date || time.dataset.postedTime || time.dataset.timestamp || time.textContent);
      if (key) return key;
    }
    return parseDateKey(el.textContent || '');
  }

  function isPlayerPropLike(s) {
    return /\b(player prop|prop|points|rebounds|assists|pra|pa\b|ra\b|strikeouts|total bases|home run|hr\b|sog|shots on goal|saves|steals|blocks|threes|3pm|passing yards|rushing yards|receiving yards|outs|double-double|double double)\b/.test(s);
  }

  function isNonPropMarket(s) {
    return /\b(parlay|lotto|5-leg|6-leg|7-leg|8-leg|sgp|same game parlay|moneyline|\bml\b|spread|run line|puck line|full game total|team total|\bover\s+\d{2,3}(\.5)?\b|\bunder\s+\d{2,3}(\.5)?\b)\b/.test(s) && !isPlayerPropLike(s);
  }

  function isStaleOpen(el, s) {
    const key = findDateKey(el);
    if (!key) return false;
    const final = /\b(win|won|loss|lost|push|void|settled|graded)\b/.test(s);
    const open = /\b(active|posted|released|open|pending|conditional|watchlist|waitlist|lean only|manual approved|api pending)\b/.test(s);
    return key < todayKey() && open && !final;
  }

  function hide(el, reason) {
    if (!el || el.dataset.micksPropsGuard === 'hidden') return;
    el.dataset.micksPropsGuard = 'hidden';
    el.dataset.micksPropsGuardReason = reason;
    el.style.display = 'none';
  }

  function show(el) {
    if (!el) return;
    if (el.dataset.micksPropsGuard === 'hidden') {
      el.dataset.micksPropsGuard = 'shown';
      el.style.display = '';
    }
  }

  function guardPropsPage() {
    const roots = PROP_ROOT_SELECTORS.flatMap(sel => Array.from(document.querySelectorAll(sel)));
    if (!roots.length) return;

    roots.forEach(root => {
      CANDIDATE_SELECTORS.forEach(selector => {
        root.querySelectorAll(selector).forEach(el => {
          if (el.tagName === 'THEAD' || el.closest('thead')) return;
          const s = text(el);
          if (!s.trim()) return;
          if (isNonPropMarket(s)) return hide(el, 'non-prop-market');
          if (isStaleOpen(el, s)) return hide(el, 'stale-open-prop');
          if ((el.closest('#propsCards') || el.closest('#activePropsCards')) && !isPlayerPropLike(s)) return hide(el, 'card-not-player-prop');
          show(el);
        });
      });
    });
  }

  function activeVisible(row) {
    const s = lower([row.status, row.releaseStatus, row.result].join(' '));
    if (/\b(win|won|loss|lost|push|void|settled|graded|closed|archived|pass)\b/.test(s)) return false;
    return Boolean(row.pick || row.game || row.legs);
  }

  function card(row, label) {
    const title = row.cardTitle || row.pick || row.game || 'Active card';
    const type = row.betType || row.market || row.category || label || 'Pick';
    const line = row.lineNumber || row.bestNumber || row.odds || 'Pending';
    const best = row.bestNumber || line || '--';
    const status = row.status || row.releaseStatus || 'Posted';
    const writeup = row.writeup || row.description || 'Public preview pending.';
    return `<article class="card pick-card glass" data-date="${esc(row.date || '')}">
      <div class="flex items-start justify-between gap-3">
        <div><div class="text-xs uppercase tracking-[.16em] text-[#ffe391] font-black">${esc(row.league || row.sport || '--')} | ${esc(type)}</div>
        <h3 class="pick-title mt-2">${esc(title)}</h3><p class="mt-2 text-[#cbbf9d]">${esc(row.game || '')}</p></div>
        ${row.grade ? `<div class="grade">${esc(row.grade)}</div>` : ''}
      </div>
      <div class="line-box"><span>Line / Number</span><b>${esc(line)}</b><span>${esc(type)} | Best: ${esc(best)}</span></div>
      <div class="flex flex-wrap gap-2 mt-4"><span class="pill">${esc(row.access || label || 'VIP')}</span><span class="pill">${esc(best)}</span><span class="pill">${esc(row.noBetCutoff || 'No Bet Cutoff')}</span><span class="pill">${esc(status)}</span></div>
      <div class="grid grid-cols-2 gap-2 mt-4"><div class="stat"><b class="!text-lg">${esc(row.odds || '--')}</b><span>Odds</span></div><div class="stat"><b class="!text-lg">${esc(row.sportsbook || 'Manual Commit')}</b><span>Sportsbook</span></div><div class="stat"><b class="!text-lg">${esc(row.units || '--')}</b><span>Units to Commit</span></div></div>
      <div class="mt-4 leading-7 text-[#f4ead4] space-y-3"><p>${esc(writeup)}</p></div>
    </article>`;
  }

  function renderCardsInto(id, rows, label, empty) {
    const el = document.getElementById(id);
    if (!el) return;
    const usable = rows.filter(activeVisible).slice(0, 12);
    el.innerHTML = usable.length ? usable.map(row => card(row, label)).join('') : `<div class="empty-picks glass"><h3 class="pick-title">${esc(empty || 'No picks released yet.')}</h3><p class="mt-3 text-[#cbbf9d]">No picks released yet.</p></div>`;
  }

  async function forceRenderFromTodayFeed() {
    try {
      const res = await fetch('/api/todays-picks?cache=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const props = Array.isArray(data.props) ? data.props : [];
      const lotto = Array.isArray(data.lottoParlays) ? data.lottoParlays : [];
      const longshots = Array.isArray(data.longshots) ? data.longshots : [];
      if (props.length) {
        renderCardsInto('propsCards', props, 'Props Lab', 'No Props Lab picks released yet.');
        renderCardsInto('activePropsCards', props, 'Props Lab', 'No active props released yet.');
      }
      if (lotto.length || longshots.length) {
        renderCardsInto('longshotsCards', [...lotto, ...longshots], 'Lotto / Longshots', 'No lotto parlays or longshots released yet.');
      }
      setTimeout(guardPropsPage, 50);
      if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
    } catch (error) {
      console.warn('Micks Picks live section repair failed:', error);
    }
  }

  function installObserver() {
    const observer = new MutationObserver(() => {
      clearTimeout(window.__micksPropsGuardTimer);
      window.__micksPropsGuardTimer = setTimeout(() => {
        guardPropsPage();
        forceRenderFromTodayFeed();
      }, 250);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.guardMicksPropsPage = guardPropsPage;
  window.forceRenderMicksLiveSections = forceRenderFromTodayFeed;

  function start() {
    guardPropsPage();
    forceRenderFromTodayFeed();
    installObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
  window.addEventListener('hashchange', () => { guardPropsPage(); forceRenderFromTodayFeed(); });
  window.addEventListener('load', () => { guardPropsPage(); forceRenderFromTodayFeed(); });
  window.setInterval(() => { guardPropsPage(); forceRenderFromTodayFeed(); }, 30000);
})();
