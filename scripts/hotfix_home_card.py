from pathlib import Path
import re

p = Path('index.html')
s = p.read_text()

featured = '''<div id="featuredCard" class="empty-picks glass premium-empty" data-static-card="1"><div class="empty-kicker">Pick of the Day · NFL</div><div class="mt-2 text-sm font-black uppercase tracking-wider text-[#f6d98d]">New York Jets at Tennessee Titans</div><h3 class="pick-title mt-2">New York Jets +1.5</h3><div class="line-box"><b>New York Jets +1.5 -110</b><span>B+ · 0.75u · Pending</span></div><p class="mt-3 text-[#eadfca] leading-7">Best number: Jets +2 or better. No-bet cutoff: Pick’em / Jets favored — rescore.</p></div>'''

jets = '''<article class="card glass pick-card"><div class="flex items-start justify-between gap-3"><div><div class="pill">Free Pick</div><div class="mt-3 text-sm font-black uppercase tracking-wider text-[#f6d98d]">New York Jets at Tennessee Titans</div><h3 class="pick-title mt-2">New York Jets +1.5</h3></div><div class="grade">B+</div></div><div class="line-box"><b>New York Jets +1.5 -110</b><span>0.75u · Pending</span></div><div class="grid grid-cols-2 gap-3 mt-3 metric-grid"><div class="stat"><b>81/110</b><span>Micks Score</span></div><div class="stat"><b>84/100</b><span>Replica</span></div><div class="stat"><b>8/10</b><span>Failure</span></div><div class="stat"><b>0.75u</b><span>Units</span></div></div><div class="analysis-box"><h4>Best Number</h4><p>Jets +2 or better</p><h4 class="mt-3">No-Bet Cutoff</h4><p>Pick’em / Jets favored — rescore</p></div></article>'''

vikings = '''<article class="card glass pick-card"><div class="flex items-start justify-between gap-3"><div><div class="pill">Free Pick</div><div class="mt-3 text-sm font-black uppercase tracking-wider text-[#f6d98d]">Green Bay Packers at Minnesota Vikings</div><h3 class="pick-title mt-2">Minnesota Vikings -1.5</h3></div><div class="grade">B+</div></div><div class="line-box"><b>Minnesota Vikings -1.5 -114</b><span>0.75u · Pending</span></div><div class="grid grid-cols-2 gap-3 mt-3 metric-grid"><div class="stat"><b>80/110</b><span>Micks Score</span></div><div class="stat"><b>82/100</b><span>Replica</span></div><div class="stat"><b>7/10</b><span>Failure</span></div><div class="stat"><b>0.75u</b><span>Units</span></div></div><div class="analysis-box"><h4>Best Number</h4><p>Vikings -1 (-110 or better)</p><h4 class="mt-3">No-Bet Cutoff</h4><p>Vikings -2.5; rescore at -3</p></div></article>'''

parlay = '''<article class="card glass pick-card"><div class="flex items-start justify-between gap-3"><div><div class="pill">Lotto Parlay</div><div class="mt-3 text-sm font-black uppercase tracking-wider text-[#f6d98d]">Jets at Titans / Packers at Vikings</div><h3 class="pick-title mt-2">Jets +1.5 / Vikings -1.5</h3></div><div class="grade">B+</div></div><div class="line-box"><b>Jets +1.5 / Vikings -1.5</b><span>0.25u · Pending</span></div><div class="grid grid-cols-2 gap-3 mt-3 metric-grid"><div class="stat"><b>82/110</b><span>Micks Score</span></div><div class="stat"><b>84/100</b><span>Replica</span></div><div class="stat"><b>7/10</b><span>Failure</span></div><div class="stat"><b>0.25u</b><span>Units</span></div></div></article>'''

s = re.sub(r'<div id="featuredCard" class="empty-picks glass premium-empty"[^>]*>.*?</div></div></div></div></div></div></section>', featured + '</div></div></div></div></div></section>', s, count=1, flags=re.S)
s = re.sub(r'<div class="grid lg:grid-cols-3 gap-4" id="freeCards"[^>]*>.*?</div><div class="grid sm:grid-cols-4 gap-4 mt-6">', '<div class="grid lg:grid-cols-3 gap-4" id="freeCards" data-static-card="1">'+jets+vikings+'</div><div class="grid sm:grid-cols-4 gap-4 mt-6">', s, count=1, flags=re.S)
s = re.sub(r'<div class="grid lg:grid-cols-3 gap-4" id="longshotsCards"[^>]*>.*?</div><div class="grid sm:grid-cols-4 gap-4 mt-6">', '<div class="grid lg:grid-cols-3 gap-4" id="longshotsCards" data-static-card="1">'+parlay+'</div><div class="grid sm:grid-cols-4 gap-4 mt-6">', s, count=1, flags=re.S)
s = s.replace('<b id="homeUnits">--</b>', '<b id="homeUnits">1.75u</b>')
s = s.replace('<b id="homeActive">--</b>', '<b id="homeActive">3</b>')

rescue = '''<!-- MICKS_STATIC_CARD_RESCUE_20260913 -->
<script>
(function(){
  const jets=`__JETS__`;
  const vikings=`__VIKINGS__`;
  const parlay=`__PARLAY__`;
  const featured=`__FEATURED__`;
  function bad(el){const t=(el&&el.textContent||'').toLowerCase();return !el||!el.children.length||t.includes('loading live card')||t.includes('no picks released')||t.includes('no live cards were returned')||t.includes('live pick unavailable')}
  function force(){
    const f=document.getElementById('featuredCard'); if(f&&bad(f)){f.outerHTML=featured}
    const free=document.getElementById('freeCards'); if(free&&bad(free)){free.innerHTML=jets+vikings;free.dataset.staticCard='1'}
    const long=document.getElementById('longshotsCards'); if(long&&bad(long)){long.innerHTML=parlay;long.dataset.staticCard='1'}
    const a=document.getElementById('homeActive'); if(a&&(a.textContent.trim()===''||a.textContent.trim()==='--'||a.textContent.trim()==='0'))a.textContent='3';
    const u=document.getElementById('homeUnits'); if(u&&(u.textContent.trim()===''||u.textContent.trim()==='--'||u.textContent.trim()==='0'||u.textContent.trim()==='0.00u'))u.textContent='1.75u';
    if(window.lucide&&typeof window.lucide.createIcons==='function'){try{window.lucide.createIcons()}catch(e){}}
  }
  force();
  document.addEventListener('DOMContentLoaded',force,{once:true});
  [100,300,750,1500,3000,6000].forEach(ms=>setTimeout(force,ms));
  const obs=new MutationObserver(()=>force());
  obs.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  setTimeout(()=>obs.disconnect(),15000);
})();
</script>
'''.replace('__JETS__', jets.replace('`','\\`')).replace('__VIKINGS__', vikings.replace('`','\\`')).replace('__PARLAY__', parlay.replace('`','\\`')).replace('__FEATURED__', featured.replace('`','\\`'))

s = re.sub(r'<!-- MICKS_STATIC_CARD_RESCUE_20260913 -->.*?</script>\s*', '', s, flags=re.S)
s = s.replace('</body>', rescue + '\n</body>')
p.write_text(s)
