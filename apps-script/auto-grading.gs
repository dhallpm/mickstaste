/* Micks Picks automatic grading engine
 * Uses final score API data plus optional manual result overrides.
 * Install this file into the same Apps Script project as odds-api.gs.
 */

const MP_GRADING = {
  tz: 'America/New_York',
  finalResultsSheet: 'Final Results Feed',
  manualResultsSheet: 'Manual Grading Results',
  longshotsGradingSheet: 'Longshots Grading',
  gradingLogSheet: 'Grading Log',
  automationLogSheet: 'Micks Picks Automation Log',
  websiteFeedSheet: 'Website Feed',
  scoreDaysFrom: 3,
  retryAttempts: 2,
  retrySleepMs: 800,
  dailyGradingHour: 2,
  dailyGradingNearMinute: 0,
  finalSports: ['basketball_nba', 'basketball_wnba', 'baseball_mlb', 'americanfootball_nfl', 'icehockey_nhl', 'mma_mixed_martial_arts'],
  sourceTabs: [
    { name: 'Active Picks', archive: 'Results Archive', kind: 'core', remove: true },
    { name: 'Website Feed', archive: 'Results Archive', kind: 'core', remove: true, optional: true },
    { name: 'Props Lab', archive: 'Props Results', kind: 'props', remove: true, optional: true },
    { name: 'Lotto Props', archive: 'Lotto Props', kind: 'lotto', remove: false, inPlace: true },
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
    const manual = mpManualGradeRows_();
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
            mpLogGrading_('INFO', 'SKIPPED', config.name, mpCell_(row, 'Pick'), 'Already marked archived/graded in source row');
            if (!config.remove) keep.push(row._values);
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
          const archiveDecision = mpArchiveDecision_(row, config, grade);
          if (archiveDecision.skip) {
            keep.push(row._values);
            summary.skipped++;
            mpLogGrading_('INFO', 'SKIPPED', config.name, mpCell_(row, 'Pick'), `${grade.result} found; skipped archive: ${archiveDecision.reason}`);
            return;
          }
          if (archiveDecision.destination === config.name) {
            gradedKeys.add(key);
            keep.push(row._values);
            summary.graded++;
            mpLogGrading_('INFO', 'GRADED_IN_PLACE', config.name, mpCell_(row, 'Pick'), `${grade.result} | ${grade.profitLoss || ''} | key=${mpPickKey_(row)} | ${grade.note || ''}`);
            return;
          }
          if (mpArchiveHasKey_(archiveDecision.destination, mpPickKey_(row))) {
            keep.push(row._values);
            summary.skipped++;
            mpLogGrading_('WARN', 'DUPLICATE_PREVENTED', config.name, mpCell_(row, 'Pick'), `Already exists in ${archiveDecision.destination} | key=${mpPickKey_(row)}`);
            return;
          }
          mpAppendArchive_(archiveDecision.destination, table.headers, row._values);
          gradedKeys.add(key);
          summary.graded++;
          summary.archived++;
          if (config.remove) summary.removed++;
          else keep.push(row._values);
          mpLogGrading_('INFO', 'GRADED', config.name, mpCell_(row, 'Pick'), `${grade.result} | ${grade.profitLoss || ''} | destination=${archiveDecision.destination} | key=${mpPickKey_(row)} | ${grade.note || ''}`);
        } catch (err) {
          keep.push(row._values);
          summary.errors++;
          mpLogGrading_('ERROR', 'ROW_ERROR', config.name, mpCell_(row, 'Pick'), err.message);
        }
      });

      if (config.remove || config.inPlace) mpRewriteRows_(sheet, table.headers, keep);
    });

    mpRefreshWebsiteFeed_();
    
    // NEW: Calculate profit/loss units for all closed bets
    calculateProfitLossUnits_();
    
    // NEW: Archive closed bets
    archiveClosedBets_();
    
    // NEW: Dedupe all archive sheets
    dedupeArchiveRows_('Results Archive');
    dedupeArchiveRows_('VIP Archive');
    dedupeArchiveRows_('Props Results');
    dedupeArchiveRows_('Lotto Props');
    dedupeArchiveRows_('Longshots History');
    
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

