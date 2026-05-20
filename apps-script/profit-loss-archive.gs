/* Micks Picks Profit/Loss Calculation & Archive Management
 * Functions to calculate profit/loss units and manage bet archival
 */

const PROFIT_LOSS = {
  activeSheetsToArchive: [
    { active: 'Active Picks', archive: 'Results Archive' },
    { active: 'Props Lab', archive: 'Props Results' },
    { active: 'Micks LongShots', archive: 'Longshots History' }
  ],
  profitLossUnitsColumn: 'Profit/Loss Units',
  profitLossColumn: 'Profit/Loss',
  unitsColumn: 'Units',
  oddsColumn: 'Odds',
  statusColumn: 'Status',
  resultColumn: 'Result'
};

/**
 * Main function to calculate profit/loss units on all active sheets
 * Runs after grading is complete
 */
function calculateProfitLossUnits() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    console.log('calculateProfitLossUnits skipped: lock active');
    return { ok: false, reason: 'lock active' };
  }

  try {
    const summary = { checked: 0, calculated: 0, updated: 0, errors: 0 };

    PROFIT_LOSS.activeSheetsToArchive.forEach(config => {
      try {
        const sheet = getSheetByName(config.active, true);
        if (!sheet) {
          console.log(`Sheet ${config.active} not found (optional)`);
          return;
        }

        const table = readTable(sheet);
        const headers = table.headers;
        const headerMap = createHeaderMap(headers);

        table.rows.forEach(row => {
          summary.checked++;
          try {
            if (!hasPick(row)) return;

            const result = getCellValue(row, 'Result');
            const status = getCellValue(row, 'Status');
            
            // Only calculate for graded bets
            if (!result || !['Win', 'Loss', 'Push', 'Void'].includes(result)) {
              return;
            }

            const units = parseUnits(getCellValue(row, PROFIT_LOSS.unitsColumn));
            const odds = parseAmericanOdds(getCellValue(row, PROFIT_LOSS.oddsColumn));
            
            const profitLoss = calculateProfit(units, odds, result);
            
            setRowCell(row, headers, PROFIT_LOSS.profitLossUnitsColumn, profitLoss);
            summary.calculated++;
          } catch (err) {
            summary.errors++;
            console.log(`Error calculating P/L for row: ${err.message}`);
          }
        });

        // Write updated rows back
        if (summary.calculated > 0) {
          rewriteRows(sheet, headers, table.rows.map(r => r._values));
          summary.updated++;
        }
      } catch (err) {
        summary.errors++;
        console.log(`Error processing ${config.active}: ${err.message}`);
      }
    });

    logAutomation('Profit/Loss Calculation', 'Completed', 
      `Checked=${summary.checked}; Calculated=${summary.calculated}; Errors=${summary.errors}`);
    
    return { ok: true, summary };
  } catch (err) {
    logAutomation('Profit/Loss Calculation', 'Failed', err.message);
    throw err;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Archive closed bets from active sheets to archive sheets
 * Call this after grading is complete
 */
function archiveClosedBets() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) {
    console.log('archiveClosedBets skipped: lock active');
    return { ok: false, reason: 'lock active' };
  }

  try {
    const summary = { archived: 0, deduplicated: 0, errors: 0, failed: [] };

    PROFIT_LOSS.activeSheetsToArchive.forEach(config => {
      try {
        const activeSheet = getSheetByName(config.active, true);
        const archiveSheet = getSheetByName(config.archive, false);

        if (!activeSheet || !archiveSheet) {
          console.log(`Skipping ${config.active} -> ${config.archive}: sheets not found`);
          return;
        }

        // Get existing archive rows for deduplication
        const archiveTable = readTable(archiveSheet);
        const archiveKeys = new Set(
          archiveTable.rows
            .filter(row => hasPick(row))
            .map(row => generatePickKey(row))
        );

        // Get active rows
        const activeTable = readTable(activeSheet);
        const keep = [];
        const toArchive = [];

        activeTable.rows.forEach(row => {
          try {
            if (!hasPick(row)) {
              keep.push(row._values);
              return;
            }

            const result = getCellValue(row, 'Result');
            const status = getCellValue(row, 'Status');

            // Archive if graded
            if (result && ['Win', 'Loss', 'Push', 'Void'].includes(result)) {
              const key = generatePickKey(row);
              
              // Check for duplicates in archive
              if (archiveKeys.has(key)) {
                summary.deduplicated++;
                keep.push(row._values);
                return;
              }

              toArchive.push(row);
              archiveKeys.add(key);
            } else {
              keep.push(row._values);
            }
          } catch (err) {
            keep.push(row._values);
            console.log(`Error processing row: ${err.message}`);
            summary.errors++;
          }
        });

        // Append to archive
        toArchive.forEach(row => {
          try {
            appendToArchive(archiveSheet, activeTable.headers, row._values);
            summary.archived++;
          } catch (err) {
            summary.failed.push(config.archive);
            console.log(`Error appending to ${config.archive}: ${err.message}`);
            summary.errors++;
          }
        });

        // Rewrite active sheet without archived rows
        if (toArchive.length > 0) {
          rewriteRows(activeSheet, activeTable.headers, keep);
        }
      } catch (err) {
        summary.failed.push(config.archive);
        console.log(`Error in archiveClosedBets for ${config.active}: ${err.message}`);
        summary.errors++;
      }
    });

    logAutomation('Archive Closed Bets', 'Completed',
      `Archived=${summary.archived}; Deduplicated=${summary.deduplicated}; Errors=${summary.errors}`);

    return { ok: true, summary };
  } catch (err) {
    logAutomation('Archive Closed Bets', 'Failed', err.message);
    throw err;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Route a single bet to appropriate archive based on bet type
 * @param {Object} row - Bet row object
 * @returns {String} Archive sheet name
 */
function routeBetToArchive(row) {
  if (!hasPick(row)) return null;

  const betType = getCellValue(row, 'Bet Type') || '';
  const longShotType = getCellValue(row, 'LongShot Type') || '';
  const propType = getCellValue(row, 'Prop Type') || '';
  const pick = getCellValue(row, 'Pick') || '';

  // Determine bet category
  const text = `${betType} ${longShotType} ${propType} ${pick}`.toLowerCase();

  if (text.includes('longshot') || text.includes('parlay')) {
    return 'Longshots History';
  }
  if (text.includes('prop') || propType.toLowerCase().includes('prop')) {
    return 'Props Results';
  }
  
  // Default to results archive
  return 'Results Archive';
}

/**
 * Deduplicate archive rows by pick key
 * @param {String} archiveSheetName - Name of archive sheet to deduplicate
 * @returns {Object} Deduplication summary
 */
function dedupeArchiveRows(archiveSheetName) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    return { ok: false, reason: 'lock active' };
  }

  try {
    const sheet = getSheetByName(archiveSheetName, false);
    if (!sheet) {
      throw new Error(`Sheet ${archiveSheetName} not found`);
    }

    const table = readTable(sheet);
    const seen = new Map();
    const unique = [];
    const duplicates = [];

    table.rows.forEach(row => {
      if (!hasPick(row)) {
        unique.push(row._values);
        return;
      }

      const key = generatePickKey(row);
      if (seen.has(key)) {
        duplicates.push(key);
      } else {
        seen.set(key, true);
        unique.push(row._values);
      }
    });

    const removed = table.rows.length - unique.length;
    if (removed > 0) {
      rewriteRows(sheet, table.headers, unique);
      logAutomation('Archive Deduplication', archiveSheetName,
        `Removed ${removed} duplicate rows; Unique=${unique.length}`);
    }

    return {
      ok: true,
      sheet: archiveSheetName,
      total: table.rows.length,
      unique: unique.length,
      removed: removed,
      duplicateKeys: duplicates
    };
  } catch (err) {
    logAutomation('Archive Deduplication', 'Failed', err.message);
    throw err;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Calculate profit/loss based on units, odds, and result
 * @param {Number} units - Units wagered
 * @param {Number} odds - American odds (e.g., +110, -110)
 * @param {String} result - 'Win', 'Loss', 'Push', or 'Void'
 * @returns {String} Formatted profit/loss string (e.g., "+2.50", "-1.00")
 */
function calculateProfit(units, odds, result) {
  if (!units || units <= 0) return '0.00';
  
  if (result === 'Push' || result === 'Void') return '0.00';
  if (result === 'Loss') return '-' + units.toFixed(2);
  if (result !== 'Win') return '';

  if (!isFinite(odds)) return units.toFixed(2);

  // Calculate profit based on American odds
  const profit = odds > 0 ? units * odds / 100 : units * 100 / Math.abs(odds);
  return '+' + profit.toFixed(2);
}

/**
 * Parse American odds from string
 * @param {String} value - Odds string (e.g., "+110", "-110", "110")
 * @returns {Number} American odds value
 */
function parseAmericanOdds(value) {
  const s = String(value || '');
  if (/pending|best available|confirm/i.test(s)) return NaN;
  const m = s.match(/[+-]?\d{3,4}/);
  return m ? Number(m[0]) : NaN;
}

/**
 * Parse units from string, handling commas and operators
 * @param {String} value - Units string (e.g., "2.5", "2,50", "+5")
 * @returns {Number} Units value
 */
function parseUnits(value) {
  const m = String(value || '').replace(/[,+]/g, '').match(/[-+]?\d*\.?\d+/);
  return m ? Number(m[0]) : 0;
}

/**
 * Generate unique key for a bet (for deduplication)
 * @param {Object} row - Bet row object
 * @returns {String} Unique key combining date, league, game, pick, and type
 */
function generatePickKey(row) {
  const parts = [
    formatDateKey(getCellValue(row, 'Date')),
    getCellValue(row, 'League') || getCellValue(row, 'Sport'),
    getCellValue(row, 'Game'),
    getCellValue(row, 'Pick'),
    getCellValue(row, 'Bet Type') || getCellValue(row, 'Prop Type') || ''
  ];
  return parts.map(p => String(p || '').trim().toLowerCase()).join('|');
}

/**
 * Format date for consistent key matching
 * @param {String|Date} value - Date value
 * @returns {String} Formatted date (YYYYMMDD)
 */
function formatDateKey(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, 'America/New_York', 'yyyyMMdd');
  }
  const s = String(value || '').trim();
  
  // Try YYYY-MM-DD format
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return m[1] + String(m[2]).padStart(2, '0') + String(m[3]).padStart(2, '0');
  
  // Try MM/DD/YYYY or MM/DD/YY format
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    const year = m[3].length === 2 ? '20' + m[3] : m[3];
    return year + String(m[1]).padStart(2, '0') + String(m[2]).padStart(2, '0');
  }
  
  // Try parsing as date string
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return Utilities.formatDate(d, 'America/New_York', 'yyyyMMdd');
  }
  
  return compactString(s);
}

