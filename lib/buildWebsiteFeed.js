import { listActiveAirtablePicksWithWarnings, logSyncAction } from './airtableClient.js'
import { sanitizeCustomerFacingAnalysis } from './customerFacingAnalysis.js'
import { listGoogleSheetsFallbackRows } from './googleSheetsFallbackFeed.js'
import { isActiveVisible, routePickCategory, rowDateKey } from './routePickCategory.js'
import { buildRecordKey, withRecordKey } from './recordKey.js'

function newestFirst(a, b) {
  return String(b.date || '').localeCompare(String(a.date || '')) ||
    String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
}

function access(row = {}) {
  return String(row.access || row.Access || row.Tier || row['Access Tier'] || '').toLowerCase()
}

function cleanRow(row = {}) {
  const keyed = withRecordKey(row)
  const route = routePickCategory(keyed)
  return {
    id: keyed.airtableRecordId || keyed.id || '',
    recordKey: keyed['Record Key'] || buildRecordKey(keyed),
    source: keyed.source || 'Airtable',
    section: route.websiteSection,
    date: rowDateKey(keyed),
    updatedAt: keyed['Last Modified'] || keyed['Updated At'] || keyed.Timestamp || '',
    league: keyed.League || keyed.Sport || keyed.league || '',
    game: keyed.Game || keyed.Matchup || keyed.game || '',
    pick: keyed.Pick || keyed.Selection || keyed.pick || '',
    betType: keyed['Bet Type'] || keyed.Type || keyed.Market || '',
    market: keyed.Market || keyed['Bet Type'] || keyed.Type || '',
    odds: keyed.Odds ?? '',
    units: keyed.Units ?? keyed['Units to Commit'] ?? '',
    bestNumber: keyed['Best Number'] || keyed.Line || keyed.Number || '',
    noBetCutoff: keyed['No Bet Cutoff'] || '',
    status: keyed.Status || keyed['Release Status'] || keyed['Display Status'] || '',
    releaseStatus: keyed['Release Status'] || keyed['Display Release Status'] || '',
    access: keyed.Access || keyed.Tier || keyed['Access Tier'] || 'Free',
    cardTitle: keyed['Card Title'] || keyed.Pick || keyed.Selection || '',
    lineNumber: keyed['Line / Number'] || keyed.Line || keyed.Number || '',
    sportsbook: keyed.Sportsbook || keyed.Book || keyed['Card Sportsbook'] || '',
    writeup: keyed.Writeup || keyed['Card Description'] || keyed.Description || '',
    marketNotes: keyed['Market Notes'] || '',
    injuryNotes: keyed['Injury Notes'] || '',
    sourceVerification: keyed['Source Verification'] || '',
    fullAnalysis: sanitizeCustomerFacingAnalysis(keyed),
    description: keyed['Card Description'] || keyed.Description || keyed.Writeup || '',
    originalTable: keyed.__table || ''
  }
}

function sourceLabel(source) {
  return source === 'google_sheets_fallback' ? 'Google Sheets Fallback' : 'Airtable'
}

function shouldUseFallback(activeResult) {
  return activeResult.needsFallback || !activeResult.rows.length
}

function activeFallbackRows(rows = []) {
  return rows.filter(row => !['Results Archive'].includes(row.__table))
}

async function getSourceRows() {
  const warnings = []
  let activeResult

  try {
    activeResult = await listActiveAirtablePicksWithWarnings()
    warnings.push(...(activeResult.warnings || []))
  } catch (error) {
    warnings.push(`Airtable read failed; trying Google Sheets fallback. ${error.message}`)
    activeResult = {
      rows: [],
      warnings,
      source: 'airtable',
      needsFallback: true,
      airtableError: error
    }
  }

  if (!shouldUseFallback(activeResult)) {
    return {
      source: 'airtable',
      sourceOfTruth: sourceLabel('airtable'),
      warnings,
      rows: activeResult.rows
    }
  }

  try {
    const fallback = await listGoogleSheetsFallbackRows()
    const hasMissingMaster = activeResult.needsFallback || activeResult.missingRequiredTables?.includes('Master Picks')
    const fallbackWarnings = [...warnings]

    if (hasMissingMaster) {
      fallbackWarnings.push('Airtable table Master Picks not found; used Google Sheets Active Picks fallback.')
    } else {
      fallbackWarnings.push('Airtable did not return active picks; used Google Sheets fallback.')
    }

    fallbackWarnings.push(...fallback.warnings)

    return {
      source: 'google_sheets_fallback',
      sourceOfTruth: sourceLabel('google_sheets_fallback'),
      warnings: fallbackWarnings,
      rows: activeFallbackRows(fallback.rows)
    }
  } catch (fallbackError) {
    const error = new Error(`Airtable and Google Sheets fallback both failed: ${fallbackError.message}`)
    error.statusCode = fallbackError.statusCode || activeResult.airtableError?.statusCode || 500
    error.warnings = [...warnings, ...(fallbackError.warnings || [])]
    throw error
  }
}

export function categorizeWebsiteRows(rows = []) {
  return rows.reduce((groups, row) => {
    if (row.section === 'props') groups.props.push(row)
    else if (row.section === 'lotto') groups.lottoParlays.push(row)
    else if (row.section === 'longshots') groups.longshots.push(row)
    else if (access(row).includes('vip') || access(row).includes('premium')) groups.vip.push(row)
    else groups.free.push(row)
    return groups
  }, { free: [], vip: [], props: [], lottoParlays: [], longshots: [] })
}

export async function buildWebsiteFeed(options = {}) {
  const now = options.date ? new Date(options.date) : new Date()
  const sourceResult = await getSourceRows()
  const rows = sourceResult.rows
    .filter(row => isActiveVisible(row, now))
    .map(cleanRow)
    .filter(row => row.pick && row.date)

  const deduped = Array.from(new Map(rows.map(row => [row.recordKey, row])).values())
    .sort(newestFirst)
  const categorized = categorizeWebsiteRows(deduped)

  await logSyncAction('Generate website feed', {
    source: sourceResult.sourceOfTruth,
    destination: 'Website API',
    count: deduped.length,
    message: 'Generated clean non-stale website feed rows'
  })

  return {
    source: sourceResult.source,
    sourceOfTruth: sourceResult.sourceOfTruth,
    date: rowDateKey({ Date: now }),
    warnings: sourceResult.warnings,
    rows: deduped,
    ...categorized
  }
}

export default buildWebsiteFeed
