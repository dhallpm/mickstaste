'use strict';

const crypto = require('crypto');

const RESULTS_ARCHIVE = 'Results Archive';
const LOOKUP_SHEET = 'Static Closing Odds Lookup';
const NEEDS_LOOKUP = 'NEEDS ODDS LOOKUP';

const LOOKUP_HEADERS = [
  'Date',
  'Sport',
  'League',
  'Game',
  'Pick',
  'Bet Type',
  'Static Source',
  'Source URL',
  'Pulled Closing Odds',
  'Confidence',
  'Matched Row Key',
  'Status',
  'Notes',
  'Updated At'
];

const ARCHIVE_COLUMNS = [
  'Closing Number',
  'Verified Closing Number',
  'Closing Fallback Source',
  'Closing Fallback URL',
  'Closing Public Verification Status'
];

const HEADER_ALIASES = {
  date: ['Date', 'Posted Date', 'Pick Date'],
  sport: ['Sport'],
  league: ['League', 'Sport League'],
  game: ['Game', 'Matchup', 'Event'],
  pick: ['Pick', 'Play', 'Selection'],
  betType: ['Bet Type', 'Market', 'Odds Market', 'Type'],
  sportsbook: ['Sportsbook', 'Book', 'Bookmaker'],
  closingNumber: ['Closing Number', 'Closing #', 'Closing Line'],
  verifiedClosingNumber: ['Verified Closing Number', 'Verified Closing #', 'Verified Closing Line'],
  fallbackSource: ['Closing Fallback Source'],
  fallbackUrl: ['Closing Fallback URL'],
  verificationStatus: ['Closing Public Verification Status'],
  odds: ['Odds', 'Price', 'Picked At', 'Picked Odds'],
  clv: ['CLV', 'Closing Line Value']
};

const SPORTS = {
  nba: { oddsApi: 'basketball_nba', covers: 'nba', teamRankings: 'nba', draftKings: 'basketball/nba', fanduel: 'basketball/nba' },
  wnba: { oddsApi: 'basketball_wnba', covers: 'wnba', teamRankings: 'wnba', draftKings: 'basketball/wnba', fanduel: 'basketball/wnba' },
  mlb: { oddsApi: 'baseball_mlb', covers: 'mlb', teamRankings: 'mlb', draftKings: 'baseball/mlb', fanduel: 'baseball/mlb' },
  nfl: { oddsApi: 'americanfootball_nfl', covers: 'nfl', teamRankings: 'nfl', draftKings: 'football/nfl', fanduel: 'football/nfl' },
  nhl: { oddsApi: 'icehockey_nhl', covers: 'nhl', teamRankings: 'nhl', draftKings: 'hockey/nhl', fanduel: 'hockey/nhl' },
  mma: { oddsApi: 'mma_mixed_martial_arts', covers: 'mma', teamRankings: 'mma', draftKings: 'mma', fanduel: 'mma' }
};

