(function () {
  const PUBLIC_ROOT = 'https://www.mickspicks.us/';
  const PUBLIC_TABS = new Set(['home','free','vip','odds','sports','props','longshots','results','yahgi','about']);

  function normalizeTab(value) {
    const tab = String(value || '').trim().toLowerCase();
    return PUBLIC_TABS.has(tab) && document.getElementById(tab) ? tab : '';
  }

  function closeMobileNav() {
    const menu = document.getElementById('menuBtn');
    const nav = document.getElementById('mobileNav');
    if (nav) nav.classList.remove('open');
    if (menu) menu.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('mp-nav-open');
  }

  function openMobileNav() {
    const menu = document.getElementById('menuBtn');
    const nav = document.getElementById('mobileNav');
    if (!nav) return;
    nav.classList.add('open');
    if (menu) menu.setAttribute('aria-expanded', 'true');
    document.documentElement.classList.add('mp-nav-open');
  }

  function toggleMobileNav() {
    const nav = document.getElementById('mobileNav');
    if (!nav) return;
    nav.classList.contains('open') ? closeMobileNav() : openMobileNav();
  }

  function activateTab(tab, updateUrl = true) {
    tab = normalizeTab(tab);
    if (!tab) return false;
    document.querySelectorAll('.tab-page').forEach(page => page.classList.toggle('active', page.id === tab));
    document.querySelectorAll('[data-tab-target]').forEach(link => link.classList.toggle('active', String(link.dataset.tabTarget || '').toLowerCase() === tab));
    closeMobileNav();
    if (updateUrl) {
      const next = `${PUBLIC_ROOT}#${tab}`;
      try { history.replaceState(null, '', next); } catch (_) { location.hash = tab; }
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
    return true;
  }

  function repairLinks() {
    document.querySelectorAll('[data-tab-target]').forEach(link => {
      const tab = normalizeTab(link.dataset.tabTarget);
      if (tab) link.setAttribute('href', `${PUBLIC_ROOT}#${tab}`);
    });
    document.querySelectorAll('a[href*="vip.mickspicks.us"], a[href*="mickspicks-vip.vercel.app"], a[href$="/premium.html"]').forEach(link => {
      link.setAttribute('href', 'https://vip.mickspicks.us/');
      link.removeAttribute('data-tab-target');
    });
  }

  function installEvents() {
    if (document.documentElement.dataset.mpNavBound === '1') return;
    document.documentElement.dataset.mpNavBound = '1';
    document.addEventListener('click', function (event) {
      const menu = event.target.closest && event.target.closest('#menuBtn');
      if (menu) {
        event.preventDefault(); event.stopImmediatePropagation(); toggleMobileNav(); return;
      }
      const tabLink = event.target.closest && event.target.closest('[data-tab-target]');
      if (tabLink) {
        const tab = normalizeTab(tabLink.dataset.tabTarget);
        if (!tab) return;
        event.preventDefault(); event.stopImmediatePropagation(); activateTab(tab, true); return;
      }
      if (window.innerWidth <= 1024) {
        const nav = document.getElementById('mobileNav');
        if (nav && nav.classList.contains('open') && !event.target.closest('#mobileNav')) closeMobileNav();
      }
    }, true);
    window.addEventListener('hashchange', function () {
      const tab = normalizeTab(location.hash.slice(1));
      if (tab) activateTab(tab, false);
    });
    window.addEventListener('resize', function () { if (window.innerWidth > 1024) closeMobileNav(); });
  }

  function installStyles() {
    if (document.getElementById('micks-mobile-v2')) return;
    const style = document.createElement('style');
    style.id = 'micks-mobile-v2';
    style.textContent = `
      html,body{max-width:100%;overflow-x:hidden} #menuBtn{flex:0 0 auto} #mobileNav{display:none!important}
      @media (max-width:1024px){
        .topbar{position:sticky!important;top:0!important;z-index:999!important}.topbar>.shell{display:flex!important;align-items:center!important;gap:.7rem!important;padding-top:.65rem!important;padding-bottom:.65rem!important;position:relative}#menuBtn{display:inline-flex!important;width:44px!important;height:44px!important;min-width:44px!important;padding:0!important;align-items:center!important;justify-content:center!important;order:1}.topbar>.shell>a[data-tab-target="home"]{order:2;flex:1 1 auto;min-width:0!important;display:flex!important;align-items:center!important}.topbar>.shell>a[data-tab-target="home"] .brand{width:40px!important;height:40px!important;min-width:40px!important}.topbar>.shell>a[data-tab-target="home"] .font-black{font-size:.92rem!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.topbar>.shell>a.btn{order:3;flex:0 0 auto;width:auto!important;min-height:40px!important;padding:.6rem .8rem!important}.desktop-nav{display:none!important}
        #mobileNav.open{display:grid!important;position:fixed!important;left:10px!important;right:10px!important;top:68px!important;width:auto!important;max-height:calc(100dvh - 82px)!important;overflow-y:auto!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:.55rem!important;padding:.75rem!important;margin:0!important;background:rgba(3,6,12,.985)!important;border:1px solid rgba(255,227,145,.22)!important;border-radius:18px!important;box-shadow:0 24px 70px rgba(0,0,0,.65)!important;z-index:1000!important}#mobileNav .nav-link{display:flex!important;width:100%!important;min-height:48px!important;justify-content:flex-start!important;padding:.78rem .82rem!important;border:1px solid rgba(255,255,255,.09)!important;background:rgba(255,255,255,.045)!important;border-radius:12px!important}#mobileNav .nav-link.active{background:rgba(247,201,72,.13)!important;border-color:rgba(247,201,72,.3)!important}
        main{width:100%!important;overflow-x:hidden!important}.shell{max-width:100%!important}.hero{min-height:0!important;padding:1.15rem!important;border-radius:20px!important}.hero-dashboard>.relative.z-10{display:grid!important;grid-template-columns:1fr!important;min-height:0!important;gap:1rem!important}.hero .title{font-size:clamp(2.7rem,12vw,5.3rem)!important;line-height:.86!important;word-break:normal!important}.dashboard-phone{width:100%!important;max-width:100%!important;margin-top:.5rem!important;padding:.7rem!important;border-radius:24px!important}.dashboard-screen{padding:.75rem!important;border-radius:18px!important}.hero-mini-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.sport-chip-row,.tech-labels{max-width:100%!important}.pick-card,.card{max-width:100%!important}.metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.line-box b,.stat b,.pick-title{overflow-wrap:anywhere!important}.odds-board{width:100%!important;max-width:100%!important;overflow-x:auto!important;-webkit-overflow-scrolling:touch!important}.odds-board table,.results-ledger-table{min-width:760px!important}.section-title{font-size:clamp(1.9rem,8vw,3.2rem)!important}.grid.lg\\:grid-cols-3,.grid.lg\\:grid-cols-2,.grid.lg\\:grid-cols-\\[\\.85fr_1\\.15fr\\]{grid-template-columns:1fr!important}
      }
      @media (max-width:640px){
        .shell{width:calc(100% - 20px)!important}.topbar>.shell>a.btn{display:none!important}.topbar>.shell>a[data-tab-target="home"] .text-\\[10px\\]{display:none!important}#mobileNav.open{grid-template-columns:1fr!important;left:8px!important;right:8px!important;top:64px!important}.hero{padding:1rem!important}.hero .title{font-size:clamp(2.45rem,15vw,4.2rem)!important}.hero p{font-size:.96rem!important;line-height:1.55!important}.hero .mt-7.flex.flex-wrap.gap-3{display:grid!important;grid-template-columns:1fr!important}.hero .btn{width:100%!important}.hero .grid.sm\\:grid-cols-3{grid-template-columns:1fr!important}.hero-mini-grid,.metric-grid{grid-template-columns:1fr!important}.grid.sm\\:grid-cols-4,.grid.sm\\:grid-cols-3,.grid.sm\\:grid-cols-2{grid-template-columns:1fr!important}.section{padding-left:0!important;padding-right:0!important}.card{border-radius:18px!important;padding:.95rem!important}.stat{min-width:0!important}.stat b{font-size:1.2rem!important}.btn{max-width:100%!important}
      }
    `;
    document.head.appendChild(style);
  }

  function potdRows(payload) {
    if (!payload || typeof payload !== 'object') return [];
    if (Array.isArray(payload.pickOfTheDay) && payload.pickOfTheDay.length) return payload.pickOfTheDay;
    const rows = payload.rows || payload.activePicks || payload.picks || payload.mainPicks || [];
    return (Array.isArray(rows) ? rows : []).filter(row => /^(yes|true|1)$/i.test(String(row['Pick of the Day'] || row.pickOfTheDay || row.Featured || row.featured || '').trim()));
  }

  async function repairPOTD() {
    try {
      const response = await fetch('/api/todays-picks?potd=1&t=' + Date.now(), { cache:'no-store' });
      if (!response.ok) return;
      const payload = await response.json();
      const picks = potdRows(payload);
      const current = document.getElementById('featuredCard');
      if (!current) return;
      if (picks.length && typeof window.featuredPickCard === 'function') {
        current.outerHTML = window.featuredPickCard(picks[0]);
        if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
      } else if (!picks.length) {
        current.innerHTML = '<div class="empty-kicker">Pick of the Day</div><h3 class="pick-title mt-2">No POTD released yet.</h3><p class="mt-3 text-[#cbbf9d] leading-7">The Pick of the Day appears here only after it is explicitly marked POTD on the current Eastern-date card.</p>';
      }
    } catch (err) { console.warn('POTD repair failed', err); }
  }

  function bootRepair() {
    repairLinks(); installStyles(); installEvents();
    const hashTab = normalizeTab(location.hash.slice(1));
    if (hashTab) activateTab(hashTab, false);
    setTimeout(repairPOTD, 700);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootRepair, { once:true });
  else bootRepair();
  setTimeout(bootRepair, 300);
  setTimeout(repairPOTD, 1600);
})();