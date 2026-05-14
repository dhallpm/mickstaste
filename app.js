
const SHEET_ID = "15txBM8qsck7f0ZA_za7xYEykBxKpuq0no3x7yHcKNeE";
const ACTIVE_GID = "0";
const VIP_ARCHIVE_GID = "210503117";

function csvUrl(gid){return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}&cache=${Date.now()}`}
function parseCSV(text){
  const rows=[];let row=[],cur="",q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i],n=text[i+1];
    if(c=='"'&&q&&n=='"'){cur+='"';i++}
    else if(c=='"'){q=!q}
    else if(c==','&&!q){row.push(cur);cur=""}
    else if((c=="\n"||c=="\r")&&!q){if(cur!==""||row.length){row.push(cur);rows.push(row);row=[];cur=""} if(c=="\r"&&n=="\n")i++}
    else cur+=c;
  }
  if(cur!==""||row.length){row.push(cur);rows.push(row)}
  return rows;
}
function makeObjects(rows){
  if(!rows.length)return[];
  const h=rows[0].map(x=>String(x||"").trim());
  return rows.slice(1).map(r=>Object.fromEntries(h.map((k,i)=>[k,String(r[i]||"").trim()])));
}
async function getRows(gid){
  const res=await fetch(csvUrl(gid),{cache:"no-store"});
  const text=await res.text();
  if(text.toLowerCase().includes("<html"))throw new Error("CSV unavailable");
  return makeObjects(parseCSV(text));
}
function esc(s){return String(s||"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]))}
function num(v){const n=parseFloat(String(v||"").replace(/[^0-9.+-]/g,""));return Number.isFinite(n)?n:0}
function isVIP(r){return /vip|featured|yes/i.test(`${r.Access||""} ${r.Featured||""}`)}
function isFree(r){return !isVIP(r)}
function set(id,val){const el=document.getElementById(id);if(el)el.textContent=val}
function updateStats(rows,prefix){
  const graded=rows.filter(r=>r.Pick&&/win|loss/i.test(r.Result||""));
  const wins=graded.filter(r=>/win/i.test(r.Result||"")).length;
  const losses=graded.filter(r=>/loss/i.test(r.Result||"")).length;
  const total=wins+losses;
  const units=rows.filter(r=>r.Pick).reduce((s,r)=>s+num(r["Profit/Loss"]),0);
  const rate=total?Math.round(wins/total*100):0;
  set(prefix+"Record",total?`${wins}-${losses}`:"--");
  set(prefix+"WinRate",total?`${rate}%`:"--");
  set(prefix+"TotalUnits",`${units>=0?"+":""}${units.toFixed(2)}u`);
  set(prefix+"Count",rows.filter(r=>r.Pick).length||"--");
}
function pickPanel(r,locked=false){
  const result=String(r.Result||"Pending").toLowerCase();
  const cls=result.includes("win")?"status-win":result.includes("loss")?"status-loss":"status-pending";
  return `<div class="main-panel">
    <div style="display:flex;justify-content:space-between;gap:14px;align-items:flex-start">
      <div>
        <div class="kicker" style="font-size:11px;letter-spacing:2px;margin-bottom:8px">${esc(r.League||r.Sport||"Sports")}</div>
        <div class="panel-title">${esc(r.Pick||"Pick Pending")}</div>
        <p class="panel-copy">${esc(r.Game||"Game details loading")}</p>
      </div>
      <div style="background:linear-gradient(135deg,#7c520e,#f6cb5d 56%,#9f711b);color:#070707;padding:10px 12px;border-radius:7px;font-weight:1000">${esc(r.Grade||"B")}</div>
    </div>
    <div class="metrics">
      <div class="metric"><strong>${esc(r.Odds||"--")}</strong><span>Odds</span></div>
      <div class="metric"><strong>${esc(r.Units||"--")}</strong><span>Units</span></div>
      <div class="metric"><strong>${esc(r["Best Number"]||"--")}</strong><span>Best Number</span></div>
      <div class="metric"><strong class="${cls}">${esc(r.Result||"Pending")}</strong><span>Status</span></div>
    </div>
    <p class="panel-copy">${esc(locked ? (r.Writeup||"Public writeup available. Full analysis stays in VIP.") : (r["Full Analysis"]||r.Writeup||"Analysis loading from sheet."))}</p>
  </div>`;
}
function renderGrid(id,rows,locked=false){
  const el=document.getElementById(id);if(!el)return;
  const list=rows.filter(r=>r.Pick).slice(0,8);
  el.innerHTML=list.length?list.map(r=>pickPanel(r,locked)).join(""):`<div class="main-panel lock-message">No picks loaded right now.</div>`;
}
function renderTable(id,rows){
  const el=document.getElementById(id);if(!el)return;
  const list=rows.filter(r=>r.Pick).slice(0,24);
  if(!list.length){el.innerHTML='<tr><td colspan="7">No picks found.</td></tr>';return}
  el.innerHTML=list.map(r=>{
    const result=String(r.Result||"Pending").toLowerCase();
    const cls=result.includes("win")?"status-win":result.includes("loss")?"status-loss":"status-pending";
    return `<tr><td>${esc(r.Date||"")}</td><td>${esc(r.League||r.Sport||"")}</td><td><strong>${esc(r.Pick||"")}</strong><br><span style="color:var(--muted)">${esc(r.Game||"")}</span></td><td>${esc(r.Grade||"")}</td><td class="${cls}">${esc(r.Result||"Pending")}</td><td>${esc(r["Profit/Loss"]||"")}</td><td>${esc(r["Closing #"]||r["Best Number"]||"")}</td></tr>`
  }).join("");
}
function renderReleaseRows(rows){
  const el=document.getElementById("recentRows");if(!el)return;
  const list=rows.filter(r=>r.Pick).slice(0,5);
  el.innerHTML=list.length?list.map(r=>{
    const result=String(r.Result||"Pending").toLowerCase();
    const cls=result.includes("win")?"green":result.includes("loss")?"red":"gold";
    return `<div class="release-row"><span>${esc(r.League||r.Sport||"")}</span><span>${esc(r.Pick||"")}</span><span class="${cls}">${esc(r.Result||"OPEN")}</span><span>${esc(r["Profit/Loss"]||"")}</span><span>${esc(r.Date||"")}</span></div>`
  }).join(""):"<div class='lock-message'>No releases loaded.</div>";
}
async function boot(){
  try{
    const active=await getRows(ACTIVE_GID);
    const archive=await getRows(VIP_ARCHIVE_GID).catch(()=>[]);
    updateStats(active,"overall");
    updateStats(active.filter(isVIP),"vip");
    updateStats(active.filter(isFree),"free");
    renderGrid("freePicksGrid",active.filter(isFree),true);
    renderGrid("vipPicksGrid",active.filter(isVIP),false);
    renderTable("resultsBody",active.concat(archive));
    renderTable("vipArchiveBody",archive.length?archive:active.filter(isVIP));
    renderReleaseRows(active.concat(archive));
    document.querySelectorAll(".sync-time").forEach(el=>el.textContent=new Date().toLocaleTimeString());
  }catch(e){
    document.querySelectorAll(".sheet-area").forEach(el=>el.innerHTML='<div class="main-panel lock-message">Sheet data could not load. Check Google Sheet publishing/export settings.</div>');
  }
}
boot();setInterval(boot,30000);
