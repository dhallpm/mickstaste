/* MICKS PICKS — PROPS LAB ONLY ENGINE
   This file isolates the Props Lab page from global pick records.
   It only tracks prop bets, prop records, prop units, and active prop cards.
*/

const PROP_SHEET_ID = "15txBM8qsck7f0ZA_za7xYEykBxKpuq0no3x7yHcKNeE";
const PROP_ACTIVE_GID = "0";
const PROP_RESULTS_GID = "1579113575";
const PROP_VIP_ARCHIVE_GID = "210503117";

const PROP_HEADER_ALIASES = {
  date: ["Date", "Posted Date", "Pick Date"],
  sport: ["Sport"],
  league: ["League", "Sport League"],
  game: ["Game", "Matchup", "Event"],
  pick: ["Pick", "Play", "Selection"],
  market: ["Market", "Bet Type", "Odds Market"],
  betType: ["Bet Type", "Market", "Type"],
  odds: ["Odds", "Price"],
  sportsbook: ["Sportsbook", "Book", "Bookmaker"],
  grade: ["Grade", "Rating"],
  units: ["Units", "Unit", "Stake"],
  bestNumber: ["Best Number", "Best #", "Best Line"],
  noBetCutoff: ["No Bet Cutoff", "No-Bet Cutoff", "Cutoff"],
  confidence: ["Confidence"],
  status: ["Status"],
  result: ["Result", "Outcome"],
  profitLoss: ["Profit/Loss", "Profit Loss", "P/L", "PL"],
  writeup: ["Writeup", "Write Up", "Public Writeup", "Summary"],
  fullAnalysis: ["Full Analysis", "Analysis", "VIP Analysis"],
  access: ["Access", "Tier"],
  featured: ["Featured", "Feature", "Featured?"],
  closingNumber: ["Closing #", "Closing Number", "Closing Line"]
};

