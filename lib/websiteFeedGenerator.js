import { listActiveAirtablePicks, listWebsiteFeedRecords, logSyncAction } from './airtableClient.js'
import { isClosedOrGraded, routePickCategory } from './routePickCategory.js'

function toIsoDate(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

function isToday(row, date = new Date()) {
  const rowDate = toIsoDate(row.Date || row.date || row['Game Date'] || row.Timestamp)
  return rowDate === date.toISOString().slice(0, 10)
}

function cleanRow(row = {}) {
  const route = routePickCategory(row)
  return {
    id: row.airtableRecordId || row.id || '',
    source: 'Airtable',
    section: route.websiteSection,
    date: toIsoDate(row.Date || row.date || row['Game Date'] || row.Timestamp),
    league: row.League || row.Sport || row.league || '',
    game: row.Game || row.Matchup || row.game || '',
    pick: row.Pick || row.Selection || row.pick || '',
    market: row.Market || row['Bet Type'] || row.Type || '',
    odds: row.Odds ?? '',
    units: row.Units ?? row['Units to Commit'] ?? '',
    status: row.Status || row['Display Status'] || '',
    access: row.Access || row.Tier || row['Access Tier'] || 'Free',
    cardTitle: row['Card Title'] || row.Pick || row.Selection || '',
    lineNumber: row['Line / Number'] || row.Line || row.Number || '',
    sportsbook: row.Sportsbook || row.Book || row['Card Sportsbook'] || '',
    description: row['Card Description'] || row.Description || row.Writeup || ''
  }
}

export async function generateWebsiteFeed(options = {}) {
  const date = options.date ? new Date(options.date) : new Date()
  const airtableRows = await listActiveAirtablePicks()
  const feedRows = await listWebsiteFeedRecords().catch(() => [])
  const sourceRows = airtableRows.length ? airtableRows : feedRows
  const rows = sourceRows
    .filter(row => isToday(row, date))
    .filter(row => !isClosedOrGraded(row))
    .map(cleanRow)
    .filter(row => row.pick && row.date)

  const deduped = Array.from(new Map(rows.map(row => [[row.date, row.game, row.pick].join('|').toLowerCase(), row])).values())

  await logSyncAction('Generate website feed', {
    source: 'Airtable',
    destination: 'Website API',
    count: deduped.length,
    message: 'Generated clean non-stale website feed rows'
  })

  return { date: date.toISOString().slice(0, 10), rows: deduped }
}

export default generateWebsiteFeed
