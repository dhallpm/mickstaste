(function(){
  function lower(v){return String(v||'').trim().toLowerCase();}
  function get(row,names){
    if(!row)return'';
    for(var i=0;i<names.length;i++){
      var wanted=lower(names[i]);
      for(var key in row){
        if(lower(key)===wanted&&String(row[key]||'').trim())return String(row[key]).trim();
      }
    }
    return'';
  }
  function isLottoRow(row){
    var text=[row&&row.__section,get(row,['section','originalTable','Category','category','Access','access','Bet Type','betType','Type','type','Market','market','Pick','pick','Game','game','League','league'])].join(' ').toLowerCase();
    return /lotto|parlay|longshot|sgp/.test(text);
  }
  try{
    if(typeof isPublicVisible==='function'){
      var previousIsPublicVisible=isPublicVisible;
      isPublicVisible=function(row){
        if(isLottoRow(row))return true;
        return previousIsPublicVisible(row);
      };
    }
    if(typeof isOddsEligible==='function'){
      var previousIsOddsEligible=isOddsEligible;
      isOddsEligible=function(row){
        if(isLottoRow(row))return false;
        return previousIsOddsEligible(row);
      };
    }
  }catch(e){console.warn('Micks override visibility patch failed',e);}
  function hideInternalNotes(){
    document.querySelectorAll('.analysis-box p,.analysis-box div,.card p,.card div').forEach(function(el){
      var t=(el.textContent||'').trim();
      if(/^Analysis Note:/i.test(t)||/Needs Customer-Friendly Rewrite/i.test(t)){el.remove();}
    });
  }
  function hidePrivateFromSports(){
    var sports=document.getElementById('sportPanels');
    if(!sports)return;
    sports.querySelectorAll('.stat').forEach(function(el){
      var t=(el.textContent||'').toLowerCase();
      if(t.includes('vip')||t.includes('members only')||t.includes('locked')){el.remove();}
    });
  }
  function weeklyResultsOnly(){
    var body=document.getElementById('resultsBody');
    if(!body)return;
    var now=new Date();
    var day=now.getDay()||7;
    var start=new Date(now.getFullYear(),now.getMonth(),now.getDate()-day+1).getTime();
    var end=start+7*86400000;
    body.querySelectorAll('tr').forEach(function(row){
      var first=row.querySelector('td');
      if(!first)return;
      var d=new Date((first.textContent||'').trim()+'T00:00:00').getTime();
      if(Number.isFinite(d)&&(d<start||d>=end)){row.remove();}
    });
  }
  function removeStaleNonCardPicks(){
    var stalePatterns=[
      /\bjapan\b/i,
      /chokheli\s+ko\s*\/\s*tko\s*\/\s*dq/i,
      /chokheli/i
    ];
    document.querySelectorAll('.pick-card,.card,tr').forEach(function(el){
      var text=el.textContent||'';
      if(stalePatterns.some(function(re){return re.test(text);})){
        el.remove();
      }
    });
  }
  function run(){hideInternalNotes();hidePrivateFromSports();weeklyResultsOnly();removeStaleNonCardPicks();}
  window.addEventListener('load',run);
  setTimeout(run,500);
  setTimeout(run,1500);
  setTimeout(run,3000);
  setInterval(run,1500);
})();