function propCsvUrl(gid){ return `https://docs.google.com/spreadsheets/d/${PROP_SHEET_ID}/export?format=csv&gid=${gid}&cache=${Date.now()}`; }
function propEsc(s){ return String(s || '').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
function propClean(s){ return String(s || '').trim().toLowerCase().replace(/\s+/g,' '); }
function propCompact(s){ return propClean(s).replace(/[^a-z0-9]/g,''); }
function propHasText(v){ return String(v || '').trim().length > 0; }
function propNumber(v){ const n = parseFloat(String(v || '').replace(/[^0-9.+-]/g,'')); return Number.isFinite(n) ? n : 0; }
function propDateDesc(a,b){ return (Date.parse(b.date || '') || 0) - (Date.parse(a.date || '') || 0); }
function propSet(id, value){ const el = document.getElementById(id); if(el) el.textContent = value; }

function propParseCSV(text){
  const rows=[]; let row=[], cur='', q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i], n=text[i+1];
    if(c === '"' && q && n === '"'){ cur += '"'; i++; }
    else if(c === '"'){ q = !q; }
    else if(c === ',' && !q){ row.push(cur); cur=''; }
    else if((c === '\n' || c === '\r') && !q){
      if(cur !== '' || row.length){ row.push(cur); rows.push(row); row=[]; cur=''; }
      if(c === '\r' && n === '\n') i++;
    } else cur += c;
  }
  if(cur !== '' || row.length){ row.push(cur); rows.push(row); }
  return rows;
}
function propNormHeader(h){ return String(h || '').trim().toLowerCase().replace(/\s+/g,' ').replace(/[^\w#/% ]/g,''); }
function propAlias(headers, aliases){ return headers.find(h => aliases.some(a => propNormHeader(a) === propNormHeader(h))); }
function propMakeObjects(rows, sourceTab){
  if(!rows.length) return [];
  const headers = rows[0].map(h => String(h || '').trim());
  return rows.slice(1).map(r => {
    const raw = {};
    headers.forEach((h,i) => raw[h] = String(r[i] || '').trim());
    const obj = { _raw: raw, _sourceTab: sourceTab };
    Object.entries(PROP_HEADER_ALIASES).forEach(([key, aliases]) => {
      const real = propAlias(headers, aliases);
      obj[key] = real ? String(raw[real] || '').trim() : '';
    });
    return obj;
  }).filter(r => Object.values(r._raw || {}).some(v => String(v || '').trim() !== ''));
}
async function propRows(gid, sourceTab){
  const res = await fetch(propCsvUrl(gid), { cache:'no-store' });
  const text = await res.text();
  if(text.toLowerCase().includes('<html')) throw new Error(sourceTab + ' unavailable');
  return propMakeObjects(propParseCSV(text), sourceTab);
}

function propKey(row){ return [row.league || row.sport || '', row.game || '', row.pick || ''].map(propCompact).join('|'); }
function propDedupe(rows){ const seen = new Set(); return rows.filter(r => { const k = propKey(r); if(!k || seen.has(k)) return false; seen.add(k); return true; }); }
function propIsWin(row){ const r=propClean(row.result); return r === 'win' || r === 'won' || r.includes('win') || r.includes('won'); }
function propIsLoss(row){ const r=propClean(row.result); return r === 'loss' || r === 'lost' || r.includes('loss') || r.includes('lost'); }
function propIsPush(row){ const r=propClean(row.result); return r === 'push' || r === 'void'; }
function propIsClosed(row){ return propIsWin(row) || propIsLoss(row) || propIsPush(row) || propClean(row.status).includes('graded') || propClean(row.status).includes('closed'); }
function propIsActive(row){
  const status = propClean(row.status);
  if(!propHasText(row.pick)) return false;
  if(['void','cancelled','canceled','delete','removed'].some(x => status.includes(x))) return false;
  return !propIsClosed(row);
}
function propResultClass(value){
  const r = propClean(value);
  if(r.includes('win') || r.includes('won')) return 'status-win';
  if(r.includes('loss') || r.includes('lost')) return 'status-loss';
  return 'status-pending';
}

function isPropBet(row){
  const text = propClean(`${row.betType} ${row.market} ${row.pick} ${row.game}`);
  const hardExcludes = [
    'moneyline','money line',' ml','spread','run line','puck line','full game total','game total',
    'team total','1h','first half','f5','first five','series','future','parlay','alt spread'
  ];
  const propWords = [
    'prop','player prop','points','pts','rebounds','rebs','reb','assists','asts','ast','pra','p+r+a','pr','pa','ra',
    'threes','3pm','3 pt','three pointers','sog','shots on goal','shots','saves','strikeouts','ks','k prop',
    'hits','bases','total bases','rbi','runs','steals','blocks','turnovers','passing','rushing','receiving',
    'yards','touchdowns','tds','fantasy score','double double'
  ];
  const hasPropWord = propWords.some(w => text.includes(w));
  const hasHardExclude = hardExcludes.some(w => text.includes(w));
  if(propClean(row.betType).includes('prop') || propClean(row.market).includes('prop')) return true;
  if(hasPropWord && !hasHardExclude) return true;
  return false;
}

function propStats(rows, activeRows){
  const graded = rows.filter(r => propHasText(r.pick) && (propIsWin(r) || propIsLoss(r)));
  const wins = graded.filter(propIsWin).length;
  const losses = graded.filter(propIsLoss).length;
  const total = wins + losses;
  const units = graded.reduce((sum, r) => sum + propNumber(r.profitLoss), 0);
  return {
    record: total ? `${wins}-${losses}` : '--',
    winRate: total ? `${Math.round((wins / total) * 100)}%` : '--',
    units: total || units ? `${units > 0 ? '+' : ''}${units.toFixed(2)}u` : '--',
    active: activeRows.length || '--',
    graded: total || '--'
  };
}

function propCard(row){
  const cls = propResultClass(row.result || row.status);
  return `<div class="pick-card">
    <div class="kicker">Prop Bet</div>
    <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
      <div>
        <div style="color:var(--muted);font-size:11px;text-transform:uppercase;font-weight:1000;letter-spacing:.9px">${propEsc(row.league || row.sport || 'Sports')} • ${propEsc(row.betType || row.market || 'Player Prop')}</div>
        <div class="pick-title">${propEsc(row.pick || 'Prop Pending')}</div>
        <p style="color:var(--muted);line-height:1.5">${propEsc(row.game || 'Game details loading')}</p>
      </div>
      <div style="background:linear-gradient(135deg,#6a3cff,#22e6ff);color:#fff;padding:9px 11px;border-radius:10px;font-weight:1000">${propEsc(row.grade || 'PROP')}</div>
    </div>
    <div class="metric-grid">
      <div class="metric"><strong>${propEsc(row.odds || '--')}</strong><span>Odds</span></div>
      <div class="metric"><strong>${propEsc(row.sportsbook || '--')}</strong><span>Book</span></div>
      <div class="metric"><strong>${propEsc(row.bestNumber || '--')}</strong><span>Best Line</span></div>
      <div class="metric"><strong class="${cls}">${propEsc(row.status || row.result || 'Pending')}</strong><span>Status</span></div>
    </div>
    <p style="color:#e7dcc4;line-height:1.55;margin-top:14px">${propEsc(row.writeup || row.fullAnalysis || 'Prop angle loading from the Micks Picks sheet.')}</p>
  </div>`;
}

function renderPropGrid(id, rows, limit=12){
  const el = document.getElementById(id); if(!el) return;
  const usable = rows.filter(propIsActive).sort(propDateDesc).slice(0, limit);
  el.innerHTML = usable.length ? usable.map(propCard).join('') : '<div class="empty">No active prop bets loaded right now.</div>';
}
function renderPropResults(id, rows, limit=100){
  const el = document.getElementById(id); if(!el) return;
  const usable = propDedupe(rows).filter(r => propHasText(r.pick)).sort(propDateDesc).slice(0, limit);
  if(!usable.length){ el.innerHTML = '<tr><td colspan="7">No prop results loaded.</td></tr>'; return; }
  el.innerHTML = usable.map(row => `<tr>
    <td>${propEsc(row.date || '')}</td>
    <td>${propEsc(row.league || row.sport || '')}</td>
    <td><strong>${propEsc(row.pick || '')}</strong><br><span style="color:var(--muted)">${propEsc(row.game || '')}</span></td>
    <td>${propEsc(row.grade || '')}</td>
    <td class="${propResultClass(row.result || row.status)}">${propEsc(row.result || row.status || 'Pending')}</td>
    <td>${propEsc(row.profitLoss || '')}</td>
    <td>${propEsc(row.closingNumber || row.bestNumber || '')}</td>
  </tr>`).join('');
}

async function bootPropsLab(){
  if(!document.body.classList.contains('page-bg-props_lab')) return;
  try{
    const [active, results, vipArchive] = await Promise.all([
      propRows(PROP_ACTIVE_GID, 'Active Picks'),
      propRows(PROP_RESULTS_GID, 'Results Archive').catch(() => []),
      propRows(PROP_VIP_ARCHIVE_GID, 'VIP Archive').catch(() => [])
    ]);
    const propActive = propDedupe(active).filter(isPropBet);
    const propResults = propDedupe(results.concat(vipArchive)).filter(isPropBet);
    const activeOpen = propActive.filter(propIsActive);
    const stats = propStats(propResults, activeOpen);

    propSet('propRecord', stats.record);
    propSet('propWinRate', stats.winRate);
    propSet('propTotalUnits', stats.units);
    propSet('propActiveCount', stats.active);
    propSet('propGradedCount', stats.graded);

    renderPropGrid('propBetsGrid', propActive, 16);
    renderPropResults('propResultsBody', propResults, 100);
    document.querySelectorAll('.prop-sync-time').forEach(el => { el.textContent = new Date().toLocaleTimeString([], { hour:'numeric', minute:'2-digit' }); });
  }catch(e){
    const grid = document.getElementById('propBetsGrid');
    if(grid) grid.innerHTML = '<div class="empty">Prop data could not load. Check the Micks Picks Google Sheet sharing settings.</div>';
    console.error('Props Lab error:', e);
  }
}

bootPropsLab();
setInterval(bootPropsLab, 30000);
