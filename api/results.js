import {
  ACTIVE_AIRTABLE_TABLE_CONFIG,
  flattenRecord,
  listAirtableRecords,
  listAirtableRecordsFromResolvedTable
} from '../lib/airtableClient.js'
import { routePickCategory, rowDateKey } from '../lib/routePickCategory.js'
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

function recordKeyParts(row = {}) {
  const [date = '', league = '', game = '', pick = '', betType = '', access = '', odds = ''] =
    String(row['Record Key'] || '').split('|').map(value => value.trim())
  return { date, league, game, pick, betType, access, odds }
}

function titleCase(value = '') {
  return String(value)
    .replace(/\b[a-z]/g, letter => letter.toUpperCase())
    .replace(/\bMl\b/g, 'ML')
}

function normalizeAccess(value = '') {
  if (/^vip$/i.test(value)) return 'VIP'
  if (/^free$/i.test(value)) return 'Free'
  return value
}

function resultOf(row = {}) {
  const source = [row.Result, row.Outcome, row.Status, row['Display Status'], row['Pick Status']].join(' ')
  if (/\b(win|won|cash|cashed)\b/i.test(source)) return 'Win'
  if (/\b(loss|lost|lose|failed)\b/i.test(source)) return 'Loss'
  if (/\bpush\b/i.test(source)) return 'Push'
  if (/\b(void|cancelled|canceled)\b/i.test(source)) return 'Void'
  return ''
}

function inferSide(row = {}) {
  const source = [row.Pick, row.Selection, row.Play, row.Market, row['Bet Type'], row.Type, row['Prop Type'], row['Full Analysis'], row.Writeup].join(' ')
  if (/\bover\b/i.test(source)) return 'Over'
  if (/\bunder\b/i.test(source)) return 'Under'
  return ''
}

export function displayPick(row = {}) {
  const existing = text(row.Pick, row.Selection, row.Play, row.Name, row['Card Title'])
  if (existing && existing !== '--') return existing

  const player = text(row.Player, row.Athlete, row['Player Name'])
  const propType = text(row['Prop Type'], row.Market, row.Type, row.Category)
  const line = text(row.Line, row.Number, row['Best Number'])
  const side = inferSide(row) || (player && propType && line ? 'Over' : '')
  if (player && propType && line) return [player, side, line, propType].filter(Boolean).join(' ')
  if (player && propType) return [player, propType].join(' ')
  const recordKeyPick = recordKeyParts(row).pick
  if (recordKeyPick) return titleCase(recordKeyPick)
  return text(row.Game, row.Matchup, row.Event, row.Legs, row['Parlay Type'])
}

function hasPick(row = {}) {
  return Boolean(displayPick(row))
}

function parseNumber(value) {
  const match = String(value ?? '').replace(/,/g, '').match(/[-+]?\d*\.?\d+/)
  return match ? Number(match[0]) : NaN
}

function shouldTrustUnitProfitLoss(value = '') {
  const existing = text(value)
  if (!existing) return false
  if (/^[-+]?\d+(?:\.\d+)?u$/i.test(existing)) return true
  if (/^[-+]?\d+(?:\.\d+)?\s*units?$/i.test(existing)) return true
  return false
}

