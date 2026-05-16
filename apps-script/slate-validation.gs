/* Micks Picks Slate Validation Module
 * Paste into the existing odds-api.io Apps Script project.
 * Depends on existing pullOddsAPI() when available.
 */

const MP_VALIDATION = {
  rawSheet: 'Raw Odds API Response',
  normalizedSheet: 'Normalized Odds API Rows',
  oddsSyncLog: 'Odds Sync Log',
  activePicks: 'Active Picks',
  websiteFeed: 'Website Feed',
  validationLog: 'Slate Validation Log',
  automationLog: 'Automation Log',
  cacheMinutes: 90,
  validStatuses: ['scheduled', 'live', 'in progress'],
  invalidStatuses: ['final', 'completed', 'unnecessary', 'canceled', 'cancelled', 'postponed']
};

function ensureSlateValidationRuntime() {
  const ss = SpreadsheetApp.getActive();
  [MP_VALIDATION.validationLog, MP_VALIDATION.automationLog].forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.appendRow(['Timestamp', 'Level', 'Action', 'Sheet', 'Row', 'Game', 'Market', 'Result', 'Reason']);
    }
  });
}

function logSlateValidation_(level, action, sheet, row, game, market, result, reason) {
  ensureSlateValidationRuntime();
  const values = [new Date(), level, action, sheet || '', row || '', game || '', market || '', result || '', reason || ''];
  SpreadsheetApp.getActive().getSheetByName(MP_VALIDATION.validationLog).appendRow(values);
  SpreadsheetApp.getActive().getSheetByName(MP_VALIDATION.automationLog).appendRow(values);
}

function normalizeKey_(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function headerIndex_(headers, names) {
  const normalized = headers.map(normalizeKey_);
  for (let i = 0; i < names.length; i++) {
    const needle = normalizeKey_(names[i]);
    const idx = normalized.indexOf(needle);
    if (idx >= 0) return idx;
  }
  return -1;
}

function getCellByAlias_(row, headers, aliases) {
  const idx = headerIndex_(headers, aliases);
  return idx >= 0 ? row[idx] : '';
}

function getNormalizedOddsRows_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(MP_VALIDATION.normalizedSheet);
  if (!sh || sh.getLastRow() < 2) throw new Error('Normalized Odds API Rows is missing or empty');
  const values = sh.getDataRange().getValues();
  const headers = values.shift().map(String);
  return values.map((row, i) => ({ rowNumber: i + 2, row, headers }));
}

function buildLiveSlateIndex_() {
  const index = {};
  getNormalizedOddsRows_().forEach(item => {
    const game = getCellByAlias_(item.row, item.headers, ['Game', 'Matchup', 'Event', 'Event Name', 'Name']);
    if (!game) return;
    index[normalizeKey_(game)] = {
      game: game,
      league: getCellByAlias_(item.row, item.headers, ['League', 'Sport League', 'Sport']),
      status: String(getCellByAlias_(item.row, item.headers, ['Status', 'Game Status', 'Event Status', 'State']) || '').toLowerCase(),
      updated: getCellByAlias_(item.row, item.headers, ['Updated', 'Last Updated', 'Timestamp', 'Pulled At', 'Sync Time']),
      rowNumber: item.rowNumber
    };
  });
  return index;
}

function isValidLiveStatus_(status) {
  const s = String(status || '').toLowerCase();
  return MP_VALIDATION.validStatuses.some(v => s.indexOf(v) !== -1) && !MP_VALIDATION.invalidStatuses.some(v => s.indexOf(v) !== -1);
}

function isStaleRow_(updated) {
  if (!updated) return false;
  const t = new Date(updated).getTime();
  if (!isFinite(t)) return false;
  return Date.now() - t > MP_VALIDATION.cacheMinutes * 60 * 1000;
}

function validateActiveSlate(game, league, date, market) {
  try {
    const index = buildLiveSlateIndex_();
    const live = index[normalizeKey_(game)];
    if (!live) return { ok: false, code: 'GAME_NOT_FOUND', reason: 'Game not found in live API feed' };
    if (isStaleRow_(live.updated)) return { ok: false, code: 'STALE_API_CACHE', reason: 'Live API cache is stale' };
    if (!isValidLiveStatus_(live.status)) return { ok: false, code: 'INVALID_STATUS', reason: 'Game status is ' + (live.status || 'unknown') };
    return { ok: true, code: 'OK', reason: 'Validated against live API feed', live: live };
  } catch (err) {
    logSlateValidation_('ERROR', 'validateActiveSlate', '', '', game, market, 'BLOCKED', err.message);
    return { ok: false, code: 'VALIDATION_UNAVAILABLE', reason: 'Slate validation unavailable' };
  }
}

function validateAndPullOddsAPI() {
  ensureSlateValidationRuntime();
  try {
    if (typeof pullOddsAPI === 'function') pullOddsAPI();
    logSlateValidation_('INFO', 'pullOddsAPI', MP_VALIDATION.rawSheet, '', '', '', 'OK', 'Odds pull completed');
    validateActivePicksAgainstLiveSlate();
  } catch (err) {
    logSlateValidation_('ERROR', 'pullOddsAPI', MP_VALIDATION.rawSheet, '', '', '', 'FAILED', err.message);
    throw err;
  }
}

function validateActivePicksAgainstLiveSlate() {
  ensureSlateValidationRuntime();
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(MP_VALIDATION.activePicks);
  if (!sh || sh.getLastRow() < 2) return;
  const archive = getOrCreateSheet_('Slate Removed Picks');
  const values = sh.getDataRange().getValues();
  const headers = values[0].map(String);
  if (archive.getLastRow() === 0) archive.appendRow(headers.concat(['Removed At', 'Validation Code', 'Validation Reason']));
  for (let r = values.length - 1; r >= 1; r--) {
    const row = values[r];
    const game = getCellByAlias_(row, headers, ['Game', 'Matchup', 'Event']);
    const league = getCellByAlias_(row, headers, ['League', 'Sport']);
    const date = getCellByAlias_(row, headers, ['Date', 'Posted Date', 'Pick Date']);
    const market = getCellByAlias_(row, headers, ['Market', 'Bet Type']);
    const result = validateActiveSlate(game, league, date, market);
    if (!result.ok) {
      archive.appendRow(row.concat([new Date(), result.code, result.reason]));
      sh.deleteRow(r + 1);
      logSlateValidation_('WARN', 'auto-remove-invalid-active-pick', MP_VALIDATION.activePicks, r + 1, game, market, 'REMOVED', result.reason);
    }
  }
}

function getOrCreateSheet_(name) {
  const ss = SpreadsheetApp.getActive();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function clearStaleApiCache() {
  CacheService.getScriptCache().removeAll(['odds_api_events', 'normalized_odds_rows', 'active_slate']);
  PropertiesService.getScriptProperties().deleteProperty('LAST_VALIDATED_SLATE_JSON');
  logSlateValidation_('INFO', 'clearStaleApiCache', '', '', '', '', 'OK', 'Cleared odds API cache keys');
}

function installSlateValidationTrigger() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction && trigger.getHandlerFunction() === 'validateAndPullOddsAPI') ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('validateAndPullOddsAPI').timeBased().everyMinutes(5).create();
  logSlateValidation_('INFO', 'install-trigger', '', '', '', '', 'OK', 'Installed 5-minute slate validation trigger');
}
