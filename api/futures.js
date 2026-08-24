import futuresBoardRows from '../data/futures-board.js'

const text = value => String(value ?? '').trim()
const norm = value => text(value).toLowerCase().replace(/\s+/g,' ')
const CLOSED = new Set(['graded','settled','final','completed','complete','win','won','loss','lost','push','void','voided','cancelled','canceled','closed'])

function normalize(row = {}) {
  const status = text(row.Status || row.status || 'Active')
  const units = Number(row.Units ?? row.units ?? 0) || 0
  const score = Number(row.Score ?? row.score ?? 0) || 0
  const failureScore = Number(row['Failure Score'] ?? row.failureScore ?? 0) || 0
  return {
    ...row,
    Section:'Futures Lab', section:'Futures Lab',
    Sport:text(row.Sport || row.sport), sport:text(row.Sport || row.sport),
    League:text(row.League || row.league || row.Sport || row.sport), league:text(row.League || row.league || row.Sport || row.sport),
    Market:text(row.Market || row.market || row['Bet Type'] || row.betType), market:text(row.Market || row.market || row['Bet Type'] || row.betType),
    Pick:text(row.Pick || row.pick), pick:text(row.Pick || row.pick),
    Sportsbook:text(row.Sportsbook || row.sportsbook), sportsbook:text(row.Sportsbook || row.sportsbook),
    'Posted Odds':text(row['Posted Odds'] || row.postedOdds || row.Odds || row.odds), postedOdds:text(row['Posted Odds'] || row.postedOdds || row.Odds || row.odds),
    'Current Best Price':text(row['Current Best Price'] || row.currentBestPrice), currentBestPrice:text(row['Current Best Price'] || row.currentBestPrice),
    'Micks Probability':text(row['Micks Probability'] || row.micksProbability), micksProbability:text(row['Micks Probability'] || row.micksProbability),
    'Market Fair Probability':text(row['Market Fair Probability'] || row.marketFairProbability), marketFairProbability:text(row['Market Fair Probability'] || row.marketFairProbability),
    'Micks Fair Odds':text(row['Micks Fair Odds'] || row.micksFairOdds), micksFairOdds:text(row['Micks Fair Odds'] || row.micksFairOdds),
    'Estimated EV':text(row['Estimated EV'] || row.estimatedEV || row.ev), estimatedEV:text(row['Estimated EV'] || row.estimatedEV || row.ev),
    Score:score, score,
    'Failure Score':failureScore, failureScore,
    Grade:text(row.Grade || row.grade).toUpperCase(), grade:text(row.Grade || row.grade).toUpperCase(),
    Units:units, units,
    'Best Number':text(row['Best Number'] || row.bestNumber), bestNumber:text(row['Best Number'] || row.bestNumber),
    'No-Bet Cutoff':text(row['No-Bet Cutoff'] || row.noBetCutoff), noBetCutoff:text(row['No-Bet Cutoff'] || row.noBetCutoff),
    'Market Intelligence':text(row['Market Intelligence'] || row.marketIntelligence), marketIntelligence:text(row['Market Intelligence'] || row.marketIntelligence),
    Risk:text(row.Risk || row.risk), risk:text(row.Risk || row.risk),
    'Posted At':text(row['Posted At'] || row.postedAt || row.Date || row.date), postedAt:text(row['Posted At'] || row.postedAt || row.Date || row.date),
    Status:status, status,
    'Correlation Group':text(row['Correlation Group'] || row.correlationGroup), correlationGroup:text(row['Correlation Group'] || row.correlationGroup)
  }
}

export default function handler(req,res){
  const rows=(Array.isArray(futuresBoardRows)?futuresBoardRows:[]).map(normalize)
  const active=rows.filter(row=>!CLOSED.has(norm(row.status)))
  const released=active.filter(row=>/active|released|open/i.test(row.status))
  const watchlist=active.filter(row=>/watch/i.test(row.status))
  const exposure=Number(released.reduce((sum,row)=>sum+Number(row.units||0),0).toFixed(2))
  res.setHeader('Content-Type','application/json')
  res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, max-age=0')
  res.status(200).json({success:true,source:'micks-futures-board',section:'Futures Lab',rows,active,released,watchlist,totalExposure:exposure})
}
