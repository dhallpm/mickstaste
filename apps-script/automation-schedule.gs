/* Micks Picks automation schedule manager
 * Run updateMicksPicksAutomationSchedule() once after deploying this Apps Script file.
 * Desired schedules:
 * - pullOddsAPI: every 30 minutes
 * - runMicksPicksAutoConfirmAutomation: every 10 minutes
 * - runMicksPicksAutoGrading: daily near 2:00 AM America/New_York
 */

const MP_AUTOMATION_TZ = 'America/New_York';
const MP_AUTOMATION_SCHEDULE = [
  { handler: 'pullOddsAPI', type: 'minutes', minutes: 30, label: 'Odds API pull' },
  { handler: 'runMicksPicksAutoConfirmAutomation', type: 'minutes', minutes: 10, label: 'Auto-confirm' },
  { handler: 'runMicksPicksAutoGrading', type: 'daily', hour: 2, nearMinute: 0, timezone: MP_AUTOMATION_TZ, label: 'Auto-grading' }
];

function updateMicksPicksAutomationSchedule() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) {
    mpScheduleLog_('WARN', 'Schedule update skipped: another trigger update is running');
    return { ok: false, skipped: true, reason: 'lock active' };
  }

  try {
    const before = ScriptApp.getProjectTriggers();
    const removed = [];
    const created = [];
    const kept = [];

    MP_AUTOMATION_SCHEDULE.forEach(rule => {
      const matches = before.filter(trigger => trigger.getHandlerFunction && trigger.getHandlerFunction() === rule.handler);
      matches.forEach(trigger => {
        ScriptApp.deleteTrigger(trigger);
        removed.push(mpTriggerSummary_(trigger, `Removed existing ${rule.handler} trigger before reinstalling ${mpScheduleDescription_(rule)}`));
      });

      const createdTrigger = mpCreateScheduleTrigger_(rule);
      created.push(mpTriggerSummary_(createdTrigger, `Created ${rule.handler} ${mpScheduleDescription_(rule)}`));
    });

    const after = ScriptApp.getProjectTriggers();
    const finalSchedules = MP_AUTOMATION_SCHEDULE.map(rule => {
      const active = after.filter(trigger => trigger.getHandlerFunction && trigger.getHandlerFunction() === rule.handler);
      return `${rule.handler} -> ${mpScheduleDescription_(rule)} (${active.length} active trigger${active.length === 1 ? '' : 's'})`;
    });

    const duplicates = finalSchedules.filter(line => !line.includes('(1 active trigger)'));
    const details = `Removed=${removed.length}; Created=${created.length}; Final=${finalSchedules.join(' | ')}`;
    mpScheduleLog_('INFO', 'Automation schedule updated: ' + details);
    mpScheduleCommandCenter_(removed, created, finalSchedules, duplicates);

    return {
      ok: duplicates.length === 0,
      removedTriggerIds: removed.map(item => item.id),
      createdTriggerIds: created.map(item => item.id),
      keptTriggerIds: kept.map(item => item.id),
      finalSchedules,
      duplicateTriggersRemoved: removed.length > 0,
      validation: duplicates.length ? 'Duplicate validation failed: ' + duplicates.join(' | ') : 'Duplicate validation passed'
    };
  } finally {
    lock.releaseLock();
  }
}

function setupMicksPicksAutomationTriggersV2() {
  return updateMicksPicksAutomationSchedule();
}

function setupMicksPicksDailyAutoGradingAndRunNow() {
  const schedule = updateMicksPicksAutomationSchedule();
  const run = runMicksPicksAutoGrading();
  mpScheduleLog_('INFO', `Daily auto-grading installed and run now: ${JSON.stringify({ schedule, run })}`);
  return { ok: schedule.ok !== false && run.ok !== false, schedule, run };
}

function runMicksPicksAutoGradingNow() {
  return runMicksPicksAutoGrading();
}

function runMicksPicksAutoConfirmAutomation() {
  if (typeof autoConfirmActivePicks === 'function') return autoConfirmActivePicks();
  if (typeof runAutoConfirmEngine === 'function') return runAutoConfirmEngine();
  if (typeof runMicksPicksAutoConfirmation === 'function') return runMicksPicksAutoConfirmation();
  if (typeof runMicksPicksAutoConfirm === 'function') return runMicksPicksAutoConfirm();
  mpScheduleLog_('WARN', 'Auto-confirm skipped: no auto-confirm implementation found');
  return { ok: false, skipped: true, reason: 'No auto-confirm implementation found' };
}

function mpCreateScheduleTrigger_(rule) {
  const builder = ScriptApp.newTrigger(rule.handler).timeBased();
  if (rule.type === 'daily') {
    return builder
      .atHour(rule.hour)
      .nearMinute(rule.nearMinute || 0)
      .everyDays(1)
      .inTimezone(rule.timezone || MP_AUTOMATION_TZ)
      .create();
  }
  return builder.everyMinutes(rule.minutes).create();
}

function mpScheduleDescription_(rule) {
  if (rule.type === 'daily') return `daily near ${rule.hour}:00 AM ${rule.timezone || MP_AUTOMATION_TZ}`;
  return `every ${rule.minutes} minutes`;
}

function mpTriggerSummary_(trigger, note) {
  let id = '';
  try { id = trigger.getUniqueId ? trigger.getUniqueId() : ''; } catch (err) { id = ''; }
  return {
    id: id || '(trigger id unavailable)',
    handler: trigger.getHandlerFunction ? trigger.getHandlerFunction() : '',
    eventType: trigger.getEventType ? String(trigger.getEventType()) : '',
    source: trigger.getTriggerSource ? String(trigger.getTriggerSource()) : '',
    note: note || ''
  };
}

function mpScheduleLog_(level, message) {
  const sheet = mpScheduleSheet_('Micks Picks Automation Log');
  if (sheet.getLastRow() === 0) sheet.appendRow(['Timestamp', 'Level', 'Message']);
  sheet.appendRow([new Date(), level || 'INFO', message || '']);
}

function mpScheduleCommandCenter_(removed, created, finalSchedules, duplicates) {
  const sheet = mpScheduleSheet_('Command Center');
  const rows = [
    ['Automation Schedule', 'pullOddsAPI', 'Active', 'Every 30 minutes; old 5-minute triggers removed'],
    ['Automation Schedule', 'runMicksPicksAutoConfirmAutomation', 'Active', 'Every 10 minutes'],
    ['Automation Schedule', 'runMicksPicksAutoGrading', 'Active', 'Daily near 2:00 AM America/New_York'],
    ['Trigger Validation', 'Removed Trigger IDs', removed.length ? removed.map(item => item.id).join(', ') : 'None', 'Duplicate cleanup completed'],
    ['Trigger Validation', 'Created Trigger IDs', created.length ? created.map(item => item.id).join(', ') : 'None', 'New desired schedule installed'],
    ['Trigger Validation', 'Final Active Schedules', finalSchedules.join(' | '), duplicates.length ? 'Duplicate validation failed' : 'Duplicate validation passed']
  ];
  const start = Math.max(sheet.getLastRow() + 1, 1);
  sheet.getRange(start, 1, rows.length, 4).setValues(rows);
}

function mpScheduleSheet_(name) {
  const ss = SpreadsheetApp.getActive();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}