/**
 * Calculate/overwrite Profit/Loss units for all closed bets (Win/Loss/Push/Void/Graded)
 * on all source tabs (Active Picks, Props Lab, Longshots, etc.)
 */
function calculateProfitLossUnits_() {
  const sheets = [
    'Active Picks', 'Props Lab', 'Micks LongShots', 'Lotto Props'
  ];
  let totalUpdated = 0;
  sheets.forEach(name => {
    const sheet = mpSheet_(name, true);
    if (!sheet) return;
    const table = mpReadTable_(sheet);
    let changed = false;
    table.rows.forEach(row => {
      const result = mpNormalizeResult_(mpCell_(row, 'Result'));
      if (['Win', 'Loss', 'Push', 'Void'].includes(result)) {
        const pl = mpProfitLoss_(row, result);
        mpSetRowCell_(row, table.headers, 'Profit/Loss', pl);
        changed = true;
        totalUpdated++;
      }
    });
    if (changed) mpRewriteRows_(sheet, table.headers, table.rows.map(r => r._values));
  });
  mpLogGrading_('INFO', 'PROFIT_LOSS_CALC', 'Multi-Sheet', '', `Calculated profit/loss for ${totalUpdated} closed bets`);
}

/**
 * Archive closed bets (graded) from all source tabs to the proper archive.
 * Handles routing and deduplication.
 */
function archiveClosedBets_() {
  let totalArchived = 0;
  MP_GRADING.sourceTabs.forEach(config => {
    const sheet = mpSheet_(config.name, config.optional);
    if (!sheet) return;
    const table = mpReadTable_(sheet);
    const keep = [];
    const gradedKeys = mpExistingGradedKeys_();
    table.rows.forEach(row => {
      if (!mpHasPick_(row)) {
        keep.push(row._values);
        return;
      }
      if (mpIsArchivedSourceRow_(row)) {
        keep.push(row._values);
        return;
      }
      const result = mpNormalizeResult_(mpCell_(row, 'Result'));
      if (!['Win', 'Loss', 'Push', 'Void'].includes(result)) {
        keep.push(row._values);
        return;
      }
      // Archive routing logic (VIP, Longshots, Lotto, Props, Standard)
      const archive = routeBetToArchive_(row, config);
      if (!archive) {
        keep.push(row._values);
        return;
      }
      const k = mpPickKey_(row);
      if (!mpArchiveHasKey_(archive, k) && !gradedKeys.has(k)) {
        mpAppendArchive_(archive, table.headers, row._values);
        gradedKeys.add(k);
        totalArchived++;
      }
      // Remove from source; don't push to "keep"
    });
    // REMOVE from source if config.remove true, REWRITE with left-overs
    if (config.remove || config.inPlace) mpRewriteRows_(sheet, table.headers, keep);
  });
  mpLogGrading_('INFO', 'ARCHIVE_CLOSED', 'Multi-Sheet', '', `Archived ${totalArchived} closed bets`);
}

/**
 * Route a row (bet) to the correct archive tab name.
 * Returns archive sheet name, or null if not archivable.
 */
function routeBetToArchive_(row, config) {
  if (mpIsLottoPick_(row)) return 'Lotto Props';
  if (config && config.kind === 'longshots' || mpIsParlay_(row)) return 'Longshots History';
  if (mpIsProp_(row) || (config && config.kind === 'props')) return 'Props Results';
  if (mpIsVipAccess_(row)) return 'VIP Archive';
  return 'Results Archive';
}

/**
 * Dedupe archive by pick key. Modifies the archive sheet in place.
 * @param {string} archiveSheetName
 */
