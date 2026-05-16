/* Micks Picks live slate validation gate.
   Reads Normalized Odds API Rows and suppresses stale/invalid active releases.
*/
(function(){
  const SHEET_ID = '15txBM8qsck7f0ZA_za7xYEykBxKpuq0no3x7yHcKNeE';
  const NORMALIZED_SHEET = 'Normalized Odds API Rows';
  const MAX_CACHE_MINUTES = 90;
  const BLOCKED_MARKETS = ['moneyline','money line',' ml','spread','run line','puck line','game total','full game total','team total','f5','first 5','first five','future','futures','series'];
  const PROP_MARKERS = ['player prop','prop','points','rebounds','assists','pra','p+r+a','total bases','strikeouts','hits','rbi','home run',' hr','sog','shots on goal','saves','steals','blocks','turnovers','passing yards','rushing yards','receiving yards','touchdowns','3pm','threes'];
  const VALID_STATUSES = ['scheduled','live','in progress'];
  const INVALID_STATUSES = ['final','completed','unnecessary','canceled','cancelled','postponed'];
  const ACTIVE_CONTAINERS = ['pickOfDayGrid','freePickOfDayGrid','homeFreePicksGrid','freePicksGrid','vipPicksGrid','propBetsGrid','lottoPropsGrid'];
  const MANUAL_OVERRIDE_MARKERS = ['manual posted', 'manual approved', 'not slate validated', 'not live slate validated', 'manualapproved', 'notvalidated'];
  const state = { loaded:false, available:false, rows:[], index:new Map(), error:'' };

  function clean(v){ return String(v||'').trim().toLowerCase().replace(/\s+/g,' '); }
  function compact(v){ return clean(v).replace(/[^a-z0-9]/g,''); }
  function parseCSV(text){ const rows=[]; let row=[],cur='',q=false; for(let i=0;i<text.length;i++){ const c=text[i],n=text[i+1]; if(c==='"'&&q&&n==='"'){cur+='"';i++;} else if(c==='"'){q=!q;} else if(c===','&&!q){row.push(cur);cur='';} else if((c==='\n'||c==='\r')&&!q){ if(cur!==''||row.length){row.push(cur);rows.push(row);row=[];cur='';} if(c==='\r'&&n==='\n')i++; } else cur+=c; } if(cur!==''||row.length){row.push(cur);rows.push(row);} return rows; }
  function csvBySheet(name){ return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}&cache=${Date.now()}`; }
  function alias(obj,names){ const keys=Object.keys(obj); const found=keys.find(k=>names.some(n=>compact(n)===compact(k))); return found?String(obj[found]||''):''; }
  function rowObjects(rows){ if(!rows.length)return[]; const headers=rows[0].map(h=>String(h||'').trim()); return rows.slice(1).map(r=>{ const obj={}; headers.forEach((h,i)=>obj[h]=String(r[i]||'').trim()); return obj; }).filter(r=>Object.values(r).some(Boolean)); }
  function eventKey(v){ return compact(v); }
  function rowGame(row){ return alias(row,['game','matchup','event','event name','name','home away','teams']); }
  function rawRowStatus(row){ return clean(alias(row,['status','game status','event status','state'])); }
  function rowUpdated(row){ return alias(row,['updated','last updated','timestamp','pulled at','sync time','book updated at']); }
  function rowStart(row){ return alias(row,['start time','commence time','event date','date']); }
  function rowLeague(row){ return alias(row,['league','sport league','sport']); }
  function rowDate(row){ return alias(row,['date','commence time','start time','event date']); }
  function asTime(v){ const t=Date.parse(String(v||'')); return Number.isFinite(t)?t:0; }
  function isStaleApiRow(row){ const t=asTime(rowUpdated(row)); if(!t)return false; return Date.now()-t > MAX_CACHE_MINUTES*60*1000; }
  function inferStatus(row){
    const explicit=rawRowStatus(row);
    if(explicit)return explicit;
    const start=asTime(rowStart(row));
    if(!start)return 'scheduled';
    const diffMinutes=(start-Date.now())/60000;
    if(diffMinutes>0)return 'scheduled';
    if(diffMinutes>-360)return 'live';
    return 'completed';
  }
  function isValidStatus(status){ return VALID_STATUSES.some(s=>status.includes(s)) && !INVALID_STATUSES.some(s=>status.includes(s)); }
  function indexRows(rows){ const idx=new Map(); rows.forEach(row=>{ const game=rowGame(row); if(!game)return; const item={ game, league:rowLeague(row), date:rowDate(row), status:inferStatus(row), updated:rowUpdated(row), raw:row }; idx.set(eventKey(game), item); }); return idx; }
  async function load(){
    if(state.loaded && state.available)return state;
    try{
      const res=await fetch(csvBySheet(NORMALIZED_SHEET),{cache:'no-store'});
      const text=await res.text();
      if(!res.ok || text.toLowerCase().includes('<html')) throw new Error('Normalized Odds API Rows unavailable');
      state.rows=rowObjects(parseCSV(text));
      state.index=indexRows(state.rows);
      state.available=state.index.size>0;
      state.loaded=true;
      if(!state.available) throw new Error('Normalized Odds API Rows is empty');
    }catch(e){ state.loaded=true; state.available=false; state.error=e.message||String(e); }
    return state;
  }
  function normalizeSlateInput(gameOrRow, league, date, market){
    if(gameOrRow && typeof gameOrRow === 'object') return gameOrRow;
    return { game:gameOrRow, league, date, market };
  }
  function validateActiveSlate(gameOrRow, league, date, market){
    const row=normalizeSlateInput(gameOrRow, league, date, market);
    if(!state.available)return { ok:false, code:'VALIDATION_UNAVAILABLE', message:'Slate validation unavailable' };
    const game=row.game||row.matchup||row.event||'';
    const key=eventKey(game);
    const live=state.index.get(key);
    if(!live)return { ok:false, code:'GAME_NOT_FOUND', message:'Game not found in live API slate' };
    if(isStaleApiRow(live.raw))return { ok:false, code:'STALE_API_CACHE', message:'Live API row is stale' };
    if(!isValidStatus(live.status))return { ok:false, code:'INVALID_GAME_STATUS', message:`Invalid game status: ${live.status||'unknown'}` };
    return { ok:true, code:'OK', message:'Validated', live };
  }
  function isPropMarket(row){ const text=clean(`${row.betType||''} ${row.market||''} ${row.pick||''}`); if(BLOCKED_MARKETS.some(w=>` ${text} `.includes(w)))return false; return PROP_MARKERS.some(w=>text.includes(w)); }
  function extractCardRow(card){ const title=card.querySelector('.pick-title')?.textContent||''; const meta=card.querySelector('p')?.textContent||''; const league=card.textContent||''; return { pick:title, game:meta, league }; }
  function hasManualOverrideCard(card){
    const text=clean(card?.textContent||'');
    const compactText=compact(text);
    return MANUAL_OVERRIDE_MARKERS.some(marker => text.includes(marker) || compactText.includes(compact(marker)));
  }
  function hasManualOverrideContainer(el){ return Array.from(el.querySelectorAll('.pick-card')).some(hasManualOverrideCard); }
  function blockContainer(id,message){ const el=document.getElementById(id); if(el)el.innerHTML=`<div class="empty">${message}</div>`; }
  function gateRenderedCards(){
    ACTIVE_CONTAINERS.forEach(id=>{
      const el=document.getElementById(id); if(!el)return;
      const cards=Array.from(el.querySelectorAll('.pick-card'));
      if(!state.available){
        if(cards.length && hasManualOverrideContainer(el)) return;
        blockContainer(id,'Slate validation unavailable');
        return;
      }
      cards.forEach(card=>{
        if(hasManualOverrideCard(card)) return;
        const result=validateActiveSlate(extractCardRow(card));
        if(!result.ok)card.remove();
      });
      if(cards.length && !el.querySelector('.pick-card')) blockContainer(id,'No live-validated picks are available.');
    });
  }
  function attach(){
    load().then(gateRenderedCards);
    const observer=new MutationObserver(()=>load().then(gateRenderedCards));
    observer.observe(document.documentElement,{childList:true,subtree:true});
    setInterval(()=>load().then(gateRenderedCards),30000);
  }
  window.SlateValidation={ load, validateActiveSlate, isPropMarket, gateRenderedCards, state };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach); else attach();
})();