/**
 * Read table from sheet as header + rows with object mapping
 * @param {Sheet} sheet - Google Sheet
 * @returns {Object} { headers: [], rows: [] }
 */
function readTable(sheet) {
  const headers = readHeaders(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { headers, rows: [] };
  
  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return {
    headers,
    rows: values.map(row => createRowObject(headers, row))
  };
}

/**
 * Read header row from sheet
 */
function readHeaders(sheet) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
}

/**
 * Create row object with both array (_values) and object access
 */
function createRowObject(headers, values) {
  const row = { _headers: headers, _values: values.slice() };
  headers.forEach((header, i) => {
    row[normalizeHeader(header)] = values[i];
  });
  return row;
}

/**
 * Create mapping of normalized headers to indices
 */
function createHeaderMap(headers) {
  const map = {};
  headers.forEach((header, i) => {
    map[normalizeHeader(header)] = i;
  });
  return map;
}

/**
 * Get cell value with alias support
 */
function getCellValue(row, header) {
  const aliases = {
    'Bet Type': ['Bet Type', 'Market', 'Prop Type', 'LongShot Type'],
    'Closing Number': ['Closing Number', 'Closing #', 'Closing Line'],
    'Profit/Loss': ['Profit/Loss', 'P/L', 'PL', 'Profit Loss'],
    'Access': ['Access', 'Tier'],
    'Result': ['Result', 'Outcome', 'Grade'],
    'Status': ['Status', 'Graded Status']
  };
  
  const names = aliases[header] || [header];
  for (let i = 0; i < names.length; i++) {
    const v = row[normalizeHeader(names[i])];
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      return v;
    }
  }
  return '';
}

