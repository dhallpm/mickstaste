const CARD_DATE = '2026-07-13'
const SETTLED = new Set(['graded','settled','final','completed','complete','win','won','loss','lost','push','void','voided','cancelled','canceled'])
const norm = value => String(value || '').trim().toLowerCase()

function easternCardDate(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false
  }).formatToParts(now).filter(p => p.type !== 'literal').map(p => [p.type, p.value]))
  const current = `${parts.year}-${parts.month}-${parts.day}`
  if (Number(parts.hour) >= 2) return current
  const prior = new Date(`${current}T12:00:00Z`)
  prior.setUTCDate(prior.getUTCDate() - 1)
  return prior.toISOString().slice(0,10)
}

function active(row) {
  const status = norm(row.Status || row.status || row['Release Status'])
  const result = norm(row.Result || row.result || row.Outcome || row.outcome)
  return !SETTLED.has(status) && !SETTLED.has(result) && norm(row['Official Bet'] || row.officialBet) !== 'no'
}

function imported(row, section, access='Free') {
  const matchup=row.Matchup||row.Game||''; const pick=row.Pick||''; const sport=row.Sport||row.League||''; const line=row.Line||row.Odds||''
  return {...row,Date:CARD_DATE,date:CARD_DATE,Section:section,section,Access:access,access:access.toLowerCase(),Sport:sport,sport,League:sport,league:sport,Matchup:matchup,matchup,Game:matchup,game:matchup,Pick:pick,pick,Line:line,line,Odds:line,odds:line,Grade:row.Grade,grade:row.Grade,Units:Number(row.Units||0),units:Number(row.Units||0),Status:row.Status||'Pending',status:row.Status||'Pending',Writeup:row.Writeup||'',writeup:row.Writeup||'','Full Analysis':row['Full Analysis']||'',fullAnalysis:row['Full Analysis']||'',full:row['Full Analysis']||'','Best Number':row['Best Number']||'',bestNumber:row['Best Number']||'','No-Bet Cutoff':row['No-Bet Cutoff']||'',noBetCutoff:row['No-Bet Cutoff']||'',officialBet:'Yes'}
}

