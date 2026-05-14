
/*
  STEP 10 NO DOUBLED PICKS
  Actual sheet structure:
  - Active Picks: active/current card only
  - Results Archive: overall site history
  - VIP Archive: VIP-only history

  Display rules:
  - Dashboard = Results Archive only
  - Results page = Results Archive only
  - VIP Vault = VIP Archive only
  - Free Look = Free/Public rows from Results Archive only
  - No frontend merging of Results Archive + VIP Archive, preventing doubled picks
*/

const SHEET_ID = "15txBM8qsck7f0ZA_za7xYEykBxKpuq0no3x7yHcKNeE";
const ACTIVE_GID = "0";
const RESULTS_ARCHIVE_GID = "1579113575";
const VIP_ARCHIVE_GID = "210503117";

const HEADER_ALIASES = {
  date: ["Date", "Posted Date", "Pick Date"],
  sport: ["Sport"],
  league: ["League", "Sport League"],
  game: ["Game", "Matchup", "Event"],
  pick: ["Pick", "Play", "Selection"],
  betType: ["Bet Type", "Market", "Type"],
  odds: ["Odds", "Price"],
  sportsbook: ["Sportsbook", "Book", "Bookmaker"],
  grade: ["Grade", "Rating"],
  units: ["Units", "Unit", "Stake"],
  bestNumber: ["Best Number", "Best #", "Best Line"],
  noBetCutoff: ["No Bet Cutoff", "No-Bet Cutoff", "Cutoff"],
  impliedProbability: ["Implied Probability", "Implied Prob"],
  evEdge: ["EV Edge", "Edge", "EV"],
  confidence: ["Confidence"],
  status: ["Status"],
  result: ["Result", "Outcome"],
  profitLoss: ["Profit/Loss", "Profit Loss", "P/L", "PL"],
  writeup: ["Writeup", "Write Up", "Public Writeup", "Summary"],
  marketNotes: ["Market Notes", "Market Note"],
  injuryNotes: ["Injury Notes", "Injury Note"],
  sourceVerification: ["Source Verification", "Sources", "Verification"],
  postedTime: ["Posted Time", "Time Posted"],
  access: ["Access", "Tier"],
  fullAnalysis: ["Full Analysis", "Analysis", "VIP Analysis"],
  featured: ["Featured", "Feature", "Featured?"],
  closingNumber: ["Closing #", "Closing Number", "Closing Line"],
  betRiversPrice: ["BetRivers Price", "BetRivers", "Local Price"],
  bestMarketPrice: ["Best Market Price", "Best Market"],
  lineMovement: ["Line Movement", "Movement"],
  confirmationStatus: ["Confirmation Status", "Confirmed", "Confirmation"]
};

function currentPage(){
  const p = location.pathname.split("/").pop() || "index.html";
  return p === "" ? "index.html" : p;
}

