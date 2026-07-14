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
  {Sport:'WNBA',Matchup:'Los Angeles Sparks at Atlanta Dream',Pick:'Atlanta Dream -8.5',Line:'-8.5',Grade:'B',Units:0.50,Status:'Pending','Official Bet':'Yes'},
  {Sport:'NBA Summer League',Matchup:'Miami Heat vs Cleveland Cavaliers',Pick:'Cleveland Cavaliers -1.5',Line:'-1.5',Grade:'B',Units:0.50,Status:'Pending','Official Bet':'Yes'},
  {Sport:'NBA Summer League',Matchup:'Minnesota Timberwolves vs Portland Trail Blazers',Pick:'Minnesota Timberwolves -5.5',Line:'-5.5',Grade:'B',Units:0.50,Status:'Pending','Official Bet':'Yes'}
]
const rawProps=[
  {Sport:'WNBA',Matchup:'Phoenix Mercury at Minnesota Lynx',Pick:'Minnesota Lynx First to 10 Points',Line:'-180',Grade:'B',Units:0.50,Status:'Pending','Official Bet':'Yes'},
  {Sport:'WNBA',Matchup:'Los Angeles Sparks at Atlanta Dream',Pick:'Atlanta Dream First to 10 Points',Line:'-145',Grade:'B',Units:0.50,Status:'Pending','Official Bet':'Yes'}
]
const rawLotto=[
  {Sport:'NBA Summer League / WNBA',Matchup:'Cavaliers / Timberwolves / Dream',Pick:'Cavaliers ML + Timberwolves ML + Dream ML',Line:'Parlay',Grade:'B-',Units:0.25,Status:'Pending','Official Bet':'Yes'}
]

async function officialOpeningRaces() {
  const board = await fetch('https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard?dates=20260713', {headers:{'User-Agent':'Mozilla/5.0'}}).then(async r=>{if(!r.ok)throw new Error(`scoreboard ${r.status}`);return r.json()})
  const wanted=(board.events||[]).filter(event=>/Phoenix Mercury|Minnesota Lynx|Los Angeles Sparks|Atlanta Dream/.test((event.competitions?.[0]?.competitors||[]).map(c=>c.team?.displayName||'').join(' | ')))
  const games=[]
  for(const event of wanted){
    const summary=await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/summary?event=${event.id}`,{headers:{'User-Agent':'Mozilla/5.0'}}).then(async r=>{if(!r.ok)throw new Error(`summary ${event.id} ${r.status}`);return r.json()})
    const opening=[];let reachedTen=null
    for(const play of (summary.plays||[])){
      const row={period:play.period?.number,clock:play.clock?.displayValue,text:play.text,homeScore:Number(play.homeScore||0),awayScore:Number(play.awayScore||0),scoringPlay:play.scoringPlay}
      opening.push(row)
      if(row.homeScore>=10||row.awayScore>=10){reachedTen=row;break}
    }
    games.push({id:event.id,name:event.name,shortName:event.shortName,reachedTen,opening})
  }
  return {ok:true,date:CARD_DATE,games}
}

export default async function handler(req,res){
  res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, max-age=0');res.setHeader('Pragma','no-cache');res.setHeader('Expires','0')
  if(String(req.query?.gradingSource||'')==='1'){
    try{return res.status(200).json(await officialOpeningRaces())}catch(error){return res.status(500).json({ok:false,error:String(error?.message||error)})}
  }
  const validDate=easternCardDate()===CARD_DATE
  const vip=validDate?rawVip.map(r=>imported(r,'VIP','VIP')).filter(active):[]
  const free=validDate?rawFree.map(r=>imported(r,'Free Picks')).filter(active):[]
  const propsLab=validDate?rawProps.map(r=>imported(r,'Props Lab')).filter(active):[]
  const lottoParlays=validDate?rawLotto.map(r=>imported(r,'Lotto Parlays')).filter(active):[]
  const longshots=[];const publicRows=[...free,...propsLab,...lottoParlays];const allRows=[...vip,...publicRows]
  const totalUnits=allRows.reduce((s,r)=>s+Number(r.Units||0),0)
  return res.status(200).json({ok:true,success:true,source:'micks-picks-july-13-settlement-check',date:CARD_DATE,expiresAt:'2026-07-14T02:00:00-04:00',vip,vipPicks:vip,vipVault:vip,free,freePicks:free,props:propsLab,propsLab,lottoParlays,lotto:lottoParlays,parlays:lottoParlays,longshots,mainPicks:[...vip,...free],activePicks:allRows,rows:allRows,records:allRows,picks:allRows,allRows,publicRows,totalUnits:Number(totalUnits.toFixed(2)),message:validDate?`${allRows.length} active picks posted for July 13, 2026.`:'No active picks. The prior card expired at 2:00 AM Eastern.'})
}