const rawVip=[]
const rawFree=[
  {Sport:'WNBA',Matchup:'Los Angeles Sparks at Atlanta Dream',Pick:'Atlanta Dream -8.5',Line:'-8.5',Grade:'B',Units:0.50,Status:'Pending','Official Bet':'Yes','Best Number':'-8.5','No-Bet Cutoff':'-9.5',Writeup:'Atlanta is the preferred side, but the edge is modest rather than premium. VSiN estimated the Dream near -9.1 against a market of -8.5, while Doc’s Sports preferred Los Angeles, so the disagreement limits this to a half-unit release.','Full Analysis':'Opening Thesis: Atlanta has the stronger overall profile and the current -8.5 sits slightly below the VSiN estimated line.\n\nMatchup Edge: The Dream have the better defensive baseline and more reliable four-quarter structure, while Los Angeles has allowed opponents to score efficiently.\n\nProjection / Metric Edge: VSiN estimated Atlanta -9.1, only 0.6 points stronger than the posted market. That is support, but not enough for a premium grade.\n\nMarket and Number Context: Play -8.5; pass above -9.5. The source disagreement with Doc’s Sports prevents a larger position.\n\nHow It Cashes: Atlanta controls the middle quarters, limits transition mistakes and turns its defensive edge into a late double-digit margin.\n\nRisk and Variance: The 181.5 total creates more possessions and more backdoor-cover opportunity for the Sparks.\n\nMicks Picks Verdict: Dream -8.5, B, 0.50u.'},
  {Sport:'NBA Summer League',Matchup:'Miami Heat vs Cleveland Cavaliers',Pick:'Cleveland Cavaliers -1.5',Line:'-1.5',Grade:'B',Units:0.50,Status:'Pending','Official Bet':'Yes','Best Number':'-1.5','No-Bet Cutoff':'-2.5',Writeup:'This is close to a pick’em, so Cleveland only needs a small separation margin. The Cavaliers are the preferred side based on projected depth, but Summer League rotations cap the play at half a unit.','Full Analysis':'Opening Thesis: Cleveland is the preferred side in a near pick’em where the spread asks for only a two-point win.\n\nMatchup Edge: The Cavaliers project with slightly better playable depth and secondary creation.\n\nMarket and Number Context: -1.5 is playable; pass above -2.5 because Summer League uncertainty quickly erodes a small edge.\n\nHow It Cashes: Cleveland wins the bench minutes and avoids the late scoring droughts common in developmental games.\n\nRisk and Variance: Rotation changes, rest decisions and late fouling remain meaningful.\n\nMicks Picks Verdict: Cavaliers -1.5, B, 0.50u.'},
  {Sport:'NBA Summer League',Matchup:'Minnesota Timberwolves vs Portland Trail Blazers',Pick:'Minnesota Timberwolves -5.5',Line:'-5.5',Grade:'B',Units:0.50,Status:'Pending','Official Bet':'Yes','Best Number':'-5.5','No-Bet Cutoff':'-6.5',Writeup:'Minnesota has the preferred projected rotation and enough creation to separate, but the spread is near the upper end of what the framework permits for a standard Summer League side.','Full Analysis':'Opening Thesis: Minnesota has the better projected rotation, but the wager remains a controlled Summer League position.\n\nMatchup Edge: The Timberwolves should have more stable shot creation across the first and second units.\n\nMarket and Number Context: -5.5 is acceptable; do not chase beyond -6.5.\n\nHow It Cashes: Minnesota builds a lead through stronger bench possessions and protects it without a fourth-quarter collapse.\n\nRisk and Variance: Developmental substitutions and late backdoor scoring can erase a correct handicap.\n\nMicks Picks Verdict: Timberwolves -5.5, B, 0.50u.'}
]
const rawProps=[
  {Sport:'WNBA',Matchup:'Phoenix Mercury at Minnesota Lynx',Pick:'Minnesota Lynx First to 10 Points',Line:'-180',Grade:'B',Units:0.50,Status:'Pending','Official Bet':'Yes','Best Number':'-180 or better','No-Bet Cutoff':'-195',Writeup:'This isolates Minnesota’s superior starting-unit execution without paying the inflated -12 full-game spread. The Lynx only need to win the opening scoring race, which fits the framework’s derivative-over-side rule.','Full Analysis':'Opening Thesis: Use Minnesota’s early advantage rather than asking the Lynx to cover an inflated full-game number.\n\nCashing Path: Minnesota’s starting unit establishes defensive pressure and creates the first run of efficient possessions.\n\nMarket Context: -180 is expensive but acceptable for the short-race probability; pass beyond -195.\n\nRisk: One cold opening stretch or two early Phoenix threes can decide the market immediately.\n\nMicks Picks Verdict: Lynx first to 10, B, 0.50u.'},
  {Sport:'WNBA',Matchup:'Los Angeles Sparks at Atlanta Dream',Pick:'Atlanta Dream First to 10 Points',Line:'-145',Grade:'B',Units:0.50,Status:'Pending','Official Bet':'Yes','Best Number':'-145 or better','No-Bet Cutoff':'-160',Writeup:'The Dream’s first-unit structure makes the early race cleaner than adding more full-game spread exposure. Atlanta needs only the better opening sequence, not a nine-point final margin.','Full Analysis':'Opening Thesis: Atlanta’s early-market derivative offers a cleaner expression of the matchup than increasing the full-game spread stake.\n\nCashing Path: The Dream convert their first defensive stops into organized early offense and reach 10 before Los Angeles settles.\n\nMarket Context: -145 is playable; pass above -160.\n\nRisk: The Sparks’ pace can create a fast, high-variance opening where one made three changes the race.\n\nMicks Picks Verdict: Dream first to 10, B, 0.50u.'}
]
const rawLotto=[
  {Sport:'NBA Summer League / WNBA',Matchup:'Cavaliers / Timberwolves / Dream',Pick:'Cavaliers ML + Timberwolves ML + Dream ML',Line:'Parlay',Grade:'B-',Units:0.25,Status:'Pending','Official Bet':'Yes','Best Number':'Shop best available','No-Bet Cutoff':'Minimum +135 combined return',Writeup:'The parlay converts the preferred spread teams to moneylines and limits the ticket to three legs. It reduces margin risk but still carries Summer League and favorite-upset volatility, so the stake stays at a quarter unit.','Full Analysis':'Structure: Cleveland Cavaliers ML, Minnesota Timberwolves ML and Atlanta Dream ML.\n\nWhy These Legs: Each leg uses the preferred team without requiring a spread cover. The construction avoids Minnesota Lynx exposure because the full-game market is inflated.\n\nCorrelation: The games are independent, which reduces same-script concentration but does not remove normal parlay risk.\n\nPrice Requirement: Require at least +135 combined return.\n\nRisk: One Summer League rotation surprise or one WNBA favorite upset kills the entire ticket.\n\nMicks Picks Verdict: B-, 0.25u.'}
]

const validDate = easternCardDate() === CARD_DATE
const vip = validDate ? rawVip.map(r=>imported(r,'VIP','VIP')).filter(active) : []
const free = validDate ? rawFree.map(r=>imported(r,'Free Picks')).filter(active) : []
const propsLab = validDate ? rawProps.map(r=>imported(r,'Props Lab')).filter(active) : []
const lottoParlays = validDate ? rawLotto.map(r=>imported(r,'Lotto Parlays')).filter(active) : []
const longshots=[]
const publicRows=[...free,...propsLab,...lottoParlays]
const allRows=[...vip,...publicRows]
const totalUnits=allRows.reduce((s,r)=>s+Number(r.Units||0),0)

export default function handler(req,res){res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, max-age=0');res.setHeader('Pragma','no-cache');res.setHeader('Expires','0');res.status(200).json({ok:true,success:true,source:'micks-picks-july-13-final',date:CARD_DATE,expiresAt:'2026-07-14T02:00:00-04:00',vip,vipPicks:vip,vipVault:vip,free,freePicks:free,props:propsLab,propsLab,lottoParlays,lotto:lottoParlays,parlays:lottoParlays,longshots,mainPicks:[...vip,...free],activePicks:allRows,rows:allRows,records:allRows,picks:allRows,allRows,publicRows,totalUnits:Number(totalUnits.toFixed(2)),message:validDate?`${allRows.length} active picks posted for July 13, 2026.`:'No active picks. The prior card expired at 2:00 AM Eastern.'})}
