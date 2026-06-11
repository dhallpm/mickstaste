// Legacy compatibility shim.
// Props Lab cards now render once from index.html using /api/todays-picks.
// This file intentionally avoids fetching or repainting props containers.
(function () {
  function repairOnly() {
    if (typeof window.repairMicksPicksDom === 'function') window.repairMicksPicksDom();
  }

  window.forceRenderMicksLiveSections = repairOnly;
})();