function formatUnits(value) {
  if (!Number.isFinite(value)) return ''
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}u`
}

function calculateProfitLoss(row = {}) {
  const result = resultOf(row)
  if (!result) return ''

  const automatedUnits = text(row['Profit/Loss Units'], row['P/L Units'], row['Unit Profit/Loss'])
  if (shouldTrustUnitProfitLoss(automatedUnits)) {
    const n = parseNumber(automatedUnits)
    if (Number.isFinite(n)) return formatUnits(n)
  }

  const legacyProfitLoss = text(row['Profit/Loss'], row['P/L'], row.PL, row['Profit Loss'])
  if (shouldTrustUnitProfitLoss(legacyProfitLoss)) {
    const n = parseNumber(legacyProfitLoss)
    if (Number.isFinite(n)) return formatUnits(n)
  }

  const units = parseNumber(text(row.Units, row['Units to Commit'], row.Stake, row.Risk))
  if (!Number.isFinite(units) || units <= 0) return ''
  if (result === 'Push' || result === 'Void') return '0.00u'
  if (result === 'Loss') return `-${units.toFixed(2)}u`
  if (result !== 'Win') return ''

  const odds = parseNumber(text(row.Odds, row.Price, row['Card Odds'], row['Final Odds']))
  if (!Number.isFinite(odds) || odds === 0) return ''
  const profit = odds > 0 ? units * odds / 100 : units * 100 / Math.abs(odds)
  return formatUnits(profit)
}

function sourceSection(row = {}) {
  const source = text(row['Original Table'], row.__table, row.__source)
  if (/Props Lab|Props Results/i.test(source)) return 'props'
  if (/Lotto/i.test(source)) return 'lotto'
  if (/Longshot/i.test(source)) return 'longshots'
  return routePickCategory(row).websiteSection
}

function legNotes(row = {}) {
  return text(
    row['Losing Leg'],
    row['Lost Leg'],
    row['Failed Leg'],
    row['Leg That Lost'],
    row['Loss Reason'],
    row['Leg Results'],
    row['Result Notes'],
    row['Settlement Notes']
  )
}

function displayNotes(row = {}, result = '') {
  const notes = legNotes(row)
  if (notes) return `Loss/settlement notes: ${notes}`
  const source = text(row['Original Table'], row.__table, row.__source, row.Category, row['Bet Type'], row['Parlay Type'])
  if (result === 'Loss' && /lotto|parlay|longshot/i.test(source)) {
    return 'Loss leg: not recorded in Airtable. Add Losing Leg or Leg Results to show exactly which leg killed the ticket.'
  }
  return text(row.Notes, row['Result Notes'], row['Settlement Notes'])
}

function recommendedNumber(row = {}) {
  const explicit = text(row['Closing Number'], row['Closing #'], row['Closing Line'], row['Recommended Number'], row['Recommended #'], row['Best Number'], row['Best #'], row['Best Line'], row.Line, row.Number)
  if (explicit) return explicit
  const match = displayPick(row).match(/\b(over|under)\s+([+-]?\d+(?:\.\d+)?)\b/i)
  return match ? `${titleCase(match[1])} ${match[2]}` : ''
}

export function normalizeRow(row = {}, sourceTable = '') {
  const recordKey = recordKeyParts(row)
  const result = resultOf(row)
  const odds = text(row.Odds, row.Price, row['Card Odds'], row['Final Odds'], recordKey.odds)
  const pl = calculateProfitLoss({ ...row, Odds: odds })
  const route = sourceSection(row)
  const pick = displayPick(row)
  const originalTable = text(row['Original Table'], row.__table)
  const closing = recommendedNumber(row)
  const grade = text(row['Card Grade'], row.Grade, row.grade, '--')
  return {
    ...row,
    __source: sourceTable || row.__table || 'Airtable Results API',
    __section: row.__section || route,
    Date: rowDateKey(row) || text(row.Date, row.date, row['Game Date'], row.Timestamp, recordKey.date),
    League: text(row.League, row.Sport, row.league, recordKey.league.toUpperCase()),
    Sport: text(row.Sport, row.League, recordKey.league.toUpperCase()),
    Game: text(row.Game, row.Matchup, row.Event, row.game, titleCase(recordKey.game)),
    Pick: pick,
    Player: text(row.Player, row.Athlete, row['Player Name']),
    'Prop Type': text(row['Prop Type'], row.Market, row.Type),
    Line: text(row.Line, row.Number, row['Best Number']),
    'Bet Type': text(row['Bet Type'], row.Market, row.Type, row['Prop Type'], row.Player ? 'Prop' : '', titleCase(recordKey.betType)),
    Odds: odds,
    Grade: grade,
    Units: text(row.Units, row['Units to Commit'], row.Stake),
    Result: result,
    Outcome: result,
    'Profit/Loss': pl,
    'Profit/Loss Units': pl,
    'P/L': pl,
    PL: pl,
    Status: 'Closed',
    'Display Status': 'Closed',
    'Pick Status': 'Closed',
    Access: normalizeAccess(text(row.Access, row.Tier, row['Access Tier'], recordKey.access, 'Free')),
    Category: text(row.Category, row.Type, row['Parlay Type'], row.Player ? 'Player Prop' : ''),
    Legs: text(row.Legs, row['Legs / Details'], row['Parlay Type']),
    Notes: displayNotes(row, result),
    'Original Table': originalTable,
    Timestamp: text(row['Settled At'], row['Graded Timestamp'], row.Timestamp, row['Posted Time'], ''),
    'Closing Number': closing
  }
}

function isFinalResult(row = {}) {
  return ['Win', 'Loss', 'Push', 'Void'].includes(resultOf(row))
}

function isWithinDays(row = {}, days = 120) {
  const key = rowDateKey(row) || String(row.Date || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return true
  const now = new Date()
  const date = new Date(`${key}T12:00:00Z`)
  const diff = (now - date) / 86400000
  return diff >= 0 && diff <= days
}

function isVip(row = {}) {
  const source = [row.__table, row.__source, row['Original Table'], row.Access, row.Tier, row['Access Tier']].join(' ')
  return /\b(vip|premium|member|members only)\b/i.test(source)
}

function isProps(row = {}) {
  if (row.__section === 'props') return true
  const textValue = [row.__table, row.__source, row['Original Table'], row.Category, row.Type, row.Market, row['Bet Type'], row['Prop Type'], row.Player, row.Athlete, row.Pick, row.Game].join(' ')
  return /Props Lab|Props Results|\b(player prop|prop|points|rebounds|assists|pra|strikeouts|total bases|home run|sog)\b/i.test(textValue) && !/lotto|parlay|longshot|long shot|moneyline|spread|team total|game total/i.test(textValue)
}

function isLotto(row = {}) {
  if (row.__section === 'lotto') return true
  const textValue = [row.__table, row.__source, row['Original Table'], row.Category, row.Type, row.Market, row['Bet Type'], row.Pick, row.Game, row.Legs].join(' ')
  return /lotto|parlay|5-leg|6-leg|7-leg|8-leg|same game|sgp|round robin/i.test(textValue)
}

function isLongshot(row = {}) {
  if (row.__section === 'longshots') return true
  const textValue = [row.__table, row.__source, row['Original Table'], row.Category, row.Type, row.Market, row['Bet Type'], row.Pick, row.Game].join(' ')
  return /longshot|long shot|Longshots History/i.test(textValue)
}

async function safeListArchive(tableName, warnings = []) {
  try {
    const records = await listAirtableRecords(tableName)
    return records.map(record => flattenRecord(record, tableName))
  } catch (error) {
    if ([403, 404].includes(error.statusCode) || error.code === 'AIRTABLE_TABLE_NOT_FOUND') {
      warnings.push(`Optional results table unavailable: ${tableName}`)
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
    .filter(isFinalResult)
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
    const vip = rows.filter(row => isVip(row) && !isProps(row) && !isLotto(row) && !isLongshot(row))
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
