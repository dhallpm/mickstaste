/* Micks Picks odds runtime
 * Primary provider: odds-api.io.
 * Fallback provider: The Odds API v4.
 * Store secrets only in Apps Script Properties.
 * Preferred keys: ODDS_API_IO_KEY for primary and THE_ODDS_API_KEY/ODDS_API_KEY for fallback.
 */

const MP_ODDS = {
  primary: {
    providerName: 'odds-api.io',
    baseUrl: 'https://api.odds-api.io/v3',
    sports: ['basketball', 'baseball', 'football', 'hockey', 'mma'],
    bookmakers: 'BetRivers,DraftKings,FanDuel,BetMGM,Caesars',
    eventLimit: 100,
    pullEventOdds: false,
    maxOddsEventsPerSport: 0,
    propertyNames: ['ODDS_API_IO_KEY']
  },
  fallback: {
    providerName: 'The Odds API',
    baseUrl: 'https://api.the-odds-api.com/v4',
    sports: ['basketball_nba', 'basketball_wnba', 'baseball_mlb', 'americanfootball_nfl', 'icehockey_nhl', 'mma_mixed_martial_arts'],
    markets: 'h2h,spreads,totals',
    regions: 'us,us2',
    oddsFormat: 'american',
    dateFormat: 'iso',
    propertyNames: ['THE_ODDS_API_KEY', 'THE_ODDS_API_KEY_V4', 'ODDS_API_FALLBACK_KEY', 'ODDS_API_KEY']
  },
  rawSheet: 'Raw Odds API Response',
  normalizedSheet: 'Normalized Odds API Rows',
  logSheet: 'Odds Sync Log'
};

function pullOddsAPI() {
  ensureOddsRuntime_();
  const rawRows = [['Pulled At', 'Provider', 'Sport', 'HTTP Code', 'Raw Response Preview']];
  const normalizedRows = normalizedHeader_();

  const primary = pullOddsApiIo_(rawRows, normalizedRows);
  if (primary.events > 0) {
    writeSheet_(MP_ODDS.rawSheet, rawRows);
    writeSheet_(MP_ODDS.normalizedSheet, normalizedRows);
    logOddsSync_('COMPLETE', 'ALL', 'odds-api.io primary slate validation pull finished', `${primary.events} events, ${primary.rowsWritten - 1} rows written, ${primary.oddsCalls} odds calls`);
    return { provider: MP_ODDS.primary.providerName, events: primary.events, rowsWritten: primary.rowsWritten - 1, oddsCalls: primary.oddsCalls };
  }

  logOddsSync_('WARN', 'FALLBACK', 'Primary odds-api.io produced no live slate rows', primary.reason || 'Trying The Odds API fallback');
  const fallback = pullTheOddsApiFallback_(rawRows, normalizedRows);
  writeSheet_(MP_ODDS.rawSheet, rawRows);
  writeSheet_(MP_ODDS.normalizedSheet, normalizedRows);
  logOddsSync_('COMPLETE', 'ALL', 'odds pull finished', `${fallback.provider} fallback: ${fallback.events} events, ${fallback.rowsWritten - 1} data rows written`);
  return { provider: fallback.provider, events: fallback.events, rowsWritten: fallback.rowsWritten - 1 };
}

function diagnoseOddsApiRuntime() {
  ensureOddsRuntime_();
  const primarySummary = propertyScan_(MP_ODDS.primary.propertyNames);
  const fallbackSummary = propertyScan_(MP_ODDS.fallback.propertyNames);
  logOddsSync_('INFO', 'DIAGNOSTIC', 'Primary odds-api.io property scan', primarySummary);
  logOddsSync_('INFO', 'DIAGNOSTIC', 'Fallback The Odds API property scan', fallbackSummary);
  const results = [];
  results.push(testProviderKey_('PRIMARY', MP_ODDS.primary, url => url + '/events'));
  results.push(testProviderKey_('FALLBACK', MP_ODDS.fallback, url => url + '/sports'));
  return results;
}

function setupMicksPicksOddsTrigger() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction && trigger.getHandlerFunction() === 'pullOddsAPI') ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('pullOddsAPI').timeBased().everyMinutes(5).create();
  return pullOddsAPI();
}

