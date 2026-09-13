(function () {
  const PUBLIC_ROOT='https://www.mickspicks.us/';
  const PUBLIC_TABS=new Set(['home','free','vip','odds','sports','props','longshots','results','yahgi','about']);

  function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]))}
  function normalizeTab(value){const tab=String(value||'').trim().toLowerCase();return PUBLIC_TABS.has(tab)&&document.getElementById(tab)?tab:''}
  function activateTab(tab,updateUrl=true){tab=normalizeTab(tab);if(!tab)return false;document.querySelectorAll('.tab-page').forEach(page=>page.classList.toggle('active',page.id===tab));document.querySelectorAll('[data-tab-target]').forEach(link=>link.classList.toggle('active',String(link.dataset.tabTarget||'').toLowerCase()===tab));if(updateUrl){try{history.replaceState(null,'',`${PUBLIC_ROOT}#${tab}`)}catch(_){location.hash=tab}}window.scrollTo({top:0,behavior:'auto'});return true}
  function bindNav(){if(document.documentElement.dataset.mpFallbackNav==='1')return;document.documentElement.dataset.mpFallbackNav='1';document.addEventListener('click',event=>{const link=event.target.closest&&event.target.closest('[data-tab-target]');if(!link)return;const tab=normalizeTab(link.dataset.tabTarget);if(!tab)return;event.preventDefault();activateTab(tab,true)},true);window.addEventListener('hashchange',()=>{const tab=normalizeTab(location.hash.slice(1));if(tab)activateTab(tab,false)})}

  const rows={
    jets:{game:'New York Jets at Tennessee Titans',pick:'New York Jets +1.5',odds:'-110',grade:'B+',units:'0.75u',score:'81/110',replica:'84/100',failure:'8/10',best:'Jets +2 or better',cutoff:'Pick’em / Jets favored — rescore',writeup:'New York +1.5 is the preferred straight-side expression. The market moved materially toward the Jets from an opener around Tennessee -3, while the matchup work supports New York at the current number.'},
    vikings:{game:'Green Bay Packers at Minnesota Vikings',pick:'Minnesota Vikings -1.5',odds:'-114',grade:'B+',units:'0.75u',score:'80/110',replica:'82/100',failure:'7/10',best:'Vikings -1 (-110 or better)',cutoff:'Vikings -2.5; rescore at -3',writeup:'Minnesota -1.5 is released at the current BetRivers price of -114. The market has flipped toward Minnesota and the play remains inside the key field-goal threshold.'},
    parlay:{game:'Jets at Titans / Packers at Vikings',pick:'Jets +1.5 / Vikings -1.5',odds:'Price at book',grade:'B+',units:'0.25u',score:'82/110',replica:'84/100',failure:'7/10',best:'Jets +2 or better / Vikings -1 or better',cutoff:'Jets PK or Vikings -3 — pass/rescore',writeup:'Two-leg Lotto Parlay using the two strongest straight-side positions on the September 13 card.'}
  };

  function card(row,label='Free Pick'){
    return `<article class="card glass pick-card"><div class="flex items-start justify-between gap-3"><div><div class="pill">${esc(label)}</div><div class="mt-3 text-sm font-black uppercase tracking-wider text-[#f6d98d]">${esc(row.game)}</div><h3 class="pick-title mt-2">${esc(row.pick)}</h3></div><div class="grade">${esc(row.grade)}</div></div><div class="line-box"><b>${esc(row.pick)} ${esc(row.odds)}</b><span>${esc(row.units)} · Pending</span></div><div class="grid grid-cols-2 gap-3 mt-3 metric-grid"><div class="stat"><b>${esc(row.score)}</b><span>Micks Score</span></div><div class="stat"><b>${esc(row.replica)}</b><span>Replica</span></div><div class="stat"><b>${esc(row.failure)}</b><span>Failure</span></div><div class="stat"><b>${esc(row.units)}</b><span>Units</span></div></div><div class="analysis-box"><h4>Best Number</h4><p>${esc(row.best)}</p><h4 class="mt-3">No-Bet Cutoff</h4><p>${esc(row.cutoff)}</p><h4 class="mt-3">Micks Analysis</h4><p>${esc(row.writeup)}</p></div></article>`
  }

  function needsRepair(el){if(!el)return false;const text=(el.textContent||'').toLowerCase();return !el.children.length||text.includes('loading live card')||text.includes('no picks released yet')||text.includes('no live cards were returned')}
  function repairCard(){
    const free=document.getElementById('freeCards');
    if(free&&needsRepair(free))free.innerHTML=card(rows.jets,'Free Pick')+card(rows.vikings,'Free Pick');
    const longshots=document.getElementById('longshotsCards');
    if(longshots&&needsRepair(longshots))longshots.innerHTML=card(rows.parlay,'Lotto Parlay');
    const featured=document.getElementById('featuredCard');
    if(featured&&needsRepair(featured))featured.innerHTML=`<div class="empty-kicker">Pick of the Day · NFL</div><div class="mt-2 text-sm font-black uppercase tracking-wider text-[#f6d98d]">${esc(rows.jets.game)}</div><h3 class="pick-title mt-2">${esc(rows.jets.pick)}</h3><div class="line-box"><b>${esc(rows.jets.pick)} ${esc(rows.jets.odds)}</b><span>${esc(rows.jets.grade)} · ${esc(rows.jets.units)}</span></div><p class="mt-3 text-[#eadfca] leading-7">${esc(rows.jets.writeup)}</p>`;
    const active=document.getElementById('homeActive');if(active&&(active.textContent==='--'||!active.textContent.trim()))active.textContent='3';
    const units=document.getElementById('homeUnits');if(units&&(units.textContent==='--'||!units.textContent.trim()))units.textContent='1.75u';
    if(window.lucide&&typeof window.lucide.createIcons==='function'){try{window.lucide.createIcons()}catch(_){}}
  }

  async function tryStaticFeed(){
    try{
      const res=await fetch('/api/todays-picks/',{cache:'no-store'});
      if(!res.ok)throw new Error('feed '+res.status);
      const payload=await res.json();
      if(!payload||payload.success!==true)throw new Error('invalid feed');
      console.info('Micks static card feed OK',payload.date);
    }catch(err){console.warn('Micks static feed unavailable; using embedded card fallback',err)}
    repairCard();
  }

  function boot(){bindNav();const hash=normalizeTab(location.hash.slice(1));if(hash)activateTab(hash,false);repairCard();setTimeout(repairCard,250);setTimeout(repairCard,900);setTimeout(repairCard,1800);tryStaticFeed()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();