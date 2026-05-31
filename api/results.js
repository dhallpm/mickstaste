import {
  ACTIVE_AIRTABLE_TABLE_CONFIG,
  AIRTABLE_TABLE_RESOLVERS,
  flattenRecord,
  listAirtableRecords,
  listAirtableRecordsFromResolvedTable
} from '../lib/airtableClient.js'
import { routePickCategory, rowDateKey, todayEasternKey } from '../lib/routePickCategory.js'
import { sendError } from '../lib/syncAuth.js'

const ARCHIVE_TABLES = [
  'Results Archive',
  'VIP Archive',
  'Props Results',
  'Lotto Props',
  'Lotto Parlays Archive',
  'Longshots History'
]

function text(...values) {
  return values.map(value => String(value ?? '').trim()).find(Boolean) || ''
}

function resultOf(row = {}) {
  const source = [row.Result, row.Outcome, row.Status, row['Display Status']].join(' ')
  if (/\b(win|won|cash|cashed)\b/i.test(source)) return 'Win'
  if (/\b(loss|lost|lose|failed)\b/i.test(source)) return 'Loss'
  if (/\bpush\b/i.test(source)) return 'Push'
  if (/\b(void|cancelled|canceled)\b/i.test(source)) return 'Void'
  return text(row.Result, row.Outcome, row.Status, row['Display Status'], 'Pending')
}

function hasPick(row = {}) {
  return Boolean(text(row.Pick, row.Selection, row.Play, row.Name, row.Game, row.Matchup, row.Legs, row['Card Title']))
}

function parseNumber(value) {
  const match = String(value ?? '').replace(/,/g, '').match(/[-+]?\d*\.?\d+/)
  return match ? Number(match[0]) : NaN
}

function calculateProfitLoss(row = {}) {
  const existing = text(row['Profit/Loss'], row['P/L'], row.PL, row['Profit Loss'])
  if (existing) return existing
  const result = resultOf(row)
  const units = parseNumber(text(row.Units, row['Units to Commit'], row.Stake))
  if (!Number.isFinite(units) || units <= 0) return ''
  if (result === 'Push' || result === 'Void') return '0.00u'
  if (result === 'Loss') return `-${units.toFixed(2)}u`
  if (result !== 'Win') return ''
  const odds = parseNumber(text(row.Odds, row.Price, row['Card Odds']))
  if (!Number.isFinite(odds) || odds === 0) return ''
  const profit = odds > 0 ? units * odds / 100 : units * 100 / Math.abs(odds)
  return `+${profit.toFixed(2)}u`
}

function normalizeRow(row = {}, sourceTable = '') {
  const result = resultOf(row)
  const pl = calculateProfitLoss(row)
  return {
    ...row,
    __source: sourceTable || row.__table || 'Airtable Results API',
    Date: rowDateKey(row) || text(row.Date, row.date, row['Game Date'], row.Timestamp),
    League: text(row.League, row.Sport, row.league),
    Sport: text(row.Sport, row.League),
    Game: text(row.Game, row.Matchup, row.Event, row.game),
    Pick: text(row.Pick, row.Selection, row.Play, row.Name, row['Card Title']),
    'Bet Type': text(row['Bet Type'], row.Market, row.Type),
    Odds: text(row.Odds, row.Price, row['Card Odds']),
    Grade: text(row['Card Grade'], row.Grade, row.grade),
    Units: text(row.Units, row['Units to Commit'], row.Stake),
    Result: result,
    'Profit/Loss': pl,
    'P/L': pl,
    PL: pl,
    Status: text(row.Status, row['Display Status'], result),
    Access: text(row.Access, row.Tier, row['Access Tier'], 'Free'),
    Category: text(row.Category, row.Type, row['Parlay Type']),
    Legs: text(row.Legs, row['Legs / Details'], row['Parlay Type']),
    Timestamp: text(row['Settled At'], row['Graded Timestamp'], row.Timestamp, row['Posted Time']),
    'Closing Number': text(row['Closing Number'], row['Closing #'], row['Closing Line'])
  }
}

function isFinalResult(row = {}) {
  return ['Win', 'Loss', 'Push', 'Void'].includes(resultOf(row))
}

