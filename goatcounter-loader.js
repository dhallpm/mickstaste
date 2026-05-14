
(function(){
  const config = window.MICKS_PICKS_CONFIG || {};
  const url = config.GOATCOUNTER_URL || "";

  if(!url || url.includes("REPLACE-WITH-YOUR-GOATCOUNTER-SITE")){
    console.warn("GoatCounter not active: set GOATCOUNTER_URL in site-config.js");
    return;
  }

  window.goatcounter = window.goatcounter || {};
  window.goatcounter.path = function(){
    return location.pathname + location.search + location.hash;
  };

  const script = document.createElement("script");
  script.async = true;
  script.src = "//gc.zgo.at/count.js";
  script.setAttribute("data-goatcounter", url);
  document.head.appendChild(script);
})();
