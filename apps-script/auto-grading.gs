/* Micks Picks automatic grading engine
 * Uses final score API data plus optional manual result overrides.
 * Install this file into the same Apps Script project as odds-api.gs.
 */

const MP_GRADING = {
  tz: 'America/New_York',
  finalResultsSheet: 'Final Results Feed',
  manualResultsSheet: 'Manual Grading Results',
  gradingLogSheet: 'Grading Log',
  automationLogSheet: 'Micks Picks Automation Log',
  websiteFeedSheet: 'Website Feed',
  scoreDaysFrom: 3,
  retryAttempts: 2,
  retrySleepMs: 800,
  finalSports: ['basketball_nba', 'basketball_wnba', 'baseball_mlb', 'americanfootball_nfl', 'icehockey_nhl', 'mma_mixed_martial_arts'],
  sourceTabs: [
    { name: 'Active Picks', archive: 'Results Archive', kind: 'core', remove: true },
    { name: 'Props Lab', archive: 'Props Results', kind: 'props', remove: true, optional: true },
    { name: 'Lotto Props', archive: 'Props Results', kind: 'props', remove: true },
    { name: 'Micks LongShots', archive: 'Longshots History', kind: 'longshots', remove: true }
  ]
};

function runMicksPicksAutoGrading() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) {
    mpLogGrading_('WARN', 'LOCKED', '', '', 'Auto grading skipped because another run is active');
    return { ok: false, skipped: true, reason: 'lock active' };
  }

  try {
    mpEnsureGradingRuntime_();
    const finals = mpPullFinalResults_();
    const manual = mpReadTable_(mpEnsureSheet_(MP_GRADING.manualResultsSheet, mpManualHeaders_())).rows;
    const gradedKeys = mpExistingGradedKeys_();
    const summary = { checked: 0, graded: 0, archived: 0, removed: 0, skipped: 0, errors: 0 };

    MP_GRADING.sourceTabs.forEach(config => {
      const sheet = mpSheet_(config.name, config.optional);
      if (!sheet) {
        mpLogGrading_('INFO', 'OPTIONAL_SOURCE_MISSING', config.name, '', `${config.name} not present`);
        return;
      }
      mpEnsureColumns_(sheet, ['Status', 'Result', 'Profit/Loss', 'Closing Number', 'Graded Timestamp']);
      const table = mpReadTable_(sheet);
      const keep = [];

      table.rows.forEach(row => {
        summary.checked++;
        try {
          if (!mpHasPick_(row)) {
            keep.push(row._values);
            summary.skipped++;
            return;
          }

          if (mpIsArchivedSourceRow_(row)) {
            keep.push(row._values);
            summary.skipped++;
            return;
          }

          const key = mpPickKey_(row);
          if (gradedKeys.has(key)) {
            mpLogGrading_('WARN', 'DUPLICATE_PREVENTED', config.name, mpCell_(row, 'Pick'), key);
            keep.push(row._values);
            summary.skipped++;
            return;
          }

          const grade = mpExistingResultGrade_(row) || mpGradeRow_(row, finals, manual, config);
          if (!grade || grade.result === 'Pending') {
            keep.push(row._values);
            summary.skipped++;
            if (grade && grade.note) mpLogGrading_('INFO', 'PENDING', config.name, mpCell_(row, 'Pick'), grade.note);
            return;
          }

          mpApplyGrade_(row, table.headers, grade);
          mpAppendArchive_(config.archive, table.headers, row._values);
          gradedKeys.add(key);
          summary.graded++;
          summary.archived++;
          if (config.remove) summary.removed++;
          else keep.push(row._values);
          mpLogGrading_('INFO', 'GRADED', config.name, mpCell_(row, 'Pick'), `${grade.result} | ${grade.profitLoss || ''} | ${grade.note || ''}`);
        } catch (err) {
          keep.push(row._values);
          summary.errors++;
          mpLogGrading_('ERROR', 'ROW_ERROR', config.name, mpCell_(row, 'Pick'), err.message);
        }
      });

      if (config.remove) mpRewriteRows_(sheet, table.headers, keep);
    });

    mpRefreshWebsiteFeed_();
    mpLogAutomation_('Auto Grading', 'Completed', `Checked=${summary.checked}; Graded=${summary.graded}; Archived=${summary.archived}; Removed=${summary.removed}; Errors=${summary.errors}`);
    return { ok: true, finalResults: finals.length, summary };
  } catch (err) {
    mpLogGrading_('ERROR', 'RUN_FAILED', '', '', err.stack || err.message);
    mpLogAutomation_('Auto Grading', 'Failed', err.message);
    throw err;
  } finally {
    lock.releaseLock();
  }
}

