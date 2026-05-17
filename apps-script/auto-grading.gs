/* Micks Picks automatic grading engine
 * Uses final score API data plus optional manual result overrides.
 * Install this file into the same Apps Script project as odds-api.gs.
 */

const MP_GRADING = {
  spreadsheetTimeZone: 'America/New_York',
  sourceTabs: [
    { name: 'Active Picks', archive: 'Results Archive', removeAfterGrade: true, kind: 'core' },
    { name: 'Props Lab', archive: 'Props Results', removeAfterGrade: true, kind: 'props', optional: true },
    { name: 'Lotto Props', archive: 'Props Results', removeAfterGrade: true, kind: 'props' },
    { name: 'Micks LongShots', archive: 'Longshots History', removeAfterGrade: true, kind: 'longshots' }
  ],
  finalResultsSheet: 'Final Results Feed',
  manualResultsSheet: 'Manual Grading Results',
  gradingLogSheet: 'Grading Log',
  automationLogSheet: 'Micks Picks Automation Log',
  websiteFeedSheet: 'Website Feed',
  duplicateWindowDays: 14,
  scoreDaysFrom: 3,
  retryAttempts: 2,
  retrySleepMs: 800,
  finalSports: ['basketball_nba', 'basketball_wnba', 'baseball_mlb', 'americanfootball_nfl', 'icehockey_nhl', 'mma_mixed_martial_arts']
};

function runMicksPicksAutoGrading() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) {
    mpLogGrading_('WARN', 'LOCKED', '', '', 'Auto grading skipped because another grading run is active');
    return { ok: false, skipped: true, reason: 'lock active' };
  }

  try {
    mpEnsureGradingRuntime_();
    const finalResults = mpPullFinalResults_();
    const manualResults = mpReadManualResults_();
    const gradedKeys = mpExistingGradedKeys_();
    const summary = { checked: 0, graded: 0, skipped: 0, archived: 0, removed: 0, errors: 0 };

    MP_GRADING.sourceTabs.forEach(config => {
      const sheet = mpSheet_(config.name, config.optional);
      if (!sheet) {
        mpLogGrading_('INFO', 'OPTIONAL_SOURCE_MISSING', config.name, '', `${config.name} does not exist; skipped`);
        return;
      }

      mpEnsureColumns_(sheet, ['Status', 'Result', 'Profit/Loss', 'Closing Number', 'Graded Timestamp']);
      const table = mpReadTable_(sheet);
      if (!table.rows.length) return;

      const keepRows = [];
      table.rows.forEach(row => {
        summary.checked++;
        try {
          if (!mpHasPick_(row) || mpAlreadyGraded_(row)) {
            keepRows.push(row._values);
            summary.skipped++;
            return;
          }

          const key = mpPickKey_(row);
          if (gradedKeys.has(key)) {
            mpApplyGradeToRow_(row, table.headers, {
              result: 'Void',
              status: 'Duplicate - Already Graded',
              profitLoss: '0.00u',
              closingNumber: mpCell_(row, 'Closing Number') || mpCell_(row, 'Best Number') || '',
              note: 'Duplicate grading prevented by archive key.'
            });
            mpLogGrading_('WARN', 'DUPLICATE_PREVENTED', config.name, mpCell_(row, 'Pick'), key);
            keepRows.push(row._values);
            summary.skipped++;
            return;
          }

          const grade = mpGradeRow_(row, finalResults, manualResults, config);
          if (!grade || grade.result === 'Pending') {
            keepRows.push(row._values);
            summary.skipped++;
            return;
          }

          mpApplyGradeToRow_(row, table.headers, grade);
          mpAppendToArchive_(config.archive, table.headers, row._values);
          gradedKeys.add(key);
          summary.graded++;
          summary.archived++;

          if (!config.removeAfterGrade) keepRows.push(row._values);
          else summary.removed++;

          mpLogGrading_('INFO', 'GRADED', config.name, mpCell_(row, 'Pick'), `${grade.result} | ${grade.profitLoss || ''} | ${grade.note || ''}`);
        } catch (err) {
          keepRows.push(row._values);
          summary.errors++;
          mpLogGrading_('ERROR', 'ROW_ERROR', config.name, mpCell_(row, 'Pick'), err.message);
        }
      });

      if (config.removeAfterGrade) mpRewriteDataRows_(sheet, table.headers, keepRows);
    });

    mpRefreshWebsiteFeed_();
    mpLogAutomation_('Auto Grading', 'Completed', `Checked=${summary.checked}; Graded=${summary.graded}; Archived=${summary.archived}; Removed=${summary.removed}; Errors=${summary.errors}`);
    return { ok: true, finalResults: finalResults.length, summary };
  } catch (err) {
    mpLogGrading_('ERROR', 'RUN_FAILED', '', '', err.stack || err.message);
    mpLogAutomation_('Auto Grading', 'Failed', err.message);
    throw err;
  } finally {
    lock.releaseLock();
  }
}

