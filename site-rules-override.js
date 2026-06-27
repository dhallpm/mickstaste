(function(){
  window.MICKS_PUBLIC_RESULTS_OFF = true;
  var VIP_ROOT = 'https://vip.mickspicks.us/';
  var VIP_PATH = '/vip/';

  function onVipHost(){return String(location.hostname||'').toLowerCase()==='vip.mickspicks.us';}
  function forceVipHostToVipPage(){
    if(!onVipHost())return;
    var path=String(location.pathname||'/').toLowerCase();
    if(path==='/'||path==='/index.html'||path==='/home'||path==='/home/'){
      location.replace(VIP_PATH);
    }
  }
  forceVipHostToVipPage();

  function lower(value){return String(value||'').trim().toLowerCase();}
  function text(el){return String((el&&el.textContent)||'');}

  function forceVipLinksToRoot(){
    document.querySelectorAll('a[href]').forEach(function(anchor){
      var href = anchor.getAttribute('href') || '';
      var label = lower(text(anchor));
      var badVipHref = /mickspicks-vip\.vercel\.app|\/premium\.html|vip\.mickspicks\.us\/index\.html|www\.mickspicks\.us\/#vip/i.test(href);
      var vipIntent = /vip|protected|vault|member|unlock|premium/.test(label) || anchor.classList.contains('vip-btn');
      if(badVipHref || (vipIntent && /#vip|\/vip|premium\.html/i.test(href))){
        anchor.setAttribute('href', VIP_ROOT);
        anchor.removeAttribute('data-tab-target');
        anchor.setAttribute('target','_self');
        anchor.setAttribute('rel','noopener');
      }
    });
  }

  function emptyResultsBody(){
    var body=document.getElementById('resultsBody');
    if(body){
      body.innerHTML='<tr><td colspan="11" class="odds-empty"><div class="empty-kicker">Results board offline</div><div class="pick-title mt-2">Public results are disconnected.</div><p class="mt-2 text-[#cbbf9d]">This prevents stale settled rows from flashing onto the public site.</p></td></tr>';
    }
  }

  function emptySectionRows(){
    ['freeResultsRows','propsResultsRows','longshotsRows'].forEach(function(id){
      var body=document.getElementById(id);
      if(body){
        body.innerHTML='<tr><td colspan="8" class="odds-empty"><div class="empty-kicker">Ledger offline</div><div class="pick-title mt-2">Results feed disconnected.</div></td></tr>';
      }
    });
  }

  function resetResultStats(){
    ['overallRecord','overallWinRate','overallUnits','overallRoi','freeRecord','freeWinRate','freeUnits','freeStreak','propsRecord','propsUnits','propsStreak','longshotsRecord','longshotsWinRate','longshotsUnits','longshotsStreak'].forEach(function(id){
      var el=document.getElementById(id);
      if(el)el.textContent='--';
    });
    var summary=document.getElementById('summaryCards');
    if(summary){
      summary.innerHTML='<div class="results-card"><strong>OFF</strong><span>Public Results</span></div>';
    }
  }

  function removeSettledCardsFromPublicBoards(){
    document.querySelectorAll('#freeCards .card,#vipCards .card,#propsCards .card,#longshotsCards .card,#sportPanels .stat').forEach(function(el){
      var t=lower(text(el));
      if(/\b(win|loss|push|void|settled|cashed|lost|profit\/loss|result restored)\b/.test(t)){
        el.remove();
      }
    });
  }

  function hideInternalNotes(){
    document.querySelectorAll('.analysis-box p,.analysis-box div,.card p,.card div').forEach(function(el){
      var t=text(el).trim();
      if(/^Analysis Note:/i.test(t)||/Needs Customer-Friendly Rewrite/i.test(t)){el.remove();}
    });
  }

  function hidePrivateFromSports(){
    var sports=document.getElementById('sportPanels');
    if(!sports)return;
    sports.querySelectorAll('.stat').forEach(function(el){
      var t=lower(text(el));
      if(t.includes('vip')||t.includes('members only')||t.includes('locked')){el.remove();}
    });
  }

  function patchGlobals(){
    try{
      if(typeof window.loadResultsFeed==='function'){
        window.loadResultsFeed=async function(){
          return {success:true,summary:{},byDate:{},records:[],rows:[],free:[],vip:[],props:[],lotto:[],longshots:[],counts:{records:0,rows:0,free:0,vip:0,props:0,lotto:0,longshots:0}};
        };
      }
      if(typeof window.renderCanonicalResults==='function'){
        window.renderCanonicalResults=function(){emptyResultsBody();resetResultStats();};
      }
    }catch(e){console.warn('Micks public results override failed',e);}
  }

  function run(){
    forceVipHostToVipPage();
    patchGlobals();
    forceVipLinksToRoot();
    emptyResultsBody();
    emptySectionRows();
    resetResultStats();
    removeSettledCardsFromPublicBoards();
    hideInternalNotes();
    hidePrivateFromSports();
  }

  run();
  window.addEventListener('load',run);
  document.addEventListener('click',function(event){
    var anchor = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if(!anchor)return;
    forceVipLinksToRoot();
    if((anchor.getAttribute('href')||'')===VIP_ROOT){
      event.stopPropagation();
    }
  },true);
  setTimeout(run,250);
  setTimeout(run,750);
  setTimeout(run,1500);
  setTimeout(run,3000);
  setInterval(run,1500);
})();
