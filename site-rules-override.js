(function () {
  const PUBLIC_ROOT = 'https://www.mickspicks.us/'
  const PUBLIC_TABS = new Set(['home', 'free', 'vip', 'odds', 'sports', 'props', 'longshots', 'results', 'yahgi', 'about'])

  function safeTab(id) {
    const tab = String(id || '').trim().toLowerCase()
    if (!PUBLIC_TABS.has(tab) || !document.getElementById(tab)) return false

    document.querySelectorAll('.tab-page').forEach(page => page.classList.toggle('active', page.id === tab))
    document.querySelectorAll('[data-tab-target]').forEach(link => link.classList.toggle('active', link.dataset.tabTarget === tab))

    const mobile = document.getElementById('mobileNav')
    if (mobile) mobile.classList.remove('open')

    const next = tab === 'home' ? '#home' : `#${tab}`
    if (location.hostname.toLowerCase() === 'www.mickspicks.us' || location.hostname.toLowerCase() === 'mickspicks.us') {
      history.replaceState(null, '', `${PUBLIC_ROOT}${next}`)
    } else {
      history.replaceState(null, '', next)
    }

    window.scrollTo({ top: 0, behavior: 'auto' })
    return true
  }

  function installNavigationRepair() {
    const menu = document.getElementById('menuBtn')
    const mobile = document.getElementById('mobileNav')

    if (menu && mobile && !menu.dataset.mobileRepairBound) {
      menu.dataset.mobileRepairBound = '1'
      menu.addEventListener('click', function (event) {
        event.preventDefault()
        event.stopImmediatePropagation()
        mobile.classList.toggle('open')
        menu.setAttribute('aria-expanded', mobile.classList.contains('open') ? 'true' : 'false')
      }, true)
    }

    document.querySelectorAll('[data-tab-target]').forEach(link => {
      if (link.dataset.mobileRepairBound) return
      link.dataset.mobileRepairBound = '1'
      link.addEventListener('click', function (event) {
        const tab = link.dataset.tabTarget
        if (!tab || !PUBLIC_TABS.has(tab)) return
        event.preventDefault()
        event.stopImmediatePropagation()
        safeTab(tab)
      }, true)
    })

    document.querySelectorAll('a[href="https://vip.mickspicks.us/"], a[href^="https://vip.mickspicks.us/"]').forEach(link => {
      link.removeAttribute('data-tab-target')
    })

    if (location.hash === '#undefined' || !location.hash) {
      if (location.hash === '#undefined') safeTab('home')
    } else {
      const hashTab = location.hash.slice(1).toLowerCase()
      if (PUBLIC_TABS.has(hashTab)) safeTab(hashTab)
    }
  }

  function installMobileStyles() {
    if (document.getElementById('micks-mobile-repair-style')) return
    const style = document.createElement('style')
    style.id = 'micks-mobile-repair-style'
    style.textContent = `
      @media (max-width: 1024px) {
        .topbar > .shell { display:grid !important; grid-template-columns:auto 1fr auto; align-items:center; gap:.65rem !important; }
        #menuBtn { display:inline-flex !important; align-items:center; justify-content:center; width:44px !important; height:44px !important; min-width:44px; padding:0 !important; }
        .desktop-nav { display:none !important; }
        .topbar .brand { width:42px !important; height:42px !important; }
        .topbar > .shell > a[data-tab-target="home"] { min-width:0; }
        .topbar > .shell > a[data-tab-target="home"] > div:last-child { min-width:0; }
        .topbar > .shell > a[data-tab-target="home"] .font-black { font-size:.92rem !important; white-space:nowrap; }
        .topbar > .shell > a[data-tab-target="home"] .text-[10px] { display:none !important; }
        #mobileNav { position:absolute; left:0; right:0; top:100%; z-index:100; width:100% !important; max-height:calc(100vh - 72px); overflow-y:auto; padding:.7rem 1rem 1rem !important; background:rgba(3,6,12,.985); border-bottom:1px solid rgba(255,227,145,.22); box-shadow:0 24px 55px rgba(0,0,0,.55); }
        #mobileNav.open { display:grid !important; grid-template-columns:1fr 1fr; gap:.55rem !important; }
        #mobileNav .nav-link { width:100%; min-height:46px; justify-content:flex-start; border:1px solid rgba(255,255,255,.09); background:rgba(255,255,255,.035); padding:.75rem .8rem; }
        main { overflow-x:hidden; }
        .hero { min-height:0 !important; padding:1.1rem !important; border-radius:20px !important; }
        .hero .title { font-size:clamp(2.75rem,15vw,5rem) !important; line-height:.84 !important; overflow-wrap:anywhere; }
        .hero-dashboard .relative.z-10 { grid-template-columns:1fr !important; min-height:0 !important; }
        .dashboard-phone { width:100% !important; max-width:100% !important; margin-top:1rem !important; padding:.65rem !important; border-radius:24px !important; }
        .dashboard-screen { border-radius:18px !important; padding:.75rem !important; }
        .sport-chip-row,.tech-labels { max-width:100%; }
        .metric-grid { grid-template-columns:repeat(2,minmax(0,1fr)) !important; }
        .pick-card { padding:.9rem !important; }
        .line-box b { font-size:1.15rem !important; overflow-wrap:anywhere; }
        .odds-board { width:100%; overflow-x:auto !important; -webkit-overflow-scrolling:touch; }
        table { min-width:760px; }
        .section-title { font-size:clamp(1.8rem,10vw,3rem) !important; }
      }
      @media (max-width: 640px) {
        .shell { width:calc(100% - 20px) !important; }
        #mobileNav.open { grid-template-columns:1fr; }
        .topbar > .shell { grid-template-columns:44px minmax(0,1fr); }
        .topbar > .shell > a.btn { display:none !important; }
        .topbar > .shell > a[data-tab-target="home"] { justify-self:start; }
        .hero .title { font-size:clamp(2.5rem,16vw,4.35rem) !important; }
        .hero p { font-size:.98rem !important; line-height:1.55 !important; }
        .hero .mt-7.flex.flex-wrap.gap-3 { display:grid !important; grid-template-columns:1fr !important; }
        .hero .btn { width:100% !important; }
        .hero .grid.sm\\:grid-cols-3 { grid-template-columns:1fr !important; }
        .hero-mini-grid,.metric-grid { grid-template-columns:1fr !important; }
        .card { border-radius:18px !important; }
        .stat b { font-size:1.25rem !important; overflow-wrap:anywhere; }
      }
    `
    document.head.appendChild(style)
  }

  function runRepair() {
    installMobileStyles()
    installNavigationRepair()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runRepair)
  } else {
    runRepair()
  }

  window.addEventListener('hashchange', function () {
    const tab = location.hash.slice(1).toLowerCase()
    if (PUBLIC_TABS.has(tab)) safeTab(tab)
  })

  setTimeout(runRepair, 250)
  setTimeout(runRepair, 1000)
})()