function pullOddsApiIo_(rawRows, normalizedRows) {
  let keyInfo;
  try {
    keyInfo = getProviderKeyInfo_(MP_ODDS.primary);
    logOddsSync_('INFO', 'CONFIG', 'odds-api.io key loaded', keyInfo.publicSummary);
  } catch (err) {
    logOddsSync_('ERROR', 'CONFIG', 'odds-api.io key missing', err.message);
    return { events: 0, rowsWritten: normalizedRows.length, oddsCalls: 0, reason: err.message };
  }

  let eventCount = 0;
  let oddsCalls = 0;
  MP_ODDS.primary.sports.forEach(sport => {
    try {
      const eventsResult = fetchOddsApiIoEvents_(sport, keyInfo.value);
      rawRows.push([new Date(), MP_ODDS.primary.providerName, sport, eventsResult.code, eventsResult.body.slice(0, 45000)]);
      if (eventsResult.code < 200 || eventsResult.code >= 300) {
        logOddsSync_('ERROR', sport, 'odds-api.io events HTTP ' + eventsResult.code, eventsResult.body.slice(0, 240));
        return;
      }

      const events = asArray_(JSON.parse(eventsResult.body || '[]'));
      eventCount += events.length;
      let sportOddsCalls = 0;
      events.forEach(event => {
        const eventId = event.id || event.eventId || '';
        const base = normalizedBaseFromOddsApiIoEvent_(event, sport);
        normalizedRows.push(base.concat(['', 'event', 'listed', '', '', eventId, '', MP_ODDS.primary.providerName]));

        if (!shouldPullOddsForEvent_(eventId, sportOddsCalls)) return;
        sportOddsCalls++;
        oddsCalls++;
        const oddsResult = fetchOddsApiIoOdds_(eventId, keyInfo.value);
        rawRows.push([new Date(), MP_ODDS.primary.providerName, sport + ' odds ' + eventId, oddsResult.code, oddsResult.body.slice(0, 45000)]);
        if (oddsResult.code < 200 || oddsResult.code >= 300) {
          logOddsSync_('WARN', sport, 'odds-api.io odds HTTP ' + oddsResult.code + ' event=' + eventId, oddsResult.body.slice(0, 240));
          return;
        }
        flattenOddsApiIoOdds_(JSON.parse(oddsResult.body || '{}')).forEach(odd => {
          normalizedRows.push(base.concat([odd.bookmaker, odd.market, odd.outcome, odd.price, odd.point, eventId, odd.updated, MP_ODDS.primary.providerName]));
        });
      });
      logOddsSync_('INFO', sport, 'odds-api.io OK', `${events.length} events listed, ${sportOddsCalls} odds calls`);
    } catch (err) {
      rawRows.push([new Date(), MP_ODDS.primary.providerName, sport, 'ERROR', err.message]);
      logOddsSync_('ERROR', sport, 'odds-api.io FAILED', err.message);
    }
  });
  return { provider: MP_ODDS.primary.providerName, events: eventCount, rowsWritten: normalizedRows.length, oddsCalls };
}

function shouldPullOddsForEvent_(eventId, sportOddsCalls) {
  if (!eventId || !MP_ODDS.primary.pullEventOdds) return false;
  return sportOddsCalls < MP_ODDS.primary.maxOddsEventsPerSport;
}

function pullTheOddsApiFallback_(rawRows, normalizedRows) {
  let keyInfo;
  try {
    keyInfo = getProviderKeyInfo_(MP_ODDS.fallback);
    logOddsSync_('INFO', 'CONFIG', 'The Odds API fallback key loaded', keyInfo.publicSummary);
  } catch (err) {
    logOddsSync_('ERROR', 'CONFIG', 'The Odds API fallback key missing', err.message);
    return { provider: MP_ODDS.fallback.providerName, events: 0, rowsWritten: normalizedRows.length };
  }

  let eventCount = 0;
  MP_ODDS.fallback.sports.forEach(sport => {
    try {
      const result = fetchTheOddsApiSport_(sport, keyInfo.value);
      rawRows.push([new Date(), MP_ODDS.fallback.providerName, sport, result.code, result.body.slice(0, 45000)]);
      if (result.code < 200 || result.code >= 300) {
        logOddsSync_('ERROR', sport, 'The Odds API HTTP ' + result.code, result.body.slice(0, 240));
        return;
      }
      const events = asArray_(JSON.parse(result.body || '[]'));
      eventCount += events.length;
      events.forEach(event => {
        const base = normalizedBaseFromTheOddsApiEvent_(event, sport);
        (event.bookmakers || []).forEach(book => {
          (book.markets || []).forEach(market => {
            (market.outcomes || []).forEach(outcome => {
              normalizedRows.push(base.concat([
                book.title || book.key || '',
                market.key || '',
                marketOutcomeName_(market, outcome),
                outcome.price || '',
                outcome.point || '',
                event.id || '',
                book.last_update || market.last_update || '',
                MP_ODDS.fallback.providerName
              ]));
            });
          });
        });
      });
      logOddsSync_('INFO', sport, 'The Odds API fallback OK', `${events.length} events normalized`);
    } catch (err) {
      rawRows.push([new Date(), MP_ODDS.fallback.providerName, sport, 'ERROR', err.message]);
      logOddsSync_('ERROR', sport, 'The Odds API fallback FAILED', err.message);
    }
  });
  return { provider: MP_ODDS.fallback.providerName, events: eventCount, rowsWritten: normalizedRows.length };
}

function normalizedHeader_() {
  return [[
    'Pulled At', 'Sport', 'League', 'Game', 'Home Team', 'Away Team', 'Start Time', 'Status',
    'Bookmaker', 'Market', 'Outcome', 'Price', 'Point', 'Event ID', 'Book Updated At', 'Odds Source'
  ]];
}

