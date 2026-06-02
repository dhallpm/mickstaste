// Micks Picks production live display repair
// Renders Airtable props/lotto/longshots and repairs Results tab grade + P/L display.
(function () {
  const TZ = 'America/New_York';
  const SHEET_ID = '15txBM8qsck7f0ZA_za7xYEykBxKpuq0no3x7yHcKNeE';
  const GIDS = {
    results: '1579113575',
    vipArchive: '210503117',
    propsResults: '695299787',
    lottoProps: '39840357',
    longshotsHistory: '43571320'
  };

  function clean(value) { return String(value ?? '').trim(); }
  function lower(value) { return clean(value).toLowerCase(); }
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }
  function first(...values) { return values.map(clean).find(Boolean) || ''; }
  function num(value) {
    const match = clean(value).replace(/,/g, '').match(/[-+]?\d*\.?\d+/);
    return match ? Number(match[0]) : 0;
  }
  function todayKey() {
    return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  }
  function dateKey(value) {
    const raw = clean(value);
    if (!raw) return '';
    const iso = raw.match(/\b\d{4}-\d{1,2}-\d{1,2}\b/);
    if (iso) {
      const [y, m, d] = iso[0].split('-');
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    const slash = raw.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
    if (slash) {
      const y = slash[3].length === 2 ? `20${slash[3]}` : slash[3];
      return `${y}-${slash[1].padStart(2, '0')}-${slash[2].padStart(2, '0')}`;
    }
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? new Date(parsed).toLocaleDateString('en-CA', { timeZone: TZ }) : raw.slice(0, 10);
  }
  function displayDate(value) {
    const key = dateKey(value);
    const m = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[2]}/${m[3]}/${m[1]}` : (clean(value) || '--');
  }
  function get(row, names) {
    for (const name of names) {
      const key = Object.keys(row || {}).find(k => lower(k) === lower(name));
      if (key && clean(row[key])) return clean(row[key]);
    }
    return '';
  }
  const A = {
    date: ['date', 'Date', 'Game Date', 'Timestamp', 'Posted Time', 'Settled At', 'Graded Timestamp'],
    sport: ['sport', 'Sport'],
    league: ['league', 'League', 'Category', 'Sport'],
    game: ['game', 'Game', 'Matchup', 'Event'],
    pick: ['pick', 'Pick', 'Selection', 'Play', 'Name', 'Title'],
    player: ['player', 'Player', 'Athlete', 'Player Name'],
    prop: ['prop', 'Prop', 'Market', 'Bet Type', 'Type', 'Prop Type'],
    cardTitle: ['cardTitle', 'Card Title', 'Pick', 'Selection', 'Play', 'Name', 'Title'],
    type: ['betType', 'Bet Type', 'Market', 'LongShot Type', 'Prop Type', 'Type'],
    odds: ['odds', 'Odds', 'Card Odds', 'Price', 'Picked Odds', 'Picked At'],
    sportsbook: ['sportsbook', 'Sportsbook', 'Card Sportsbook', 'Book', 'Best Book'],
    grade: ['grade', 'Grade', 'Card Grade', 'Rating', 'Micks Grade', 'Yahgi Grade', 'Confidence Grade'],
    units: ['units', 'Units', 'Units to Commit', 'Unit', 'Stake', 'Risk'],
    best: ['bestNumber', 'Best Number', 'Best #', 'Best Line', 'Line', 'Number'],
    cutoff: ['noBetCutoff', 'No Bet Cutoff', 'Cutoff'],
    status: ['status', 'Status', 'Display Status', 'Release Status', 'releaseStatus'],
    result: ['result', 'Result', 'Outcome', 'Status'],
    pl: ['profitLoss', 'Profit/Loss', 'P/L', 'PL', 'Profit Loss', 'Units Result', 'Net Units'],
    closing: ['closing', 'Closing Number', 'Closing #', 'Closing Line', 'Timestamp', 'Settled At'],
    writeup: ['writeup', 'Writeup', 'Public Writeup', 'Summary', 'description', 'analysisPreview'],
    notes: ['notes', 'Notes', 'Result Notes', 'Settlement Notes', 'Losing Leg', 'Leg Results'],
    legs: ['legs', 'Legs']
  };
  function val(row, key) { return get(row, A[key] || [key]); }

  function titleOf(row) {
    const player = val(row, 'player');
    const prop = val(row, 'prop');
    return first(val(row, 'cardTitle'), val(row, 'pick'), player && prop ? `${player} ${prop}` : '', player, prop, val(row, 'game'), val(row, 'legs')) || 'Active card';
  }
  function gradeOf(row) {
    const grade = first(val(row, 'grade'), row.grade, row.Grade, row['Card Grade']);
    return grade || 'Pending Grade';
  }
  function resultOf(row) {
    const s = lower(`${val(row, 'result')} ${val(row, 'status')}`);
    if (/\b(win|won)\b/.test(s)) return 'Win';
    if (/\b(loss|lost)\b/.test(s)) return 'Loss';
    if (/\bpush\b/.test(s)) return 'Push';
    if (/\b(void|cancel|canceled|cancelled)\b/.test(s)) return 'Void';
    return first(val(row, 'result'), val(row, 'status'), 'Pending');
  }
  function isFinal(row) { return ['Win', 'Loss', 'Push', 'Void'].includes(resultOf(row)); }
  function isActive(row) {
    const s = lower(`${val(row, 'status')} ${val(row, 'result')}`);
    return Boolean(titleOf(row)) && !/\b(win|won|loss|lost|push|void|settled|graded|closed|archived|pass)\b/.test(s);
  }
  function americanOdds(value) {
    const raw = clean(value);
    if (!raw || /pending|tbd|n\/a/i.test(raw)) return null;
    const m = raw.match(/[+-]?\d{2,5}/);
    return m ? Number(m[0]) : null;
  }
  function formatUnits(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '--';
    if (Math.abs(n) < 0.005) return '0.00u';
    return `${n > 0 ? '+' : ''}${n.toFixed(2)}u`;
  }
  function profitUnits(row) {
    const direct = first(val(row, 'pl'), row.profitLoss, row['Profit/Loss'], row['P/L']);
    if (direct && !/undefined|null|nan|\[object object\]/i.test(direct)) {
      const n = num(direct);
      if (Number.isFinite(n)) return n;
    }
    const result = resultOf(row);
    const stake = num(val(row, 'units'));
    const odds = americanOdds(val(row, 'odds'));
    if (!['Win', 'Loss', 'Push', 'Void'].includes(result)) return null;
    if (result === 'Push' || result === 'Void') return 0;
    if (result === 'Loss') return stake ? -Math.abs(stake) : null;
    if (!stake || odds === null) return null;
    return odds > 0 ? stake * odds / 100 : stake * 100 / Math.abs(odds);
  }
  function profitDisplay(row) {
    const value = profitUnits(row);
    return value === null ? (isFinal(row) ? 'Needs Units/Odds' : 'Pending') : formatUnits(value);
  }
  function statusCell(row) {
    const result = resultOf(row);
    const cls = result === 'Win' ? 'status-win' : result === 'Loss' ? 'status-loss' : (result === 'Push' || result === 'Void') ? 'status-push' : 'status-pending';
    return `<span class="${cls}">${esc(result)}</span>`;
  }
  function tableRows(rows, cells, empty) {
    if (!rows.length) return `<tr><td colspan="${cells.length}">${esc(empty)}</td></tr>`;
    return rows.slice(0, 90).map(row => `<tr>${cells.map(fn => `<td>${fn(row)}</td>`).join('')}</tr>`).join('');
  }
  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }
  function stats(rows, activeRows = []) {
    const graded = rows.filter(row => isFinal(row) && lower(gradeOf(row)) !== 'pass');
    const wins = graded.filter(row => resultOf(row) === 'Win').length;
    const losses = graded.filter(row => resultOf(row) === 'Loss').length;
    const pushes = graded.filter(row => resultOf(row) === 'Push' || resultOf(row) === 'Void').length;
    const decisions = wins + losses;
    const units = graded.reduce((sum, row) => sum + (profitUnits(row) ?? 0), 0);
    const ordered = [...graded].sort((a, b) => String(dateKey(val(b, 'date'))).localeCompare(String(dateKey(val(a, 'date')))));
    let streakType = '', streak = 0;
    for (const row of ordered) {
      const result = resultOf(row);
      if (result !== 'Win' && result !== 'Loss') continue;
      if (!streakType) streakType = result;
      if (result !== streakType) break;
      streak += 1;
    }
    return {
      wins, losses, pushes,
      winRate: decisions ? `${Math.round(wins / decisions * 100)}%` : '--',
      units,
      active: activeRows.filter(isActive).length,
      streak: streak ? `${streak}${streakType[0]}` : '--'
    };
  }
  function writeStats(prefix, s) {
    setText(`${prefix}Record`, `${s.wins}-${s.losses}${s.pushes ? `-${s.pushes}` : ''}`);
    setText(`${prefix}WinRate`, s.winRate);
    setText(`${prefix}Units`, formatUnits(s.units));
    setText(`${prefix}Streak`, s.streak);
  }

  function card(row, label) {
    const title = titleOf(row);
    const type = first(val(row, 'type'), label, 'Pick');
    const line = first(val(row, 'best'), val(row, 'odds'), 'Pending');
    const writeup = first(val(row, 'writeup'), 'Public preview pending.');
    return `<article class="card pick-card glass" data-date="${esc(dateKey(val(row, 'date')))}">
      <div class="flex items-start justify-between gap-3"><div><div class="text-xs uppercase tracking-[.16em] text-[#ffe391] font-black">${esc(first(val(row, 'league'), val(row, 'sport'), '--'))} | ${esc(type)}</div><h3 class="pick-title mt-2">${esc(title)}</h3><p class="mt-2 text-[#cbbf9d]">${esc(val(row, 'game'))}</p></div><div class="grade">${esc(gradeOf(row))}</div></div>
      <div class="line-box"><span>Line / Number</span><b>${esc(line)}</b><span>${esc(type)}</span></div>
      <div class="flex flex-wrap gap-2 mt-4"><span class="pill">${esc(label || 'VIP')}</span><span class="pill">${esc(first(val(row, 'cutoff'), 'No Bet Cutoff'))}</span><span class="pill">${esc(first(val(row, 'status'), 'Posted'))}</span></div>
      <div class="grid grid-cols-2 gap-2 mt-4"><div class="stat"><b class="!text-lg">${esc(first(val(row, 'odds'), '--'))}</b><span>Odds</span></div><div class="stat"><b class="!text-lg">${esc(first(val(row, 'sportsbook'), 'Manual Commit'))}</b><span>Sportsbook</span></div><div class="stat"><b class="!text-lg">${esc(first(val(row, 'units'), '--'))}</b><span>Units to Commit</span></div></div>
      <div class="mt-4 leading-7 text-[#f4ead4]"><p>${esc(writeup)}</p></div>
    </article>`;
  }
  function renderCardsInto(id, rows, label, empty) {
    const el = document.getElementById(id);
    if (!el) return;
    const usable = rows.filter(isActive).slice(0, 12);
    el.innerHTML = usable.length ? usable.map(row => card(row, label)).join('') : `<div class="empty-picks glass"><h3 class="pick-title">${esc(empty || 'No picks released yet.')}</h3><p class="mt-3 text-[#cbbf9d]">No picks released yet.</p></div>`;
  }
  function propsSummary(rows) {
    const active = rows.filter(isActive);
    const grades = active.map(gradeOf).filter(Boolean).join(' / ') || '--';
    const sports = Array.from(new Set(active.map(row => first(val(row, 'sport'), val(row, 'league'))).filter(Boolean))).join(' / ') || '--';
    return `<div class="card glass"><div class="pill"><i data-lucide="zap"></i>Props Lab</div><h3 class="pick-title mt-4">${active.length} active prop${active.length === 1 ? '' : 's'} loaded</h3><p class="mt-3 text-[#cbbf9d] leading-7">The actual prop cards are listed once below under Today’s Active Props.</p><div class="grid grid-cols-2 gap-2 mt-4"><div class="stat"><b class="!text-lg">${esc(grades)}</b><span>Grades</span></div><div class="stat"><b class="!text-lg">${esc(sports)}</b><span>Sports</span></div></div></div>`;
  }
  function renderPropsSummary(id, rows) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = propsSummary(rows);
  }
  function renderHome(data) {
    const active = ['free', 'vip', 'props', 'lottoParlays', 'longshots'].flatMap(key => Array.isArray(data[key]) ? data[key] : []).filter(isActive);
    const featured = active[0];
    const featuredEl = document.getElementById('featuredCard');
    if (featuredEl && featured) featuredEl.outerHTML = card(featured, first(featured.access, 'VIP'));
    setText('homeActive', `${active.length} picks`);
  }

  function parseCsv(text) {
    const rows = [];
    let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i], n = text[i + 1];
      if (c === '"' && q && n === '"') { cell += '"'; i++; continue; }
      if (c === '"') { q = !q; continue; }
      if (c === ',' && !q) { row.push(cell); cell = ''; continue; }
      if ((c === '\n' || c === '\r') && !q) { if (c === '\r' && n === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; continue; }
      cell += c;
    }
    row.push(cell); rows.push(row);
    const headers = (rows.shift() || []).map(clean);
    return rows.map(values => Object.fromEntries(headers.map((h, i) => [h, clean(values[i])]))).filter(row => Object.values(row).some(Boolean));
  }
  async function fetchSheet(gid, source) {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}&t=${Date.now()}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`${source} ${res.status}`);
      return parseCsv(await res.text()).map(row => ({ ...row, __source: source }));
    } catch (error) {
      console.warn('Micks sheet results fallback failed:', source, error);
      return [];
    }
  }
  async function loadResultsRows() {
    try {
      const res = await fetch('/api/results?days=180&cache=' + Date.now(), { cache: 'no-store' });
      const data = res.ok ? await res.json() : null;
      const rows = data && Array.isArray(data.rows) ? data.rows : [];
      const hasApiRows = rows.length || ['free', 'vip', 'props', 'lotto', 'longshots'].some(key => Array.isArray(data?.[key]) && data[key].length);
      if (hasApiRows) {
        return {
          free: data.free || [],
          vip: data.vip || [],
          props: data.props || [],
          lotto: data.lotto || [],
          longshots: data.longshots || [],
          rows: rows.length ? rows : [...(data.free || []), ...(data.vip || []), ...(data.props || []), ...(data.lotto || []), ...(data.longshots || [])]
        };
      }
    } catch (error) {
      console.warn('Micks /api/results repair fetch failed:', error);
    }

    const [free, vip, props, lotto, longshots] = await Promise.all([
      fetchSheet(GIDS.results, 'Results Archive'),
      fetchSheet(GIDS.vipArchive, 'VIP Archive'),
      fetchSheet(GIDS.propsResults, 'Props Results'),
      fetchSheet(GIDS.lottoProps, 'Lotto Props'),
      fetchSheet(GIDS.longshotsHistory, 'Longshots History')
    ]);
    return { free, vip, props, lotto, longshots, rows: [...free, ...vip, ...props, ...lotto, ...longshots] };
  }
  function renderLedger(id, rows, empty) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = tableRows(rows, [
      row => esc(displayDate(val(row, 'date'))),
      row => esc(first(val(row, 'league'), val(row, 'sport'), row.__source, '--')),
      row => esc(first(val(row, 'game'), '--')),
      row => esc(first(titleOf(row), val(row, 'legs'), '--')),
      row => esc(gradeOf(row)),
      row => statusCell(row),
      row => esc(profitDisplay(row)),
      row => esc(first(val(row, 'closing'), '--'))
    ], empty || 'No archive rows loaded yet.');
  }
  function renderOverallResults(id, rows) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = tableRows(rows, [
      row => esc(displayDate(val(row, 'date'))),
      row => esc(first(val(row, 'league'), val(row, 'sport'), row.__source, '--')),
      row => esc(first(titleOf(row), val(row, 'legs'), '--')),
      row => esc(gradeOf(row)),
      row => statusCell(row),
      row => esc(profitDisplay(row)),
      row => esc(first(val(row, 'closing'), '--'))
    ], 'No result rows loaded yet.');
  }
  function renderLongshotRows(id, rows) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = tableRows(rows, [
      row => esc(displayDate(val(row, 'date'))),
      row => esc(first(val(row, 'risk'), val(row, 'category'), 'Longshots')),
      row => esc(first(titleOf(row), 'Parlay')),
      row => `<div class="max-w-[420px] whitespace-pre-wrap">${esc(first(val(row, 'legs'), val(row, 'notes'), '--'))}</div>`,
      row => esc(gradeOf(row)),
      row => statusCell(row),
      row => esc(profitDisplay(row)),
      row => esc(first(val(row, 'notes'), 'No additional notes recorded.'))
    ], 'No Longshots History rows loaded yet.');
  }
  async function renderResultsRepair(activeData = null) {
    const data = await loadResultsRows();
    const overall = data.rows;
    renderLedger('freeResultsRows', data.free, 'No free results archive rows loaded yet.');
    renderLedger('vipResultsRows', data.vip, 'No VIP archive rows loaded yet.');
    renderLedger('propsResultsRows', data.props, 'No Props Results rows loaded yet.');
    renderLongshotRows('longshotsRows', [...data.lotto, ...data.longshots]);
    renderOverallResults('resultsRows', overall);
    writeStats('overall', stats(overall, []));
    writeStats('free', stats(data.free, activeData?.free || []));
    writeStats('vip', stats(data.vip, activeData?.vip || []));
    writeStats('props', stats(data.props, activeData?.props || []));
    writeStats('longshots', stats([...data.lotto, ...data.longshots], [...(activeData?.lottoParlays || []), ...(activeData?.longshots || [])]));
  }
  async function hydrateOddsFeed() {
    const table = document.getElementById('oddsRows');
    if (!table) return;
    try {
      const res = await fetch('/api/odds-feed?cache=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const rows = Array.isArray(data.rows) ? data.rows : [];
      if (!rows.length) return;
      table.innerHTML = rows.slice(0, 80).map(row => `<tr>${[row.league, row.game, row.pick, row.odds, row.sportsbook, row.bestMarket, row.movement, row.confirmation].map(value => `<td>${esc(value || '--')}</td>`).join('')}</tr>`).join('');
    } catch (error) {
      console.warn('Micks odds feed repair failed:', error);
    }
  }
  async function renderLiveSections() {
    try {
      const res = await fetch('/api/todays-picks?cache=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const props = Array.isArray(data.props) ? data.props : [];
      const lotto = Array.isArray(data.lottoParlays) ? data.lottoParlays : [];
      const longshots = Array.isArray(data.longshots) ? data.longshots : [];
      renderHome(data);
      renderPropsSummary('propsCards', props);
      renderCardsInto('activePropsCards', props, 'Props Lab', 'No active props released yet.');
      renderCardsInto('longshotsCards', [...lotto, ...longshots], 'Lotto / Longshots', 'No lotto parlays or longshots released yet.');
      await renderResultsRepair(data);
      hydrateOddsFeed();
      if (window.lucide?.createIcons) window.lucide.createIcons();
      console.log('Micks production repair rendered:', { props: props.length, lotto: lotto.length, longshots: longshots.length });
    } catch (error) {
      console.warn('Micks production repair failed:', error);
      await renderResultsRepair(null);
    }
  }
  function patchBadExistingCells() {
    ['overallUnits', 'freeUnits', 'vipUnits', 'propsUnits', 'longshotsUnits', 'homeUnits'].forEach(id => {
      const el = document.getElementById(id);
      if (el && /nan|undefined|null|\[object object\]/i.test(el.textContent)) el.textContent = '+0.00u';
    });
    document.querySelectorAll('#resultsRows td, #propsResultsRows td, #longshotsRows td, #freeResultsRows td, #vipResultsRows td').forEach(td => {
      if (/nan|undefined|null|\[object object\]/i.test(td.textContent)) td.textContent = '--';
    });
  }
  function start() {
    patchBadExistingCells();
    renderLiveSections();
    setTimeout(renderLiveSections, 900);
    setTimeout(renderLiveSections, 2500);
    window.setInterval(() => { patchBadExistingCells(); renderLiveSections(); }, 30000);
  }
  window.forceRenderMicksLiveSections = renderLiveSections;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.addEventListener('hashchange', renderLiveSections);
  window.addEventListener('load', renderLiveSections);
})();