function dedupeArchiveRows_(archiveSheetName) {
  const sheet = mpSheet_(archiveSheetName, true);
  if (!sheet) return;
  const table = mpReadTable_(sheet);
  const keys = {};
  const deduped = [];
  let removed = 0;
  table.rows.forEach(row => {
    const k = mpPickKey_(row);
    if (!k) return;
    if (keys[k]) {
      removed++;
    } else {
      keys[k] = true;
      deduped.push(row._values);
    }
  });
  if (removed > 0) {
    mpRewriteRows_(sheet, table.headers, deduped);
    mpLogGrading_('INFO', 'DEDUPE_ARCHIVE', archiveSheetName, '', `Removed ${removed} duplicate rows`);
  }
}

function setupMicksPicksAutomationTriggers() {
  const handlers = ['pullOddsAPI', 'runMicksPicksAutoConfirm', 'runMicksPicksAutoConfirmAutomation', 'runMicksPicksAutoGrading'];
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction && handlers.indexOf(trigger.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('pullOddsAPI').timeBased().everyMinutes(30).create();
  ScriptApp.newTrigger('runMicksPicksAutoConfirmAutomation').timeBased().everyMinutes(10).create();
  ScriptApp.newTrigger('runMicksPicksAutoGrading')
    .timeBased()
    .atHour(MP_GRADING.dailyGradingHour)
    .nearMinute(MP_GRADING.dailyGradingNearMinute)
    .everyDays(1)
    .inTimezone(MP_GRADING.tz)
    .create();
  mpLogAutomation_('Trigger Setup', 'Updated', `pullOddsAPI=30min; autoConfirm=10min; autoGrading=${mpDailyGradingScheduleText_()}; duplicate triggers removed`);
  return validateMicksPicksAutomationTriggers();
}

function validateMicksPicksAutomationTriggers() {
  const rows = [['Timestamp','Handler','Source','Event Type','Schedule']];
  const counts = {};
  ScriptApp.getProjectTriggers().forEach(trigger => {
    const handler = trigger.getHandlerFunction ? trigger.getHandlerFunction() : '';
    if (!handler) return;
    counts[handler] = (counts[handler] || 0) + 1;
    rows.push([new Date(), handler, trigger.getTriggerSource ? String(trigger.getTriggerSource()) : '', trigger.getEventType ? String(trigger.getEventType()) : '', handler === 'pullOddsAPI' ? 'Every 30 minutes' : handler === 'runMicksPicksAutoConfirmAutomation' ? 'Every 10 minutes' : handler === 'runMicksPicksAutoGrading' ? mpDailyGradingScheduleText_() : 'Unknown']);
  });
  mpWriteRows_('Command Center', rows);
  mpLogAutomation_('Trigger Validation', 'Completed', JSON.stringify(counts));
  return counts;
}

function mpDailyGradingScheduleText_() {
  return `Daily near ${MP_GRADING.dailyGradingHour}:00 AM ${MP_GRADING.tz}`;
}

function runMicksPicksAutoConfirmAutomation() {
  if (typeof runMicksPicksAutoConfirm === 'function') return runMicksPicksAutoConfirm();
  if (typeof runAutoConfirmEngine === 'function') return runAutoConfirmEngine();
  if (typeof runMicksPicksAutoConfirmation === 'function') return runMicksPicksAutoConfirmation();
  mpLogAutomation_('Auto Confirm', 'Skipped', 'No auto-confirm implementation found in this Apps Script project');
  return { ok: false, skipped: true, reason: 'No auto-confirm implementation found' };
}

function mpPullFinalResults_() {
  const rows = [mpFinalHeaders_()];
  const key = mpFallbackKey_();
  if (!key) {
    mpLogGrading_('WARN', 'API_KEY_MISSING', '', '', 'Missing The Odds API key for final scores; using ESPN scoreboard fallback');
  } else {
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
          mpPushFinalRow_(rows, [new Date(), event.sport_key || sport, event.sport_title || sport, `${away} vs ${home}`, home, away, event.commence_time || '', completed ? 'TRUE' : 'FALSE', isFinite(hs) ? hs : '', isFinite(as) ? as : '', winner, event.id || '', 'Odds API', event.completed]);
        });
      } catch (err) {
        mpLogGrading_('ERROR', 'SCORES_FETCH_FAILED', sport, '', err.message);
      }
    });
  }

  mpPullEspnFinalResults_(rows);

  mpWriteRows_(MP_GRADING.finalResultsSheet, rows);
  return mpRowsToObjects_(rows).filter(row => mpCell_(row, 'Completed') === 'TRUE');
}

