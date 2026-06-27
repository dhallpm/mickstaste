(function () {
  const PUBLIC_ROOT = 'https://www.mickspicks.us/'
  const PUBLIC_TABS = new Set(['home', 'free', 'odds', 'sports', 'props', 'longshots', 'results', 'yahgi', 'about'])

  if (location.hostname.toLowerCase() !== 'vip.mickspicks.us') return

  const tab = location.hash.slice(1).toLowerCase()
  // This script only ships with the public project. If that project is ever
  // attached to the VIP hostname again, escape its public UI to the public
  // domain without rewriting links or touching data-tab-target attributes.
  location.replace(`${PUBLIC_ROOT}#${PUBLIC_TABS.has(tab) ? tab : 'home'}`)
})()