async function runClosingOddsWorker(options = {}) {
  const env = options.env || process.env;
  const limit = Number(options.limit || env.CLOSING_ODDS_LIMIT || 50);
  const dryRun = Boolean(options.dryRun || env.DRY_RUN === '1' || env.CLOSING_ODDS_DRY_RUN === '1');
  const sheets = options.sheetsClient || createSheetsClient(env);

  if (!dryRun) {
    await ensureLookupSheet(sheets);
  }
  const archive = await readSheetTable(sheets, RESULTS_ARCHIVE);
  const archiveHeaders = ensureArchiveHeaderList(archive.headers);
  if (archiveHeaders.changed && !dryRun) {
    await writeHeaderRow(sheets, RESULTS_ARCHIVE, archiveHeaders.headers);
  }

  const rows = archive.rows
    .map((row, index) => normalizeArchiveRow(row, archiveHeaders.headers, index + 2))
    .filter(shouldLookupRow)
    .slice(0, limit);

  const summary = {
    ok: true,
    dryRun,
    checkedRows: archive.rows.length,
    rowsNeedingLookup: rows.length,
    appendedLookupRows: 0,
    highConfidenceUpdates: 0,
    mediumOrLowCandidates: 0,
    manualFallbacks: 0,
    errors: []
  };

  for (const row of rows) {
    try {
      const attempts = await lookupClosingOdds(row, env, options);
      const lookupRows = attempts.map(attempt => toLookupRow(row, attempt));
      if (lookupRows.length && !dryRun) {
        await appendRows(sheets, `${LOOKUP_SHEET}!A:N`, lookupRows);
      }
      summary.appendedLookupRows += lookupRows.length;

      const best = chooseBestAttempt(attempts);
      if (!best || !attempts.some(attempt => attempt.closingOdds) || best.status === 'Manual Review') {
        summary.manualFallbacks += 1;
      } else if (best.confidence === 'High' && best.closingOdds && !row.hasManualVerifiedClosing) {
        if (!dryRun) {
          await applyHighConfidenceUpdate(sheets, row, archiveHeaders.headers, best);
        }
        summary.highConfidenceUpdates += 1;
      } else {
        if (!dryRun && row.closingNeedsLookup) {
          await updateSingleCell(sheets, RESULTS_ARCHIVE, row.rowNumber, archiveHeaders.headers.indexOf('Closing Number') + 1, NEEDS_LOOKUP);
        }
        summary.mediumOrLowCandidates += 1;
      }
    } catch (err) {
      summary.errors.push({ row: row.rowNumber, key: row.key, error: err.message });
      const failure = toLookupRow(row, {
        source: 'Worker',
        url: '',
        closingOdds: '',
        confidence: 'Low',
        status: 'Error',
        notes: err.message
      });
      if (!dryRun) await appendRows(sheets, `${LOOKUP_SHEET}!A:N`, [failure]);
      summary.appendedLookupRows += 1;
    }
  }

  summary.ok = summary.errors.length === 0;
  return summary;
}

function createSheetsClient(env) {
  const spreadsheetId = requiredEnv(env, 'GOOGLE_SHEETS_ID');
  const email = requiredEnv(env, 'GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const privateKey = requiredEnv(env, 'GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n');
  let tokenCache = null;

  async function accessToken() {
    const now = Math.floor(Date.now() / 1000);
    if (tokenCache && tokenCache.expiresAt > now + 60) return tokenCache.value;
    const assertion = signJwt(email, privateKey, now);
    const body = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    });
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    const payload = await parseJsonResponse(response);
    tokenCache = {
      value: payload.access_token,
      expiresAt: now + Number(payload.expires_in || 3600)
    };
    return tokenCache.value;
  }

  async function request(path, options = {}) {
    const token = await accessToken();
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    return parseJsonResponse(response);
  }

  return { spreadsheetId, request };
}

function signJwt(email, privateKey, now) {
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64Url(JSON.stringify({
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  }));
  const body = `${header}.${claims}`;
  const signature = crypto.createSign('RSA-SHA256').update(body).sign(privateKey);
  return `${body}.${base64Url(signature)}`;
}

async function parseJsonResponse(response) {
  const text = await response.text();
  let payload = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (err) {
      throw new Error(`Non-JSON response from ${response.url}: ${text.slice(0, 180)}`);
    }
  }
  if (!response.ok) {
    const message = payload.error_description || payload.error?.message || payload.error || text || response.statusText;
    throw new Error(`HTTP ${response.status}: ${message}`);
  }
  return payload;
}

async function readSheetTable(sheets, sheetName) {
  const payload = await sheets.request(`/values/${encodeURIComponent(sheetName)}!A:ZZ`);
  const values = payload.values || [];
  const headers = (values[0] || []).map(h => String(h || '').trim());
  const rows = values.slice(1).map(valuesRow => {
    const row = {};
    headers.forEach((header, index) => {
      if (header) row[header] = valuesRow[index] || '';
    });
    row._values = valuesRow;
    return row;
  });
  return { headers, rows };
}

async function ensureLookupSheet(sheets) {
  const metadata = await sheets.request('?fields=sheets.properties');
  const exists = (metadata.sheets || []).some(sheet => sheet.properties?.title === LOOKUP_SHEET);
  if (!exists) {
    await sheets.request(':batchUpdate', {
      method: 'POST',
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: LOOKUP_SHEET } } }] })
    });
  }
  const table = await readSheetTable(sheets, LOOKUP_SHEET);
  if (!sameHeaders(table.headers, LOOKUP_HEADERS)) {
    await writeHeaderRow(sheets, LOOKUP_SHEET, LOOKUP_HEADERS);
  }
}

