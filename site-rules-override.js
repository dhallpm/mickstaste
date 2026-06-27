(function(){
  var PUBLIC_ROOT='https://www.mickspicks.us/';
  var VIP_ROOT='https://vip.mickspicks.us/';
  var PUBLIC_KEYS=['home','free','odds','sports','props','longshots','results'];

  function clean(v){return String(v||'').trim().toLowerCase();}
  function text(el){return clean((el&&el.textContent)||'');}
  function host(){return clean(location.hostname);}

  function isVipButton(anchor){
    var href=clean(anchor.getAttribute('href'));
    var t=text(anchor);
    return anchor.classList.contains('vip-btn') || t.indexOf('vip')>-1 || t.indexOf('premium')>-1 || t.indexOf('member')>-1 || t.indexOf('vault')>-1 || href.indexOf('premium')>-1 || href.indexOf('mickspicks-vip')>-1;
  }

  function publicUrl(anchor){
    var href=clean(anchor.getAttribute('href'));
    var t=text(anchor);
    for(var i=0;i<PUBLIC_KEYS.length;i++){
      var key=PUBLIC_KEYS[i];
      if(href==='#'+key || href.indexOf('#'+key)>-1 || t===key || t.indexOf(key)>-1){
        return PUBLIC_ROOT+'#'+key;
      }
    }
    return '';
  }

  function assignFixed(anchor,url){
    anchor.setAttribute('href',url);
    anchor.setAttribute('target','_self');
    anchor.setAttribute('data-mp-fixed-href',url);
  }

  function fixLinks(){
    document.querySelectorAll('a[href]').forEach(function(anchor){
      if(isVipButton(anchor)){
        assignFixed(anchor,VIP_ROOT);
        return;
      }
      var pub=publicUrl(anchor);
      if(pub){
        assignFixed(anchor,pub);
      }
    });
  }

  function escapeVipHomepage(){
    if(host()!=='vip.mickspicks.us')return;
    var path=clean(location.pathname||'/');
    if(path==='/' || path==='/index.html'){
      location.replace('/vip/');
    }
  }

  function run(){
    escapeVipHomepage();
    fixLinks();
  }

  run();
  window.addEventListener('load',run);
  document.addEventListener('click',function(event){
    var anchor=event.target&&event.target.closest?event.target.closest('a[href]'):null;
    if(!anchor)return;
    run();
    var fixed=anchor.getAttribute('data-mp-fixed-href');
    if(fixed){
      event.preventDefault();
      event.stopImmediatePropagation();
      location.assign(fixed);
    }
  },true);
  setTimeout(run,250);
  setTimeout(run,750);
  setTimeout(run,1500);
  setInterval(run,1500);
})();
