/* Micks Picks Free Look Filter
   Free page only shows true free straight picks.
   Props/parlays are tagged away from Free Look unless VIP A/A+ override applies.
*/
const FL_SHEET_ID='15txBM8qsck7f0ZA_za7xYEykBxKpuq0no3x7yHcKNeE';
const FL_GIDS={feed:'1231201305',results:'1579113575'};
function flCsv(gid){return `https://docs.google.com/spreadsheets/d/${FL_SHEET_ID}/export?format=csv&gid=${gid}&cache=${Date.now()}`}
function flEsc(s){return String(s||'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
function flClean(s){return String(s||'').trim().toLowerCase().replace(/\s+/g,' ')}
function flCompact(s){return flClean(s).replace(/[^a-z0-9]/g,'')}
function flNum(v){const n=parseFloat(String(v||'').replace(/[^0-9.+-]/g,''));return Number.isFinite(n)?n:0}
function flHas(v){return String(v||'').trim().length>0}
function flParseCSV(text){const rows=[];let row=[],cur='',q=false;for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c==='"'&&q&&n==='"'){cur+='"';i++}else if(c==='"'){q=!q}else if(c===','&&!q){row.push(cur);cur=''}else if((c==='\n'||c==='\r')&&!q){if(cur!==''||row.length){row.push(cur);rows.push(row);row=[];cur=''}if(c==='\r'&&n==='\n')i++}else cur+=c}if(cur!==''||row.length){row.push(cur);rows.push(row)}return rows}
function flNorm(h){return String(h||'').trim().toLowerCase().replace(/\s+/g,' ').replace(/[^\w#/% ]/g,'')}
const FL_ALIASES={date:['Date'],sport:['Sport'],league:['League'],game:['Game','Matchup','Event'],pick:['Pick','Play','Selection'],betType:['Bet Type','Market','Type'],odds:['Odds','Price'],sportsbook:['Sportsbook','Book'],grade:['Grade'],units:['Units'],status:['Status'],result:['Result','Outcome'],profitLoss:['Profit/Loss','P/L','PL'],writeup:['Writeup','Write Up','Public Writeup'],access:['Access','Tier'],featured:['Featured','Featured?'],tag:['Tag','Tags','Category','Pick Tag','Card Tag'],releaseStatus:['Release Status','Release'],closingNumber:['Closing Number','Closing #'],bestNumber:['Best Number','Best #'],fullAnalysis:['Full Analysis'],marketNotes:['Market Notes'],injuryNotes:['Injury Notes'],confidence:['Confidence'],sourceVerification:['Source Verification']};
function flAlias(headers,aliases){return headers.find(h=>aliases.some(a=>flNorm(a)===flNorm(h)))}
function flObjects(rows,source){if(!rows.length)return[];const headers=rows[0].map(h=>String(h||'').trim());return rows.slice(1).map(r=>{const raw={};headers.forEach((h,i)=>raw[h]=String(r[i]||'').trim());const obj={_sourceTab:source,_raw:raw};Object.entries(FL_ALIASES).forEach(([k,aliases])=>{const real=flAlias(headers,aliases);obj[k]=real?String(raw[real]||'').trim():''});return obj}).filter(r=>Object.values(r._raw).some(v=>String(v||'').trim()!==''))}
async function flRows(gid,source){const res=await fetch(flCsv(gid),{cache:'no-store'});const txt=await res.text();if(txt.toLowerCase().includes('<html'))throw new Error(source+' unavailable');return flObjects(flParseCSV(txt),source)}
function flDateVal(v){const s=String(v||'').trim();if(!s)return 0;let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(m)return new Date(+m[1],+m[2]-1,+m[3]).getTime();m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);if(m){let y=+m[3];if(y<100)y+=2000;return new Date(y,+m[1]-1,+m[2]).getTime()}const d=new Date(s);return Number.isNaN(d.getTime())?0:d.getTime()}
function flFmtDate(v){const t=flDateVal(v);if(!t)return flEsc(v||'');const d=new Date(t);return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${d.getFullYear()}`}
function flKey(r){return [r.date,r.league||r.sport,r.game,r.pick,r.betType].map(flCompact).join('|')}
function flDedupe(rows){const map=new Map();rows.forEach(r=>{const k=flKey(r);if(!k)return;if(!map.has(k))map.set(k,r)});return Array.from(map.values())}
function flGradeRank(g){const x=flClean(g);if(x==='a+'||x==='a plus')return 5;if(x==='a')return 4;if(x==='a-')return 3;if(x==='b+')return 2;if(x==='b')return 1;return 0}
function flIsVip(r){const t=flClean(`${r.access} ${r.featured}`);return t.includes('vip')||t.includes('premium')||t.includes('member')}
function flIsFree(r){const t=flClean(`${r.access}`);return t.includes('free')||t.includes('public')||(!flIsVip(r)&&!t)}
function flIsClosed(r){const t=flClean(`${r.status} ${r.result}`);return t.includes('graded')||t.includes('closed')||t.includes('win')||t.includes('loss')||t.includes('push')||t.includes('void')}
function flNoBet(r){const t=flClean(`${r.grade} ${r.status} ${r.result} ${r.releaseStatus}`);return t.includes('pass')||t.includes('no bet')||t.includes('price moved')||flNum(r.units)===0}
function flTag(r){
  const explicit=flClean(r.tag);
  if(explicit.includes('lotto'))return 'LOTTO';
  if(explicit.includes('parlay'))return 'PARLAY';
  if(explicit.includes('prop'))return 'PROP';
  if(explicit.includes('straight'))return 'STRAIGHT';
  const t=flClean(`${r.pick} ${r.betType} ${r.market} ${r.game}`);
  if(t.includes('lotto')||t.includes('ladder')||t.includes('sprinkle'))return 'LOTTO';
  if(t.includes('parlay')||t.includes('same game')||t.includes('sgp')||t.includes('teaser'))return 'PARLAY';
  if(t.includes('player prop')||t.includes('prop')||t.includes('sog')||t.includes('pra')||t.includes('assist')||t.includes('rebounds')||t.includes('points')||t.includes('total bases')||t.includes(' hr ')||t.includes('home run')||t.includes('team total'))return 'PROP';
  return 'STRAIGHT';
}
function flVipOverride(r){return flIsVip(r)&&flGradeRank(r.grade)>=4&&flTag(r)==='PROP'}
function flFreeEligible(r){
  if(!flHas(r.pick)||flNoBet(r))return false;
  const tag=flTag(r);
  if(flVipOverride(r))return true;
  if(tag==='PROP'||tag==='PARLAY'||tag==='LOTTO')return false;
  return flIsFree(r)&&tag==='STRAIGHT';
}
function flActiveEligible(r){return flFreeEligible(r)&&!flIsClosed(r)}
function flWin(r){const pl=flNum(r.profitLoss);if(pl>0)return true;const t=flClean(`${r.result} ${r.status}`);return t.includes('win')||t.includes('won')}
function flLoss(r){const pl=flNum(r.profitLoss);if(pl<0)return true;const t=flClean(`${r.result} ${r.status}`);return t.includes('loss')||t.includes('lost')}
function flClass(r){if(flWin(r))return'status-win';if(flLoss(r))return'status-loss';return'status-pending'}
function flStats(rows,activeRows){const eligible=rows.filter(flFreeEligible);const graded=eligible.filter(r=>flWin(r)||flLoss(r));const wins=graded.filter(flWin).length;const losses=graded.filter(flLoss).length;const units=graded.reduce((s,r)=>s+flNum(r.profitLoss),0);const count=graded.length+activeRows.filter(flActiveEligible).length;return{record:graded.length?`${wins}-${losses}`:'--',winRate:graded.length?`${Math.round(wins/graded.length*100)}%`:'--',units:graded.length||units?`${units>0?'+':''}${units.toFixed(2)}u`:'--',count:count||'--'}}
function flSet(id,v){const el=document.getElementById(id);if(el)el.textContent=v}
function flPickCard(r){const tag=flTag(r);const badge=flVipOverride(r)?'VIP A/A+ Prop Override':'FREE';return `<div class="pick-card"><div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><div><div style="color:var(--muted);font-size:11px;text-transform:uppercase;font-weight:1000;letter-spacing:.9px">${flEsc(r.league||r.sport||'Sports')} | ${flEsc(tag)}</div><div class="pick-title">${flEsc(r.pick||'Pick Pending')}</div><p style="color:var(--muted);line-height:1.5">${flEsc(r.game||'')}</p></div><div style="background:linear-gradient(135deg,#9b6d15,#ffe28a 54%,#b98821);color:#090909;padding:9px 11px;border-radius:10px;font-weight:1000">${flEsc(r.grade||badge)}</div></div><div class="metric-grid"><div class="metric"><strong>${flEsc(r.odds||'--')}</strong><span>Odds</span></div><div class="metric"><strong>${flEsc(r.sportsbook||'--')}</strong><span>Book</span></div><div class="metric"><strong>${flEsc(r.bestNumber||'--')}</strong><span>Best #</span></div><div class="metric"><strong>${flEsc(badge)}</strong><span>Card Type</span></div></div><p style="color:#e7dcc4;line-height:1.55;margin-top:14px">${flEsc(r.writeup||'Public writeup loading from Micks Picks.')}</p></div>`}
function flRenderGrid(id,rows,limit=12){const el=document.getElementById(id);if(!el)return;const active=flDedupe(rows).filter(flActiveEligible).sort((a,b)=>flDateVal(b.date)-flDateVal(a.date)).slice(0,limit);el.innerHTML=active.length?active.map(flPickCard).join(''):'<div class="empty">No active free straight picks loaded right now.</div>'}
function flRenderPickOfDay(rows){const el=document.getElementById('freePickOfDayGrid');if(!el)return;const active=flDedupe(rows).filter(flActiveEligible);if(!active.length){el.innerHTML='<div class="empty">No Free Pick of the Day loaded right now.</div>';return}const featured=active.filter(r=>flClean(r.featured)==='yes');const pool=(featured.length?featured:active).sort((a,b)=>flGradeRank(b.grade)-flGradeRank(a.grade)||flDateVal(b.date)-flDateVal(a.date));el.innerHTML=flPickCard(pool[0])}
function flRenderArchive(rows){const body=document.getElementById('freeArchiveBody');if(!body)return;const eligible=flDedupe(rows).filter(flFreeEligible).filter(r=>flWin(r)||flLoss(r)).sort((a,b)=>flDateVal(b.date)-flDateVal(a.date));body.innerHTML=eligible.length?eligible.slice(0,100).map(r=>`<tr><td>${flFmtDate(r.date)}</td><td>${flEsc(r.league||r.sport||'')}</td><td><strong>${flEsc(r.pick||'')}</strong><br><span style="color:var(--muted)">${flEsc(r.game||'')}</span><br><span style="color:var(--muted)">Tag: ${flEsc(flTag(r))}${flVipOverride(r)?' | VIP Override':''}</span></td><td>${flEsc(r.grade||'')}</td><td class="${flClass(r)}">${flEsc(r.result||r.status||'')}</td><td>${flEsc(r.profitLoss||'')}</td><td>${flEsc(r.closingNumber||r.bestNumber||'')}</td></tr>`).join(''):'<tr><td colspan="7">No free straight results loaded.</td></tr>'}
async function bootFreeLookFilter(){try{const [feed,results]=await Promise.all([flRows(FL_GIDS.feed,'Website Feed'),flRows(FL_GIDS.results,'Results Archive').catch(()=>[])]);const active=flDedupe(feed);const archive=flDedupe(results);const stats=flStats(archive,active);flSet('freeRecord',stats.record);flSet('freeWinRate',stats.winRate);flSet('freeTotalUnits',stats.units);flSet('freeCount',stats.count);flRenderPickOfDay(active);flRenderGrid('freePicksGrid',active,12);flRenderGrid('homeFreePicksGrid',active,8);flRenderArchive(archive);document.querySelectorAll('.sync-time').forEach(el=>{el.textContent=new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})})}catch(e){console.error('Free Look filter failed:',e)}}
setTimeout(bootFreeLookFilter,900);
setInterval(bootFreeLookFilter,30000);