function setupMicksPicksAutomationTriggers() {
  const handlers = ['pullOddsAPI', 'runMicksPicksAutoConfirm', 'runMicksPicksAutoGrading'];
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction && handlers.indexOf(trigger.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('pullOddsAPI').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('runMicksPicksAutoConfirm').timeBased().everyMinutes(10).create();
  ScriptApp.newTrigger('runMicksPicksAutoGrading').timeBased().everyMinutes(15).create();
  mpLogAutomation_('Automation Triggers', 'Installed', 'pullOddsAPI every 5 min; auto-confirm every 10 min; auto-grading every 15 min');
  return { ok: true, triggers: handlers };
}

function runMicksPicksAutoConfirm() {
  if (typeof autoConfirmActivePicks === 'function') return autoConfirmActivePicks();
  if (typeof runAutoConfirmEngine === 'function') return runAutoConfirmEngine();
  if (typeof runMicksPicksAutoConfirmation === 'function') return runMicksPicksAutoConfirmation();
  mpLogAutomation_('Auto Confirm', 'Skipped', 'No auto-confirm implementation found in this Apps Script project');
  return { ok: false, skipped: true, reason: 'No auto-confirm implementation found' };
}

function mpPullFinalResults_() {
  const rows = [[
    'Pulled At', 'Sport', 'League', 'Game', 'Home Team', 'Away Team', 'Start Time', 'Completed',
    'Home Score', 'Away Score', 'Winner', 'Event ID', 'Source', 'Raw Status'
  ]];
  const keyInfo = mpGetFallbackKey_();
  if (!keyInfo) {
    mpLogGrading_('ERROR', 'API_KEY_MISSING', '', '', 'Missing The Odds API key for final scores');
    mpWriteRows_(MP_GRADING.finalResultsSheet, rows);
    return [];
  }

  MP_GRADING.finalSports.forEach(sport => {
    try {
      const url = `${MP_ODDS.fallback.baseUrl}/sports/${encodeURIComponent(sport)}/scores/?${queryString_({ apiKey: keyInfo.value, daysFrom: MP_GRADING.scoreDaysFrom, dateFormat: 'iso' })}`;
      const response = mpFetchWithRetry_(url);
      if (response.code < 200 || response.code >= 300) {
        mpLogGrading_('ERROR', 'SCORES_HTTP_' + response.code, sport, '', response.body.slice(0, 300));
        return;
      }
      JSON.parse(response.body || '[]').forEach(event => {
        const home = event.home_team || '';
        const away = event.away_team || '';
        const scoreMap = mpScoreMap_(event.scores || []);
        const homeScore = scoreMap[mpTeamKey_(home)];
        const awayScore = scoreMap[mpTeamKey_(away)];
        const completed = event.completed === true || String(event.completed).toLowerCase() === 'true';
        const winner = completed && isFinite(homeScore) && isFinite(awayScore)
          ? (homeScore > awayScore ? home : awayScore > homeScore ? away : 'Push')
          : '';
        rows.push([new Date(), event.sport_key || sport, event.sport_title || sport, `${away} vs ${home}`, home, away, event.commence_time || '', completed ? 'TRUE' : 'FALSE', homeScore ?? '', awayScore ?? '', winner, event.id || '', 'The Odds API scores', event.completed || '']);
      });
    } catch (err) {
      mpLogGrading_('ERROR', 'SCORES_FETCH_FAILED', sport, '', err.message);
    }
  });

  mpWriteRows_(MP_GRADING.finalResultsSheet, rows);
  return mpRowsToObjects_(rows).filter(row => mpCell_(row, 'Completed') === 'TRUE');
}

function mpGradeRow_(row, finalResults, manualResults, config) {
  const manual = mpFindManualResult_(row, manualResults);
  if (manual) return mpGradeFromManual_(row, manual);

  if (config.kind === 'longshots' || mpIsParlay_(row)) return mpGradeParlay_(row, finalResults, manualResults);
  if (mpIsPropMarket_(row)) return mpGradeProp_(row, finalResults);

  const result = mpFindGameResult_(row, finalResults);
  if (!result) return mpPending_('No completed API result matched game/date');

  const betType = mpClean_(`${mpCell_(row, 'Bet Type')} ${mpCell_(row, 'LongShot Type')} ${mpCell_(row, 'Prop Type')}`);
  const pick = mpCell_(row, 'Pick');
  let outcome = 'Pending';

  if (betType.includes('moneyline') || /\bml\b/i.test(pick)) outcome = mpGradeMoneyline_(pick, result);
  else if (betType.includes('spread') || betType.includes('run line') || betType.includes('puck line') || mpHasSpreadLine_(pick)) outcome = mpGradeSpread_(pick, result);
  else if (betType.includes('total') || mpHasTotalLine_(pick)) outcome = mpGradeTotal_(pick, result);
  else outcome = mpPending_('Unsupported non-prop market type');

  if (outcome === 'Pending') return mpPending_('Game result found, but market could not be interpreted safely');
  return mpGradePayload_(row, outcome, result.closingNumber || '', 'Auto graded from final score API');
}

function mpGradeProp_(row, finalResults) {
  const pick = mpClean_(mpCell_(row, 'Pick'));
  const type = mpClean_(`${mpCell_(row, 'Bet Type')} ${mpCell_(row, 'Prop Type')} ${mpCell_(row, 'LongShot Type')}`);
  const gameResult = mpFindGameResult_(row, finalResults);

  if ((type.includes('hr') || pick.includes('home run')) && gameResult) {
    return mpPending_('HR prop needs player stat feed or Manual Grading Results override');
  }
  if (type.includes('fight') || type.includes('ufc') || pick.includes('round') || pick.includes('distance')) {
    return mpPending_('UFC prop needs fight method/round feed or Manual Grading Results override');
  }
  return mpPending_('Player prop needs player stat feed or Manual Grading Results override');
}

function mpGradeParlay_(row, finalResults, manualResults) {
  const legs = mpLegs_(mpCell_(row, 'Legs'));
  if (!legs.length) return mpPending_('No parlay legs found');

  const outcomes = legs.map(leg => {
    const legRow = mpCloneRowWithPick_(row, leg);
    const manual = mpFindManualResult_(legRow, manualResults);
    if (manual) return mpGradeFromManual_(legRow, manual).result;
    const result = mpFindGameResult_(legRow, finalResults) || mpFindGameResult_(row, finalResults);
    if (!result) return 'Pending';
    if (mpHasTotalLine_(leg)) return mpGradeTotal_(leg, result);
    if (mpHasSpreadLine_(leg)) return mpGradeSpread_(leg, result);
    if (/\bml\b|moneyline/i.test(leg)) return mpGradeMoneyline_(leg, result);
    return 'Pending';
  });

  if (outcomes.some(result => result === 'Loss')) return mpGradePayload_(row, 'Loss', '', 'Parlay graded: at least one leg lost');
  if (outcomes.every(result => result === 'Win' || result === 'Push' || result === 'Void')) {
    if (outcomes.every(result => result === 'Push' || result === 'Void')) return mpGradePayload_(row, 'Void', '', 'Parlay graded: all legs void/push');
    return mpGradePayload_(row, 'Win', '', 'Parlay graded: all resolved legs won or pushed');
  }
  return mpPending_('Parlay has unresolved legs: ' + outcomes.join(', '));
}

function mpGradeMoneyline_(pick, result) {
  const selected = mpSelectedTeam_(pick, result);
  if (!selected || !result.winner || result.winner === 'Push') return 'Pending';
  return mpTeamKey_(selected) === mpTeamKey_(result.winner) ? 'Win' : 'Loss';
}

function mpGradeSpread_(pick, result) {
  const line = mpExtractSignedLine_(pick);
  const selected = mpSelectedTeam_(pick, result);
  if (!selected || !isFinite(line)) return 'Pending';
  const selectedIsHome = mpTeamKey_(selected) === mpTeamKey_(result.homeTeam);
  const selectedScore = selectedIsHome ? Number(result.homeScore) : Number(result.awayScore);
  const opponentScore = selectedIsHome ? Number(result.awayScore) : Number(result.homeScore);
  const margin = selectedScore + line - opponentScore;
  return margin > 0 ? 'Win' : margin < 0 ? 'Loss' : 'Push';
}

function mpGradeTotal_(pick, result) {
  const total = mpExtractTotal_(pick);
  const text = mpClean_(pick);
  if (!isFinite(total)) return 'Pending';
  const actual = Number(result.homeScore) + Number(result.awayScore);
  if (text.includes('over')) return actual > total ? 'Win' : actual < total ? 'Loss' : 'Push';
  if (text.includes('under')) return actual < total ? 'Win' : actual > total ? 'Loss' : 'Push';
  return 'Pending';
}

function mpGradePayload_(row, result, closingNumber, note) {
  return {
    result,
    status: 'Graded - ' + result,
    profitLoss: mpProfitLoss_(row, result),
    closingNumber: closingNumber || mpCell_(row, 'Closing Number') || mpCell_(row, 'Best Market Price') || mpCell_(row, 'Best Number') || '',
    note: note || ''
  };
}

function mpGradeFromManual_(row, manual) {
  const result = mpNormalizeResult_(mpCell_(manual, 'Result'));
  return {
    result,
    status: 'Graded - ' + result,
    profitLoss: mpCell_(manual, 'Profit/Loss') || mpProfitLoss_(row, result),
    closingNumber: mpCell_(manual, 'Closing Number') || mpCell_(manual, 'Closing Line') || mpCell_(row, 'Closing Number') || '',
    note: mpCell_(manual, 'Settlement Notes') || mpCell_(manual, 'Source') || 'Manual Grading Results override'
  };
}

function mpProfitLoss_(row, result) {
  const units = mpNumber_(mpCell_(row, 'Units'));
  if (!units) return '';
  if (result === 'Loss') return (-units).toFixed(2) + 'u';
  if (result === 'Push' || result === 'Void') return '0.00u';
  if (result !== 'Win') return '';
  const odds = mpAmericanOdds_(mpCell_(row, 'Odds'));
  if (!isFinite(odds)) return units.toFixed(2) + 'u';
  const profit = odds > 0 ? units * odds / 100 : units * 100 / Math.abs(odds);
  return profit.toFixed(2) + 'u';
}

function mpPending_(note) {
  return { result: 'Pending', status: 'Pending', note: note || '' };
}

function mpExistingGradedKeys_() {
  const sheets = ['Results Archive', 'Props Results', 'Longshots History'];
  const keys = new Set();
  sheets.forEach(name => {
    const sheet = mpSheet_(name, true);
    if (!sheet) return;
    mpReadTable_(sheet).rows.forEach(row => {
      if (mpAlreadyGraded_(row) || mpCell_(row, 'Result')) keys.add(mpPickKey_(row));
    });
  });
  return keys;
}

function mpAppendToArchive_(archiveName, sourceHeaders, values) {
  const archive = mpSheet_(archiveName, false);
  if (archive.getLastRow() === 0) archive.appendRow(sourceHeaders);
  mpEnsureColumns_(archive, ['Status', 'Result', 'Profit/Loss', 'Closing Number', 'Graded Timestamp']);
  const archiveHeaders = mpReadHeaders_(archive);
  const sourceMap = mpHeaderMap_(sourceHeaders);
  const row = archiveHeaders.map(header => {
    const idx = sourceMap[mpNorm_(header)];
    return idx == null ? '' : values[idx];
  });
  archive.appendRow(row);
}

function mpRefreshWebsiteFeed_() {
  const active = mpSheet_('Active Picks', true);
  const feed = mpSheet_(MP_GRADING.websiteFeedSheet, false);
  const headers = ['Date','Sport','League','Game','Pick','Bet Type','Odds','Sportsbook','Grade','Units','Writeup','Access','Featured','Status','Release Status','Posted Time','Framework Tags','Edge Durability','Market Notes','Timestamp'];
  const rows = [headers];
  if (active) {
    mpReadTable_(active).rows.forEach(row => {
      const release = mpClean_(mpCell_(row, 'Release Status'));
      if (!mpHasPick_(row) || mpAlreadyGraded_(row) || (release && !release.includes('released'))) return;
      rows.push(headers.map(header => mpCell_(row, header)));
    });
  }
  mpWriteRows_(MP_GRADING.websiteFeedSheet, rows);
}

function mpApplyGradeToRow_(row, headers, grade) {
  mpSetCell_(row, headers, 'Status', grade.status || ('Graded - ' + grade.result));
  mpSetCell_(row, headers, 'Result', grade.result);
  mpSetCell_(row, headers, 'Profit/Loss', grade.profitLoss || '');
  mpSetCell_(row, headers, 'Closing Number', grade.closingNumber || '');
  mpSetCell_(row, headers, 'Graded Timestamp', new Date());
}

function mpRewriteDataRows_(sheet, headers, rows) {
  const maxRows = Math.max(sheet.getLastRow() - 1, 0);
  if (maxRows > 0) sheet.getRange(2, 1, maxRows, sheet.getMaxColumns()).clearContent();
  if (!rows.length) return;
  const width = Math.max(headers.length, sheet.getLastColumn());
  const padded = rows.map(row => {
    const copy = row.slice();
    while (copy.length < width) copy.push('');
    return copy.slice(0, width);
  });
  sheet.getRange(2, 1, padded.length, width).setValues(padded);
}

function mpReadManualResults_() {
  const sheet = mpSheet_(MP_GRADING.manualResultsSheet, false);
  if (sheet.getLastRow() === 0) sheet.appendRow(['Date','League','Game','Pick','Result','Closing Number','Profit/Loss','Settlement Notes','Source']);
  return mpReadTable_(sheet).rows;
}

function mpFindManualResult_(row, manualRows) {
  const rowKey = mpPickKey_(row);
  return manualRows.find(manual => mpPickKey_(manual) === rowKey || (
    mpDateKey_(mpCell_(manual, 'Date')) === mpDateKey_(mpCell_(row, 'Date')) &&
    mpSimilar_(mpCell_(manual, 'Game'), mpCell_(row, 'Game')) &&
    mpSimilar_(mpCell_(manual, 'Pick'), mpCell_(row, 'Pick'))
  ));
}

function mpFindGameResult_(row, results) {
  const dateKey = mpDateKey_(mpCell_(row, 'Date'));
  const game = mpCell_(row, 'Game');
  return results.find(result => {
    const start = mpCell_(result, 'Start Time');
    const resultDate = start ? mpDateKey_(start) : dateKey;
    return (!dateKey || !resultDate || dateKey === resultDate) && mpSimilar_(game, mpCell_(result, 'Game'));
  }) || results.find(result => mpTeamsInText_(game).some(team => mpContainsTeam_(mpCell_(result, 'Game'), team)));
}

function mpSelectedTeam_(pick, result) {
  const text = mpTeamKey_(pick);
  const home = result.homeTeam || mpCell_(result, 'Home Team');
  const away = result.awayTeam || mpCell_(result, 'Away Team');
  if (text.includes(mpTeamKey_(home))) return home;
  if (text.includes(mpTeamKey_(away))) return away;
  const teams = mpTeamsInText_(pick);
  return teams.find(team => mpContainsTeam_(home, team) || mpContainsTeam_(away, team)) || '';
}

function mpScoreMap_(scores) {
  const map = {};
  (scores || []).forEach(score => {
    const name = score.name || score.team || '';
    const value = Number(score.score);
    if (name && isFinite(value)) map[mpTeamKey_(name)] = value;
  });
  return map;
}

function mpReadTable_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (!values.length) return { headers: [], rows: [] };
  const headers = values[0].map(value => String(value || '').trim());
  const rows = values.slice(1).map(valuesRow => mpRowObject_(headers, valuesRow)).filter(row => row._values.some(value => String(value || '').trim() !== ''));
  return { headers, rows };
}