function ensureArchiveHeaderList(headers) {
  const next = headers.slice();
  for (const column of ARCHIVE_COLUMNS) {
    if (!next.includes(column)) next.push(column);
  }
  return { headers: next, changed: next.length !== headers.length };
}

async function writeHeaderRow(sheets, sheetName, headers) {
  await sheets.request(`/values/${encodeURIComponent(sheetName)}!A1:ZZ1?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [headers] })
  });
}

async function appendRows(sheets, range, rows) {
  await sheets.request(`/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
    method: 'POST',
    body: JSON.stringify({ values: rows })
  });
}

async function updateSingleCell(sheets, sheetName, rowNumber, columnNumber, value) {
  const range = `${sheetName}!${columnLetter(columnNumber)}${rowNumber}`;
  await sheets.request(`/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    body: JSON.stringify({ values: [[value]] })
  });
}

async function applyHighConfidenceUpdate(sheets, row, headers, attempt) {
  const updates = {
    'Closing Number': attempt.closingOdds,
    'Verified Closing Number': attempt.closingOdds,
    'Closing Fallback Source': attempt.source,
    'Closing Fallback URL': attempt.url,
    'Closing Public Verification Status': 'Verified - High Confidence'
  };

  const oddsColumn = findHeaderIndex(headers, HEADER_ALIASES.odds) + 1;
  const clvColumn = findHeaderIndex(headers, HEADER_ALIASES.clv) + 1;
  const verifiedColumn = headers.indexOf('Verified Closing Number') + 1;
  if (clvColumn > 0 && oddsColumn > 0 && verifiedColumn > 0) {
    updates[headers[clvColumn - 1]] = `=IF(OR(${columnLetter(oddsColumn)}${row.rowNumber}="",${columnLetter(verifiedColumn)}${row.rowNumber}=""),"",VALUE(${columnLetter(verifiedColumn)}${row.rowNumber})-VALUE(${columnLetter(oddsColumn)}${row.rowNumber}))`;
  }

  const data = Object.entries(updates).map(([header, value]) => ({
    range: `${RESULTS_ARCHIVE}!${columnLetter(headers.indexOf(header) + 1)}${row.rowNumber}`,
    values: [[value]]
  })).filter(update => !update.range.includes('0'));

  await sheets.request(`/values:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data })
  });
}

function normalizeArchiveRow(raw, headers, rowNumber) {
  const value = aliases => getByAliases(raw, aliases);
  const closing = value(HEADER_ALIASES.closingNumber);
  const verifiedClosing = value(HEADER_ALIASES.verifiedClosingNumber);
  const row = {
    rowNumber,
    raw,
    date: value(HEADER_ALIASES.date),
    sport: value(HEADER_ALIASES.sport),
    league: value(HEADER_ALIASES.league),
    game: value(HEADER_ALIASES.game),
    pick: value(HEADER_ALIASES.pick),
    betType: value(HEADER_ALIASES.betType),
    sportsbook: value(HEADER_ALIASES.sportsbook),
    closingNumber: closing,
    verifiedClosingNumber: verifiedClosing,
    closingNeedsLookup: needsLookup(closing),
    verifiedNeedsLookup: needsLookup(verifiedClosing),
    hasManualVerifiedClosing: hasMeaningfulClosing(verifiedClosing)
  };
  row.key = buildRowKey(row);
  row.searchText = normalizeText([row.date, row.league || row.sport, row.game, row.pick, row.betType, row.sportsbook].join(' '));
  row.sportInfo = sportInfo(row.league || row.sport);
  row.headers = headers;
  return row;
}

function shouldLookupRow(row) {
  if (!row.pick && !row.game) return false;
  if (row.hasManualVerifiedClosing) return false;
  return row.closingNeedsLookup || row.verifiedNeedsLookup;
}

async function lookupClosingOdds(row, env, options = {}) {
  const sources = buildSources(row, env);
  const attempts = [];
  for (const source of sources) {
    try {
      const attempt = await source.fetch(row, env, options);
      attempts.push(attempt);
      if (attempt.confidence === 'High' && attempt.closingOdds) break;
    } catch (err) {
      attempts.push({
        source: source.name,
        url: source.url || '',
        closingOdds: '',
        confidence: 'Low',
        status: 'Fetch Failed',
        notes: err.message
      });
    }
  }
  if (!attempts.some(attempt => attempt.closingOdds)) {
    attempts.push({
      source: 'Manual Verification',
      url: '',
      closingOdds: '',
      confidence: 'Low',
      status: 'Manual Review',
      notes: `No high-confidence public/static match found for ${row.key}.`
    });
  }
  return attempts;
}

