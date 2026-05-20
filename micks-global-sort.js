// Micks Picks global DOM repair layer
// Runs after Google Sheets CSV render and cleans placeholder cards, stale active rows, props routing, units, and result tables.
(function () {
  const TZ = 'America/New_York';
  const TODAY = new Date().toLocaleDateString('en-CA', { timeZone: TZ });

  const TABLE_SELECTORS = [
    'tbody#resultsRows',
    'tbody#allArchiveRows',
    'tbody#freeResultsRows',
    'tbody#vipResultsRows',
    'tbody#propsResultsRows',
    'tbody#longshotsRows',
    'tbody#oddsRows'
  ];

  const CARD_GRID_SELECTORS = [
    '#freeCards',
    '#vipCards',
    '#propsCards',
    '#activePropsCards',
    '#longshotsCards',
    '#sportPanels'
  ];

  function text(el) {
    return String((el && el.textContent) || '').trim();
  }

  function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function lower(value) {
    return cleanText(value).toLowerCase();
  }

  function parseDateKey(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    let m = raw.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
    if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
    m = raw.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
    if (m) {
      const year = m[3].length === 2 ? `20${m[3]}` : m[3];
      return `${year}-${String(m[1]).padStart(2, '0')}-${String(m[2]).padStart(2, '0')}`;
    }
    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed)) return new Date(parsed).toLocaleDateString('en-CA', { timeZone: TZ });
    return '';
  }

  function parseDateRank(value) {
    const key = parseDateKey(value);
    return key ? Date.parse(`${key}T12:00:00`) : 0;
  }

  function rowDateRank(row) {
    const cells = Array.from(row.children || []).map(text);
    return parseDateRank(cells[0]) || parseDateRank(cells[7]) || parseDateRank(cells[3]) || parseDateRank(text(row));
  }

  function sortChildrenNewestFirst(container, ranker) {
    if (!container) return;
    const children = Array.from(container.children || []).filter(child => child.nodeType === 1);
    if (children.length < 2) return;
    const ranked = children.map((child, index) => ({ child, index, rank: ranker(child) }));
    if (!ranked.some(item => item.rank)) return;
    ranked.sort((a, b) => (b.rank - a.rank) || (a.index - b.index));
    const frag = document.createDocumentFragment();
    ranked.forEach(item => frag.appendChild(item.child));
    container.appendChild(frag);
  }

  function isSettledString(value) {
    return /\b(win|won|loss|lost|push|void|settled|graded|closed|final)\b/i.test(String(value || ''));
  }

  function isOpenString(value) {
    const s = lower(value);
    return /\b(pregame|active|posted|released|open|pending)\b/.test(s) && !isSettledString(s);
  }

  function isPropText(value) {
    const s = lower(value);
    return /\b(player prop|\bprop\b|assists?|points?|rebounds?|pra|pa\b|ra\b|hit prop|to record a hit|total bases|strikeouts?|sog|shots?|saves?)\b/.test(s);
  }

  function isParlayText(value) {
    return /\b(parlay|lotto|5-leg|6-leg|7-leg|8-leg|sgp|same game)\b/i.test(String(value || ''));
  }

  function cardDateKey(card) {
    const s = text(card);
    return parseDateKey(s);
  }

  function looksLikeActiveCard(card) {
    const s = text(card);
    return card.classList.contains('pick-card') || /\b(line \/ number|units to commit|sportsbook|odds)\b/i.test(s);
  }

  function getCardParts(card) {
    const full = text(card);
    const stats = Array.from(card.querySelectorAll('.stat'));
    const statPairs = stats.map(stat => {
      const b = stat.querySelector('b');
      const span = stat.querySelector('span');
      return { stat, value: text(b), label: lower(text(span)), b };
    });
    return { full, stats, statPairs };
  }

  function replaceBadPlaceholders(card) {
    const { full, statPairs } = getCardParts(card);
    const lowerFull = lower(full);

    const headerText = cleanText((card.querySelector('.pick-title') || {}).textContent || '');
    const unitFromHeader = (headerText.match(/\b(\d+(?:\.\d+)?)\s*u\b/i) || full.match(/\b(\d+(?:\.\d+)?)\s*u\b/i) || [])[0];
    const oddsFromHeader = headerText.match(/odds:\s*([+-]?\d+)/i);
    const lineFromHeader = headerText.match(/line:\s*([^|]+)/i);

    statPairs.forEach(pair => {
      if (!pair.b) return;
      const val = lower(pair.value);
      if (pair.label.includes('units')) {
        if (!pair.value || pair.value === '--' || val === 'pending') {
          pair.b.textContent = unitFromHeader || '0.50u';
        }
      }
      if (pair.label === 'odds') {
        if (!pair.value || pair.value === '--' || /pending|price pending|best available/i.test(pair.value)) {
          pair.b.textContent = oddsFromHeader ? oddsFromHeader[1] : 'Confirm Price';
        }
      }
      if (pair.label.includes('sportsbook')) {
        if (!pair.value || pair.value === '--' || /best available|manual commit/i.test(pair.value)) {
          pair.b.textContent = 'Book TBD';
        }
      }
    });

    const lineBox = card.querySelector('.line-box b');
    if (lineBox && /pending|price pending|best available|--/i.test(text(lineBox))) {
      if (lineFromHeader) lineBox.textContent = cleanText(lineFromHeader[1]);
      else if (/moneyline|\bml\b/i.test(lowerFull)) lineBox.textContent = headerText.replace(/.*\|\s*/g, '') || 'Moneyline';
      else if (/team total/i.test(lowerFull)) lineBox.textContent = 'Team Total - Confirm Number';
      else lineBox.textContent = 'Confirm Line';
    }

    Array.from(card.querySelectorAll('.pill')).forEach(pill => {
      const p = text(pill);
      if (/best available/i.test(p)) pill.textContent = 'Book TBD';
      if (/price pending/i.test(p)) pill.textContent = 'Confirm Price';
      if (p === '--') pill.textContent = 'Confirm';
    });
  }

  function hideWrongCards() {
    const propsContainer = document.querySelector('#activePropsCards');
    if (propsContainer) {
      Array.from(propsContainer.children || []).forEach(card => {
        const s = text(card);
        if (!looksLikeActiveCard(card)) return;
        if (!isPropText(s) || isParlayText(s)) card.style.display = 'none';
        const d = cardDateKey(card);
        if (d && d < TODAY && isOpenString(s)) card.style.display = 'none';
      });
    }

    const vipContainer = document.querySelector('#vipCards');
    if (vipContainer) {
      Array.from(vipContainer.children || []).forEach(card => {
        const s = text(card);
        if (isParlayText(s)) card.style.display = 'none';
        const d = cardDateKey(card);
        if (d && d < TODAY && isOpenString(s)) card.style.display = 'none';
      });
    }

    ['#freeCards', '#longshotsCards'].forEach(sel => {
      const container = document.querySelector(sel);
      if (!container) return;
      Array.from(container.children || []).forEach(card => {
        const d = cardDateKey(card);
        if (d && d < TODAY && isOpenString(text(card))) card.style.display = 'none';
      });
    });
  }

  function closeSettledRowsInTables() {
    TABLE_SELECTORS.forEach(sel => {
      document.querySelectorAll(sel).forEach(tbody => {
        Array.from(tbody.querySelectorAll('tr')).forEach(row => {
          const s = text(row);
          const cells = Array.from(row.children || []);
          const resultCell = cells.find(td => /\b(win|loss|push|void)\b/i.test(text(td)));
          if (resultCell) {
            row.dataset.micksSettled = 'true';
            row.classList.add('micks-settled-row');
          }
          // Never let blank archive rows with NEEDS ODDS LOOKUP show as real rows.
          if (!cleanText(cells.slice(0, 6).map(text).join('')) && /needs odds lookup/i.test(s)) {
            row.style.display = 'none';
          }
        });
      });
    });
  }

  function removeDuplicateVisibleCards() {
    CARD_GRID_SELECTORS.forEach(sel => {
      document.querySelectorAll(sel).forEach(container => {
        const seen = new Set();
        Array.from(container.children || []).forEach(card => {
          const key = lower(text(card).replace(/\b(confirm price|book tbd|manual commit|pending|best available|price pending|--|units to commit|odds|sportsbook)\b/g, '').slice(0, 220));
          if (!key) return;
          if (seen.has(key)) card.style.display = 'none';
          else seen.add(key);
        });
      });
    });
  }

  function sortTables() {
    TABLE_SELECTORS.forEach(selector => {
      document.querySelectorAll(selector).forEach(tbody => sortChildrenNewestFirst(tbody, rowDateRank));
    });
  }

  function repairMicksPicksDom() {
    document.querySelectorAll('.pick-card, .card').forEach(card => {
      if (looksLikeActiveCard(card)) replaceBadPlaceholders(card);
    });
    hideWrongCards();
    closeSettledRowsInTables();
    removeDuplicateVisibleCards();
    sortTables();
  }

  function installObserver() {
    const observer = new MutationObserver(() => {
      window.clearTimeout(window.__micksRepairTimer);
      window.__micksRepairTimer = window.setTimeout(repairMicksPicksDom, 80);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  window.repairMicksPicksDom = repairMicksPicksDom;
  window.sortMicksPicksDom = repairMicksPicksDom;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      repairMicksPicksDom();
      installObserver();
    });
  } else {
    repairMicksPicksDom();
    installObserver();
  }

  window.addEventListener('load', repairMicksPicksDom);
  window.setInterval(repairMicksPicksDom, 2000);
})();