function mpRowObject_(headers, values) {
  const row = { _values: values.slice(), _headers: headers };
  headers.forEach((header, index) => row[mpNorm_(header)] = values[index]);
  return row;
}

function mpRowsToObjects_(rows) {
  const headers = rows[0] || [];
  return rows.slice(1).map(row => mpRowObject_(headers, row));
}

function mpReadHeaders_(sheet) {
  if (sheet.getLastRow() === 0) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(value => String(value || '').trim());
}

function mpHeaderMap_(headers) {
  const map = {};
  headers.forEach((header, index) => map[mpNorm_(header)] = index);
  return map;
}

function mpEnsureColumns_(sheet, columns) {
  let headers = mpReadHeaders_(sheet);
  if (!headers.length) {
    sheet.appendRow(columns);
    return;
  }
  const missing = columns.filter(column => headers.map(mpNorm_).indexOf(mpNorm_(column)) < 0);
  if (!missing.length) return;
  const start = headers.length + 1;
  sheet.getRange(1, start, 1, missing.length).setValues([missing]);
}

function mpEnsureGradingRuntime_() {
  mpEnsureSheet_(MP_GRADING.finalResultsSheet, ['Pulled At','Sport','League','Game','Home Team','Away Team','Start Time','Completed','Home Score','Away Score','Winner','Event ID','Source','Raw Status']);
  mpEnsureSheet_(MP_GRADING.manualResultsSheet, ['Date','League','Game','Pick','Result','Closing Number','Profit/Loss','Settlement Notes','Source']);
  mpEnsureSheet_(MP_GRADING.gradingLogSheet, ['Timestamp','Level','Action','Sheet','Pick','Details']);
  mpEnsureSheet_(MP_GRADING.automationLogSheet, ['Timestamp','Level','Message']);
  mpEnsureSheet_('Longshots History', ['Date','Sport','League','Game','Pick','LongShot Type','Odds','Sportsbook','Grade','Units','Best Number','No Bet Cutoff','Leg Count','Payout Target','Risk Tier','Status','Release Status','Access','Featured','Writeup','Full Analysis','Market Notes','Source Verification','Timestamp','Manual Approved','Override Mode','Legs','Removed Legs','Validation Notes','Category','Result','Profit/Loss','Settlement Notes','Settled At','Closing Number','Graded Timestamp']);
  mpEnsureSheet_('Props Lab', ['Date','Sport','League','Game','Pick','Bet Type','Odds','Sportsbook','Grade','Units','Best Number','No Bet Cutoff','Status','Result','Profit/Loss','Writeup','Full Analysis','Access','Featured','Closing Number','Graded Timestamp']);
}

