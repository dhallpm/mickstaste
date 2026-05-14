
/*
  MICKS PICKS SHEET MAPPING FIX
  Expected saved headers:
  Date, Sport, League, Game, Pick, Bet Type, Odds, Sportsbook, Grade, Units,
  Best Number, No Bet Cutoff, Implied Probability, EV Edge, Confidence, Status,
  Result, Profit/Loss, Writeup, Market Notes, Injury Notes, Source Verification,
  Posted Time, Access, Full Analysis

  Also supports:
  Featured, Closing #, Closing Number, BetRivers Price, Best Market Price,
  Line Movement, Confirmation Status, Release Time
*/

const SHEET_ID = "15txBM8qsck7f0ZA_za7xYEykBxKpuq0no3x7yHcKNeE";
const ACTIVE_GID = "0";
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
  confirmationStatus: ["Confirmation Status", "Confirmed", "Confirmation"],
  releaseTime: ["Release Time", "Unlock Time"]
};

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
  return String(h || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w#/% ]/g, "");
}

function makeObjects(rows){
  if(!rows.length) return [];
  const headers = rows[0].map(h => String(h || "").trim());

  return rows.slice(1).map(r => {
    const raw = {};
    headers.forEach((h,i) => raw[h] = String(r[i] || "").trim());

    const normalized = { _raw: raw };
    for(const [key, aliases] of Object.entries(HEADER_ALIASES)){
      const realHeader = headers.find(h => aliases.some(alias => normalizeHeader(alias) === normalizeHeader(h)));
      normalized[key] = realHeader ? String(raw[realHeader] || "").trim() : "";
    }
    return normalized;
  }).filter(r => Object.values(r._raw || {}).some(v => String(v || "").trim() !== ""));
}

async function getRows(gid){
  const res = await fetch(csvUrl(gid), { cache:"no-store" });
  const text = await res.text();
  if(text.toLowerCase().includes("<html")) throw new Error("CSV unavailable");
  return makeObjects(parseCSV(text));
}

function esc(s){
  return String(s || "").replace(/[&<>"]/g, m => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;"
  }[m]));
}

function toNumber(value){
  const n = parseFloat(String(value || "").replace(/[^0-9.+-]/g,""));
  return Number.isFinite(n) ? n : 0;
}

function hasText(value){
  return String(value || "").trim().length > 0;
}

function tierText(row){
  return `${row.access || ""} ${row.featured || ""}`.toLowerCase().trim();
}

function isVIP(row){
  const t = tierText(row);
  return (
    t.includes("vip") ||
    t.includes("premium") ||
    t.includes("member") ||
    t.includes("featured") ||
    row.featured.toLowerCase() === "yes"
  );
}

function isFree(row){
  const t = tierText(row);

  // Explicit free/public rows are always free.
  if(t.includes("free") || t.includes("public")) return true;

  // Rows explicitly marked VIP/premium/featured are never free.
  if(isVIP(row)) return false;

  // Blank Access rows default to Free so public picks still show.
  return true;
}

function filterClosed(rows){
  return rows.filter(r => hasText(r.pick) && (isClosed(r) || hasText(r.result)));
}

function filterActive(rows){
  return rows.filter(isActive);
}

function isClosed(row){
  const result = String(row.result || "").toLowerCase();
  return ["win","loss","push"].some(x => result.includes(x));
}

function isActive(row){
  const status = String(row.status || "").toLowerCase();
  const result = String(row.result || "").toLowerCase();

  if(["void","cancelled","canceled","delete","removed"].some(x => status.includes(x))) return false;
  if(["win","loss","push"].some(x => result.includes(x))) return false;

  return hasText(row.pick);
}

function setText(id, value){
  const el = document.getElementById(id);
  if(el) el.textContent = value;
}

function resultClass(value){
  const r = String(value || "").toLowerCase();
  if(r.includes("win")) return "status-win";
  if(r.includes("loss")) return "status-loss";
  return "status-pending";
}