function isWithinDays(row = {}, days = 120) {
  const key = rowDateKey(row) || String(row.Date || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return true
  const now = new Date(`${todayEasternKey()}T12:00:00Z`)
  const date = new Date(`${key}T12:00:00Z`)
  const diff = (now - date) / 86400000
  return diff >= 0 && diff <= days
}

function isPastOrFinal(row = {}) {
  const key = rowDateKey(row) || String(row.Date || '').slice(0, 10)
  return isFinalResult(row) || (key && key < todayEasternKey())
}

function isVip(row = {}) {
  return /\b(vip|premium|member)\b/i.test(text(row.Access, row.Tier, row['Access Tier'])) || /VIP Archive/i.test(row.__table || row.__source || '')
}

function isProps(row = {}) {
  const textValue = [row.Category, row.Type, row.Market, row['Bet Type'], row.Pick, row.Game, row.__table].join(' ')
  return /Props Results|\b(player prop|prop|points|rebounds|assists|pra|strikeouts|total bases|home run|sog)\b/i.test(textValue) && !/lotto|parlay|longshot|long shot/i.test(textValue)
}

function isLotto(row = {}) {
  const textValue = [row.Category, row.Type, row.Market, row['Bet Type'], row.Pick, row.Game, row.Legs, row.__table].join(' ')
  return /lotto|parlay|5-leg|6-leg|7-leg|8-leg|same game|sgp|round robin/i.test(textValue)
}

function isLongshot(row = {}) {
  const textValue = [row.Category, row.Type, row.Market, row['Bet Type'], row.Pick, row.Game, row.__table].join(' ')
  return /longshot|long shot|Longshots History/i.test(textValue)
}

async function safeListArchive(tableName, warnings = []) {
  try {
    const records = await listAirtableRecords(tableName)
    return records.map(record => flattenRecord(record, tableName))
  } catch (error) {
    if (error.statusCode === 404 || error.code === 'AIRTABLE_TABLE_NOT_FOUND') {
      warnings.push(`Optional results table not found: ${tableName}`)
      return []
    }
    throw error
  }
}

async function getRows(days) {
  const warnings = []
  const rows = []

  for (const config of ACTIVE_AIRTABLE_TABLE_CONFIG) {
    try {
      const result = await listAirtableRecordsFromResolvedTable(config)
      warnings.push(...(result.warnings || []))
      rows.push(...result.rows)
    } catch (error) {
      if (error.code === 'AIRTABLE_RESOLVED_TABLE_NOT_FOUND' && !config.required) {
        warnings.push(`Optional active table not found: ${config.defaultName}`)
        continue
      }
      throw error
    }
  }

  for (const table of ARCHIVE_TABLES) {
    rows.push(...await safeListArchive(table, warnings))
  }

  const normalized = rows
    .filter(hasPick)
    .filter(row => isWithinDays(row, days))
    .filter(isPastOrFinal)
    .map(row => normalizeRow(row, row.__table))

  const deduped = Array.from(new Map(normalized.map(row => [
    [row.Date, row.League, row.Game, row.Pick, row['Bet Type'], row.Access].map(value => String(value || '').toLowerCase()).join('|'),
    row
  ])).values())

  deduped.sort((a, b) => String(b.Date || '').localeCompare(String(a.Date || '')) || String(b.Timestamp || '').localeCompare(String(a.Timestamp || '')))

  return { rows: deduped, warnings }
}

export default async function handler(req, res) {
  try {
    const days = Math.min(Math.max(Number(req.query?.days || 120), 1), 365)
    const result = await getRows(days)
    const rows = result.rows
    const props = rows.filter(isProps)
    const lotto = rows.filter(row => isLotto(row) && !isLongshot(row))
    const longshots = rows.filter(isLongshot)
    const vip = rows.filter(isVip)
    const free = rows.filter(row => !isVip(row) && !isProps(row) && !isLotto(row) && !isLongshot(row))

    res.status(200).json({
      success: true,
      source: 'airtable',
      sourceOfTruth: 'Airtable',
      days,
      warnings: result.warnings,
      rows,
      free,
      vip,
      props,
      lotto,
      longshots,
      results: free
    })
  } catch (error) {
    console.error(error)
    sendError(res, error)
  }
}