function mpEnsureSheet_(name, headers) {
  const sheet = mpSheet_(name, false);
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  else mpEnsureColumns_(sheet, headers);
  return sheet;
}

function mpSheet_(name, optional) {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(name);
  if (!sheet && optional) return null;
  return sheet || ss.insertSheet(name);
}

function mpWriteRows_(name, rows) {
  const sheet = mpSheet_(name, false);
  sheet.clearContents();
  if (rows.length) sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
}

function mpFetchWithRetry_(url) {
  let last;
  for (let attempt = 0; attempt <= MP_GRADING.retryAttempts; attempt++) {
    try {
      const res = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true });
      const code = res.getResponseCode();
      const body = res.getContentText();
      if (code < 500 && code !== 429) return { code, body };
      last = { code, body };
    } catch (err) {
      last = { code: 'ERROR', body: err.message };
    }
    Utilities.sleep(MP_GRADING.retrySleepMs * (attempt + 1));
  }
  return last || { code: 'ERROR', body: 'Unknown fetch error' };
}

function mpGetFallbackKey_() {
  const names = (MP_ODDS && MP_ODDS.fallback && MP_ODDS.fallback.propertyNames) || ['THE_ODDS_API_KEY', 'ODDS_API_KEY'];
  const props = PropertiesService.getScriptProperties();
  for (let i = 0; i < names.length; i++) {
    const value = String(props.getProperty(names[i]) || '').trim();
    if (value) return { name: names[i], value };
  }
  return null;
}