function setupMicksPicksAutomationTriggers() {
  const handlers = ['pullOddsAPI', 'runMicksPicksAutoConfirm', 'runMicksPicksAutoConfirmAutomation', 'runMicksPicksAutoGrading'];
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction && handlers.indexOf(trigger.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('pullOddsAPI').timeBased().everyMinutes(30).create();
  ScriptApp.newTrigger('runMicksPicksAutoConfirmAutomation').timeBased().everyMinutes(10).create();
  ScriptApp.newTrigger('runMicksPicksAutoGrading').timeBased().everyMinutes(15).create();
  mpLogAutomation_('Automation Triggers', 'Installed', 'pullOddsAPI every 30 min; auto-confirm every 10 min; auto-grading every 15 min');
  return { ok: true, triggers: handlers };
}

function runMicksPicksAutoConfirmAutomation() {
  return runMicksPicksAutoConfirm();
}

function runMicksPicksAutoConfirm() {
  if (typeof autoConfirmActivePicks === 'function') return autoConfirmActivePicks();
  if (typeof runAutoConfirmEngine === 'function') return runAutoConfirmEngine();
  if (typeof runMicksPicksAutoConfirmation === 'function') return runMicksPicksAutoConfirmation();
  mpLogAutomation_('Auto Confirm', 'Skipped', 'No auto-confirm implementation found in this Apps Script project');
  return { ok: false, skipped: true, reason: 'No auto-confirm implementation found' };
}

function mpPullFinalResults_() {
  const rows = [mpFinalHeaders_()];
  const key = mpFallbackKey_();
  if (!key) {
    mpLogGrading_('ERROR', 'API_KEY_MISSING', '', '', 'Missing The Odds API key for final scores');
    mpWriteRows_(MP_GRADING.finalResultsSheet, rows);
    return [];
  }

  MP_GRADING.finalSports.forEach(sport => {
    try {
      const url = `${MP_ODDS.fallback.baseUrl}/sports/${encodeURIComponent(sport)}/scores/?${queryString_({ apiKey: key.value, daysFrom: MP_GRADING.scoreDaysFrom, dateFormat: 'iso' })}`;
      const res = mpFetchRetry_(url);
      if (res.code < 200 || res.code >= 300) {
        mpLogGrading_('ERROR', 'SCORES_HTTP_' + res.code, sport, '', String(res.body || '').slice(0, 300));
        return;
      }
      JSON.parse(res.body || '[]').forEach(event => {
        const home = event.home_team || '';
        const away = event.away_team || '';
        const scores = mpScoreMap_(event.scores || []);
        const hs = scores[mpTeamKey_(home)];
        const as = scores[mpTeamKey_(away)];
        const completed = event.completed === true || String(event.completed).toLowerCase() === 'true';
        const winner = completed && isFinite(hs) && isFinite(as) ? (hs > as ? home : as > hs ? away : 'Push') : '';
        rows.push([new Date(), event.sport_key || sport, event.sport_title || sport, `${away} vs ${home}`, home, away, event.commence_time || '', completed ? 'TRUE' : 'FALSE', hs == null ? '' : hs, as == null ? '' : as, winner, event.id || '', 'The Odds API scores', event.completed || '']);
      });
    } catch (err) {
      mpLogGrading_('ERROR', 'SCORES_FETCH_FAILED', sport, '', err.message);
    }
  });

  mpWriteRows_(MP_GRADING.finalResultsSheet, rows);
  return mpRowsToObjects_(rows).filter(row => mpCell_(row, 'Completed') === 'TRUE');
}

function mpGradeRow_(row, finals, manual, config) {
  const override = mpFindManual_(row, manual);
  if (override) return mpGradeManual_(row, override);
  if (config.kind === 'longshots' || mpIsParlay_(row)) return mpGradeParlay_(row, finals, manual);
  if (mpIsProp_(row)) return mpPending_('Player, HR, and UFC props require Manual Grading Results or a dedicated player/fight stat feed');

  const final = mpFindFinal_(row, finals);
  if (!final) return mpPending_('No completed API final matched game/date');

  const type = mpClean_(`${mpCell_(row, 'Bet Type')} ${mpCell_(row, 'LongShot Type')} ${mpCell_(row, 'Prop Type')}`);
  const pick = mpCell_(row, 'Pick');
  let result = 'Pending';
  if (type.includes('moneyline') || /\bml\b/i.test(pick)) result = mpGradeMoneyline_(pick, final);
  else if (type.includes('spread') || type.includes('run line') || type.includes('puck line') || mpHasSpread_(pick)) result = mpGradeSpread_(pick, final);
  else if (type.includes('total') || mpHasTotal_(pick)) result = mpGradeTotal_(pick, final);
  if (result === 'Pending') return mpPending_('Final found, but market could not be interpreted safely');
  return mpPayload_(row, result, '', 'Auto graded from final score API');
}

function mpGradeParlay_(row, finals, manual) {
  const legs = mpLegs_(mpCell_(row, 'Legs'));
  if (!legs.length) return mpPending_('No parlay legs found');
  const outcomes = legs.map(leg => {
    const legRow = mpCloneWithPick_(row, leg);
    const override = mpFindManual_(legRow, manual);
    if (override) return mpGradeManual_(legRow, override).result;
    const final = mpFindFinal_(legRow, finals) || mpFindFinal_(row, finals);
    if (!final) return 'Pending';
    if (mpHasTotal_(leg)) return mpGradeTotal_(leg, final);
    if (mpHasSpread_(leg)) return mpGradeSpread_(leg, final);
    if (/\bml\b|moneyline/i.test(leg)) return mpGradeMoneyline_(leg, final);
    return 'Pending';
  });
  if (outcomes.some(x => x === 'Loss')) return mpPayload_(row, 'Loss', '', 'Parlay graded: at least one leg lost');
  if (outcomes.every(x => x === 'Win' || x === 'Push' || x === 'Void')) {
    if (outcomes.every(x => x === 'Push' || x === 'Void')) return mpPayload_(row, 'Void', '', 'Parlay graded: all legs pushed/voided');
    return mpPayload_(row, 'Win', '', 'Parlay graded: all resolved legs won or pushed');
  }
  return mpPending_('Parlay has unresolved legs: ' + outcomes.join(', '));
}

function mpGradeMoneyline_(pick, final) {
  const selected = mpSelectedTeam_(pick, final);
  const winner = mpCell_(final, 'Winner');
  if (!selected || !winner || winner === 'Push') return 'Pending';
  return mpTeamKey_(selected) === mpTeamKey_(winner) ? 'Win' : 'Loss';
}

function mpGradeSpread_(pick, final) {
  const line = mpExtractSignedLine_(pick);
  const selected = mpSelectedTeam_(pick, final);
  if (!selected || !isFinite(line)) return 'Pending';
  const home = mpCell_(final, 'Home Team');
  const away = mpCell_(final, 'Away Team');
  const homeScore = Number(mpCell_(final, 'Home Score'));
  const awayScore = Number(mpCell_(final, 'Away Score'));
  const selectedIsHome = mpTeamKey_(selected) === mpTeamKey_(home);
  const selectedScore = selectedIsHome ? homeScore : awayScore;
  const opponentScore = selectedIsHome ? awayScore : homeScore;
  const margin = selectedScore + line - opponentScore;
  return margin > 0 ? 'Win' : margin < 0 ? 'Loss' : 'Push';
}

function mpGradeTotal_(pick, final) {
  const line = mpExtractTotal_(pick);
  if (!isFinite(line)) return 'Pending';
  const actual = Number(mpCell_(final, 'Home Score')) + Number(mpCell_(final, 'Away Score'));
  const text = mpClean_(pick);
  if (text.includes('over')) return actual > line ? 'Win' : actual < line ? 'Loss' : 'Push';
  if (text.includes('under')) return actual < line ? 'Win' : actual > line ? 'Loss' : 'Push';
  return 'Pending';
}

function mpGradeManual_(row, manual) {
  const result = mpNormalizeResult_(mpCell_(manual, 'Result'));
  return {
    result,
    status: 'Graded - ' + result,
    profitLoss: mpCell_(manual, 'Profit/Loss') || mpProfitLoss_(row, result),
    closingNumber: mpCell_(manual, 'Closing Number') || mpCell_(manual, 'Closing Line') || mpCell_(row, 'Closing Number') || '',
    note: mpCell_(manual, 'Settlement Notes') || mpCell_(manual, 'Source') || 'Manual Grading Results override'
  };
}

function mpExistingResultGrade_(row) {
  const result = mpNormalizeResult_(mpCell_(row, 'Result'));
  if (result === 'Pending') return null;
  return {
    result,
    status: 'Graded - ' + result,
    profitLoss: mpCell_(row, 'Profit/Loss') || mpProfitLoss_(row, result),
    closingNumber: mpCell_(row, 'Closing Number') || mpCell_(row, 'Best Market Price') || mpCell_(row, 'Best Number') || '',
    note: 'Archived from existing Result column'
  };
}

function mpPayload_(row, result, closingNumber, note) {
  return {
    result,
    status: 'Graded - ' + result,
    profitLoss: mpProfitLoss_(row, result),
    closingNumber: closingNumber || mpCell_(row, 'Closing Number') || mpCell_(row, 'Best Market Price') || mpCell_(row, 'Best Number') || '',
    note: note || ''
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

function mpExistingGradedKeys_() {
  const keys = new Set();
  ['Results Archive', 'Props Results', 'Longshots History'].forEach(name => {
    const sheet = mpSheet_(name, true);
    if (!sheet) return;
    mpReadTable_(sheet).rows.forEach(row => {
      if (mpAlreadyGraded_(row) || mpCell_(row, 'Result')) keys.add(mpPickKey_(row));
    });
  });
  return keys;
}

function mpAppendArchive_(archiveName, sourceHeaders, values) {
  const archive = mpEnsureSheet_(archiveName, sourceHeaders.concat(['Graded Timestamp']));
  mpEnsureColumns_(archive, ['Status', 'Result', 'Profit/Loss', 'Closing Number', 'Graded Timestamp']);
  const archiveHeaders = mpReadHeaders_(archive);
  const sourceMap = mpHeaderMap_(sourceHeaders);
  const out = archiveHeaders.map(header => {
    const idx = sourceMap[mpNorm_(header)];
    return idx == null ? '' : values[idx];
  });
  archive.appendRow(out);
}

function mpRefreshWebsiteFeed_() {
  const active = mpSheet_('Active Picks', true);
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

function mpApplyGrade_(row, headers, grade) {
  mpSetCell_(row, headers, 'Status', grade.status || ('Graded - ' + grade.result));
  mpSetCell_(row, headers, 'Result', grade.result);
  mpSetCell_(row, headers, 'Profit/Loss', grade.profitLoss || '');
  mpSetCell_(row, headers, 'Closing Number', grade.closingNumber || '');
  mpSetCell_(row, headers, 'Graded Timestamp', new Date());
}

function mpRewriteRows_(sheet, headers, rows) {
  const dataRows = Math.max(sheet.getLastRow() - 1, 0);
  if (dataRows > 0) sheet.getRange(2, 1, dataRows, sheet.getMaxColumns()).clearContent();
  if (!rows.length) return;
  const width = Math.max(headers.length, sheet.getLastColumn());
  const padded = rows.map(row => {
    const out = row.slice();
    while (out.length < width) out.push('');
    return out.slice(0, width);
  });
  sheet.getRange(2, 1, padded.length, width).setValues(padded);
}

function mpFindManual_(row, manualRows) {
  const key = mpPickKey_(row);
  return manualRows.find(m => mpPickKey_(m) === key || (
    mpDateKey_(mpCell_(m, 'Date')) === mpDateKey_(mpCell_(row, 'Date')) &&
    mpSimilar_(mpCell_(m, 'Game'), mpCell_(row, 'Game')) &&
    mpSimilar_(mpCell_(m, 'Pick'), mpCell_(row, 'Pick'))
  ));
}

function mpFindFinal_(row, finals) {
  const dateKey = mpDateKey_(mpCell_(row, 'Date'));
  const game = mpCell_(row, 'Game');
  return finals.find(final => {
    const resultDate = mpDateKey_(mpCell_(final, 'Start Time'));
    return (!dateKey || !resultDate || dateKey === resultDate) && mpSimilar_(game, mpCell_(final, 'Game'));
  }) || finals.find(final => mpTeamsInText_(game).some(team => mpContainsTeam_(mpCell_(final, 'Game'), team)));
}

function mpSelectedTeam_(pick, final) {
  const text = mpTeamKey_(pick);
  const home = mpCell_(final, 'Home Team');
  const away = mpCell_(final, 'Away Team');
  if (text.includes(mpTeamKey_(home))) return home;
  if (text.includes(mpTeamKey_(away))) return away;
  const teams = mpTeamsInText_(pick);
  return teams.find(team => mpContainsTeam_(home, team) || mpContainsTeam_(away, team)) || '';
}

function mpEnsureGradingRuntime_() {
  mpEnsureSheet_(MP_GRADING.finalResultsSheet, mpFinalHeaders_());
  mpEnsureSheet_(MP_GRADING.manualResultsSheet, mpManualHeaders_());
  mpEnsureSheet_(MP_GRADING.gradingLogSheet, ['Timestamp','Level','Action','Sheet','Pick','Details']);
  mpEnsureSheet_(MP_GRADING.automationLogSheet, ['Timestamp','Level','Message']);
  mpEnsureSheet_('Longshots History', ['Date','Sport','League','Game','Pick','LongShot Type','Odds','Sportsbook','Grade','Units','Best Number','No Bet Cutoff','Leg Count','Payout Target','Risk Tier','Status','Release Status','Access','Featured','Writeup','Full Analysis','Market Notes','Source Verification','Timestamp','Manual Approved','Override Mode','Legs','Removed Legs','Validation Notes','Category','Result','Profit/Loss','Settlement Notes','Settled At','Closing Number','Graded Timestamp']);
  mpEnsureSheet_('Props Lab', ['Date','Sport','League','Game','Pick','Bet Type','Odds','Sportsbook','Grade','Units','Best Number','No Bet Cutoff','Status','Result','Profit/Loss','Writeup','Full Analysis','Access','Featured','Closing Number','Graded Timestamp']);
}

function mpFinalHeaders_() {
  return ['Pulled At','Sport','League','Game','Home Team','Away Team','Start Time','Completed','Home Score','Away Score','Winner','Event ID','Source','Raw Status'];
}

function mpManualHeaders_() {
  return ['Date','League','Game','Pick','Result','Closing Number','Profit/Loss','Settlement Notes','Source'];
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

function mpEnsureColumns_(sheet, columns) {
  const headers = mpReadHeaders_(sheet);
  if (!headers.length) {
    sheet.appendRow(columns);
    return;
  }
  const norms = headers.map(mpNorm_);
  const missing = columns.filter(col => norms.indexOf(mpNorm_(col)) < 0);
  if (missing.length) sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
}

function mpReadTable_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (!values.length) return { headers: [], rows: [] };
  const headers = values[0].map(v => String(v || '').trim());
  const rows = values.slice(1).map(v => mpRow_(headers, v)).filter(r => r._values.some(v => String(v || '').trim() !== ''));
  return { headers, rows };
}

function mpRowsToObjects_(rows) {
  const headers = rows[0] || [];
  return rows.slice(1).map(row => mpRow_(headers, row));
}

function mpRow_(headers, values) {
  const row = { _headers: headers, _values: values.slice() };
  headers.forEach((h, i) => row[mpNorm_(h)] = values[i]);
  return row;
}

function mpReadHeaders_(sheet) {
  if (sheet.getLastRow() === 0) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(v => String(v || '').trim());
}

function mpHeaderMap_(headers) {
  const map = {};
  headers.forEach((h, i) => map[mpNorm_(h)] = i);
  return map;
}

function mpWriteRows_(name, rows) {
  const sheet = mpSheet_(name, false);
  sheet.clearContents();
  if (rows.length) sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
}

function mpFetchRetry_(url) {
  let last = { code: 'ERROR', body: 'Unknown fetch error' };
  for (let i = 0; i <= MP_GRADING.retryAttempts; i++) {
    try {
      const res = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true });
      last = { code: res.getResponseCode(), body: res.getContentText() };
      if (last.code < 500 && last.code !== 429) return last;
    } catch (err) {
      last = { code: 'ERROR', body: err.message };
    }
    Utilities.sleep(MP_GRADING.retrySleepMs * (i + 1));
  }
  return last;
}

function mpFallbackKey_() {
  const names = (typeof MP_ODDS !== 'undefined' && MP_ODDS.fallback && MP_ODDS.fallback.propertyNames) || ['THE_ODDS_API_KEY', 'THE_ODDS_API_KEY_V4', 'ODDS_API_FALLBACK_KEY', 'ODDS_API_KEY'];
  const props = PropertiesService.getScriptProperties();
  for (let i = 0; i < names.length; i++) {
    const value = String(props.getProperty(names[i]) || '').trim();
    if (value) return { name: names[i], value };
  }
  return null;
}

function mpCell_(row, header) {
  const value = row[mpNorm_(header)];
  return value == null ? '' : String(value).trim();
}

function mpSetCell_(row, headers, header, value) {
  const idx = mpHeaderMap_(headers)[mpNorm_(header)];
  if (idx == null) return;
  while (row._values.length <= idx) row._values.push('');
  row._values[idx] = value;
  row[mpNorm_(header)] = value;
}

function mpHasPick_(row) { return Boolean(mpCell_(row, 'Pick') || mpCell_(row, 'Play')); }

function mpIsArchivedSourceRow_(row) {
  return Boolean(mpCell_(row, 'Graded Timestamp'));
}

function mpAlreadyGraded_(row) {
  const status = mpClean_(mpCell_(row, 'Status'));
  const result = mpClean_(mpCell_(row, 'Result'));
  return Boolean(mpCell_(row, 'Graded Timestamp') || status.includes('graded') || ['win','loss','push','void'].indexOf(result) >= 0);
}

function mpPickKey_(row) {
  return [mpDateKey_(mpCell_(row, 'Date')), mpCell_(row, 'League') || mpCell_(row, 'Sport'), mpCell_(row, 'Game'), mpCell_(row, 'Pick')].map(mpCompact_).join('|');
}

function mpDateKey_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) return Utilities.formatDate(value, MP_GRADING.tz, 'yyyyMMdd');
  const s = String(value || '').trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return m[1] + String(m[2]).padStart(2, '0') + String(m[3]).padStart(2, '0');
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) return (m[3].length === 2 ? '20' + m[3] : m[3]) + String(m[1]).padStart(2, '0') + String(m[2]).padStart(2, '0');
  const d = new Date(s);
  if (isNaN(d.getTime())) return mpCompact_(s);
  return Utilities.formatDate(d, MP_GRADING.tz, 'yyyyMMdd');
}

