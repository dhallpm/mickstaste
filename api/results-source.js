const reconstructed = [
  {date:'2026-08-13',section:'Free',access:'Free',sport:'WNBA',league:'WNBA',game:'Atlanta Dream @ Connecticut Sun',pick:'Under 173.5',betType:'Game Total',odds:'-113',units:'0.80u',result:'Win',profitLoss:'+0.71u',status:'Graded',settlementSource:'Original BetRivers ticket / settled screenshot',settlementNotes:'Historical reconstruction. Original wager $8.80; payout $16.63. Grade not recovered.'},
  {date:'2026-08-13',section:'Free',access:'Free',sport:'NFL',league:'NFL Preseason',game:'LA Chargers @ HOU Texans',pick:'Under 38.5',betType:'Game Total',odds:'-110',units:'0.50u',result:'Win',profitLoss:'+0.45u',status:'Graded',settlementSource:'Original BetRivers ticket / settled screenshot',settlementNotes:'Historical reconstruction. Original wager $5.50; payout $10.51. Grade not recovered.'},
  {date:'2026-08-14',section:'Free',access:'Free',sport:'WNBA',league:'WNBA',game:'Dallas Wings @ Indiana Fever',pick:'Indiana Fever -8.5',betType:'Point Spread',odds:'-112',units:'1.00u',result:'Win',profitLoss:'+0.89u',status:'Graded',settlementSource:'Original BetRivers ticket / settled screenshot',settlementNotes:'Historical reconstruction. Original wager $11.00; payout $20.90. Grade not recovered.'},
  {date:'2026-08-14',section:'Free',access:'Free',sport:'MLB',league:'MLB',game:'SD Padres @ CLE Guardians',pick:'San Diego Padres ML',betType:'Moneyline',odds:'+112',units:'0.50u',result:'Win',profitLoss:'+0.56u',status:'Graded',settlementSource:'Original BetRivers ticket / settled screenshot',settlementNotes:'Historical reconstruction. Original wager $5.50; payout $11.66. Grade not recovered.'},
  {date:'2026-08-14',section:'Free',access:'Free',sport:'MLB',league:'MLB',game:'COL Rockies @ SF Giants',pick:'San Francisco Giants ML',betType:'Moneyline',odds:'-132',units:'0.80u',result:'Loss',profitLoss:'-0.80u',status:'Graded',settlementSource:'Original BetRivers ticket + final-score verification',settlementNotes:'Historical reconstruction. Original wager $8.80. Colorado won 5-2. Grade not recovered.'},
  {date:'2026-08-15',section:'Free',access:'Free',sport:'MLB',league:'MLB',game:'COL Rockies @ SF Giants',pick:'San Francisco Giants -1.5',betType:'Run Line',odds:'+135',units:'1.00u',result:'Win',profitLoss:'+1.35u',status:'Graded',settlementSource:'Original BetRivers ticket / settled screenshot',settlementNotes:'Historical reconstruction. Original wager $11.00; payout $25.85. Giants won 7-1. Grade not recovered.'},
  {date:'2026-08-15',section:'Free',access:'Free',sport:'MLB',league:'MLB',game:'BOS Red Sox @ PIT Pirates',pick:'Boston Red Sox ML',betType:'Moneyline',odds:'-129',units:'0.80u',result:'Win',profitLoss:'+0.62u',status:'Graded',settlementSource:'Original BetRivers settled screenshot',settlementNotes:'Historical reconstruction. Original wager $8.80; payout $15.66. Boston won 4-0. Grade not recovered.'},
  {date:'2026-08-15',section:'Free',access:'Free',sport:'MLB',league:'MLB',game:'COL Rockies @ SF Giants',pick:'Over 7.5',betType:'Game Total',odds:'-103',units:'0.50u',result:'Win',profitLoss:'+0.49u',status:'Graded',settlementSource:'Original BetRivers settled screenshot',settlementNotes:'Historical reconstruction. Original wager $5.50; payout $10.89. Giants won 7-1. Grade not recovered.'},
  {date:'2026-08-15',section:'Free',access:'Free',sport:'Tennis',league:'ATP Cincinnati',game:'Roberto Bautista Agut vs Miomir Kecmanovic',pick:'Miomir Kecmanovic ML',betType:'Moneyline',odds:'',units:'',result:'Loss',profitLoss:'Unknown',status:'Graded',settlementSource:'User-confirmed loss + result verification',settlementNotes:'Historical reconstruction. Kecmanovic lost 6-1, 6-2. Original posted odds, stake, grade and unit size were not recovered, so unit P/L remains unknown.'},
  {date:'2026-08-15',section:'Props Lab',access:'Free',sport:'MLB',league:'MLB Props',game:'BAL Orioles @ TB Rays',pick:'Ian Seymour 7+ strikeouts',betType:'Pitcher Strikeouts',odds:'-121',units:'0.50u',result:'Win',profitLoss:'+0.41u',status:'Graded',settlementSource:'Original BetRivers ticket / settled screenshot',settlementNotes:'Historical reconstruction. Original wager $5.50; payout $10.07. Grade not recovered.'},
  {date:'2026-08-15',section:'Props Lab',access:'Free',sport:'UFC',league:'UFC',game:'Mackenzie Dern vs Gillian Robertson',pick:'Fight to Go the Distance — Yes',betType:'Fight Goes Distance',odds:'-150',units:'0.50u',result:'Win',profitLoss:'+0.33u',status:'Graded',settlementSource:'Original BetRivers settled screenshot',settlementNotes:'Historical reconstruction. This was the distance prop, not Dern moneyline. Original wager $5.50; payout $9.19. Grade not recovered.'},
  {date:'2026-08-15',section:'Lotto Parlays',access:'Free',sport:'MLB',league:'MLB',game:'COL Rockies @ SF Giants',pick:'SF Giants -1.5 + Over 7.5',betType:'2-Leg Same Game Parlay',odds:'+275',units:'0.50u',result:'Win',profitLoss:'+1.38u',status:'Graded',settlementSource:'Original BetRivers ticket / settled screenshot',settlementNotes:'Historical reconstruction. Original wager $5.50; payout $20.63. Both legs won in the Giants 7-1 victory. Strict Lotto classification; never VIP.'}
]