function mpCell_(row, header) {
  return row[mpNorm_(header)] == null ? '' : String(row[mpNorm_(header)]).trim();
}

function mpSetCell_(row, headers, header, value) {
  const map = mpHeaderMap_(headers);
  const idx = map[mpNorm_(header)];
  if (idx == null) return;
  while (row._values.length <= idx) row._values.push('');
  row._values[idx] = value;
  row[mpNorm_(header)] = value;
}

function mpHasPick_(row) {
  return Boolean(mpCell_(row, 'Pick') || mpCell_(row, 'Play'));
}

function mpAlreadyGraded_(row) {
  const status = mpClean_(mpCell_(row, 'Status'));
  const result = mpClean_(mpCell_(row, 'Result'));
  const gradedAt = mpCell_(row, 'Graded Timestamp');
  return Boolean(gradedAt || status.includes('graded') || ['win','loss','push','void'].indexOf(result) >= 0);
}

function mpPickKey_(row) {
  return [mpDateKey_(mpCell_(row, 'Date')), mpCell_(row, 'League') || mpCell_(row, 'Sport'), mpCell_(row, 'Game'), mpCell_(row, 'Pick')].map(mpCompact_).join('|');
}

function mpDateKey_(value) {
  const date = new Date(value);
  if (isNaN(date.getTime())) return mpCompact_(value);
  return Utilities.formatDate(date, MP_GRADING.spreadsheetTimeZone, 'yyyyMMdd');
}