function updateStats(rows, prefix){
  const graded = rows.filter(r => hasText(r.pick) && /win|loss/i.test(r.result || ""));
  const wins = graded.filter(r => /win/i.test(r.result || "")).length;
  const losses = graded.filter(r => /loss/i.test(r.result || "")).length;
  const total = wins + losses;
  const units = rows
    .filter(r => hasText(r.pick))
    .reduce((sum, r) => sum + toNumber(r.profitLoss), 0);

  setText(prefix + "Record", total ? `${wins}-${losses}` : "--");
  setText(prefix + "WinRate", total ? `${Math.round((wins / total) * 100)}%` : "--");
  setText(prefix + "TotalUnits", units ? `${units > 0 ? "+" : ""}${units.toFixed(2)}u` : "--");
  setText(prefix + "Count", rows.filter(r => hasText(r.pick)).length || "--");
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

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;color:var(--muted);font-size:11px;text-transform:uppercase;font-weight:900">
        ${row.sportsbook ? `<span>Book: ${esc(row.sportsbook)}</span>` : ""}
        ${row.evEdge ? `<span>EV: ${esc(row.evEdge)}</span>` : ""}
        ${row.confidence ? `<span>Confidence: ${esc(row.confidence)}</span>` : ""}
        ${row.postedTime ? `<span>Posted: ${esc(row.postedTime)}</span>` : ""}
      </div>
    </div>
  `;
}

function renderGrid(id, rows, locked=false){
  const el = document.getElementById(id);
  if(!el) return;

  const activeRows = rows.filter(isActive).slice(0, 12);
  el.innerHTML = activeRows.length
    ? activeRows.map(row => pickCard(row, locked)).join("")
    : `<div class="empty">No active picks loaded right now. Check the sheet Access, Status, and Result columns.</div>`;
}

function renderTable(id, rows){
  const el = document.getElementById(id);
  if(!el) return;

  const usable = rows.filter(r => hasText(r.pick)).slice(0, 80);

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
        <td>
          <strong>${esc(row.pick || "")}</strong><br>
          <span style="color:var(--muted)">${esc(row.game || "")}</span>
        </td>
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

  const usable = rows.filter(r => hasText(r.pick)).slice(0, 12);

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
    const activeRows = await getRows(ACTIVE_GID);
    const archiveRows = await getRows(VIP_ARCHIVE_GID).catch(() => []);

    const allRows = activeRows.concat(archiveRows);

    // True separation by tier.
    const freeActiveRows = activeRows.filter(isFree);
    const vipActiveRows = activeRows.filter(isVIP);

    const freeArchiveRows = archiveRows.filter(isFree);
    const vipArchiveRows = archiveRows.filter(isVIP);

    const freeAllRows = freeActiveRows.concat(freeArchiveRows);
    const vipAllRows = vipActiveRows.concat(vipArchiveRows);

    const overallClosedRows = filterClosed(allRows);
    const freeClosedRows = filterClosed(freeAllRows);
    const vipClosedRows = filterClosed(vipAllRows);

    updateStats(overallClosedRows.length ? overallClosedRows : allRows, "overall");
    updateStats(vipClosedRows.length ? vipClosedRows : vipAllRows, "vip");
    updateStats(freeClosedRows.length ? freeClosedRows : freeAllRows, "free");

    renderGrid("freePicksGrid", freeActiveRows, true);
    renderGrid("vipPicksGrid", vipActiveRows, false);

    // Overall Results page shows everything closed.
    renderTable("resultsBody", overallClosedRows.length ? overallClosedRows : allRows);

    // VIP Archive page/section shows VIP only.
    renderTable("vipArchiveBody", vipClosedRows.length ? vipClosedRows : vipAllRows);

    // Free results table if a page adds it later.
    renderTable("freeArchiveBody", freeClosedRows.length ? freeClosedRows : freeAllRows);

    renderOddsLayer(activeRows);

    document.querySelectorAll(".sync-time").forEach(el => {
      el.textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    });
  }catch(e){
    document.querySelectorAll(".sheet-area").forEach(el => {
      el.innerHTML = '<div class="empty">Sheet data could not load. Make sure the Google Sheet is shared as Viewer or published to web.</div>';
    });
    console.error("Micks Picks sheet load error:", e);
  }
}

boot();
setInterval(boot, 30000);