function fetchOddsApiIoEvents_(sport, apiKey) {
  const now = new Date();
  const to = new Date(now.getTime() + 36 * 60 * 60 * 1000);
  const params = { apiKey, sport, status: 'pending,live', from: now.toISOString(), to: to.toISOString(), limit: MP_ODDS.primary.eventLimit };
  const res = UrlFetchApp.fetch(MP_ODDS.primary.baseUrl + '/events?' + queryString_(params), { method: 'get', muteHttpExceptions: true });
  return { code: res.getResponseCode(), body: res.getContentText() };
}

function fetchOddsApiIoOdds_(eventId, apiKey) {
  const params = { apiKey, eventId, bookmakers: MP_ODDS.primary.bookmakers };
  const res = UrlFetchApp.fetch(MP_ODDS.primary.baseUrl + '/odds?' + queryString_(params), { method: 'get', muteHttpExceptions: true });
  return { code: res.getResponseCode(), body: res.getContentText() };
}

function fetchTheOddsApiSport_(sport, apiKey) {
  const params = { apiKey, regions: MP_ODDS.fallback.regions, markets: MP_ODDS.fallback.markets, oddsFormat: MP_ODDS.fallback.oddsFormat, dateFormat: MP_ODDS.fallback.dateFormat };
  const url = `${MP_ODDS.fallback.baseUrl}/sports/${encodeURIComponent(sport)}/odds/?${queryString_(params)}`;
  const res = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true });
  return { code: res.getResponseCode(), body: res.getContentText() };
}

function normalizedBaseFromOddsApiIoEvent_(event, fallbackSport) {
  const sport = objectText_(event.sport, 'slug') || objectText_(event.sport, 'name') || fallbackSport;
  const league = objectText_(event.league, 'slug') || objectText_(event.league, 'name') || '';
  const home = event.home || event.homeTeam || event.home_team || '';
  const away = event.away || event.awayTeam || event.away_team || '';
  const game = `${away} vs ${home}`.trim();
  return [new Date(), sport, league, game, home, away, event.date || event.startTime || event.commence_time || '', normalizeOddsApiIoStatus_(event.status)];
}

function normalizedBaseFromTheOddsApiEvent_(event, fallbackSport) {
  const home = event.home_team || '';
  const away = event.away_team || '';
  const game = `${away} vs ${home}`.trim();
  return [new Date(), event.sport_key || fallbackSport, event.sport_title || fallbackSport, game, home, away, event.commence_time || '', eventStatusFromStart_(event.commence_time)];
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

function getProviderKeyInfo_(provider) {
  const props = PropertiesService.getScriptProperties();
  for (let i = 0; i < provider.propertyNames.length; i++) {
    const name = provider.propertyNames[i];
    const value = String(props.getProperty(name) || '').trim();
    if (value && !/^your[_-]?api[_-]?key$/i.test(value)) {
      return { name, value, publicSummary: `${name} present length=${value.length} mask=${maskKey_(value)}` };
    }
  }
  throw new Error(`Missing ${provider.providerName} key. Checked: ${provider.propertyNames.join(', ')}`);
}

function propertyScan_(names) {
  return names.map(name => {
    const raw = PropertiesService.getScriptProperties().getProperty(name);
    const value = String(raw || '').trim();
    return `${name}: ${value ? 'present length=' + value.length + ' mask=' + maskKey_(value) : 'missing'}`;
  }).join(' | ');
}

function testProviderKey_(label, provider, endpointBuilder) {
  try {
    const info = getProviderKeyInfo_(provider);
    const url = endpointBuilder(provider.baseUrl) + '?' + queryString_({ apiKey: info.value, sport: provider.sports[0], limit: 1 });
    const res = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true });
    logOddsSync_('INFO', 'DIAGNOSTIC', `${label} ${provider.providerName} test HTTP ${res.getResponseCode()}`, info.publicSummary + ' | body=' + res.getContentText().slice(0, 240));
    return { provider: provider.providerName, ok: res.getResponseCode() >= 200 && res.getResponseCode() < 300, status: res.getResponseCode() };
  } catch (err) {
    logOddsSync_('ERROR', 'DIAGNOSTIC', `${label} ${provider.providerName} diagnostic failed`, err.message);
    return { provider: provider.providerName, ok: false, error: err.message };
  }
}

function normalizeOddsApiIoStatus_(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'pending' || s === 'scheduled' || s === 'pre') return 'scheduled';
  if (s === 'live' || s === 'inplay' || s === 'in_play' || s === 'in progress') return 'live';
  if (s === 'settled' || s === 'final' || s === 'completed' || s === 'finished') return 'completed';
  if (s === 'cancelled' || s === 'canceled' || s === 'postponed') return s;
  return s || 'scheduled';
}

function eventStatusFromStart_(start) {
  const t = new Date(start).getTime();
  if (!isFinite(t)) return 'scheduled';
  const diffMinutes = (t - Date.now()) / 60000;
  if (diffMinutes > 0) return 'scheduled';
  if (diffMinutes > -360) return 'live';
  return 'completed';
}

function marketOutcomeName_(market, outcome) {
  const name = String(outcome.name || '');
  if (outcome.point === '' || outcome.point == null) return name;
  if (market.key === 'spreads') return `${name} ${outcome.point}`;
  if (market.key === 'totals') return `${name} ${outcome.point}`;
  return name;
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
