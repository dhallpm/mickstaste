/* MICKS PICKS — PROPS LAB ONLY ENGINE
   Isolates Props Lab from global records and tracks only prop bets/results.
   Fixes: broader winning prop detection + consistent MM/DD/YYYY dates.
*/

const PROP_SHEET_ID = "15txBM8qsck7f0ZA_za7xYEykBxKpuq0no3x7yHcKNeE";
const PROP_ACTIVE_GID = "0";
const PROP_RESULTS_GID = "1579113575";
const PROP_VIP_ARCHIVE_GID = "210503117";

const PROP_HEADER_ALIASES = {
  date: ["Date", "Posted Date", "Pick Date"], sport: ["Sport"], league: ["League", "Sport League"],
  game: ["Game", "Matchup", "Event"], pick: ["Pick", "Play", "Selection"],
  market: ["Market", "Bet Type", "Odds Market"], betType: ["Bet Type", "Market", "Type"],
  odds: ["Odds", "Price"], sportsbook: ["Sportsbook", "Book", "Bookmaker"], grade: ["Grade", "Rating"],
  units: ["Units", "Unit", "Stake"], bestNumber: ["Best Number", "Best #", "Best Line"],
  noBetCutoff: ["No Bet Cutoff", "No-Bet Cutoff", "Cutoff"], confidence: ["Confidence"],
  status: ["Status"], result: ["Result", "Outcome"], profitLoss: ["Profit/Loss", "Profit Loss", "P/L", "PL"],
  writeup: ["Writeup", "Write Up", "Public Writeup", "Summary"], fullAnalysis: ["Full Analysis", "Analysis", "VIP Analysis"],
  access: ["Access", "Tier"], featured: ["Featured", "Feature", "Featured?"], closingNumber: ["Closing #", "Closing Number", "Closing Line"]
};

function propCsvUrl(gid){ return `https://docs.google.com/spreadsheets/d/${PROP_SHEET_ID}/export?format=csv&gid=${gid}&cache=${Date.now()}`; }
function propEsc(s){ return String(s || '').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
function propClean(s){ return String(s || '').trim().toLowerCase().replace(/\s+/g,' '); }
function propCompact(s){ return propClean(s).replace(/[^a-z0-9]/g,''); }
function propHasText(v){ return String(v || '').trim().length > 0; }
function propNumber(v){ const n = parseFloat(String(v || '').replace(/[^0-9.+-]/g,'')); return Number.isFinite(n) ? n : 0; }
function propSet(id, value){ const el = document.getElementById(id); if(el) el.textContent = value; }

function propDateValue(v){
  const s = String(v || '').trim();
  if(!s) return 0;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if(m){
    let y = Number(m[3]); if(y < 100) y += 2000;
    return new Date(y, Number(m[1]) - 1, Number(m[2])).getTime();
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}
function propFormatDate(v){
  const t = propDateValue(v);
  if(!t) return propEsc(v || '');
  const d = new Date(t);
  const mm = String(d.getMonth() + 1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  const yy = d.getFullYear();
  return `${mm}/${dd}/${yy}`;
}
function propDateDesc(a,b){ return propDateValue(b.date) - propDateValue(a.date); }

function propParseCSV(text){
  const rows=[]; let row=[], cur='', q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i], n=text[i+1];
    if(c === '"' && q && n === '"'){ cur += '"'; i++; }
    else if(c === '"'){ q = !q; }
    else if(c === ',' && !q){ row.push(cur); cur=''; }
    else if((c === '\n' || c === '\r') && !q){ if(cur !== '' || row.length){ row.push(cur); rows.push(row); row=[]; cur=''; } if(c === '\r' && n === '\n') i++; }
    else cur += c;
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
    const raw = {}; headers.forEach((h,i) => raw[h] = String(r[i] || '').trim());
    const obj = { _raw: raw, _sourceTab: sourceTab };
    Object.entries(PROP_HEADER_ALIASES).forEach(([key, aliases]) => { const real = propAlias(headers, aliases); obj[key] = real ? String(raw[real] || '').trim() : ''; });
    return obj;
  }).filter(r => Object.values(r._raw || {}).some(v => String(v || '').trim() !== ''));
}
async function propRows(gid, sourceTab){
  const res = await fetch(propCsvUrl(gid), { cache:'no-store' });
  const text = await res.text();
  if(text.toLowerCase().includes('<html')) throw new Error(sourceTab + ' unavailable');
  return propMakeObjects(propParseCSV(text), sourceTab);
}

