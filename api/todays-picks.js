import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const publishedCard = require('../data/todays-picks.json')
const activeCardRows = ['free','vip','vipVault','props','lottoParlays','longshots','watchlist']
  .flatMap(key => Array.isArray(publishedCard[key]) ? publishedCard[key] : [])

const SETTLED = new Set(['graded','settled','final','completed','complete','win','won','loss','lost','push','void','voided','cancelled','canceled','closed'])
const text = value => String(value ?? '').trim()
const norm = value => text(value).toLowerCase().replace(/\s+/g,' ')

function easternCardDate(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone:'America/New_York', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', hourCycle:'h23'
  }).formatToParts(now).filter(part => part.type !== 'literal').map(part => [part.type,part.value]))
  const current = `${parts.year}-${parts.month}-${parts.day}`
  if (Number(parts.hour) >= 2) return current
  const prior = new Date(`${current}T12:00:00Z`)
  prior.setUTCDate(prior.getUTCDate() - 1)
  return prior.toISOString().slice(0,10)
}

function dateKey(value) {
  const raw = text(value)
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0,10)
  const parsed = raw ? new Date(raw) : null
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString().slice(0,10) : ''
}

function active(row = {}, cardDate = '') {
  const status = norm(row.Status || row.status || row['Release Status'])
  const result = norm(row.Result || row.result || row.Outcome || row.outcome)
  const official = norm(row['Official Bet'] ?? row.officialBet ?? 'yes')
  const placedPersonalTicket = section(row) === 'Lotto Parlays' && row.betPlaced === true
  const nonOfficialSection = (['Watchlist / Live Only','Passes'].includes(section(row)) || (section(row) === 'Lotto Parlays' && /^watch/i.test(status)))
  return dateKey(row.Date || row.date) === cardDate && !SETTLED.has(status) && !SETTLED.has(result) && (placedPersonalTicket || nonOfficialSection || !/^(no|false|0)$/.test(official))
}

function section(row = {}) {
  const raw = norm(row.Section || row.section || row.Category || row.category)
  if (raw === 'vip') return 'VIP'
  if (/props?/.test(raw)) return 'Props Lab'
  if (/lotto|parlay/.test(raw)) return 'Lotto Parlays'
  if (/longshot/.test(raw)) return 'Longshots'
  if (/watchlist|live only/.test(raw)) return 'Watchlist / Live Only'
  if (/^pass(?:es)?$/.test(raw)) return 'Passes'
  return 'Free'
}

function normalize(row = {}, cardDate = '') {
  const sec = section(row)
  const matchup = text(row.Matchup || row.matchup || row.Game || row.game)
  const sport = text(row.Sport || row.sport || row.League || row.league)
  const league = text(row.League || row.league || sport)
  const pick = text(row.Pick || row.pick)
  const line = text(row.lineNumber || row.Line || row.line || row.Odds || row.odds)
  const odds = text(row.Odds || row.odds || line)
  const grade = text(row.Grade || row.grade).toUpperCase()
  const rawUnits = row.Units ?? row.units ?? 0
  const units = row.hideWagerAmounts === true ? '' : /^TBD\b/i.test(text(rawUnits)) ? text(rawUnits) : Number(rawUnits) || 0
  const writeup = text(row.Writeup || row.writeup)
  const fullAnalysis = text(row['Full Analysis'] || row.fullAnalysis || row.full)
  const bestNumber = text(row['Best Number'] || row.bestNumber || row.best)
  const playableTo = text(row['Playable To'] || row.playableTo || row.playable)
  const cutoff = text(row['No-Bet Cutoff'] || row.noBetCutoff || row.cutoff)
  const micksScore = text(row['Micks Score'] || row.micksScore || row.Score || row.score)
  const replicaScore = text(row['Replica Score'] || row.replicaScore || row['Market AI Replica'] || row.marketAiReplica)
  const failureScore = text(row['Failure Score'] || row.failureScore)
  const officialBet = text(row['Official Bet'] || row.officialBet || 'Yes')
  const accessRaw = text(row.Access || row.access || (sec === 'VIP' ? 'VIP' : 'Free'))
  const access = sec === 'VIP' ? 'VIP' : accessRaw
  const status = text(row.Status || row.status || 'Pending')
  return {
    ...row,
    Date:cardDate,date:cardDate,Section:sec,section:sec,Access:access,access:access.toLowerCase(),
    Sport:sport,sport,League:league,league,Matchup:matchup,matchup,Game:matchup,game:matchup,
    Pick:pick,pick,Line:line,line,Odds:odds,odds,Grade:grade,grade,Units:units,units,Status:status,status,
    Writeup:writeup,writeup,'Full Analysis':fullAnalysis,fullAnalysis,full:fullAnalysis,
    'Best Number':bestNumber,bestNumber,best:bestNumber,'Playable To':playableTo,playableTo,
    'No-Bet Cutoff':cutoff,noBetCutoff:cutoff,cutoff,
    'Micks Score':micksScore,micksScore,score:micksScore,'Replica Score':replicaScore,replicaScore,marketAiReplica:replicaScore,
    'Failure Score':failureScore,failureScore,'Official Bet':officialBet,officialBet
  }
}

function unique(rows = []) {
  return Array.from(new Map(rows.map(row => [[row.date,row.section,row.game,row.pick,row.odds].map(norm).join('|'),row])).values())
}

export default function handler(req,res) {
  const cardDate = easternCardDate()
  const rows = unique((Array.isArray(activeCardRows) ? activeCardRows : []).filter(row => active(row,cardDate)).map(row => normalize(row,cardDate)))
  const vip = rows.filter(row => row.section === 'VIP')
  const free = rows.filter(row => row.section === 'Free')
  const props = rows.filter(row => row.section === 'Props Lab')
  const lottoParlays = rows.filter(row => row.section === 'Lotto Parlays')
  const longshots = rows.filter(row => row.section === 'Longshots')
  const watchlist = rows.filter(row => row.section === 'Watchlist / Live Only')
  const passes = rows.filter(row => row.section === 'Passes')
  const official = rows.filter(row => !['Watchlist / Live Only','Passes'].includes(row.section) && !/^(no|false|0)$/.test(norm(row.officialBet)))
  const publicRows = official.filter(row => row.section !== 'VIP' && norm(row.access) !== 'vip')
  const pickOfTheDay = official.filter(row => /^(yes|true|1)$/i.test(text(row['Pick of the Day'] || row.pickOfTheDay || row.Featured || row.featured)))

  res.setHeader('Content-Type','application/json')
  res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, max-age=0')
  res.status(200).json({
    success:true,source:'published-active-card',sourceOfTruth:'Micks Picks publish data',date:cardDate,
    totalExposure:Number(official.reduce((sum,row)=>sum+Number(row.units||0),0).toFixed(2)),
    vip,vipPicks:vip,vipVault:vip,free,freePicks:free,props,propsLab:props,
    lottoParlays,lotto:lottoParlays,parlays:lottoParlays,longshots,watchlist,liveOnly:watchlist,passes,pickOfTheDay,
    mainPicks:official,activePicks:official,rows:official,records:official,picks:official,allRows:official,publicRows
  })
}
