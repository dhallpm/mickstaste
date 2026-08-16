import { listResultsGoogleSheetsPicksWithWarnings } from '../lib/googleSheetsPickStore.js'

const text = value => String(value ?? '').trim()
const norm = value => text(value).toLowerCase().replace(/\s+/g, ' ')
const token = value => norm(value).replace(/[^a-z0-9]/g, '')

function first(row = {}, names = []) {
  const wanted = new Set(names.map(token))
  for (const [key,value] of Object.entries(row || {})) {
    if (wanted.has(token(key)) && text(value)) return value
  }
  return ''
}

function resultLabel(row = {}) {
  const raw = norm(first(row, ['Result','Outcome','Final Result','Pick Result','Graded Result']))
  if (/^(win|won|w|cash|cashed)$/.test(raw)) return 'Win'
  if (/^(loss|lost|lose|l|failed)$/.test(raw)) return 'Loss'
  if (raw === 'push') return 'Push'
  if (/^(void|voided|cancelled|canceled|no action)$/.test(raw)) return 'Void'
  return ''
}

function dateKey(value) {
  const raw = text(value)
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0,10)
  const parsed = raw ? new Date(raw) : null
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString().slice(0,10) : ''
}

function sectionOf(row = {}) {
  const explicit = norm(first(row, ['Section']))
  const table = norm(row.__table || row.__sheetName || row.Table)
  if (/props?/.test(table)) return 'Props Lab'
  if (/lotto|parlay/.test(table)) return 'Lotto Parlays'
  if (/longshot/.test(table)) return 'Longshots'
  if (explicit === 'vip') return 'VIP'
  return 'Free'
}