function propKey(row){ return [row.league || row.sport || '', row.game || '', row.pick || '', row.result || '', row.status || ''].map(propCompact).join('|'); }
function propDedupe(rows){ const seen = new Set(); return rows.filter(r => { const k = propKey(r); if(!k || seen.has(k)) return false; seen.add(k); return true; }); }
function propResultText(row){ return propClean(`${row.result || ''} ${row.status || ''}`); }
function propIsWin(row){ const r=propResultText(row); return r.includes('win') || r.includes('won') || r === 'w' || r.includes('cash') || r.includes('cashed') || r.includes('✅'); }
function propIsLoss(row){ const r=propResultText(row); return r.includes('loss') || r.includes('lost') || r === 'l' || r.includes('lose') || r.includes('failed'); }
function propIsPush(row){ const r=propResultText(row); return r.includes('push') || r.includes('void') || r.includes('cancel'); }
function propIsClosed(row){ return propIsWin(row) || propIsLoss(row) || propIsPush(row) || propClean(row.status).includes('graded') || propClean(row.status).includes('closed'); }
function propIsActive(row){
  const status = propClean(row.status);
  if(!propHasText(row.pick)) return false;
  if(['void','cancelled','canceled','delete','removed'].some(x => status.includes(x))) return false;
  return !propIsClosed(row);
}
function propResultClass(value){
  const r = propClean(value);
  if(r.includes('win') || r.includes('won') || r.includes('cash')) return 'status-win';
  if(r.includes('loss') || r.includes('lost') || r.includes('failed')) return 'status-loss';
  return 'status-pending';
}
function propDisplayResult(row){
  if(propIsWin(row)) return 'Win';
  if(propIsLoss(row)) return 'Loss';
  if(propIsPush(row)) return 'Push/Void';
  return row.result || row.status || 'Pending';
}

function isPropBet(row){
  const betType = propClean(row.betType || row.market || '');
  const pick = propClean(row.pick || '');
  const text = propClean(`${row.betType} ${row.market} ${row.pick}`);
  const nonPlayer = ['moneyline','money line','spread','run line','puck line','full game total','game total','team total','period total','total rounds','parlay','future','series'];
  if(betType.includes('player prop') || betType.includes('sog prop') || betType.includes('prop')) return true;
  if(nonPlayer.some(w => betType.includes(w))) return false;
  const propWords = [' over ',' under ','points','pts','rebounds','rebs','assists','asts','pra','p+r+a','threes','3pm','sog','shots on goal','saves','strikeouts',' k ','hits','total bases','rbi','steals','blocks','turnovers','passing','rushing','receiving','yards','touchdowns','fantasy score','double double','itd','inside the distance'];
  return propWords.some(w => (` ${text} `).includes(w)) && !/^under \d|^over \d/.test(pick.replace(/\.\d+/g,''));
}

function propStats(rows, activeRows){
  const graded = rows.filter(r => propHasText(r.pick) && (propIsWin(r) || propIsLoss(r)));
  const wins = graded.filter(propIsWin).length;
  const losses = graded.filter(propIsLoss).length;
  const total = wins + losses;
  const units = graded.reduce((sum, r) => sum + propNumber(r.profitLoss), 0);
  return { record: total ? `${wins}-${losses}` : '--', winRate: total ? `${Math.round((wins / total) * 100)}%` : '--', units: total || units ? `${units > 0 ? '+' : ''}${units.toFixed(2)}u` : '--', active: activeRows.length || '--', graded: total || '--' };
}