function mpPullEspnFinalResults_(rows) {
  const sports = [
    { sport: 'basketball_nba', league: 'NBA', url: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard' },
    { sport: 'basketball_wnba', league: 'WNBA', url: 'https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard' },
    { sport: 'baseball_mlb', league: 'MLB', url: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard' },
    { sport: 'americanfootball_nfl', league: 'NFL', url: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard' },
    { sport: 'icehockey_nhl', league: 'NHL', url: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard' }
  ];
  const dates = mpRecentEspnDates_();
  sports.forEach(sport => {
    dates.forEach(dateKey => {
      try {
        const res = mpFetchRetry_(sport.url + '?' + queryString_({ dates: dateKey }));
        if (res.code < 200 || res.code >= 300) {
          mpLogGrading_('ERROR', 'ESPN_SCORES_HTTP_' + res.code, sport.league, '', String(res.body || '').slice(0, 300));
          return;
        }
        const payload = JSON.parse(res.body || '{}');
        (payload.events || []).forEach(event => mpPushEspnEvent_(rows, sport, event));
      } catch (err) {
        mpLogGrading_('ERROR', 'ESPN_SCORES_FETCH_FAILED', sport.league, '', err.message);
      }
    });
  });
}

function mpRecentEspnDates_() {
  const dates = [];
  const now = new Date();
  for (let i = 0; i <= MP_GRADING.scoreDaysFrom; i++) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dates.push(Utilities.formatDate(d, MP_GRADING.tz, 'yyyyMMdd'));
  }
  return dates;
}

function mpPushEspnEvent_(rows, sport, event) {
  const competition = (event.competitions || [])[0] || {};
  const status = event.status && event.status.type ? event.status.type : {};
  const competitors = competition.competitors || [];
  const home = competitors.find(c => c.homeAway === 'home') || {};
  const away = competitors.find(c => c.homeAway === 'away') || {};
  const homeTeam = mpEspnTeamName_(home);
  const awayTeam = mpEspnTeamName_(away);
  if (!homeTeam || !awayTeam) return;
  const hs = Number(home.score);
  const as = Number(away.score);
  const completed = status.completed === true || String(status.state || '').toLowerCase() === 'post';
  const winner = completed && isFinite(hs) && isFinite(as) ? (hs > as ? homeTeam : as > hs ? awayTeam : 'Push') : '';
  mpPushFinalRow_(rows, [new Date(), sport.sport, sport.league, `${awayTeam} vs ${homeTeam}`, homeTeam, awayTeam, event.date || '', completed ? 'TRUE' : 'FALSE', isFinite(hs) ? hs : '', isFinite(as) ? as : '', winner, event.id || '', 'ESPN', completed]);
}

function mpEspnTeamName_(competitor) {
  const team = competitor.team || {};
  return team.displayName || team.shortDisplayName || team.name || competitor.displayName || '';
}

function mpPushFinalRow_(rows, row) {
  const key = [mpDateKey_(row[6]), mpTeamKey_(row[4]), mpTeamKey_(row[5])].join('|');
  const exists = rows.slice(1).some(existing => [mpDateKey_(existing[6]), mpTeamKey_(existing[4]), mpTeamKey_(existing[5])].join('|') === key);
  if (!exists) rows.push(row);
}

function mpGradeRow_(row, finals, manual, config) {
  const override = mpFindManual_(row, manual);
  if (override) return mpGradeManual_(row, override);
  if (config.kind === 'longshots' || config.kind === 'lotto' || mpIsParlay_(row)) return mpGradeParlay_(row, finals, manual);
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
  const legs = mpLegs_(mpCell_(row, 'Legs') || mpCell_(row, 'Pick'));
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
  const parlayOdds = mpParlayOdds_(row, manual);
  if (outcomes.some(x => x === 'Loss')) return mpParlayPayload_(row, 'Loss', parlayOdds, 'Parlay graded: at least one leg lost');
  if (outcomes.every(x => x === 'Win' || x === 'Push' || x === 'Void')) {
    if (outcomes.every(x => x === 'Push' || x === 'Void')) return mpParlayPayload_(row, 'Void', parlayOdds, 'Parlay graded: all legs pushed/voided');
    return mpParlayPayload_(row, 'Win', parlayOdds, 'Parlay graded: all resolved legs won or pushed');
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

function mpParlayPayload_(row, result, odds, note) {
  return {
    result,
    status: 'Graded - ' + result,
    profitLoss: mpProfitLossWithOdds_(row, result, odds),
    closingNumber: isFinite(odds) ? mpFormatAmericanOdds_(odds) : (mpCell_(row, 'Closing Number') || mpCell_(row, 'Odds') || mpCell_(row, 'Best Number') || ''),
    note: note || ''
  };
}

function mpProfitLoss_(row, result) {
  return mpProfitLossWithOdds_(row, result, mpFirstAmericanOdds_([
    mpCell_(row, 'Odds'),
    mpCell_(row, 'Closing Number'),
    mpCell_(row, 'Best Market Price'),
    mpCell_(row, 'Best Number')
  ]));
}

function mpProfitLossWithOdds_(row, result, odds) {
  const units = mpNumber_(mpCell_(row, 'Units'));
  if (result === 'Push' || result === 'Void') return '0.00';
  if (result === 'Loss') return '-' + units.toFixed(2);
  if (result !== 'Win') return '';
  if (!isFinite(odds)) return units.toFixed(2);
  const profit = odds > 0 ? units * odds / 100 : units * 100 / Math.abs(odds);
  return '+' + profit.toFixed(2);
}

function mpFirstAmericanOdds_(values) {
  for (let i = 0; i < values.length; i++) {
    const odds = mpAmericanOdds_(values[i]);
    if (isFinite(odds)) return odds;
  }
  return NaN;
}

function mpParlayOdds_(row, manual) {
  const manualOdds = mpFirstAmericanOdds_(manual.filter(m => mpCell_(m, 'Longshot Name') === mpCell_(row, 'Pick')).map(m => mpCell_(m, 'Final Parlay Odds')));
  if (isFinite(manualOdds)) return manualOdds;
  return mpFirstAmericanOdds_([mpCell_(row, 'Final Parlay Odds'), mpCell_(row, 'Closing Number'), mpCell_(row, 'Odds'), mpCell_(row, 'Payout Target')]);
}

function mpFormatAmericanOdds_(odds) {
  return odds > 0 ? '+' + Math.round(odds) : String(Math.round(odds));
}

function mpExistingGradedKeys_() {
  const keys = new Set();
  ['Results Archive', 'VIP Archive', 'Props Results', 'Lotto Props', 'Longshots History'].forEach(name => {
    const sheet = mpSheet_(name, true);
    if (!sheet) return;
    mpReadTable_(sheet).rows.forEach(row => {
      if (mpAlreadyGraded_(row) || mpCell_(row, 'Result')) keys.add(mpPickKey_(row));
    });
  });
  return keys;
}

function mpArchiveDecision_(row, config, grade) {
  const baseSkip = mpOfficialSkipReason_(row, config);
  if (baseSkip) return { skip: true, reason: baseSkip };
  if (config.kind === 'longshots' || mpIsParlay_(row)) return { skip: false, destination: 'Longshots History' };
  if (mpIsLottoPick_(row)) return { skip: false, destination: 'Lotto Props' };
  if (mpIsProp_(row) || config.kind === 'props') return { skip: false, destination: 'Props Results' };
  if (mpIsVipAccess_(row)) {
    const vipSkip = mpVipArchiveSkipReason_(row);
    if (vipSkip) return { skip: true, reason: vipSkip };
    return { skip: false, destination: 'VIP Archive' };
  }
  return { skip: false, destination: 'Results Archive' };
}

function mpOfficialSkipReason_(row, config) {
  const grade = mpClean_(mpCell_(row, 'Grade'));
  const units = mpNumber_(mpCell_(row, 'Units'));
  const text = mpClean_([
    mpCell_(row, 'Status'),
    mpCell_(row, 'Release Status'),
    mpCell_(row, 'Release Notes'),
    mpCell_(row, 'Automation Notes'),
    mpCell_(row, 'Source Verification'),
    mpCell_(row, 'Framework Tags')
  ].join(' '));
  if (!units || units <= 0) return '0-unit row';
  if (grade === 'pass' || grade.includes('no bet')) return 'Pass/No Bet grade';
  if (text.includes('auto unlocked')) return 'Auto unlocked row';
  if (text.includes('imported') || text.includes('import history') || text.includes('imported history')) return 'Imported/history row';
  if (text.includes('live system') || /\blive\b/.test(text)) return 'Live/system row';
  return '';
}

function mpVipArchiveSkipReason_(row) {
  const release = mpClean_(mpCell_(row, 'Release Status'));
  const accessOk = mpIsVipAccess_(row);
  if (!accessOk) return 'Access is not VIP/Premium';
  if (release !== 'released') return 'VIP Release Status is not Released';
  if (mpIsLottoPick_(row)) return 'Lotto Prop excluded from VIP Archive';
  return '';
}

function mpArchiveHasKey_(archiveName, key) {
  const archive = mpSheet_(archiveName, true);
  if (!archive) return false;
  return mpReadTable_(archive).rows.some(row => mpPickKey_(row) === key);
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
  const headers = ['Date','Sport','League','Game','Pick','Bet Type','Odds','Sportsbook','Grade','Units','Writeup','Access','Featured','Status','Release Status','Posted Time','Framework Tags','Edge Analysis','Confidence'];
  const rows = [headers];
  if (active) {
    mpReadTable_(active).rows.forEach(row => {
      const release = mpClean_(mpCell_(row, 'Release Status'));
      if (!mpHasPick_(row) || mpAlreadyGraded_(row) || (release && !release.includes('released'))) return;
      rows.push(headers.map(h => mpCell_(row, h)));
    });
  }
  mpWriteRows_(MP_GRADING.websiteFeedSheet, rows);
}

function mpManualGradeRows_() {
  const manual = mpSheet_(MP_GRADING.manualResultsSheet, true);
  const rows = manual ? mpReadTable_(manual).rows : [];
  const longshots = mpSheet_(MP_GRADING.longshotsGradingSheet, true);
  if (longshots) rows.push.apply(rows, mpReadTable_(longshots).rows);
  return rows.filter(row => mpNormalizeResult_(mpCell_(row, 'Result')) !== 'Pending');
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
  const date = mpDateKey_(mpCell_(row, 'Date'));
  return finals.find(final => {
    const gameOk = mpSimilar_(mpCell_(row, 'Game'), mpCell_(final, 'Game')) || mpTeamsInText_(mpCell_(row, 'Game')).some(team => mpContainsTeam_(mpCell_(final, 'Game'), team));
    return gameOk && (!date || !mpCell_(final, 'Commence Time') || mpDateKey_(mpCell_(final, 'Commence Time')) === date);
  });
}

function mpApplyGrade_(row, headers, grade) {
  mpSetRowCell_(row, headers, 'Status', grade.status || ('Graded - ' + grade.result));
  mpSetRowCell_(row, headers, 'Result', grade.result);
  mpSetRowCell_(row, headers, 'Profit/Loss', grade.profitLoss);
  mpSetRowCell_(row, headers, 'Closing Number', grade.closingNumber || '');
  mpSetRowCell_(row, headers, 'Graded Timestamp', new Date());
}

function mpEnsureGradingRuntime_() {
  mpEnsureSheet_(MP_GRADING.finalResultsSheet, mpFinalHeaders_());
  mpEnsureSheet_(MP_GRADING.manualResultsSheet, ['Date','League','Game','Pick','Bet Type','Result','Closing Number','Profit/Loss','Settlement Notes','Source']);
  mpEnsureSheet_(MP_GRADING.longshotsGradingSheet, mpLongshotsManualHeaders_());
  mpEnsureSheet_(MP_GRADING.gradingLogSheet, ['Timestamp','Level','Action','Sheet','Pick','Details']);
  mpEnsureSheet_(MP_GRADING.automationLogSheet, ['Timestamp','Level','Message']);
  mpEnsureSheet_(MP_GRADING.websiteFeedSheet, ['Date','Sport','League','Game','Pick','Bet Type','Odds','Sportsbook','Grade','Units','Writeup','Access','Featured','Status','Release Status','Posted Time','Framework Tags','Edge Analysis','Confidence']);
  mpEnsureSheet_('Longshots History', ['Date','Sport','League','Game','Pick','LongShot Type','Odds','Sportsbook','Grade','Units','Best Number','No Bet Cutoff','Leg Count','Payout Target','Risk Tier','Result','Profit/Loss','Closing Number','Graded Timestamp']);
  mpEnsureSheet_('Lotto Props', ['Date','Sport','League','Game','Pick','Bet Type','Odds','Sportsbook','Grade','Units','Best Number','No Bet Cutoff','Implied Probability','EV Edge','Confidence','Status','Result','Profit/Loss','Closing Number','Graded Timestamp']);
  mpEnsureColumns_(mpEnsureSheet_('Props Results', ['Date','Sport','League','Game','Pick','Bet Type','Odds','Sportsbook','Grade','Units','Best Number','No Bet Cutoff','Implied Probability','EV Edge','Confidence','Status','Result','Profit/Loss','Closing Number','Graded Timestamp']), ['Status', 'Result', 'Profit/Loss', 'Closing Number', 'Graded Timestamp']);
}

function mpFinalHeaders_() {
  return ['Pulled At','Sport Key','Sport Title','Game','Home Team','Away Team','Commence Time','Completed','Home Score','Away Score','Winner','Event ID','Source','Raw Completed'];
}

function mpLongshotsManualHeaders_() {
  return ['Date','League','Game','Pick','Result','Closing Number','Profit/Loss','Settlement Notes','Source','Longshot Name','Leg #','Grading Notes','Final Parlay Odds'];
}

function mpSheet_(name, optional) {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(name);
  if (!sheet && !optional) throw new Error('Missing required sheet: ' + name);
  return sheet;
}

function mpEnsureSheet_(name, headers) {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  else mpEnsureColumns_(sheet, headers);
  return sheet;
}

function mpEnsureColumns_(sheet, headers) {
  const existing = mpReadHeaders_(sheet);
  const normalized = existing.map(mpNorm_);
  const missing = headers.filter(h => normalized.indexOf(mpNorm_(h)) < 0);
  if (missing.length) sheet.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
}

function mpReadHeaders_(sheet) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
}

function mpReadTable_(sheet) {
  const headers = mpReadHeaders_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { headers, rows: [] };
  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return { headers, rows: values.map(row => mpRowObject_(headers, row)) };
}

function mpRowObject_(headers, values) {
  const row = { _headers: headers, _values: values.slice() };
  headers.forEach((header, i) => { row[mpNorm_(header)] = values[i]; });
  return row;
}

function mpHeaderMap_(headers) {
  const map = {};
  headers.forEach((header, i) => { map[mpNorm_(header)] = i; });
  return map;
}

function mpCell_(row, header) {
  const aliases = {
    'Bet Type': ['Bet Type', 'Market', 'Prop Type', 'LongShot Type'],
    'Closing Number': ['Closing Number', 'Closing #', 'Closing Line'],
    'Profit/Loss': ['Profit/Loss', 'P/L', 'PL', 'Profit Loss'],
    'Access': ['Access', 'Tier']
  };
  const names = aliases[header] || [header];
  for (let i = 0; i < names.length; i++) {
    const v = row[mpNorm_(names[i])];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return '';
}

function mpSetRowCell_(row, headers, header, value) {
  let idx = headers.map(mpNorm_).indexOf(mpNorm_(header));
  if (idx < 0) {
    headers.push(header);
    idx = headers.length - 1;
  }
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
  return [mpDateKey_(mpCell_(row, 'Date')), mpCell_(row, 'League') || mpCell_(row, 'Sport'), mpCell_(row, 'Game'), mpCell_(row, 'Pick'), mpCell_(row, 'Bet Type') || mpCell_(row, 'Prop Type') || mpCell_(row, 'LongShot Type')].map(mpCompact_).join('|');
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

function mpIsLottoPick_(row) {
  const text = mpClean_(`${mpCell_(row, 'Category')} ${mpCell_(row, 'Bet Type')} ${mpCell_(row, 'Prop Type')} ${mpCell_(row, 'LongShot Type')} ${mpCell_(row, 'Pick')} ${mpCell_(row, 'Framework Tags')}`);
  return text.includes('lotto') || text.includes('hr prop') || text.includes('home run prop') || text.includes('hr sprinkle');
}

function mpIsVipAccess_(row) {
  const access = mpClean_(mpCell_(row, 'Access'));
  return access === 'vip' || access === 'premium';
}

function mpIsParlay_(row) {
  const text = mpClean_(`${mpCell_(row, 'LongShot Type')} ${mpCell_(row, 'Bet Type')} ${mpCell_(row, 'Pick')}`);
  return text.includes('parlay') || text.includes('lotto') || mpNumber_(mpCell_(row, 'Leg Count')) > 1 || Boolean(mpCell_(row, 'Legs')) || String(mpCell_(row, 'Pick')).indexOf('|') >= 0;
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

function mpSelectedTeam_(pick, final) {
  const teams = [mpCell_(final, 'Home Team'), mpCell_(final, 'Away Team')];
  return teams.find(team => mpContainsTeam_(pick, team)) || '';
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
function mpWriteRows_(name, rows) { const sh = mpEnsureSheet_(name, rows[0] || ['Value']); mpRewriteRows_(sh, rows[0] || ['Value'], rows.slice(1)); }
function mpRewriteRows_(sheet, headers, rows) {
  sheet.clearContents();
  const values = [headers].concat(rows);
  if (values.length) sheet.getRange(1, 1, values.length, headers.length).setValues(values.map(row => {
    const out = row.slice(0, headers.length);
    while (out.length < headers.length) out.push('');
    return out;
  }));
}
function mpRowsToObjects_(rows) { const headers = rows[0] || []; return rows.slice(1).map(row => mpRowObject_(headers, row)); }

function mpFetchRetry_(url) {
  let last;
  for (let i = 0; i <= MP_GRADING.retryAttempts; i++) {
    try {
      const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      return { code: response.getResponseCode(), body: response.getContentText() };
    } catch (err) {
      last = err;
      Utilities.sleep(MP_GRADING.retrySleepMs * (i + 1));
    }
  }
  throw last;
}

function mpFallbackKey_() {
  const props = PropertiesService.getScriptProperties();
  const keys = ['THE_ODDS_API_KEY', 'ODDS_API_KEY', 'FALLBACK_ODDS_API_KEY'];
  for (let i = 0; i < keys.length; i++) {
    const value = props.getProperty(keys[i]);
    if (value) return { name: keys[i], value };
  }
  return null;
}

function queryString_(params) {
  return Object.keys(params).map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join('&');
}