function mpClean_(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function mpCompact_(value) {
  return mpClean_(value).replace(/[^a-z0-9]/g, '');
}

function mpNorm_(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[^\w#/% ]/g, '');
}

function mpNumber_(value) {
  const n = parseFloat(String(value || '').replace(/[^0-9.+-]/g, ''));
  return isFinite(n) ? n : 0;
}

function mpAmericanOdds_(value) {
  const text = String(value || '').trim();
  if (/pending|best available|confirm/i.test(text)) return NaN;
  const match = text.match(/[+-]?\d{3,4}/);
  return match ? Number(match[0]) : NaN;
}

function mpExtractSignedLine_(text) {
  const match = String(text || '').match(/([+-]\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : NaN;
}

function mpExtractTotal_(text) {
  const match = String(text || '').match(/(?:over|under|o|u)\s*(\d+(?:\.\d+)?)/i) || String(text || '').match(/(\d+(?:\.\d+)?)\s*(?:runs|points|goals)?/i);
  return match ? Number(match[1]) : NaN;
}

function mpHasSpreadLine_(text) {
  return /[+-]\d+(?:\.\d+)?/.test(String(text || ''));
}

function mpHasTotalLine_(text) {
  return /\b(over|under|o|u)\s*\d/i.test(String(text || ''));
}

function mpIsPropMarket_(row) {
  const text = mpClean_(`${mpCell_(row, 'Bet Type')} ${mpCell_(row, 'Prop Type')} ${mpCell_(row, 'LongShot Type')} ${mpCell_(row, 'Pick')}`);
  return ['prop','total bases','strikeouts','home run','hr','points','rebounds','assists','sog','saves','round','distance'].some(marker => text.includes(marker));
}

function mpIsParlay_(row) {
  const text = mpClean_(`${mpCell_(row, 'LongShot Type')} ${mpCell_(row, 'Bet Type')} ${mpCell_(row, 'Pick')}`);
  return text.includes('parlay') || mpNumber_(mpCell_(row, 'Leg Count')) > 1 || mpCell_(row, 'Legs');
}

function mpLegs_(legs) {
  return String(legs || '').split('|').map(leg => leg.replace(/^\s*\d+\.\s*/, '').trim()).filter(Boolean);
}

function mpCloneRowWithPick_(row, pick) {
  const clone = Object.assign({}, row, { _values: row._values.slice(), _headers: row._headers });
  clone[mpNorm_('Pick')] = pick;
  return clone;
}

function mpTeamsInText_(text) {
  return String(text || '').split(/\bvs\b|@|\+|,/i).map(part => part.trim()).filter(part => part.length > 2);
}

function mpContainsTeam_(haystack, needle) {
  const h = mpTeamKey_(haystack);
  const n = mpTeamKey_(needle);
  return Boolean(n && (h.includes(n) || n.includes(h)));
}

function mpTeamKey_(value) {
  return mpCompact_(String(value || '').replace(/\b(over|under|moneyline|ml|run line|spread|alt|to record a hit|hit|team total)\b/ig, ''));
}

function mpSimilar_(a, b) {
  const aa = mpCompact_(a);
  const bb = mpCompact_(b);
  return Boolean(aa && bb && (aa.includes(bb) || bb.includes(aa) || mpTeamsInText_(a).some(team => mpContainsTeam_(b, team))));
}

function mpNormalizeResult_(value) {
  const text = mpClean_(value);
  if (text.includes('win') || text === 'w' || text.includes('cash')) return 'Win';
  if (text.includes('loss') || text === 'l' || text.includes('lose')) return 'Loss';
  if (text.includes('push')) return 'Push';
  if (text.includes('void') || text.includes('cancel')) return 'Void';
  return 'Pending';
}

function mpLogGrading_(level, action, sheet, pick, details) {
  const sh = mpSheet_(MP_GRADING.gradingLogSheet, false);
  if (sh.getLastRow() === 0) sh.appendRow(['Timestamp','Level','Action','Sheet','Pick','Details']);
  sh.appendRow([new Date(), level || '', action || '', sheet || '', pick || '', details || '']);
}

function mpLogAutomation_(level, message, details) {
  const sh = mpSheet_(MP_GRADING.automationLogSheet, false);
  if (sh.getLastRow() === 0) sh.appendRow(['Timestamp','Level','Message']);
  sh.appendRow([new Date(), level || '', message || '', details || '']);
}