function propCard(row){
  const cls = propResultClass(propDisplayResult(row));
  return `<div class="pick-card"><div class="kicker">Prop Bet</div><div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><div><div style="color:var(--muted);font-size:11px;text-transform:uppercase;font-weight:1000;letter-spacing:.9px">${propEsc(row.league || row.sport || 'Sports')} • ${propEsc(row.betType || row.market || 'Player Prop')}</div><div class="pick-title">${propEsc(row.pick || 'Prop Pending')}</div><p style="color:var(--muted);line-height:1.5">${propEsc(row.game || 'Game details loading')}</p></div><div style="background:linear-gradient(135deg,#6a3cff,#22e6ff);color:#fff;padding:9px 11px;border-radius:10px;font-weight:1000">${propEsc(row.grade || 'PROP')}</div></div><div class="metric-grid"><div class="metric"><strong>${propEsc(row.odds || '--')}</strong><span>Odds</span></div><div class="metric"><strong>${propEsc(row.sportsbook || '--')}</strong><span>Book</span></div><div class="metric"><strong>${propEsc(row.bestNumber || '--')}</strong><span>Best Line</span></div><div class="metric"><strong class="${cls}">${propEsc(propDisplayResult(row))}</strong><span>Status</span></div></div><p style="color:#e7dcc4;line-height:1.55;margin-top:14px">${propEsc(row.writeup || row.fullAnalysis || 'Prop angle loading from the Micks Picks sheet.')}</p></div>`;
}

function renderPropGrid(id, rows, limit=12){
  const el = document.getElementById(id); if(!el) return;
  const usable = rows.filter(propIsActive).sort(propDateDesc).slice(0, limit);
  el.innerHTML = usable.length ? usable.map(propCard).join('') : '<div class="empty">No active prop bets loaded right now.</div>';
}
function renderPropResults(id, rows, limit=100){
  const el = document.getElementById(id); if(!el) return;
  const usable = propDedupe(rows).filter(r => propHasText(r.pick) && propIsClosed(r)).sort(propDateDesc).slice(0, limit);
  if(!usable.length){ el.innerHTML = '<tr><td colspan="7">No prop results loaded.</td></tr>'; return; }
  el.innerHTML = usable.map(row => `<tr><td>${propFormatDate(row.date)}</td><td>${propEsc(row.league || row.sport || '')}</td><td><strong>${propEsc(row.pick || '')}</strong><br><span style="color:var(--muted)">${propEsc(row.game || '')}</span></td><td>${propEsc(row.grade || '')}</td><td class="${propResultClass(propDisplayResult(row))}">${propEsc(propDisplayResult(row))}</td><td>${propEsc(row.profitLoss || '')}</td><td>${propEsc(row.closingNumber || row.bestNumber || '')}</td></tr>`).join('');
}

async function bootPropsLab(){
  if(!document.body.classList.contains('page-bg-props_lab')) return;
  try{
    const [active, results, vipArchive] = await Promise.all([propRows(PROP_ACTIVE_GID, 'Active Picks'), propRows(PROP_RESULTS_GID, 'Results Archive').catch(() => []), propRows(PROP_VIP_ARCHIVE_GID, 'VIP Archive').catch(() => [])]);
    const propActive = propDedupe(active).filter(isPropBet);
    const propResults = propDedupe(results.concat(vipArchive)).filter(isPropBet);
    const activeOpen = propActive.filter(propIsActive);
    const stats = propStats(propResults, activeOpen);
    propSet('propRecord', stats.record); propSet('propWinRate', stats.winRate); propSet('propTotalUnits', stats.units); propSet('propActiveCount', stats.active); propSet('propGradedCount', stats.graded);
    renderPropGrid('propBetsGrid', propActive, 16);
    renderPropResults('propResultsBody', propResults, 100);
    document.querySelectorAll('.prop-sync-time').forEach(el => { el.textContent = new Date().toLocaleTimeString([], { hour:'numeric', minute:'2-digit' }); });
  }catch(e){ const grid = document.getElementById('propBetsGrid'); if(grid) grid.innerHTML = '<div class="empty">Prop data could not load. Check the Micks Picks Google Sheet sharing settings.</div>'; console.error('Props Lab error:', e); }
}

bootPropsLab();
setInterval(bootPropsLab, 30000);
