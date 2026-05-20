// Micks Picks props page guard
// Keeps #props focused on player props only: no parlays, no lotto cards, no moneylines/spreads/totals, and no stale open cards.
(function () {
  const TZ = 'America/New_York';
  const PROP_ROOT_SELECTORS = ['#props', '#propsCards', '#activePropsCards', '#propsResultsRows'];
  const CANDIDATE_SELECTORS = ['.pick-card', '.card', '[class*="card"]', 'tr'];

  function todayKey() {
    return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  }

  function parseDateKey(text) {
    const raw = String(text || '').trim();
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
    return /\b(player prop|prop|points|rebounds|assists|pra|pa\b|ra\b|strikeouts|total bases|home run|hr\b|sog|shots on goal|saves|steals|blocks|threes|3pm|passing yards|rushing yards|receiving yards)\b/.test(s);
  }

  function isNonPropMarket(s) {
    return /\b(parlay|lotto|5-leg|6-leg|7-leg|8-leg|sgp|same game parlay|moneyline|\bml\b|spread|run line|puck line|full game total|team total|\bover\s+\d{2,3}(\.5)?\b|\bunder\s+\d{2,3}(\.5)?\b)\b/.test(s) && !isPlayerPropLike(s);
  }

  function isStaleOpen(el, s) {
    const key = findDateKey(el);
    if (!key) return false;
    const final = /\b(win|won|loss|lost|push|void|settled|graded)\b/.test(s);
    const open = /\b(active|posted|released|open|pending|manual approved|api pending)\b/.test(s);
    return key < todayKey() && open && !final;
  }

  function hide(el, reason) {
    if (!el || el.dataset.micksPropsGuard === 'hidden') return;
    el.dataset.micksPropsGuard = 'hidden';
    el.dataset.micksPropsGuardReason = reason;
    el.style.display = 'none';
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
        });
      });
    });
  }

  function installObserver() {
    const observer = new MutationObserver(() => {
      clearTimeout(window.__micksPropsGuardTimer);
      window.__micksPropsGuardTimer = setTimeout(guardPropsPage, 100);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.guardMicksPropsPage = guardPropsPage;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { guardPropsPage(); installObserver(); });
  } else {
    guardPropsPage(); installObserver();
  }
  window.addEventListener('hashchange', guardPropsPage);
  window.addEventListener('load', guardPropsPage);
  window.setInterval(guardPropsPage, 2000);
})();