function buildSources(row, env) {
  const info = row.sportInfo || {};
  const sources = [
    publicHtmlSource('DonBest/Covers odds history', coversUrl(info, row)),
    publicHtmlSource('DraftKings public/static sportsbook page', draftKingsUrl(info)),
    publicHtmlSource('FanDuel public/static sportsbook page', fanduelUrl(info)),
    publicHtmlSource('TeamRankings odds page', teamRankingsUrl(info, row))
  ];
  if (env.ODDS_API_KEY && info.oddsApi) sources.push(oddsApiHistoricalSource(info));
  if (env.OPTICODDS_API_KEY) sources.push(opticOddsHistoricalSource(info));
  return sources.filter(source => source.url || source.fetch);
}

function publicHtmlSource(name, url) {
  return {
    name,
    url,
    async fetch(row) {
      if (!url) return noCandidate(name, '', 'No source URL could be generated for this league.');
      const response = await fetch(url, { headers: { 'User-Agent': 'MicksPicksClosingOddsWorker/1.0' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      return parseHtmlCandidate(name, url, html, row);
    }
  };
}

function oddsApiHistoricalSource(info) {
  return {
    name: 'Odds API historical endpoint',
    async fetch(row, env) {
      const isoDate = historicalDate(row.date);
      if (!isoDate) return noCandidate(this.name, '', 'Row date could not be converted to an ISO historical odds timestamp.');
      const params = new URLSearchParams({
        apiKey: env.ODDS_API_KEY,
        regions: 'us,us2',
        markets: marketsForBetType(row.betType),
        oddsFormat: 'american',
        dateFormat: 'iso',
        date: isoDate
      });
      const url = `https://api.the-odds-api.com/v4/historical/sports/${encodeURIComponent(info.oddsApi)}/odds?${params}`;
      const response = await fetch(url);
      const payload = await parseJsonResponse(response);
      return parseOddsApiPayload(this.name, url, payload, row);
    }
  };
}

function opticOddsHistoricalSource(info) {
  return {
    name: 'OpticOdds historical endpoint',
    async fetch(row, env) {
      const isoDate = historicalDate(row.date);
      if (!isoDate) return noCandidate(this.name, '', 'Row date could not be converted to an ISO historical odds timestamp.');
      const params = new URLSearchParams({
        key: env.OPTICODDS_API_KEY,
        sport: info.oddsApi || normalizeText(row.league || row.sport),
        date: isoDate,
        is_main: 'true'
      });
      const url = `https://api.opticodds.com/api/v3/fixtures/odds/historical?${params}`;
      const response = await fetch(url);
      const payload = await parseJsonResponse(response);
      return parseGenericJsonPayload(this.name, url, payload, row);
    }
  };
}

function parseHtmlCandidate(source, url, html, row) {
  const text = normalizeText(stripHtml(html));
  const matchupScore = matchupFound(text, row) ? 1 : 0;
  const pickScore = row.pick && text.includes(normalizeText(row.pick)) ? 1 : 0;
  const marketScore = marketFound(text, row.betType) ? 1 : 0;
  const dateScore = dateFound(text, row.date) ? 1 : 0;
  const odds = extractOddsNearPick(stripHtml(html), row.pick) || extractFirstAmericanOdds(stripHtml(html));
  const confidence = confidenceFromScores(dateScore, matchupScore, marketScore, pickScore, Boolean(odds));
  return {
    source,
    url,
    closingOdds: odds,
    confidence,
    status: odds ? 'Candidate Found' : 'No Odds Found',
    notes: `${source}: date=${Boolean(dateScore)}, matchup=${Boolean(matchupScore)}, market=${Boolean(marketScore)}, pick=${Boolean(pickScore)}.`
  };
}

function parseOddsApiPayload(source, url, payload, row) {
  const events = Array.isArray(payload.data) ? payload.data : [];
  const candidates = [];
  for (const event of events) {
    if (!eventMatchesRow(event, row)) continue;
    for (const bookmaker of event.bookmakers || []) {
      if (row.sportsbook && !normalizeText(bookmaker.title || bookmaker.key).includes(normalizeText(row.sportsbook))) continue;
      for (const market of bookmaker.markets || []) {
        if (!marketKeyMatches(market.key, row.betType)) continue;
        for (const outcome of market.outcomes || []) {
          if (!outcomeMatchesPick(outcome, row)) continue;
          candidates.push({
            source,
            url,
            closingOdds: formatOdds(outcome.price, outcome.point),
            confidence: 'High',
            status: 'Verified',
            notes: `Exact historical API match: ${bookmaker.title || bookmaker.key} ${market.key} ${outcome.name || ''} ${outcome.point || ''}.`
          });
        }
      }
    }
  }
  if (candidates.length) return candidates[0];
  return noCandidate(source, url, 'Historical API returned no exact date + matchup + market + side match.');
}

function parseGenericJsonPayload(source, url, payload, row) {
  const text = normalizeText(JSON.stringify(payload));
  const odds = extractOddsNearPick(JSON.stringify(payload), row.pick) || extractFirstAmericanOdds(JSON.stringify(payload));
  const confidence = confidenceFromScores(dateFound(text, row.date) ? 1 : 0, matchupFound(text, row) ? 1 : 0, marketFound(text, row.betType) ? 1 : 0, row.pick && text.includes(normalizeText(row.pick)) ? 1 : 0, Boolean(odds));
  return {
    source,
    url,
    closingOdds: odds,
    confidence,
    status: odds ? 'Candidate Found' : 'No Odds Found',
    notes: `${source}: generic JSON/static match confidence ${confidence}.`
  };
}

function confidenceFromScores(dateScore, matchupScore, marketScore, pickScore, hasOdds) {
  if (hasOdds && dateScore && matchupScore && marketScore && pickScore) return 'High';
  if (hasOdds && dateScore && matchupScore) return 'Medium';
  return 'Low';
}

function chooseBestAttempt(attempts) {
  const score = { High: 3, Medium: 2, Low: 1 };
  return attempts.slice().sort((a, b) => (score[b.confidence] || 0) - (score[a.confidence] || 0))[0] || null;
}

function toLookupRow(row, attempt) {
  return [
    row.date,
    row.sport,
    row.league,
    row.game,
    row.pick,
    row.betType,
    attempt.source,
    attempt.url,
    attempt.closingOdds || '',
    attempt.confidence || 'Low',
    row.key,
    attempt.status || '',
    attempt.notes || '',
    new Date().toISOString()
  ];
}

function noCandidate(source, url, notes) {
  return { source, url, closingOdds: '', confidence: 'Low', status: 'No Match', notes };
}

function coversUrl(info, row) {
  if (!info.covers) return '';
  return `https://www.covers.com/sport/${encodeURIComponent(info.covers)}/odds`;
}

function draftKingsUrl(info) {
  return info.draftKings ? `https://sportsbook.draftkings.com/leagues/${info.draftKings}` : '';
}

function fanduelUrl(info) {
  return info.fanduel ? `https://sportsbook.fanduel.com/navigation/${info.fanduel}` : '';
}

function teamRankingsUrl(info) {
  return info.teamRankings ? `https://www.teamrankings.com/${info.teamRankings}/odds/` : '';
}

function sportInfo(value) {
  const key = normalizeText(value);
  for (const [league, info] of Object.entries(SPORTS)) {
    if (key.includes(league)) return info;
  }
  return {};
}

function marketsForBetType(betType) {
  const text = normalizeText(betType);
  if (text.includes('spread') || text.includes('run line') || text.includes('puck line')) return 'spreads';
  if (text.includes('total') || text.includes('over') || text.includes('under')) return 'totals';
  return 'h2h,spreads,totals';
}

function marketKeyMatches(key, betType) {
  const market = normalizeText(key);
  const wanted = normalizeText(betType);
  if (!wanted) return true;
  if (wanted.includes('spread') || wanted.includes('run line') || wanted.includes('puck line')) return market.includes('spread');
  if (wanted.includes('total') || wanted.includes('over') || wanted.includes('under')) return market.includes('total');
  if (wanted.includes('money') || wanted.includes('ml')) return market.includes('h2h') || market.includes('money');
  return true;
}

function eventMatchesRow(event, row) {
  const haystack = normalizeText([event.home_team, event.away_team, event.commence_time].join(' '));
  return matchupFound(haystack, row);
}

function outcomeMatchesPick(outcome, row) {
  const pick = normalizeText(row.pick);
  const outcomeText = normalizeText([outcome.name, outcome.description, outcome.point].join(' '));
  if (!pick) return false;
  if (pick.includes('over')) return outcomeText.includes('over');
  if (pick.includes('under')) return outcomeText.includes('under');
  return pick.split(' ').filter(Boolean).some(part => part.length > 2 && outcomeText.includes(part));
}

function matchupFound(text, row) {
  const game = normalizeText(row.game);
  if (!game) return false;
  const parts = game.split(/\s+(?:at|vs|v|@)\s+|[-/]/).map(part => part.trim()).filter(Boolean);
  if (parts.length >= 2) return parts.every(part => text.includes(part));
  return text.includes(game);
}

function marketFound(text, betType) {
  const market = normalizeText(betType);
  if (!market) return true;
  if (market.includes('spread')) return text.includes('spread') || text.includes('line');
  if (market.includes('total') || market.includes('over') || market.includes('under')) return text.includes('total') || text.includes('over') || text.includes('under');
  if (market.includes('money') || market === 'ml') return text.includes('moneyline') || text.includes('money line') || text.includes('h2h');
  return text.includes(market);
}

function dateFound(text, value) {
  const date = parseDate(value);
  if (!date) return false;
  const iso = date.toISOString().slice(0, 10);
  const month = String(date.getUTCMonth() + 1);
  const day = String(date.getUTCDate());
  const year = String(date.getUTCFullYear());
  return text.includes(iso) || text.includes(`${month}/${day}/${year}`) || text.includes(`${month}/${day}`);
}

function historicalDate(value) {
  const date = parseDate(value);
  if (!date) return '';
  date.setUTCHours(23, 55, 0, 0);
  return date.toISOString();
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function extractOddsNearPick(text, pick) {
  if (!pick) return '';
  const haystack = String(text || '');
  const index = normalizeText(haystack).indexOf(normalizeText(pick));
  if (index < 0) return '';
  return extractFirstAmericanOdds(haystack.slice(Math.max(0, index - 300), index + 600));
}

function extractFirstAmericanOdds(text) {
  const match = String(text || '').match(/(?:^|[\s(:,])([+-]\d{2,4})(?=$|[\s,).])/);
  return match ? match[1] : '';
}

function formatOdds(price, point) {
  const odds = Number(price);
  const prefix = odds > 0 ? '+' : '';
  const oddsText = Number.isFinite(odds) ? `${prefix}${odds}` : String(price || '');
  return point !== undefined && point !== null && point !== '' ? `${oddsText} (${point})` : oddsText;
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function buildRowKey(row) {
  return normalizeText([row.date, row.league || row.sport, row.game, row.pick, row.betType].join('|'));
}

function getByAliases(row, aliases) {
  for (const alias of aliases) {
    if (row[alias] !== undefined && row[alias] !== null && row[alias] !== '') return String(row[alias]).trim();
  }
  return '';
}

function needsLookup(value) {
  const text = normalizeText(value);
  return !text || text === normalizeText(NEEDS_LOOKUP) || !looksLikeClosingValue(value);
}

function hasMeaningfulClosing(value) {
  return Boolean(normalizeText(value)) && !needsLookup(value) && looksLikeClosingValue(value);
}

function looksLikeClosingValue(value) {
  const text = String(value || '').trim();
  if (!text) return false;
  if (/^(pk|pick|even|ev)$/i.test(text)) return true;
  return /[+-]?\d+(?:\.\d+)?/.test(text);
}

function findHeaderIndex(headers, aliases) {
  return headers.findIndex(header => aliases.includes(header));
}

function sameHeaders(a, b) {
  return a.length >= b.length && b.every((header, index) => a[index] === header);
}

function columnLetter(columnNumber) {
  let dividend = columnNumber;
  let columnName = '';
  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    dividend = Math.floor((dividend - modulo) / 26);
  }
  return columnName;
}

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9+.-]+/g, ' ').trim();
}

function base64Url(value) {
  return Buffer.from(value).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function requiredEnv(env, name) {
  if (!env[name]) throw new Error(`Missing required environment variable ${name}`);
  return env[name];
}

module.exports = {
  LOOKUP_HEADERS,
  NEEDS_LOOKUP,
  runClosingOddsWorker,
  createSheetsClient,
  lookupClosingOdds,
  normalizeArchiveRow,
  shouldLookupRow,
  buildRowKey
};