const text = value => String(value ?? '').trim()
const num = value => {
  if (/^unknown$/i.test(text(value))) return 0
  const match = text(value).replace(/[u,%,$,]/gi,'').match(/[+-]?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : 0
}

function normalized(row = {}) {
  return {
    ...row,
    Date:row.date,Section:row.section,Access:row.access,Sport:row.sport,League:row.league,Game:row.game,Pick:row.pick,
    'Bet Type':row.betType,Odds:row.odds,Units:row.units,Result:row.result,Outcome:row.result,Status:row.status,
    'Profit/Loss':row.profitLoss,'P/L':row.profitLoss,PL:row.profitLoss,
    'Settlement Source':row.settlementSource,'Settlement Notes':row.settlementNotes,
    __section:row.section === 'Props Lab' ? 'props' : row.section === 'Lotto Parlays' ? 'lotto' : row.section === 'Longshots' ? 'longshots' : 'master'
  }
}

function statsFor(rows = []) {
  const wins = rows.filter(row => row.result === 'Win').length
  const losses = rows.filter(row => row.result === 'Loss').length
  const pushes = rows.filter(row => row.result === 'Push' || row.result === 'Void').length
  const known = rows.filter(row => !/^unknown$/i.test(text(row.profitLoss)))
  const netUnits = known.reduce((sum,row)=>sum+num(row.profitLoss),0)
  return {wins,losses,pushes,record:`${wins}-${losses}${pushes?`-${pushes}`:''}`,netUnits:Number(netUnits.toFixed(2)),units:`${netUnits>=0?'+':''}${netUnits.toFixed(2)}u`,profitLoss:`${netUnits>=0?'+':''}${netUnits.toFixed(2)}u`,winRate:wins+losses?`${(wins/(wins+losses)*100).toFixed(1)}%`:'--',incompleteUnitRows:rows.length-known.length}
}

export default function handler(req,res) {
  const days = Math.min(Math.max(Number(req.query?.days || 180),1),3650)
  const cutoff = Date.now() - days * 86400000
  const results = reconstructed.map(normalized).filter(row => new Date(`${row.date}T12:00:00Z`).getTime() >= cutoff)
    .sort((a,b)=>String(b.date).localeCompare(String(a.date)))
  const exact = name => results.filter(row=>row.section===name)
  const vip=exact('VIP'),free=exact('Free'),props=exact('Props Lab'),lotto=exact('Lotto Parlays'),longshots=exact('Longshots')
  const stats=statsFor(results)
  const breakdown={overall:stats,vip:statsFor(vip),free:statsFor(free),props:statsFor(props),parlays:statsFor(lotto),lotto:statsFor(lotto),longshots:statsFor(longshots)}
  res.setHeader('Content-Type','application/json')
  res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, max-age=0')
  res.status(200).json({ok:true,success:true,source:'reconstructed-results-2026-08-13-15',date:'2026-08-15',results,rows:results,records:results,resultRows:results,archive:results,resultsArchive:results,gradedPicks:results,settledPicks:results,recentResults:results,latestResults:results,allRows:results,vip,free,props,lotto,longshots,record:stats.record,overallRecord:stats.record,vipRecord:breakdown.vip.record,freeRecord:breakdown.free.record,propsRecord:breakdown.props.record,parlayRecord:breakdown.parlays.record,lottoRecord:breakdown.lotto.record,units:stats.units,totalUnits:stats.units,overallUnits:stats.units,profitLoss:stats.profitLoss,winRate:stats.winRate,stats,metrics:stats,breakdown,sectionRecords:breakdown,recordsBySection:breakdown,summary:{record:stats.record,units:stats.units,winRate:stats.winRate,totalPicks:results.length,incompleteUnitRows:stats.incompleteUnitRows,note:'Known unit total excludes the unrecovered Kecmanovic stake. The same reconstructed ledger is also stored in Google Sheets.'}})
}