function csvUrl(gid){
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}&cache=${Date.now()}`;
}

function parseCSV(text){
  const rows=[]; let row=[], cur="", q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i], n=text[i+1];
    if(c === '"' && q && n === '"'){ cur += '"'; i++; }
    else if(c === '"'){ q = !q; }
    else if(c === "," && !q){ row.push(cur); cur=""; }
    else if((c === "\n" || c === "\r") && !q){
      if(cur !== "" || row.length){ row.push(cur); rows.push(row); row=[]; cur=""; }
      if(c === "\r" && n === "\n") i++;
    } else cur += c;
  }
  if(cur !== "" || row.length){ row.push(cur); rows.push(row); }
  return rows;
}

function normalizeHeader(h){
  return String(h || "").trim().toLowerCase().replace(/\s+/g, " ").replace(/[^\w#/% ]/g, "");
}

function makeObjects(rows, sourceTab){
  if(!rows.length) return [];
  const headers = rows[0].map(h => String(h || "").trim());

  return rows.slice(1).map(r => {
    const raw = {};
    headers.forEach((h,i) => raw[h] = String(r[i] || "").trim());

    const normalized = { _raw: raw, _sourceTab: sourceTab };
    for(const [key, aliases] of Object.entries(HEADER_ALIASES)){
      const realHeader = headers.find(h => aliases.some(alias => normalizeHeader(alias) === normalizeHeader(h)));
      normalized[key] = realHeader ? String(raw[realHeader] || "").trim() : "";
    }
    return normalized;
  }).filter(r => Object.values(r._raw || {}).some(v => String(v || "").trim() !== ""));
}

async function getRows(gid, sourceTab){
  const res = await fetch(csvUrl(gid), { cache:"no-store" });
  const text = await res.text();
  if(text.toLowerCase().includes("<html")) throw new Error("CSV unavailable");
  return makeObjects(parseCSV(text), sourceTab);
}

function esc(s){
  return String(s || "").replace(/[&<>"]/g, m => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;"
  }[m]));
}

function toNumber(value){
  const n = parseFloat(String(value || "").replace(/[^0-9.+-]/g,""));
  return Number.isFinite(n) ? n : 0;
}

function hasText(value){
  return String(value || "").trim().length > 0;
}

function clean(s){
  return String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function tierText(row){
  return `${row.access || ""} ${row.featured || ""}`.toLowerCase().trim();
}

function isVIP(row){
  if(row._sourceTab === "VIP Archive") return true;
  const t = tierText(row);
  return (
    t.includes("vip") ||
    t.includes("premium") ||
    t.includes("member") ||
    t.includes("featured") ||
    clean(row.featured) === "yes"
  );
}

function isFree(row){
  if(row._sourceTab === "VIP Archive") return false;
  const t = tierText(row);
  if(t.includes("free") || t.includes("public")) return true;
  if(isVIP(row)) return false;
  return true;
}

function isWin(row){
  const r = clean(row.result);
  return r === "win" || r === "won" || r.includes("win") || r.includes("won");
}

function isLoss(row){
  const r = clean(row.result);
  return r === "loss" || r === "lost" || r.includes("loss") || r.includes("lost");
}

function isPush(row){
  const r = clean(row.result);
  return r === "push" || r === "void";
}

function isClosed(row){
  return isWin(row) || isLoss(row) || isPush(row) || clean(row.status).includes("closed");
}

function isActive(row){
  const status = clean(row.status);
  if(!hasText(row.pick)) return false;
  if(["void","cancelled","canceled","delete","removed"].some(x => status.includes(x))) return false;
  if(isClosed(row)) return false;
  return true;
}

function rowKey(row){
  return [
    row.league || row.sport || "",
    row.game || "",
    row.pick || ""
  ].map(clean).join("|");
}

function dedupeRows(rows){
  const seen = new Set();
  const out = [];
  for(const row of rows){
    if(!hasText(row.pick)) continue;
    const key = rowKey(row);
    if(!key || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function byDateDesc(a,b){
  const da = Date.parse(a.date || a.postedTime || "") || 0;
  const db = Date.parse(b.date || b.postedTime || "") || 0;
  return db - da;
}

function setText(id, value){
  const el = document.getElementById(id);
  if(el) el.textContent = value;
}

function resultClass(value){
  const r = clean(value);
  if(r.includes("win") || r.includes("won")) return "status-win";
  if(r.includes("loss") || r.includes("lost")) return "status-loss";
  return "status-pending";
}

function calcStats(rows, countRows = rows){
  const graded = rows.filter(r => hasText(r.pick) && (isWin(r) || isLoss(r)));
  const wins = graded.filter(isWin).length;
  const losses = graded.filter(isLoss).length;
  const total = wins + losses;
  const units = graded.reduce((sum, r) => sum + toNumber(r.profitLoss), 0);
  const count = countRows.filter(r => hasText(r.pick)).length;

  return {
    record: total ? `${wins}-${losses}` : "--",
    winRate: total ? `${Math.round((wins / total) * 100)}%` : "--",
    units: total || units ? `${units > 0 ? "+" : ""}${units.toFixed(2)}u` : "--",
    count: count || "--"
  };
}

function writeStats(prefix, stats){
  setText(prefix + "Record", stats.record);
  setText(prefix + "WinRate", stats.winRate);
  setText(prefix + "TotalUnits", stats.units);
  setText(prefix + "Count", stats.count);
}

function writeVisibleStatsForPage(page, overallStats, vipStats, freeStats){
  if(page === "premium.html" || page === "sharp-card.html"){
    writeStats("vip", vipStats);
    setText("overallRecord", vipStats.record);
    setText("overallWinRate", vipStats.winRate);
    setText("overallTotalUnits", vipStats.units);
    setText("overallCount", vipStats.count);
  } else if(page === "free-look.html"){
    writeStats("free", freeStats);
    setText("overallRecord", freeStats.record);
    setText("overallWinRate", freeStats.winRate);
    setText("overallTotalUnits", freeStats.units);
    setText("overallCount", freeStats.count);
  } else {
    writeStats("overall", overallStats);
    writeStats("vip", vipStats);
    writeStats("free", freeStats);
  }
}

function publicWriteup(row){
  return row.writeup || "Public writeup loading from the Micks Picks sheet.";
}

function vipAnalysis(row){
  const parts = [
    row.fullAnalysis,
    row.marketNotes ? `Market Notes: ${row.marketNotes}` : "",
    row.injuryNotes ? `Injury Notes: ${row.injuryNotes}` : "",
    row.noBetCutoff ? `No-Bet Cutoff: ${row.noBetCutoff}` : "",
    row.sourceVerification ? `Source Verification: ${row.sourceVerification}` : ""
  ].filter(Boolean);

  return parts.join(" ") || row.writeup || "VIP analysis loading from the Micks Picks sheet.";
}

function pickCard(row, locked=false){
  const league = row.league || row.sport || "Sports";
  const cls = resultClass(row.result || row.status);
  const accessBadge = isVIP(row) ? "VIP" : "FREE";
  const write = locked ? publicWriteup(row) : vipAnalysis(row);

  return `
    <div class="pick-card">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
        <div>
          <div style="color:var(--muted);font-size:11px;text-transform:uppercase;font-weight:1000;letter-spacing:.9px">${esc(league)} • ${esc(row.betType || "Pick")}</div>
          <div class="pick-title">${esc(row.pick || "Pick Pending")}</div>
          <p style="color:var(--muted);line-height:1.5">${esc(row.game || "Game details loading")}</p>
        </div>
        <div style="background:linear-gradient(135deg,#9b6d15,#ffe28a 54%,#b98821);color:#090909;padding:9px 11px;border-radius:10px;font-weight:1000">
          ${esc(row.grade || accessBadge)}
        </div>
      </div>

      <div class="metric-grid">
        <div class="metric"><strong>${esc(row.odds || "--")}</strong><span>Odds</span></div>
        <div class="metric"><strong>${esc(row.units || "--")}</strong><span>Units</span></div>
        <div class="metric"><strong>${esc(row.bestNumber || "--")}</strong><span>Best Number</span></div>
        <div class="metric"><strong class="${cls}">${esc(row.status || row.result || "Pending")}</strong><span>Status</span></div>
      </div>

      <p style="color:#e7dcc4;line-height:1.55;margin-top:14px">${esc(write)}</p>
    </div>
  `;
}

function renderGrid(id, rows, locked=false){
  const el = document.getElementById(id);
  if(!el) return;

  const activeRows = rows.filter(isActive).slice(0, 12);
  el.innerHTML = activeRows.length
    ? activeRows.map(row => pickCard(row, locked)).join("")
    : `<div class="empty">No active picks loaded right now. Active Picks tab currently has no pick rows.</div>`;
}

function renderTable(id, rows, limit = 100){
  const el = document.getElementById(id);
  if(!el) return;

  const usable = dedupeRows(rows).filter(r => hasText(r.pick)).sort(byDateDesc).slice(0, limit);

  if(!usable.length){
    el.innerHTML = '<tr><td colspan="7">No results loaded.</td></tr>';
    return;
  }

  el.innerHTML = usable.map(row => {
    const cls = resultClass(row.result || row.status);
    return `
      <tr>
        <td>${esc(row.date || "")}</td>
        <td>${esc(row.league || row.sport || "")}</td>
        <td><strong>${esc(row.pick || "")}</strong><br><span style="color:var(--muted)">${esc(row.game || "")}</span></td>
        <td>${esc(row.grade || "")}</td>
        <td class="${cls}">${esc(row.result || row.status || "Pending")}</td>
        <td>${esc(row.profitLoss || "")}</td>
        <td>${esc(row.closingNumber || row.bestNumber || "")}</td>
      </tr>
    `;
  }).join("");
}

function renderOddsLayer(rows){
  const el = document.getElementById("oddsRows");
  if(!el) return;

  const usable = dedupeRows(rows).filter(r => hasText(r.pick)).slice(0, 12);

  el.innerHTML = usable.length ? usable.map(row => `
    <tr>
      <td>${esc(row.league || row.sport || "")}</td>
      <td>${esc(row.game || "")}</td>
      <td>${esc(row.pick || "")}</td>
      <td>${esc(row.betRiversPrice || row.odds || "--")}</td>
      <td>${esc(row.bestMarketPrice || row.bestNumber || "--")}</td>
      <td>${esc(row.lineMovement || "--")}</td>
      <td>${esc(row.confirmationStatus || "Manual Confirm")}</td>
    </tr>
  `).join("") : '<tr><td colspan="7">No odds rows loaded.</td></tr>';
}

async function boot(){
  try{
    const page = currentPage();

    const activeRows = await getRows(ACTIVE_GID, "Active Picks");
    const resultsRows = dedupeRows(await getRows(RESULTS_ARCHIVE_GID, "Results Archive"));
    const vipArchiveRows = dedupeRows(await getRows(VIP_ARCHIVE_GID, "VIP Archive").catch(() => []));

    // Critical rule: no combining result tabs for display or metrics.
    const overallResults = resultsRows;
    const vipResults = vipArchiveRows;
    const freeResults = dedupeRows(resultsRows.filter(isFree));

    const freeActiveRows = activeRows.filter(isFree);
    const vipActiveRows = activeRows.filter(isVIP);

    const overallStats = calcStats(overallResults, overallResults);
    const vipStats = calcStats(vipResults, vipResults.concat(vipActiveRows));
    const freeStats = calcStats(freeResults, freeResults.concat(freeActiveRows));

    writeVisibleStatsForPage(page, overallStats, vipStats, freeStats);

    if(page === "premium.html"){
      renderGrid("vipPicksGrid", vipActiveRows, false);
      renderTable("vipArchiveBody", vipResults);
    } else if(page === "free-look.html"){
      renderGrid("freePicksGrid", freeActiveRows, true);
      renderTable("freeArchiveBody", freeResults);
    } else if(page === "results.html"){
      renderTable("resultsBody", overallResults);
    } else if(page === "market-heat.html"){
      renderOddsLayer(activeRows.length ? activeRows : resultsRows);
    } else if(page === "sharp-card.html"){
      renderGrid("vipPicksGrid", vipActiveRows, false);
    } else if(page === "index.html" || page === ""){
      renderTable("dashboardResultsBody", overallResults, 12);
    }

    document.querySelectorAll(".sync-time").forEach(el => {
      el.textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    });

    console.log("Micks Picks no-duplicate stats:", { overallStats, vipStats, freeStats });
  }catch(e){
    document.querySelectorAll(".sheet-area").forEach(el => {
      el.innerHTML = '<div class="empty">Sheet data could not load. Make sure the Google Sheet is shared as Viewer or published to web.</div>';
    });
    console.error("Micks Picks sheet load error:", e);
  }
}

boot();
setInterval(boot, 30000);