/**
 * Set cell value in row object
 */
function setRowCell(row, headers, header, value) {
  let idx = headers.map(normalizeHeader).indexOf(normalizeHeader(header));
  if (idx < 0) {
    headers.push(header);
    idx = headers.length - 1;
  }
  while (row._values.length <= idx) {
    row._values.push('');
  }
  row._values[idx] = value;
  row[normalizeHeader(header)] = value;
}

/**
 * Check if row has a pick
 */
function hasPick(row) {
  return Boolean(getCellValue(row, 'Pick') || getCellValue(row, 'Play'));
}

/**
 * Normalize header for consistent matching
 */
function normalizeHeader(v) {
  return String(v || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w#/% ]/g, '');
}

/**
 * Create compact string (remove non-alphanumeric)
 */
function compactString(v) {
  return String(v || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Get sheet by name safely
 */
function getSheetByName(name, optional) {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(name);
  if (!sheet && !optional) {
    throw new Error('Missing required sheet: ' + name);
  }
  return sheet;
}

/**
 * Append row to archive sheet
 */
function appendToArchive(sheet, sourceHeaders, values) {
  const headers = readHeaders(sheet);
  const sourceMap = createHeaderMap(sourceHeaders);
  
  const out = headers.map(header => {
    const idx = sourceMap[normalizeHeader(header)];
    return idx == null ? '' : values[idx];
  });
  
  sheet.appendRow(out);
}

/**
 * Rewrite all rows in a sheet (clear and repopulate)
 */
function rewriteRows(sheet, headers, rows) {
  sheet.clearContents();
  const values = [headers].concat(rows);
  if (values.length) {
    sheet.getRange(1, 1, values.length, headers.length).setValues(
      values.map(row => {
        const out = row.slice(0, headers.length);
        while (out.length < headers.length) out.push('');
        return out;
      })
    );
  }
}

/**
 * Log automation event to Micks Picks Automation Log
 */
function logAutomation(level, message, details) {
  const sh = getSheetByName('Micks Picks Automation Log', false);
  if (!sh) return;
  sh.appendRow([new Date(), level || '', message || '', details || '']);
}
