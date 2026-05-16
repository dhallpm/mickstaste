/* Micks Picks odds-api.io runtime
 * Paste/deploy in the Apps Script project attached to the Micks Picks Data sheet.
 * Stores secrets only in Script Properties. Preferred property name: ODDS_API_IO_KEY.
 * Fallbacks are accepted for compatibility: ODDS_API_KEY, THE_ODDS_API_KEY, THE_ODDS_API_KEY_V4.
 */

const MP_ODDS = {
  providerName: 'odds-api.io',
  baseUrl: 'https://api.odds-api.io/v3',
  rawSheet: 'Raw Odds API Response',
  normalizedSheet: 'Normalized Odds API Rows',
  logSheet: 'Odds Sync Log',
  sports: ['basketball', 'baseball', 'football', 'hockey', 'mma'],
  bookmakers: 'BetRivers,DraftKings,FanDuel,BetMGM,Caesars,ESPN BET',
  eventLimit: 100,
  propertyNames: ['ODDS_API_IO_KEY', 'ODDS_API_KEY', 'THE_ODDS_API_KEY', 'THE_ODDS_API_KEY_V4']
};

function pullOddsAPI() {
  ensureOddsRuntime_();
  const keyInfo = getOddsApiKeyInfo_();
  const apiKey = keyInfo.value;
  logOddsSync_('INFO', 'CONFIG', 'odds-api.io key loaded', keyInfo.publicSummary);

  const rawRows = [['Pulled At', 'Provider', 'Sport', 'HTTP Code', 'Raw Response Preview']];
  const normalizedRows = [[
    'Pulled At', 'Sport', 'League', 'Game', 'Home Team', 'Away Team', 'Start Time', 'Status',
    'Bookmaker', 'Market', 'Outcome', 'Price', 'Point', 'Event ID', 'Book Updated At', 'Odds Source'
  ]];
  let written = 0;
  let eventCount = 0;

  MP_ODDS.sports.forEach(sport => {
    try {
      const eventsResult = fetchOddsApiIoEvents_(sport, apiKey);
      rawRows.push([new Date(), MP_ODDS.providerName, sport, eventsResult.code, eventsResult.body.slice(0, 45000)]);
      if (eventsResult.code < 200 || eventsResult.code >= 300) {
        logOddsSync_('ERROR', sport, 'events HTTP ' + eventsResult.code, eventsResult.body.slice(0, 240));
        return;
      }

      const events = asArray_(JSON.parse(eventsResult.body || '[]'));
      eventCount += events.length;
      events.forEach(event => {
        const eventId = event.id || event.eventId || '';
        const base = normalizedBaseFromEvent_(event, sport);
        normalizedRows.push(base.concat(['', 'event', 'listed', '', '', eventId, '', MP_ODDS.providerName]));
        written += 1;

        if (!eventId) return;
        const oddsResult = fetchOddsApiIoOdds_(eventId, apiKey);
        if (oddsResult.code < 200 || oddsResult.code >= 300) {
          logOddsSync_('WARN', sport, 'odds HTTP ' + oddsResult.code + ' event=' + eventId, oddsResult.body.slice(0, 240));
          return;
        }
        const oddsPayload = JSON.parse(oddsResult.body || '{}');
        const flattened = flattenOddsApiIoOdds_(oddsPayload);
        flattened.forEach(odd => {
          normalizedRows.push(base.concat([
            odd.bookmaker,
            odd.market,
            odd.outcome,
            odd.price,
            odd.point,
            eventId,
            odd.updated,
            MP_ODDS.providerName
          ]));
          written += 1;
        });
      });
      logOddsSync_('INFO', sport, 'OK', `${events.length} events processed`);
    } catch (err) {
      rawRows.push([new Date(), MP_ODDS.providerName, sport, 'ERROR', err.message]);
      logOddsSync_('ERROR', sport, 'FAILED', err.message);
    }
  });

  writeSheet_(MP_ODDS.rawSheet, rawRows);
  writeSheet_(MP_ODDS.normalizedSheet, normalizedRows);
  logOddsSync_('COMPLETE', 'ALL', 'odds-api.io pull finished', `${eventCount} events, ${written} rows written`);
  return { provider: MP_ODDS.providerName, events: eventCount, rowsWritten: written };
}

function diagnoseOddsApiRuntime() {
  ensureOddsRuntime_();
  const summaries = MP_ODDS.propertyNames.map(name => {
    const raw = PropertiesService.getScriptProperties().getProperty(name);
    const value = String(raw || '').trim();
    return `${name}: ${value ? 'present length=' + value.length + ' mask=' + maskKey_(value) : 'missing'}`;
  });
  logOddsSync_('INFO', 'DIAGNOSTIC', 'Script property scan', summaries.join(' | '));
  try {
    const info = getOddsApiKeyInfo_();
    const url = `${MP_ODDS.baseUrl}/events?apiKey=${encodeURIComponent(info.value)}&sport=basketball&limit=1`;
    const res = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true });
    logOddsSync_('INFO', 'DIAGNOSTIC', 'odds-api.io events test HTTP ' + res.getResponseCode(), info.publicSummary + ' | body=' + res.getContentText().slice(0, 240));
    return { ok: res.getResponseCode() >= 200 && res.getResponseCode() < 300, status: res.getResponseCode(), key: info.publicSummary };
  } catch (err) {
    logOddsSync_('ERROR', 'DIAGNOSTIC', 'Runtime diagnostic failed', err.message);
    return { ok: false, error: err.message };
  }
}

