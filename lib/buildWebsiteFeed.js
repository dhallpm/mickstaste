import { listActiveAirtablePicks, logSyncAction } from './airtableClient.js'
import { isActiveVisible, routePickCategory, rowDateKey } from './routePickCategory.js'
import { buildRecordKey, withRecordKey } from './recordKey.js'

function newestFirst(a, b) {
  return String(b.date || '').localeCompare(String(a.date || '')) ||
    String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
}

function access(row = {}) {
  return String(row.Access || row.Tier || row['Access Tier'] || '').toLowerCase()
}

function cleanRow(row = {}) {
  const keyed = withRecordKey(row)
  const route = routePickCategory(keyed)
  return {
    id: keyed.airtableRecordId || keyed.id || '',
    recordKey: keyed['Record Key'] || buildRecordKey(keyed),
    source: 'Airtable',
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
    status: keyed.Status || keyed['Release Status'] || keyed['Display Status'] || '',
    access: keyed.Access || keyed.Tier || keyed['Access Tier'] || 'Free',
    cardTitle: keyed['Card Title'] || keyed.Pick || keyed.Selection || '',
    lineNumber: keyed['Line / Number'] || keyed.Line || keyed.Number || '',
    sportsbook: keyed.Sportsbook || keyed.Book || keyed['Card Sportsbook'] || '',
    description: keyed['Card Description'] || keyed.Description || keyed.Writeup || '',
    originalTable: keyed.__table || ''
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
  const rows = (await listActiveAirtablePicks())
    .filter(row => isActiveVisible(row, now))
    .map(cleanRow)
    .filter(row => row.pick && row.date)

  const deduped = Array.from(new Map(rows.map(row => [row.recordKey, row])).values())
    .sort(newestFirst)
  const categorized = categorizeWebsiteRows(deduped)

  await logSyncAction('Generate website feed', {
    source: 'Airtable',
    destination: 'Website API',
    count: deduped.length,
    message: 'Generated clean non-stale website feed rows'
  })

  return {
    date: rowDateKey({ Date: now }),
    rows: deduped,
    ...categorized
  }
}

export default buildWebsiteFeed
