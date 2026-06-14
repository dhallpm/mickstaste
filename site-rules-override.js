(function(){
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
  function run(){hideInternalNotes();hidePrivateFromSports();weeklyResultsOnly();}
  window.addEventListener('load',run);
  setInterval(run,1500);
})();