function numberValue(value) {
  const match = text(value).replace(/[$,%u,]/gi,'').match(/[+-]?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : 0
}

function normalize(row = {}) {
  const result = resultLabel(row)
  const section = sectionOf(row)
  const date = dateKey(first(row, ['Date','Game Date','Settled At','Timestamp','Posted Time']))
  const sport = text(first(row, ['Sport']))
  const league = text(first(row, ['League','Sport'])) || sport
  const game = text(first(row, ['Game','Matchup','Event']))
  const pick = text(first(row, ['Pick','Selection','Play','Prop']))
  const betType = text(first(row, ['Bet Type','Type','Market','Prop']))
  const odds = text(first(row, ['Odds','Posted Odds','American Odds']))
  const grade = text(first(row, ['Grade','Card Grade']))
  const unitsRaw = first(row, ['Units','Units to Commit','Stake'])
  const profitLoss = text(first(row, ['Profit/Loss','P/L','PL','Profit Loss','Profit/Loss Units']))
  const access = section === 'VIP' ? 'VIP' : (text(first(row, ['Access','Tier','Access Tier'])) || 'Free')
  const settledAt = first(row, ['Settled At'])
  const settlementSource = first(row, ['Settlement Source'])
  const settlementStatus = first(row, ['Settlement Status'])
  const settlementNotes = first(row, ['Settlement Notes','Result Notes','Notes'])
  const recordKey = text(first(row, ['Record Key'])) || [date,section,league,game,pick,betType].map(norm).join('|')

  return {
    ...row,
    id:row.id || recordKey, recordKey,
    source:'Google Sheets', sourceOfTruth:'Google Sheets',
    __section:section === 'Props Lab' ? 'props' : section === 'Lotto Parlays' ? 'lotto' : section === 'Longshots' ? 'longshots' : 'master',
    section, Section:section, resultSection:section,
    date, Date:date, sport, Sport:sport, league, League:league, game, Game:game,
    pick, Pick:pick, cardTitle:pick, betType, 'Bet Type':betType,
    odds, Odds:odds, grade, Grade:grade,
    units:unitsRaw, Units:unitsRaw, unitsRisked:Math.max(0,numberValue(unitsRaw)),
    result, Result:result, Outcome:result, status:result || 'Graded', Status:result || 'Graded',
    profitLoss, 'Profit/Loss':profitLoss, 'P/L':profitLoss, PL:profitLoss, profitLossValue:numberValue(profitLoss),
    access, Access:access,
    settledAt, 'Settled At':settledAt, settlementSource, 'Settlement Source':settlementSource,
    settlementStatus, 'Settlement Status':settlementStatus, settlementNotes, 'Settlement Notes':settlementNotes,
    timestamp:settledAt || first(row,['Timestamp','Posted Time'])
  }
}

function keyOf(row = {}) {
  return [row.date,row.section,row.league,row.game,row.pick,row.betType].map(norm).join('|')
}

function dedupe(rows = []) {
  return Array.from(new Map(rows.map(row => [keyOf(row),row])).values())
}

function statsFor(rows = []) {
  const wins = rows.filter(row => row.result === 'Win').length
  const losses = rows.filter(row => row.result === 'Loss').length
  const pushes = rows.filter(row => row.result === 'Push' || row.result === 'Void').length
  const knownRows = rows.filter(row => Number.isFinite(row.profitLossValue) && !/^unknown$/i.test(text(row.profitLoss)))
  const netUnits = knownRows.reduce((sum,row)=>sum+Number(row.profitLossValue || 0),0)
  const risked = rows.reduce((sum,row)=>sum+Number(row.unitsRisked || 0),0)
  return {
    wins, losses, pushes,
    record:`${wins}-${losses}${pushes ? `-${pushes}` : ''}`,
    netUnits:Number(netUnits.toFixed(2)), units:`${netUnits >= 0 ? '+' : ''}${netUnits.toFixed(2)}u`,
    profitLoss:`${netUnits >= 0 ? '+' : ''}${netUnits.toFixed(2)}u`, unitsRisked:Number(risked.toFixed(2)),
    winRate:wins+losses ? `${(wins/(wins+losses)*100).toFixed(1)}%` : '--',
    incompleteUnitRows:rows.filter(row => /^unknown$/i.test(text(row.profitLoss))).length
  }
}

export default async function handler(req,res) {
  try {
    const days = Math.min(Math.max(Number(req.query?.days || 180),1),3650)
    const cutoff = Date.now() - days * 86400000
    const source = await listResultsGoogleSheetsPicksWithWarnings()
    const results = dedupe(source.rows
      .map(normalize)
      .filter(row => row.result && row.date)
      .filter(row => new Date(`${row.date}T12:00:00Z`).getTime() >= cutoff))
      .sort((a,b)=>String(b.date).localeCompare(String(a.date)) || String(b.timestamp||'').localeCompare(String(a.timestamp||'')))

    const exact = name => results.filter(row => row.section === name)
    const vip = exact('VIP'), free = exact('Free'), props = exact('Props Lab'), lotto = exact('Lotto Parlays'), longshots = exact('Longshots')
    const stats = statsFor(results)
    const breakdown = { overall:stats, vip:statsFor(vip), free:statsFor(free), props:statsFor(props), parlays:statsFor(lotto), lotto:statsFor(lotto), longshots:statsFor(longshots) }

    res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, max-age=0')
    res.status(200).json({
      ok:true, success:true, source:'google-sheets-results', sourceOfTruth:'Google Sheets',
      date:results[0]?.date || '', warnings:source.warnings || [],
      results, rows:results, records:results, resultRows:results, archive:results, resultsArchive:results,
      gradedPicks:results, settledPicks:results, recentResults:results, latestResults:results, allRows:results,
      vip, free, props, lotto, longshots,
      record:stats.record, overallRecord:stats.record, vipRecord:breakdown.vip.record, freeRecord:breakdown.free.record,
      propsRecord:breakdown.props.record, parlayRecord:breakdown.parlays.record, lottoRecord:breakdown.lotto.record,
      units:stats.units, totalUnits:stats.units, overallUnits:stats.units, profitLoss:stats.profitLoss,
      winRate:stats.winRate, stats, metrics:stats, breakdown, sectionRecords:breakdown, recordsBySection:breakdown,
      summary:{record:stats.record,units:stats.units,winRate:stats.winRate,totalPicks:results.length,incompleteUnitRows:stats.incompleteUnitRows}
    })
  } catch (error) {
    console.error('results-source Google Sheets error', error)
    res.status(500).json({ok:false,success:false,source:'google-sheets-results',error:error?.message || 'Unable to load results'})
  }
}
