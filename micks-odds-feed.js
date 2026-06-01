// Hydrate Odds tab from Airtable/Micks Picks imported odds instead of stale sheet fallback.
(function () {
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  function td(value) { return `<td>${esc(value || '--')}</td>`; }

  async function hydrateOddsFeed() {
    const table = document.getElementById('oddsRows');
    if (!table) return;
    try {
      const res = await fetch('/api/odds-feed?cache=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const rows = Array.isArray(data.rows) ? data.rows : [];
      if (!rows.length) return;
      table.innerHTML = rows.slice(0, 80).map(row => `<tr>${[
        row.league,
        row.game,
        row.pick,
        row.odds,
        row.sportsbook,
        row.bestMarket,
        row.movement,
        row.confirmation
      ].map(td).join('')}</tr>`).join('');
      console.log('Odds feed hydrated from /api/odds-feed', rows.length);
    } catch (error) {
      console.warn('Odds feed hydrate failed', error);
    }
  }

  window.addEventListener('load', () => setTimeout(hydrateOddsFeed, 1000));
  window.addEventListener('hashchange', () => setTimeout(hydrateOddsFeed, 250));
})();
