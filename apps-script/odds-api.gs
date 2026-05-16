/* Micks Picks The Odds API runtime
 * Paste/deploy in the Apps Script project attached to the Micks Picks Data sheet.
 * Stores secrets only in Script Properties. Supported property names:
 * ODDS_API_KEY, THE_ODDS_API_KEY, THE_ODDS_API_KEY_V4, OPTICODDS_API_KEY.
 */

const MP_ODDS = {
  baseUrl: 'https://api.the-odds-api.com/v4',
  rawSheet: 'Raw Odds API Response',
  normalizedSheet: 'Normalized Odds API Rows',
  logSheet: 'Odds Sync Log',
  sports: [
    'basketball_nba',
    'basketball_wnba',
    'baseball_mlb',
    'americanfootball_nfl',
    'icehockey_nhl',
    'mma_mixed_martial_arts'
  ],
  markets: 'h2h,spreads,totals',
  regions: 'us,us2',
  oddsFormat: 'american',
  dateFormat: 'iso'
};

function pullOddsAPI() {
  ensureOddsRuntime_();
  const apiKey = getOddsApiKey_();
  const rawRows = [['Pulled At', 'Sport', 'HTTP Code', 'Raw Response Preview']];
  const normalizedRows = [[
    'Pulled At', 'Sport', 'League', 'Game', 'Home Team', 'Away Team', 'Start Time', 'Status',
    'Bookmaker', 'Market', 'Outcome', 'Price', 'Point', 'Event ID', 'Book Updated At', 'Odds Source'
  ]];
  let written = 0;

  MP_ODDS.sports.forEach(sport => {
    try {
      const result = fetchOddsSport_(sport, apiKey);
      rawRows.push([new Date(), sport, result.code, result.body.slice(0, 45000)]);
      if (result.code < 200 || result.code >= 300) {
        logOddsSync_('ERROR', sport, 'HTTP ' + result.code, result.body.slice(0, 240));
        return;
      }
      const events = JSON.parse(result.body || '[]');
      events.forEach(event => {
        const status = eventStatusFromStart_(event.commence_time);
        const game = `${event.away_team || ''} vs ${event.home_team || ''}`.trim();
        (event.bookmakers || []).forEach(book => {
          (book.markets || []).forEach(market => {
            (market.outcomes || []).forEach(outcome => {
              normalizedRows.push([
                new Date(),
                event.sport_key || sport,
                event.sport_title || sport,
                game,
                event.home_team || '',
                event.away_team || '',
                event.commence_time || '',
                status,
                book.title || book.key || '',
                market.key || '',
                marketOutcomeName_(market, outcome),
                outcome.price || '',
                outcome.point || '',
                event.id || '',
                book.last_update || market.last_update || '',
                'The Odds API'
              ]);
              written += 1;
            });
          });
        });
      });
      logOddsSync_('INFO', sport, 'OK', `${events.length} events normalized`);
    } catch (err) {
      rawRows.push([new Date(), sport, 'ERROR', err.message]);
      logOddsSync_('ERROR', sport, 'FAILED', err.message);
    }
  });

  writeSheet_(MP_ODDS.rawSheet, rawRows);
  writeSheet_(MP_ODDS.normalizedSheet, normalizedRows);
  logOddsSync_('COMPLETE', 'ALL', 'Odds pull finished', `${written} rows written`);
  return { rowsWritten: written };
}

function setupMicksPicksOddsTrigger() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction && trigger.getHandlerFunction() === 'pullOddsAPI') ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('pullOddsAPI').timeBased().everyMinutes(5).create();
  return pullOddsAPI();
}

function getOddsApiKey_() {
  const props = PropertiesService.getScriptProperties();
  const names = ['ODDS_API_KEY', 'THE_ODDS_API_KEY', 'THE_ODDS_API_KEY_V4', 'OPTICODDS_API_KEY'];
  for (let i = 0; i < names.length; i++) {
    const value = String(props.getProperty(names[i]) || '').trim();
    if (value && !/^your[_-]?api[_-]?key$/i.test(value)) return value;
  }
  throw new Error('Missing The Odds API key. Add ODDS_API_KEY in Apps Script Project Settings > Script Properties.');
}

function fetchOddsSport_(sport, apiKey) {
  const url = `${MP_ODDS.baseUrl}/sports/${encodeURIComponent(sport)}/odds/?apiKey=${encodeURIComponent(apiKey)}&regions=${encodeURIComponent(MP_ODDS.regions)}&markets=${encodeURIComponent(MP_ODDS.markets)}&oddsFormat=${encodeURIComponent(MP_ODDS.oddsFormat)}&dateFormat=${encodeURIComponent(MP_ODDS.dateFormat)}`;
  const res = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true });
  return { code: res.getResponseCode(), body: res.getContentText() };
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
