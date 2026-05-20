// Micks Picks live routing and settlement rules.
// Loaded after index.html's inline engine so the live site uses one definition for active cards and P/L.
(function () {
  const TZ = 'America/New_York';
  const FINAL_RE = /\b(win|won|loss|lost|push|void|cancelled|canceled|settled|graded|closed|final|complete|completed|archived|removed|invalid)\b/i;
  const OPEN_RE = /\b(active|posted|released|open|pending|pregame|manual approved|api pending)\b/i;
  const PLAYER_PROP_RE = /\b(player prop|prop|points?|pts|rebounds?|rebs|assists?|asts|pra|p\+r\+a|\bpa\b|\bra\b|strikeouts?|total bases|\btb\b|home runs?|\bhr\b|hits?|rbi|shots on goal|\bsog\b|saves?|receiving yards|rushing yards|passing yards|steals?|blocks?|threes|3pm|touchdowns?)\b/i;
  const NON_PROP_RE = /\b(parlay|lotto|5-leg|6-leg|7-leg|8-leg|sgp|same game|moneyline|money line|\bml\b|spread|run line|puck line|game total|full game total|team total|period total|quarter total|half total|\bf5\b|first 5|first five|future|futures|vip pick|free pick)\b/i;
  const LONGSHOT_RE = /\b(longshot|long shot|lotto|ladder|sprinkle|moonshot|parlay|5-leg|6-leg|7-leg|8-leg|sgp|same game|safe lotto|high variance|plus-money|plus money)\b/i;
  const ALIASES = {
    date: ['Date', 'Posted Date', 'Pick Date'],
    timestamp: ['Timestamp', 'Posted Time', 'Graded Timestamp', 'Settled At'],
    league: ['League', 'Sport'],
    game: ['Game', 'Matchup', 'Event'],
    pick: ['Pick', 'Selection', 'Play', 'Name'],
    type: ['Bet Type', 'Market', 'LongShot Type', 'Prop Type', 'Type'],
    category: ['Category'],
    odds: ['Card Odds', 'Odds', 'Price'],
    units: ['Units to Commit', 'Units', 'Unit', 'Stake'],
    status: ['Display Status', 'Status'],
    release: ['Display Release Status', 'Release Status', 'Release'],
    result: ['Result', 'Outcome'],
    pl: ['Profit/Loss', 'P/L', 'PL', 'Profit Loss'],
    writeup: ['Card Description', 'Writeup', 'Public Writeup', 'Summary'],
    full: ['Full Analysis', 'Analysis', 'VIP Analysis'],
    confirm: ['Confirmation Status', 'Confirmed']
  };

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  function lower(value) {
    return text(value).toLowerCase();
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

  function todayKey() {
    return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  }

  function statusText(row) {
    return [
      getValue(row, 'status'),
      getValue(row, 'release'),
      getValue(row, 'result'),
      getValue(row, 'confirm')
    ].join(' ');
  }

  function marketText(row) {
    return [
      getValue(row, 'type'),
      getValue(row, 'category'),
      getValue(row, 'pick'),
      getValue(row, 'game'),
      getValue(row, 'writeup'),
      getValue(row, 'full')
    ].join(' ');
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
    const market = marketText(row);
    if (NON_PROP_RE.test(market)) return false;
    return PLAYER_PROP_RE.test(market);
  }

  function isLottoOrLongshot(row) {
    return LONGSHOT_RE.test(marketText(row));
  }

  function parseNumber(value) {
    const match = text(value).replace(/,/g, '').match(/[-+]?\d*\.?\d+/);
    return match ? Number(match[0]) : NaN;
  }

  function resultOf(row) {
    const source = `${getValue(row, 'result')} ${getValue(row, 'status')}`;
    if (/\b(win|won|cash|cashed)\b/i.test(source)) return 'Win';
    if (/\b(loss|lost|lose|failed)\b/i.test(source)) return 'Loss';
    if (/\bpush\b/i.test(source)) return 'Push';
    if (/\b(void|cancelled|canceled)\b/i.test(source)) return 'Void';
    return getValue(row, 'result') || getValue(row, 'status') || 'Pending';
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

  function cleanDisplayProfitLoss(row) {
    const existing = getValue(row, 'pl');
    if (/^[-+]?0?\.?0+u?$/i.test(existing) && ['Push', 'Void'].includes(resultOf(row))) return '0.00u';
    if (/^[-+]?\d+(\.\d+)?u$/i.test(existing)) return existing.replace(/^([^+-])/, '+$1');
    if (/^[-+]?\d+(\.\d+)?$/i.test(existing)) {
      const n = parseNumber(existing);
      return `${n > 0 ? '+' : ''}${n.toFixed(2)}u`;
    }
    return calculateProfitLossUnits(row) || '';
  }

  window.isActive = function (row) {
    return !!(window.hasPick ? window.hasPick(row) : getValue(row, 'pick')) && isCurrentActive(row) && isOpenOrPending(row);
  };
  window.isPropMarket = isTruePlayerProp;
  window.isHrLotto = function (row) {
    return isLottoOrLongshot(row) && !isTruePlayerProp(row);
  };
  window.resultOf = resultOf;
  window.calculateProfitLossUnits = calculateProfitLossUnits;
  window.isMicksLongshotOrLottoParlay = isLottoOrLongshot;

  if (typeof window.renderLedger === 'function') {
    const originalRenderLedger = window.renderLedger;
    window.renderLedger = function (id, rows, empty) {
      const normalized = (rows || []).map(row => {
        const pl = cleanDisplayProfitLoss(row);
        return pl ? Object.assign({}, row, { 'Profit/Loss': pl, 'P/L': pl, PL: pl }) : row;
      }).sort((a, b) => Date.parse(dateKey(getValue(b, 'date') || getValue(b, 'timestamp')) || 0) - Date.parse(dateKey(getValue(a, 'date') || getValue(a, 'timestamp')) || 0));
      return originalRenderLedger(id, normalized, empty);
    };
  }

  if (typeof window.calcStats === 'function') {
    const originalCalcStats = window.calcStats;
    window.calcStats = function (rows, activeRows) {
      const normalized = (rows || []).map(row => {
        const pl = cleanDisplayProfitLoss(row);
        return pl ? Object.assign({}, row, { 'Profit/Loss': pl, 'P/L': pl, PL: pl }) : row;
      });
      return originalCalcStats(normalized, activeRows || []);
    };
  }

  if (typeof window.boot === 'function') {
    window.setTimeout(() => window.boot(), 0);
  }
})();