function setupMicksPicksOddsTrigger() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction && trigger.getHandlerFunction() === 'pullOddsAPI') ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('pullOddsAPI').timeBased().everyMinutes(5).create();
  return pullOddsAPI();
}

function getOddsApiKey_() {
  return getOddsApiKeyInfo_().value;
}

function getOddsApiKeyInfo_() {
  const props = PropertiesService.getScriptProperties();
  for (let i = 0; i < MP_ODDS.propertyNames.length; i++) {
    const name = MP_ODDS.propertyNames[i];
    const value = String(props.getProperty(name) || '').trim();
    if (value && !/^your[_-]?api[_-]?key$/i.test(value)) {
      return { name, value, publicSummary: `${name} present length=${value.length} mask=${maskKey_(value)}` };
    }
  }
  throw new Error('Missing odds-api.io key. Add ODDS_API_IO_KEY in Apps Script Project Settings > Script Properties.');
}

function fetchOddsApiIoEvents_(sport, apiKey) {
  const now = new Date();
  const to = new Date(now.getTime() + 36 * 60 * 60 * 1000);
  const params = {
    apiKey,
    sport,
    status: 'pending,live',
    from: now.toISOString(),
    to: to.toISOString(),
    limit: MP_ODDS.eventLimit
  };
  const res = UrlFetchApp.fetch(MP_ODDS.baseUrl + '/events?' + queryString_(params), { method: 'get', muteHttpExceptions: true });
  return { code: res.getResponseCode(), body: res.getContentText() };
}

function fetchOddsApiIoOdds_(eventId, apiKey) {
  const params = { apiKey, eventId, bookmakers: MP_ODDS.bookmakers };
  const res = UrlFetchApp.fetch(MP_ODDS.baseUrl + '/odds?' + queryString_(params), { method: 'get', muteHttpExceptions: true });
  return { code: res.getResponseCode(), body: res.getContentText() };
}

function normalizedBaseFromEvent_(event, fallbackSport) {
  const sport = objectText_(event.sport, 'slug') || objectText_(event.sport, 'name') || fallbackSport;
  const league = objectText_(event.league, 'slug') || objectText_(event.league, 'name') || '';
  const home = event.home || event.homeTeam || event.home_team || '';
  const away = event.away || event.awayTeam || event.away_team || '';
  const game = `${away} vs ${home}`.trim();
  return [
    new Date(),
    sport,
    league,
    game,
    home,
    away,
    event.date || event.startTime || event.commence_time || '',
    normalizeOddsApiIoStatus_(event.status)
  ];
}

function flattenOddsApiIoOdds_(payload) {
  const rows = [];
  const books = payload.bookmakers || {};
  Object.keys(books).forEach(bookmaker => {
    const markets = asArray_(books[bookmaker]);
    markets.forEach(market => {
      const marketName = market.name || market.market || market.key || market.type || '';
      const updated = market.updatedAt || market.lastUpdate || market.timestamp || '';
      const odds = asArray_(market.odds || market.outcomes || market.prices || []);
      odds.forEach(outcome => {
        rows.push({
          bookmaker,
          market: marketName,
          outcome: outcome.name || outcome.selection || outcome.label || outcome.side || '',
          price: outcome.price || outcome.odds || outcome.american || outcome.home || outcome.away || outcome.draw || '',
          point: outcome.point || outcome.hdp || outcome.line || outcome.handicap || '',
          updated
        });
      });
    });
  });
  return rows;
}

function normalizeOddsApiIoStatus_(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'pending' || s === 'scheduled' || s === 'pre') return 'scheduled';
  if (s === 'live' || s === 'inplay' || s === 'in_play' || s === 'in progress') return 'live';
  if (s === 'settled' || s === 'final' || s === 'completed' || s === 'finished') return 'completed';
  if (s === 'cancelled' || s === 'canceled' || s === 'postponed') return s;
  return s || 'scheduled';
}

function queryString_(params) {
  return Object.keys(params).filter(k => params[k] !== '' && params[k] != null).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
}

function asArray_(value) {
  return Array.isArray(value) ? value : [];
}

function objectText_(value, key) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return String(value[key] || '');
}

function maskKey_(value) {
  const v = String(value || '');
  if (v.length <= 8) return '***';
  return v.slice(0, 4) + '...' + v.slice(-4);
}

function ensureOddsRuntime_() {
  getOrCreateSheetByName_(MP_ODDS.rawSheet);
  getOrCreateSheetByName_(MP_ODDS.normalizedSheet);
  const log = getOrCreateSheetByName_(MP_ODDS.logSheet);
  if (log.getLastRow() === 0) log.appendRow(['Timestamp', 'Level', 'Sport', 'Message', 'Details']);
}

function writeSheet_(name, rows) {
  const sh = getOrCreateSheetByName_(name);
  sh.clearContents();
  if (rows.length) sh.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
}

function getOrCreateSheetByName_(name) {
  const ss = SpreadsheetApp.getActive();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function logOddsSync_(level, sport, message, details) {
  const sh = getOrCreateSheetByName_(MP_ODDS.logSheet);
  if (sh.getLastRow() === 0) sh.appendRow(['Timestamp', 'Level', 'Sport', 'Message', 'Details']);
  sh.appendRow([new Date(), level, sport || '', message || '', details || '']);
}