function mpClean_(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, ' '); }
function mpCompact_(v) { return mpClean_(v).replace(/[^a-z0-9]/g, ''); }
function mpNorm_(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[^\w#/% ]/g, ''); }
function mpNumber_(v) { const n = parseFloat(String(v || '').replace(/[^0-9.+-]/g, '')); return isFinite(n) ? n : 0; }
function mpAmericanOdds_(v) { const s = String(v || ''); if (/pending|best available|confirm/i.test(s)) return NaN; const m = s.match(/[+-]?\d{3,4}/); return m ? Number(m[0]) : NaN; }
function mpExtractSignedLine_(t) { const m = String(t || '').match(/([+-]\d+(?:\.\d+)?)/); return m ? Number(m[1]) : NaN; }
function mpExtractTotal_(t) { const m = String(t || '').match(/(?:over|under|o|u)\s*(\d+(?:\.\d+)?)/i); return m ? Number(m[1]) : NaN; }
function mpHasSpread_(t) { return /[+-]\d+(?:\.\d+)?/.test(String(t || '')); }
function mpHasTotal_(t) { return /\b(over|under|o|u)\s*\d/i.test(String(t || '')); }

function mpIsProp_(row) {
  const text = mpClean_(`${mpCell_(row, 'Bet Type')} ${mpCell_(row, 'Prop Type')} ${mpCell_(row, 'LongShot Type')} ${mpCell_(row, 'Pick')}`);
  return ['prop','total bases','strikeouts','home run','hr','points','rebounds','assists','sog','saves','round','distance'].some(x => text.includes(x));
}

function mpIsParlay_(row) {
  const text = mpClean_(`${mpCell_(row, 'LongShot Type')} ${mpCell_(row, 'Bet Type')} ${mpCell_(row, 'Pick')}`);
  return text.includes('parlay') || mpNumber_(mpCell_(row, 'Leg Count')) > 1 || Boolean(mpCell_(row, 'Legs'));
}

function mpLegs_(legs) { return String(legs || '').split('|').map(x => x.replace(/^\s*\d+\.\s*/, '').trim()).filter(Boolean); }
function mpCloneWithPick_(row, pick) { const clone = Object.assign({}, row, { _values: row._values.slice(), _headers: row._headers }); clone[mpNorm_('Pick')] = pick; return clone; }
function mpTeamsInText_(text) { return String(text || '').split(/\bvs\b|@|\+|,/i).map(x => x.trim()).filter(x => x.length > 2); }
function mpTeamKey_(v) { return mpCompact_(String(v || '').replace(/\b(over|under|moneyline|ml|run line|spread|alt|to record a hit|hit|team total)\b/ig, '')); }
function mpContainsTeam_(haystack, needle) { const h = mpTeamKey_(haystack), n = mpTeamKey_(needle); return Boolean(n && (h.includes(n) || n.includes(h))); }
function mpSimilar_(a, b) { const aa = mpCompact_(a), bb = mpCompact_(b); return Boolean(aa && bb && (aa.includes(bb) || bb.includes(aa) || mpTeamsInText_(a).some(team => mpContainsTeam_(b, team)))); }

function mpScoreMap_(scores) {
  const map = {};
  (scores || []).forEach(score => {
    const n = score.name || score.team || '';
    const v = Number(score.score);
    if (n && isFinite(v)) map[mpTeamKey_(n)] = v;
  });
  return map;
}

function mpNormalizeResult_(v) {
  const text = mpClean_(v);
  if (text.includes('win') || text === 'w' || text.includes('cash')) return 'Win';
  if (text.includes('loss') || text === 'l' || text.includes('lose')) return 'Loss';
  if (text.includes('push')) return 'Push';
  if (text.includes('void') || text.includes('cancel')) return 'Void';
  return 'Pending';
}

function mpPending_(note) { return { result: 'Pending', status: 'Pending', note: note || '' }; }
function mpLogGrading_(level, action, sheet, pick, details) { const sh = mpEnsureSheet_(MP_GRADING.gradingLogSheet, ['Timestamp','Level','Action','Sheet','Pick','Details']); sh.appendRow([new Date(), level || '', action || '', sheet || '', pick || '', details || '']); }
function mpLogAutomation_(level, message, details) { const sh = mpEnsureSheet_(MP_GRADING.automationLogSheet, ['Timestamp','Level','Message']); sh.appendRow([new Date(), level || '', message || '', details || '']); }
