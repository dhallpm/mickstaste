import { listActiveGoogleSheetsPicksWithWarnings } from '../lib/googleSheetsPickStore.js'

const SETTLED = new Set(['graded','settled','final','completed','complete','win','won','loss','lost','push','void','voided','cancelled','canceled','closed'])
const RECOGNIZED_SECTIONS = new Map([
  ['vip','VIP'], ['free','Free'], ['free picks','Free'], ['props','Props Lab'], ['props lab','Props Lab'],
  ['lotto','Lotto Parlays'], ['lotto parlays','Lotto Parlays'], ['parlays','Lotto Parlays'],
  ['longshots','Longshots'], ['longshot','Longshots'], ['watchlist','Watchlist / Live Only'],
  ['watchlist / live only','Watchlist / Live Only'], ['live only','Watchlist / Live Only'], ['passes','Passes'], ['pass','Passes'],
  ['pick of the day','Pick of the Day']
])

const text = value => String(value ?? '').trim()
const norm = value => text(value).toLowerCase().replace(/\s+/g, ' ')
const token = value => norm(value).replace(/[^a-z0-9]/g, '')

function first(row = {}, names = []) {
  const wanted = new Set(names.map(token))
  for (const [key, value] of Object.entries(row || {})) {
    if (wanted.has(token(key)) && text(value)) return value
  }
  return ''
}

function easternCardDate(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', hourCycle: 'h23'
  }).formatToParts(now).filter(part => part.type !== 'literal').map(part => [part.type, part.value]))
  const current = `${parts.year}-${parts.month}-${parts.day}`
  if (Number(parts.hour) >= 2) return current
  const prior = new Date(`${current}T12:00:00Z`)
  prior.setUTCDate(prior.getUTCDate() - 1)
  return prior.toISOString().slice(0, 10)
}

function dateKey(value) {
  const raw = text(value)
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  const parsed = raw ? new Date(raw) : null
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : ''
}

function grade(row = {}) {
  return text(first(row, ['Grade','Card Grade'])).toUpperCase()
}

function vipEligible(row = {}) {
  const access = norm(first(row, ['Access','Tier','Access Tier']))
  return /\b(vip|premium)\b/.test(access) && ['A-','A','A+'].includes(grade(row))
}

function sourceSection(row = {}) {
  const explicit = RECOGNIZED_SECTIONS.get(norm(first(row, ['Section','Category'])))
  const table = norm(row.__table || row.__sheetName || row.Table)
  if (/props?/.test(table)) return 'Props Lab'
  if (/lotto|parlay/.test(table)) return 'Lotto Parlays'
  if (/longshot/.test(table)) return 'Longshots'
  if (explicit === 'VIP') return vipEligible(row) ? 'VIP' : 'Free'
  if (explicit) return explicit
  return vipEligible(row) ? 'VIP' : 'Free'
}

function isSettled(row = {}) {
  const status = norm(first(row, ['Status','Display Status','Pick Status','Settlement Status']))
  const result = norm(first(row, ['Result','Outcome','Final Result','Pick Result','Graded Result']))
  return SETTLED.has(status) || SETTLED.has(result)
}

function isVisibleForDate(row = {}, cardDate = '') {
  const rowDate = dateKey(first(row, ['Date','Game Date','Posted Time','Timestamp']))
  return rowDate === cardDate && !isSettled(row)
}

function officialBet(row = {}) {
  return !/^(no|false|0)$/i.test(text(first(row, ['Official Bet','OfficialBet'])))
}

