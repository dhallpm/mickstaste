// Micks Picks props live filter
// Hides stale open prop cards/rows from yesterday or older on the Props page.
(function () {
  const TZ = 'America/New_York';
  const PROP_CONTAINERS = [
    '#propsCards',
    '#activePropsCards',
    '#propsResultsRows',
    '[data-section="props"]',
    '[data-tab="props"]'
  ];

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
    if (Number.isFinite(parsed)) {
      return new Date(parsed).toLocaleDateString('en-CA', { timeZone: TZ });
    }

    return '';
  }

  function findDateKey(el) {
    if (!el) return '';
    const attrs = ['data-date', 'data-posted-time', 'data-timestamp'];
    for (const attr of attrs) {
      const key = parseDateKey(el.getAttribute(attr));
      if (key) return key;
    }

    const time = el.querySelector && el.querySelector('time[datetime], [data-date], [data-posted-time], [data-timestamp]');
    if (time) {
      const key = parseDateKey(time.getAttribute('datetime') || time.dataset.date || time.dataset.postedTime || time.dataset.timestamp || time.textContent);
      if (key) return key;
    }

    return parseDateKey(el.textContent || '');
  }

  function isOpenText(text) {
    const s = String(text || '').toLowerCase();
    const hasFinal = /\b(win|won|loss|lost|push|void|settled|graded)\b/.test(s);
    if (hasFinal) return false;
    return /\b(active|posted|released|open|pending)\b/.test(s) || !/\b(result|final)\b/.test(s);
  }

  function looksLikeProp(text) {
    const s = String(text || '').toLowerCase();
    return /\b(prop|points|rebounds|assists|pra|pa|ra|strikeouts|total bases|home run|hr\b|sog|saves|shots|player)\b/.test(s);
  }

  function hideStaleProps() {
    const today = todayKey();
    const candidates = new Set();

    PROP_CONTAINERS.forEach(selector => {
      document.querySelectorAll(selector).forEach(container => {
        Array.from(container.children || []).forEach(child => candidates.add(child));
      });
    });

    // Fallback: scan visible card-like blocks that mention props.
    document.querySelectorAll('.card, [class*="card"], tr').forEach(el => {
      if (looksLikeProp(el.textContent || '')) candidates.add(el);
    });

    candidates.forEach(el => {
      const text = el.textContent || '';
      if (!looksLikeProp(text)) return;
      const key = findDateKey(el);
      if (!key) return;
      const staleOpen = key < today && isOpenText(text);
      if (staleOpen) {
        el.dataset.micksHiddenStaleProp = 'true';
        el.style.display = 'none';
      }
    });
  }

  function installObserver() {
    const observer = new MutationObserver(() => {
      clearTimeout(window.__micksPropsFilterTimer);
      window.__micksPropsFilterTimer = setTimeout(hideStaleProps, 100);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.hideStaleMicksProps = hideStaleProps;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      hideStaleProps();
      installObserver();
    });
  } else {
    hideStaleProps();
    installObserver();
  }

  window.addEventListener('load', hideStaleProps);
  window.setInterval(hideStaleProps, 3000);
})();
