/* Micks LongShots - parlay and lotto release board */
const LONGSHOTS_SHEET_ID = '15txBM8qsck7f0ZA_za7xYEykBxKpuq0no3x7yHcKNeE';
const LONGSHOTS_GID = '2026051601';
const LONGSHOTS_COLUMNS = {
  date:['Date'], sport:['Sport'], league:['League'], game:['Game','Matchup'], pick:['Pick','Play'], type:['LongShot Type','Type','Bet Type'], odds:['Odds'], sportsbook:['Sportsbook','Book'], grade:['Grade'], units:['Units'], bestNumber:['Best Number'], cutoff:['No Bet Cutoff','Cutoff'], legCount:['Leg Count','Legs'], payoutTarget:['Payout Target'], riskTier:['Risk Tier','Risk'], status:['Status'], releaseStatus:['Release Status'], access:['Access'], featured:['Featured'], writeup:['Writeup'], fullAnalysis:['Full Analysis'], marketNotes:['Market Notes'], sourceVerification:['Source Verification'], timestamp:['Timestamp','Posted Time'], manualApproved:['Manual Approved'], overrideMode:['Override Mode'], legs:['Legs'], removedLegs:['Removed Legs'], validationNotes:['Validation Notes','Validation Note']
};

let LONGSHOTS_STATE = [];

