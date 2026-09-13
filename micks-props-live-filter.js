// Legacy compatibility shim.
// Props Lab cards now render once from index.html using /data/todays-picks.json.
// This file intentionally avoids fetching or repainting props containers.
(function () {
  function repairOnly() {
    if (typeof window.repairMicksPicksDom === 'function') window.repairMicksPicksDom();
  }

  window.forceRenderMicksLiveSections = repairOnly;
})();
