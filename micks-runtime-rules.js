// Micks Picks live routing and settlement rules.
// Loaded after index.html's inline engine so the live site uses one definition for active cards, props, results, and P/L.
(function () {
  const TZ = 'America/New_York';
  const FINAL_RE = /\b(win|won|loss|lost|push|void|cancelled|canceled|settled|graded|closed|final|complete|completed|archived|removed|invalid)\b/i;
  const OPEN_RE = /\b(active|posted|released|open|pending|pregame|manual approved|api pending)\b/i;
  const PLAYER_PROP_RE = /\b(player prop|prop|points?|pts|rebounds?|rebs|assists?|asts|pra|p\+r\+a|\bpa\b|\bra\b|strikeouts?|\bks\b|k's|\bhrr\b|hits?\s*(?:\+|and)\s*runs?\s*(?:\+|and)\s*rbi?s?|total bases|\btb\b|home runs?|\bhr\b|hits?|rbi|shots on goal|\bsog\b|saves|round|distance)\b/i;
  const NON_PROP_RE = /\b(parlay|lotto|5-leg|6-leg|7-leg|8-leg|sgp|same game|moneyline|money line|\bml\b|spread|run line|puck line|game total|full game total|team total|period total|quarter total|half|1h|2h)\b/i;
  const PARLAY_ONLY_RE = /\b(parlay|5-leg|6-leg|7-leg|8-leg|sgp|same game|ladder|sprinkle)\b/i;
  const LOTTO_ONLY_RE = /\b(lotto|lotto prop|hr lotto|home run lotto|safe lotto|moonshot)\b/i;

  const ALIASES = {
    date: ['Date', 'Posted Date', 'Pick Date'],
    timestamp: ['Timestamp', 'Posted Time', 'Graded Timestamp', 'Settled At'],
    league: ['League', 'Sport'],
    game: ['Game', 'Matchup', 'Event'],
    pick: ['Pick', 'Selection', 'Play', 'Name', 'Card Title'],
    type: ['Bet Type', 'Market', 'LongShot Type', 'Prop Type', 'Type'],
    category: ['Category'],
    legs: ['Legs', 'Leg Count', 'Leg #', 'Parlay Type'],
    odds: ['Card Odds', 'Odds', 'Price', 'Final Odds'],
    units: ['Units to Commit', 'Units', 'Unit', 'Stake', 'Risk'],
    status: ['Display Status', 'Status'],
    release: ['Display Release Status', 'Release Status', 'Release'],
    result: ['Result', 'Outcome'],
    pl: ['Profit/Loss', 'P/L', 'PL', 'Profit Loss'],
    notes: ['Notes', 'Result Notes', 'Settlement Notes', 'Losing Leg', 'Leg Results'],
    writeup: ['Card Description', 'Writeup', 'Public Writeup', 'Summary'],
    full: ['Full Analysis', 'Analysis', 'VIP Analysis'],
    confirm: ['Confirmation Status', 'Confirmed'],
    access: ['Access', 'Tier'],
    grade: ['Card Grade', 'Grade'],
    closing: ['Closing Number', 'Closing #', 'Closing Line']
  };

  function text(value) { return String(value == null ? '' : value).trim(); }
  function lower(value) { return text(value).toLowerCase(); }
  function esc(value) {
    if (typeof window.esc === 'function') return window.esc(value);
    return String(value ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function getValue(row, key) {
    if (typeof window.val === 'function') return window.val(row, key);
    if (!row) return '';
    const names = ALIASES[key] || [key];
    for (const name of names) {
      const real = Object.keys(row).find(candidate => lower(candidate) === lower(name));
      if (real && text(row[real])) return text(row[real]);
    }
    return '';
  }

  function dateKey(value) {
    if (typeof window.normalDate === 'function') return window.normalDate(value);
    const raw = text(value);
    let m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
    m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? new Date(parsed).toLocaleDateString('en-CA', { timeZone: TZ }) : '';
  }

  function displayDate(value) {
    if (typeof window.displayDate === 'function') return window.displayDate(value);
    const key = dateKey(value);
    const m = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[2]}/${m[3]}/${m[1]}` : esc(value || '--');
  }

  function todayKey() { return new Date().toLocaleDateString('en-CA', { timeZone: TZ }); }

  function statusText(row) {
    return [getValue(row, 'status'), getValue(row, 'release'), getValue(row, 'result'), getValue(row, 'confirm')].map(text).filter(Boolean).join(' ');
  }

  function marketText(row) {
    return [getValue(row, 'type'), getValue(row, 'category'), getValue(row, 'pick'), getValue(row, 'game'), getValue(row, 'legs'), getValue(row, 'writeup'), getValue(row, 'full'), getValue(row, 'grade'), row?.__source, row?.__table, row?.__section].join(' ');
  }

  function isCurrentActive(row) {
    const rowDate = dateKey(getValue(row, 'date') || getValue(row, 'timestamp'));
    const release = lower(getValue(row, 'release'));
    const status = lower(statusText(row));
    const explicitlyActive = OPEN_RE.test(status) || /current active|active card/.test(release);
    return rowDate === todayKey() || explicitlyActive;
  }

  function isOpenOrPending(row) {
    const status = statusText(row);
    const result = getValue(row, 'result');
    if (FINAL_RE.test(status) || FINAL_RE.test(result)) return false;
    if (text(result) && !/\bpending\b/i.test(result)) return false;
    return !status || OPEN_RE.test(status);
  }

  function isTruePlayerProp(row) {
    const source = `${row?.__source || ''} ${row?.__table || ''}`;
    const market = marketText(row);
    const spacedPlusCombo = /\s\+\s/.test(market) && !/hits?\s*\+\s*runs?\s*\+\s*rbi?s?/i.test(market);
    if (/Props Lab|Props Results/i.test(source)) return !NON_PROP_RE.test(market);
    if (NON_PROP_RE.test(market) || spacedPlusCombo) return false;
    return PLAYER_PROP_RE.test(market);
  }

  function parseNumber(value) {
    const match = text(value).replace(/,/g, '').match(/[-+]?\d*\.?\d+/);
    return match ? Number(match[0]) : NaN;
  }

  function isStrictParlay(row) {
    const market = marketText(row);
    const legText = getValue(row, 'legs');
    const legCount = parseNumber(legText);
    const hasParlay = PARLAY_ONLY_RE.test(market);
    const hasLotto = LOTTO_ONLY_RE.test(market);
    if (!hasParlay && !hasLotto) return false;
    if (/moneyline|money line|\bml\b/i.test(market) && !hasParlay) return false;
    if (isTruePlayerProp(row)) return false;
    const hasMultipleLegs = legCount > 1 || (legText && legText.includes('|'));
    return hasMultipleLegs || hasLotto;
  }

  function resultOf(row) {
    const source = `${getValue(row, 'result')} ${getValue(row, 'status')}`;
    if (/\b(win|won|cash|cashed)\b/i.test(source)) return 'Win';
    if (/\b(loss|lost|lose|failed)\b/i.test(source)) return 'Loss';
    if (/\bpush\b/i.test(source)) return 'Push';
    if (/\b(void|cancelled|canceled)\b/i.test(source)) return 'Void';
    return getValue(row, 'result') || 'Pending';
  }

  function calculateProfitLossUnits(row) {
    const result = resultOf(row);
    const units = parseNumber(getValue(row, 'units'));
    if (!Number.isFinite(units) || units <= 0) return '';
    if (result === 'Push' || result === 'Void') return '0.00u';
    if (result === 'Loss') return `-${units.toFixed(2)}u`;
    if (result !== 'Win') return '';
    const odds = parseNumber(getValue(row, 'odds'));
    if (!Number.isFinite(odds) || odds === 0) return '';
    const profit = odds > 0 ? units * odds / 100 : units * 100 / Math.abs(odds);
    return `+${profit.toFixed(2)}u`;
  }

  function hasPositiveUnits(row) {
    const units = parseNumber(getValue(row, 'units'));
    return Number.isFinite(units) && units > 0;
  }

  function cleanDisplayProfitLoss(row) {
    const calculated = calculateProfitLossUnits(row);
    if (calculated) return calculated;
    const existing = getValue(row, 'pl');
    if (/^[-+]?\d+(\.\d+)?u$/i.test(existing)) return existing.replace(/^([^+-])/, '+$1');
    return '';
  }

  function normalizeForDisplay(row) {
    const pl = cleanDisplayProfitLoss(row);
    return Object.assign({}, row, pl ? { 'Profit/Loss': pl, 'P/L': pl, PL: pl } : {}, { Result: resultOf(row), Outcome: resultOf(row) });
  }

  function tableRows(rows, cells, empty) {
    if (typeof window.tableRows === 'function') return window.tableRows(rows, cells, empty);
    if (!rows.length) return `<tr><td colspan="${cells.length}">${esc(empty)}</td></tr>`;
    return rows.map(r => `<tr>${cells.map(fn => `<td>${fn(r)}</td>`).join('')}</tr>`).join('');
  }

  function statusCell(row) {
    const res = resultOf(row);
    const cls = res === 'Win' ? 'status-win' : res === 'Loss' ? 'status-loss' : res === 'Push' || res === 'Void' ? 'status-push' : 'status-pending';
    return `<span class="${cls}">${esc(res)}</span>`;
  }

  function renderLedgerRows(id, rows, empty) {
    const el = document.getElementById(id);
    if (!el) return;
    const normalized = (rows || []).filter(hasPositiveUnits).map(normalizeForDisplay).sort((a, b) => String(dateKey(getValue(b, 'date') || getValue(b, 'timestamp'))).localeCompare(String(dateKey(getValue(a, 'date') || getValue(a, 'timestamp')))));
    const cells = [
      r => displayDate(getValue(r, 'date') || getValue(r, 'timestamp')),
      r => esc(getValue(r, 'league') || getValue(r, 'category') || r.__source || '--'),
      r => esc(getValue(r, 'game') || '--'),
      r => esc(getValue(r, 'pick') || getValue(r, 'legs') || '--'),
      r => esc(getValue(r, 'grade') || '--'),
      r => statusCell(r),
      r => esc(getValue(r, 'pl') || '--'),
      r => esc(getValue(r, 'closing') || getValue(r, 'timestamp') || '--')
    ];
    if (id === 'resultsRows') cells.splice(2, 1);
    el.innerHTML = tableRows(normalized.slice(0, 120), cells, empty || 'No result rows loaded yet.');
  }

  function renderLongshotsRows(rows) {
    const el = document.getElementById('longshotsRows');
    if (!el) return;
    const normalized = (rows || []).filter(hasPositiveUnits).map(normalizeForDisplay).sort((a, b) => String(dateKey(getValue(b, 'date') || getValue(b, 'timestamp'))).localeCompare(String(dateKey(getValue(a, 'date') || getValue(a, 'timestamp')))));
    el.innerHTML = tableRows(normalized.slice(0, 120), [
      r => displayDate(getValue(r, 'date') || getValue(r, 'timestamp')),
      r => esc(getValue(r, 'category') || 'Longshots'),
      r => esc(getValue(r, 'pick') || getValue(r, 'game') || 'Parlay'),
      r => esc(getValue(r, 'legs') || '--'),
      r => esc(getValue(r, 'grade') || '--'),
      r => statusCell(r),
      r => esc(getValue(r, 'pl') || '--'),
      r => esc(getValue(r, 'notes') || 'No additional notes recorded.')
    ], 'No Longshots History rows loaded yet.');
  }

  function writeStats(prefix, rows) {
    if (typeof window.calcStats === 'function' && typeof window.writeStats === 'function') {
      window.writeStats(prefix, window.calcStats((rows || []).filter(hasPositiveUnits).map(normalizeForDisplay), []));
    }
  }

  window.isActive = function (row) {
    return !!(window.hasPick ? window.hasPick(row) : getValue(row, 'pick')) && isCurrentActive(row) && isOpenOrPending(row);
  };
  window.isPropMarket = isTruePlayerProp;
  window.isHrLotto = function (row) { return isStrictParlay(row) && !isTruePlayerProp(row); };
  window.isStrictParlay = isStrictParlay;
  window.resultOf = resultOf;
  window.calculateProfitLossUnits = calculateProfitLossUnits;
  window.isMicksLongshotOrLottoParlay = isStrictParlay;

  if (typeof window.renderLedger === 'function') {
    const originalRenderLedger = window.renderLedger;
    window.renderLedger = function (id, rows, empty) {
      let nextRows = rows || [];
      if (id === 'propsResultsRows') nextRows = nextRows.filter(isTruePlayerProp);
      nextRows = nextRows.filter(hasPositiveUnits).map(normalizeForDisplay);
      return originalRenderLedger(id, nextRows, empty);
    };
  }

  if (typeof window.calcStats === 'function') {
    const originalCalcStats = window.calcStats;
    window.calcStats = function (rows, activeRows) {
      return originalCalcStats((rows || []).filter(hasPositiveUnits).map(normalizeForDisplay), activeRows || []);
    };
  }

  async function hydrateResultsFromApi() {
    try {
      const response = await fetch(`/api/results?days=3650&cache=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Results API ${response.status}`);
      const data = await response.json();
      if (data.success === false) throw new Error(data.error || 'Results API unavailable');
      const rows = typeof window.canonicalRowsFromPayload === 'function'
        ? window.canonicalRowsFromPayload(data)
        : ['results', 'weeklyResults', 'resultRows', 'records', 'rows', 'allRows', 'archive', 'resultsArchive']
            .map(key => data[key])
            .find(value => Array.isArray(value) && value.length) || [];
      const free = Array.isArray(data.free) ? data.free : [];
      const vip = Array.isArray(data.vip) ? data.vip : [];
      const props = (Array.isArray(data.props) ? data.props : []).filter(isTruePlayerProp);
      const cards = [...(Array.isArray(data.lotto) ? data.lotto : []), ...(Array.isArray(data.longshots) ? data.longshots : [])];
      renderLedgerRows('freeResultsRows', free, 'No free results archive rows loaded yet.');
      renderLedgerRows('vipResultsRows', vip, 'No VIP archive rows loaded yet.');
      renderLedgerRows('propsResultsRows', props, 'No Props Results rows loaded yet.');
      renderLedgerRows('resultsRows', rows, 'No result rows loaded yet.');
      renderLongshotsRows(cards);
      writeStats('overall', rows);
      writeStats('free', free);
      writeStats('vip', vip);
      writeStats('props', props);
      writeStats('longshots', cards);
      if (typeof window.renderCanonicalResults === 'function') window.renderCanonicalResults(data);
      const homeRecord = document.getElementById('overallRecord')?.textContent;
      const homeUnits = document.getElementById('overallUnits')?.textContent;
      if (homeRecord) document.getElementById('homeRecord').textContent = homeRecord;
      if (homeUnits) document.getElementById('homeUnits').textContent = homeUnits;
      console.log('Google Sheets results hydrated', rows.length);
    } catch (error) {
      console.warn('Google Sheets results hydrate failed:', error);
    }
  }

  window.addEventListener('load', function () {
    setTimeout(hydrateResultsFromApi, 900);
  });

})();