function numberValue(value) {
  const match = text(value).replace(/,/g, '').match(/[+-]?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : 0
}

function normalizeRow(row = {}, cardDate = '') {
  const section = sourceSection(row)
  const accessRaw = text(first(row, ['Access','Tier','Access Tier'])) || (section === 'VIP' ? 'VIP' : 'Free')
  const access = section === 'VIP' ? 'VIP' : accessRaw
  const sport = text(first(row, ['Sport','League']))
  const league = text(first(row, ['League','Sport'])) || sport
  const matchup = text(first(row, ['Matchup','Game','Event']))
  const pick = text(first(row, ['Pick','Selection','Play','Prop']))
  const line = text(first(row, ['Line','Odds','Posted Odds','Best Number']))
  const odds = text(first(row, ['Odds','Posted Odds','American Odds'])) || line
  const units = numberValue(first(row, ['Units','Units to Commit','Stake']))
  const status = text(first(row, ['Status','Display Status','Pick Status'])) || 'Pending'
  const writeup = text(first(row, ['Writeup','Short Take','Why This Play']))
  const fullAnalysis = text(first(row, ['Full Analysis','FullAnalysis']))
  const bestNumber = text(first(row, ['Best Number','Line','Number']))
  const cutoff = text(first(row, ['No-Bet Cutoff','No Bet Cutoff','Cutoff']))
  const isOfficial = officialBet(row)

  return {
    ...row,
    Date:cardDate, date:cardDate,
    Section:section, section,
    Access:access, access:access.toLowerCase(),
    Sport:sport, sport, League:league, league,
    Matchup:matchup, matchup, Game:matchup, game:matchup,
    Pick:pick, pick, Line:line, line, Odds:odds, odds,
    Grade:grade(row), grade:grade(row), Units:units, units,
    Status:status, status,
    Writeup:writeup, writeup,
    'Full Analysis':fullAnalysis, fullAnalysis, full:fullAnalysis,
    'Best Number':bestNumber, bestNumber, best:bestNumber,
    'No-Bet Cutoff':cutoff, noBetCutoff:cutoff, cutoff,
    'Official Bet':isOfficial ? 'Yes' : 'No', officialBet:isOfficial ? 'Yes' : 'No'
  }
}

function unique(rows = []) {
  const key = row => [row.date,row.section,row.game,row.pick,row.odds].map(norm).join('|')
  return Array.from(new Map(rows.map(row => [key(row), row])).values())
}

export default async function handler(req, res) {
  try {
    const cardDate = easternCardDate()
    const source = await listActiveGoogleSheetsPicksWithWarnings()
    const dated = source.rows.filter(row => isVisibleForDate(row, cardDate)).map(row => normalizeRow(row, cardDate))

    const watchlist = unique(dated.filter(row => row.section === 'Watchlist / Live Only'))
    const passes = unique(dated.filter(row => row.section === 'Passes' || /^pass$/i.test(row.grade)))
    const official = unique(dated.filter(row => row.officialBet === 'Yes' && !['Watchlist / Live Only','Passes'].includes(row.section) && !/^pass$/i.test(row.grade)))
    const vip = official.filter(row => row.section === 'VIP')
    const free = official.filter(row => row.section === 'Free')
    const props = official.filter(row => row.section === 'Props Lab')
    const lottoParlays = official.filter(row => row.section === 'Lotto Parlays')
    const longshots = official.filter(row => row.section === 'Longshots')
    const pickOfTheDay = official.filter(row => /^(yes|true|1)$/i.test(text(first(row, ['Pick of the Day','Featured']))))
    const publicRows = official.filter(row => row.section !== 'VIP' && norm(row.access) !== 'vip')

    res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, max-age=0')
    res.status(200).json({
      success:true, source:'google-sheets', sourceOfTruth:'Google Sheets', date:cardDate,
      warnings:source.warnings || [], totalExposure:Number(official.reduce((sum,row)=>sum+Number(row.units||0),0).toFixed(2)),
      vip, vipPicks:vip, vipVault:vip,
      free, freePicks:free,
      props, propsLab:props,
      lottoParlays, lotto:lottoParlays, parlays:lottoParlays,
      longshots, watchlist, liveOnly:watchlist, passes, pickOfTheDay,
      mainPicks:official, activePicks:official, rows:official, records:official, picks:official, allRows:official, publicRows
    })
  } catch (error) {
    console.error('todays-picks Google Sheets error', error)
    res.status(500).json({ success:false, source:'google-sheets', error:error?.message || 'Unable to load current Micks Picks card' })
  }
}