function lsCsvUrl(){ return `https://docs.google.com/spreadsheets/d/${LONGSHOTS_SHEET_ID}/export?format=csv&gid=${LONGSHOTS_GID}&cache=${Date.now()}`; }
function lsClean(value){ return String(value || '').trim().toLowerCase().replace(/\s+/g,' '); }
function lsEscape(value){ return String(value || '').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])); }
function lsParseCSV(text){ const rows=[]; let row=[], cur='', quoted=false; for(let i=0;i<text.length;i++){ const c=text[i], n=text[i+1]; if(c==='"' && quoted && n==='"'){ cur+='"'; i++; } else if(c==='"'){ quoted=!quoted; } else if(c===',' && !quoted){ row.push(cur); cur=''; } else if((c==='\n'||c==='\r') && !quoted){ if(cur!==''||row.length){ row.push(cur); rows.push(row); row=[]; cur=''; } if(c==='\r'&&n==='\n') i++; } else cur+=c; } if(cur!==''||row.length){ row.push(cur); rows.push(row); } return rows; }
function lsNormHeader(value){ return String(value||'').trim().toLowerCase().replace(/\s+/g,' ').replace(/[^\w#/% ]/g,''); }
function lsAlias(headers, aliases){ return headers.find(header => aliases.some(alias => lsNormHeader(alias) === lsNormHeader(header))); }
function lsObjects(rows){ if(!rows.length) return []; const headers=rows[0].map(h=>String(h||'').trim()); return rows.slice(1).map(row=>{ const raw={}; headers.forEach((header,index)=>raw[header]=String(row[index]||'').trim()); const out={_raw:raw}; Object.entries(LONGSHOTS_COLUMNS).forEach(([key,aliases])=>{ const real=lsAlias(headers,aliases); out[key]=real ? String(raw[real]||'').trim() : ''; }); return out; }).filter(row => Object.values(row._raw).some(Boolean)); }
function lsIsReleased(row){ const status=lsClean(`${row.releaseStatus} ${row.status}`); return status.includes('released') || status.includes('manual posted') || status.includes('pregame') || status.includes('pending live market validation'); }
function lsIsVip(row){ return lsClean(`${row.access} ${row.featured} ${row.riskTier}`).includes('vip') || lsClean(row.featured)==='yes'; }
function lsIsParlay(row){ return lsClean(`${row.type} ${row.pick}`).includes('parlay') || Number(row.legCount) > 1; }
function lsSort(a,b){ return Date.parse(b.date || b.timestamp || 0) - Date.parse(a.date || a.timestamp || 0); }
function lsRowsFor(type){ const rows = LONGSHOTS_STATE.filter(lsIsReleased).sort(lsSort); if(type === 'parlay') return rows.filter(lsIsParlay); if(type === 'lotto') return rows.filter(row => !lsIsParlay(row)); return rows; }
function lsLegItems(legs){
  return String(legs || '').split('|').map(leg => leg.trim()).filter(Boolean).map((leg,index) => {
    const cleaned = leg.replace(/^\d+\.\s*/, '').trim();
    return `<li><span>${index + 1}</span><strong>${lsEscape(cleaned)}</strong></li>`;
  }).join('');
}
function lsCard(row){
  const vip = lsIsVip(row);
  const legText = row.legCount ? `${row.legCount} leg${Number(row.legCount) === 1 ? '' : 's'}` : (lsIsParlay(row) ? 'Parlay' : 'Lotto');
  const legItems = lsLegItems(row.legs);
  const legs = legItems ? `<div class="longshot-leg-card"><div class="longshot-leg-title">Ticket Legs</div><ol>${legItems}</ol></div>` : '';
  const validation = row.validationNotes || row.removedLegs ? `<div class="longshot-note"><strong>Validation:</strong> ${lsEscape(row.validationNotes || 'Pending')} ${row.removedLegs ? `<br><strong>Removed:</strong> ${lsEscape(row.removedLegs)}` : ''}</div>` : '';
  return `<article class="longshot-card ${vip ? 'is-vip' : ''}">
    <div class="longshot-ticket-edge"></div>
    <div class="longshot-card-top"><span>${lsEscape(row.league || row.sport || 'LongShot')}</span><strong>${lsEscape(row.grade || 'Lotto')}</strong></div>
    <h3>${lsEscape(row.pick || 'LongShot Pending')}</h3>
    <p class="longshot-game">${lsEscape(row.game || row.type || 'Card pending')}</p>
    <div class="longshot-chip-row"><span>${lsEscape(row.type || 'Lotto')}</span><span>${lsEscape(legText)}</span><span>${lsEscape(row.riskTier || 'High Variance')}</span></div>
    ${legs}
    <div class="longshot-metrics"><div><strong>${lsEscape(row.odds || '--')}</strong><span>Odds</span></div><div><strong>${lsEscape(row.units || '--')}</strong><span>Units</span></div><div><strong>${lsEscape(row.bestNumber || '--')}</strong><span>Best #</span></div><div><strong>${lsEscape(row.cutoff || '--')}</strong><span>Cutoff</span></div></div>
    <p class="longshot-writeup">${lsEscape(row.writeup || 'Longshot notes loading from the sheet.')}</p>
    <div class="longshot-note"><strong>Market:</strong> ${lsEscape(row.marketNotes || 'Confirm price before betting.')} ${row.payoutTarget ? `<br><strong>Target:</strong> ${lsEscape(row.payoutTarget)}` : ''}</div>
    ${validation}
    <div class="longshot-status">${lsEscape(row.status || row.releaseStatus || 'Pending')}</div>
  </article>`;
}
function lsRenderGrid(id, rows){ const el=document.getElementById(id); if(!el) return; el.innerHTML = rows.length ? rows.map(lsCard).join('') : '<div class="empty longshot-empty">No released longshots loaded yet.</div>'; }
function lsRenderMetrics(){
  const all=lsRowsFor('all');
  const parlay=lsRowsFor('parlay');
  const lotto=lsRowsFor('lotto');
  const units=all.reduce((sum,row)=>sum+(parseFloat(String(row.units||'').replace(/[^0-9.+-]/g,''))||0),0);
  [['longshotCount',all.length],['longshotParlayCount',parlay.length],['longshotLottoCount',lotto.length],['longshotUnits',units ? `${units.toFixed(2)}u` : '--']].forEach(([id,value])=>{ const el=document.getElementById(id); if(el) el.textContent=value; });
  document.querySelectorAll('.longshot-sync-time').forEach(el=>{ el.textContent=new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}); });
}
async function loadLongShots(){
  try{
    const res=await fetch(lsCsvUrl(),{cache:'no-store'});
    const text=await res.text();
    if(!res.ok || text.toLowerCase().includes('<html')) throw new Error('Micks LongShots sheet unavailable');
    LONGSHOTS_STATE = lsObjects(lsParseCSV(text));
    lsRenderMetrics();
    lsRenderGrid('longshotsFeaturedGrid', lsRowsFor('all').slice(0,3));
    lsRenderGrid('longshotsParlayGrid', lsRowsFor('parlay'));
    lsRenderGrid('longshotsLottoGrid', lsRowsFor('lotto'));
  }catch(error){
    document.querySelectorAll('.longshots-sheet-area').forEach(el=>{ el.innerHTML='<div class="empty longshot-empty">Micks LongShots feed could not load.</div>'; });
    console.error('Micks LongShots error:', error);
  }
}

loadLongShots();
setInterval(loadLongShots, 30000);
