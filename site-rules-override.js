(function(){
  window.MICKS_PUBLIC_RESULTS_OFF = true;
  var PUBLIC_ROOT = 'https://www.mickspicks.us/';
  var VIP_ROOT = 'https://vip.mickspicks.us/';

  function clean(value){return String(value||'').trim().toLowerCase();}
  function label(el){return clean((el && el.textContent) || '');}
  function isVipHost(){return clean(location.hostname)==='vip.mickspicks.us';}

  function publicTarget(anchor){
    var href=clean(anchor.getAttribute('href'));
    var text=label(anchor);
    var keys=['home','free','odds','sports','props','longshots','results'];
    for(var i=0;i<keys.length;i++){
      var key=keys[i];
      if(href==='#'+key || href.indexOf('#'+key)>-1 || text===key || text.indexOf(key)>-1){
        return PUBLIC_ROOT + '#' + key;
      }
    }
    return '';
  }

  function vipIntent(anchor){
    var href=clean(anchor.getAttribute('href'));
    var text=label(anchor);
    return text.indexOf('vip')>-1 || text.indexOf('premium')>-1 || text.indexOf('member')>-1 || text.indexOf('vault')>-1 || href.indexOf('premium')>-1 || href.indexOf('mickspicks-vip')>-1 || anchor.classList.contains('vip-btn');
  }

  function fixLinks(){
    document.querySelectorAll('a[href]').forEach(function(anchor){
      if(vipIntent(anchor)){
        anchor.setAttribute('href',VIP_ROOT);
        anchor.setAttribute('target','_self');
        anchor.removeAttribute('data-tab-target');
        return;
      }
      var target=publicTarget(anchor);
      if(target){
        anchor.setAttribute('href',target);
        anchor.setAttribute('target','_self');
        anchor.removeAttribute('data-tab-target');
      }
    });
  }

  function leaveHomepageOnVipHost(){
    if(!isVipHost())return;
    var path=clean(location.pathname||'/');
    if(path==='/' || path==='/index.html'){
      window.location.replace('/vip/');
    }
  }

  function run(){
    leaveHomepageOnVipHost();
    fixLinks();
  }

  run();
  window.addEventListener('load',run);
  document.addEventListener('click',function(){setTimeout(run,0);},true);
  setTimeout(run,250);
  setTimeout(run,1000);
  setInterval(run,1500);
})();
