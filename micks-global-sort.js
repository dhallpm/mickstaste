// Micks Picks global newest-first DOM sorter
// Keeps cards/tables newest-first even when data arrives from Google Sheets CSV feeds.
(function () {
  const DATE_SELECTORS = [
    'tbody#resultsRows',
    'tbody#allArchiveRows',
    'tbody#freeResultsRows',
    'tbody#vipResultsRows',
    'tbody#propsResultsRows',
    'tbody#lottoResultsRows',
    'tbody#longshotsRows',
    'tbody#oddsRows'
  ];

  const CARD_GRID_SELECTORS = [
    '#freeCards',
    '#vipCards',
    '#propsCards',
    '#activePropsCards',
    '#activeLottoCards',
    '#longshotsCards',
    '#sportPanels'
  ];

  const DATE_PATTERNS = [
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
    /\b\d{4}-\d{1,2}-\d{1,2}\b/g,
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{2,4}\b/gi
  ];

  function parseDateCandidate(value) {
    if (!value) return 0;
    const raw = String(value).trim();
    const direct = Date.parse(raw);
    if (Number.isFinite(direct)) return direct;

    for (const pattern of DATE_PATTERNS) {
      pattern.lastIndex = 0;
      const match = pattern.exec(raw);
      if (match) {
        const parsed = Date.parse(match[0]);
        if (Number.isFinite(parsed)) return parsed;
      }
    }
    return 0;
  }

  function rowDateRank(row) {
    if (!row || !row.children || !row.children.length) return 0;
    const cells = Array.from(row.children).map(cell => cell.textContent || '');
    // Results tables put date in the first cell. Odds tables may put picked-at in the fourth cell.
    return parseDateCandidate(cells[0]) || parseDateCandidate(cells[7]) || parseDateCandidate(cells[3]) || parseDateCandidate(row.textContent);
  }

  function cardDateRank(card) {
    if (!card) return 0;
    const attrs = ['data-settled-at', 'data-posted-time', 'data-timestamp', 'data-date', 'datetime'];
    for (const attr of attrs) {
      const value = card.getAttribute && card.getAttribute(attr);
      const parsed = parseDateCandidate(value);
      if (parsed) return parsed;
    }
    const time = card.querySelector && card.querySelector('time[datetime], [data-date], [data-timestamp], [data-posted-time], [data-settled-at]');
    if (time) {
      const parsed = parseDateCandidate(time.getAttribute('datetime') || time.dataset.date || time.dataset.timestamp || time.dataset.postedTime || time.dataset.settledAt || time.textContent);
      if (parsed) return parsed;
    }
    return parseDateCandidate(card.textContent);
  }

  function sortChildrenNewestFirst(container, ranker) {
    if (!container) return;
    const children = Array.from(container.children).filter(child => child.nodeType === 1);
    if (children.length < 2) return;

    const ranked = children.map((child, index) => ({ child, index, rank: ranker(child) }));
    if (!ranked.some(item => item.rank)) return;

    ranked.sort((a, b) => (b.rank - a.rank) || (a.index - b.index));
    const fragment = document.createDocumentFragment();
    ranked.forEach(item => fragment.appendChild(item.child));
    container.appendChild(fragment);
  }

  function sortMicksPicksDom() {
    DATE_SELECTORS.forEach(selector => {
      document.querySelectorAll(selector).forEach(tbody => sortChildrenNewestFirst(tbody, rowDateRank));
    });

    CARD_GRID_SELECTORS.forEach(selector => {
      document.querySelectorAll(selector).forEach(container => sortChildrenNewestFirst(container, cardDateRank));
    });
  }

  function installSortObserver() {
    const observer = new MutationObserver(() => {
      window.clearTimeout(window.__micksSortTimer);
      window.__micksSortTimer = window.setTimeout(sortMicksPicksDom, 75);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.sortMicksPicksDom = sortMicksPicksDom;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      sortMicksPicksDom();
      installSortObserver();
    });
  } else {
    sortMicksPicksDom();
    installSortObserver();
  }

  window.addEventListener('load', sortMicksPicksDom);
  window.setInterval(sortMicksPicksDom, 3000);
})();
