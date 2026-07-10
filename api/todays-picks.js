function record(section, data) {
  const access = data.Access || (section === 'VIP' ? 'VIP' : 'Free')
  return {
    ...data,
    section,
    __section: section,
    originalTable: section,
    access,
    Access: access,
    date: data.Date,
    sport: data.Sport,
    league: data.League,
    game: data.Game,
    pick: data.Pick,
    market: data['Bet Type'] || data.Prop || '',
    odds: data.Odds || '',
    grade: data.Grade || '',
    units: data.Units || '',
    confidence: data.Confidence || '',
    status: data.Status || 'Pending',
    notes: data.Writeup || data['Full Analysis'] || '',
    source: 'Micks Picks July 10 card'
  }
}

const vip = [
  record('VIP', {
    Date: '2026-07-10', Sport: 'Soccer', League: 'FIFA World Cup', Game: 'Spain vs Belgium',
    Pick: 'Spain to Advance', 'Bet Type': 'To Advance', Odds: '-320', Sportsbook: 'Circa',
    Grade: 'A-', Units: '1.00', 'Best Number': '-320 or better', 'No-Bet Cutoff': '-360',
    Confidence: '8.7/10', Status: 'Pending', Access: 'VIP', Featured: 'Yes',
    'Official Bet': 'Yes', 'Pick of the Day Eligible': 'Yes',
    'Full Analysis': 'Spain is the stronger side and the to-advance market protects against extra time or penalties. Belgium’s improved form adds enough variance to keep the grade at A-. The knockout-stage strategy favors to advance rather than regulation moneyline, reducing draw risk while preserving the preferred side.',
    Risk: 'Belgium counterattack and knockout volatility.'
  }),
  record('VIP', {
    Date: '2026-07-10', Sport: 'Basketball', League: 'WNBA', Game: 'Chicago Sky vs Los Angeles Sparks',
    Pick: 'Los Angeles Sparks ML', 'Bet Type': 'Moneyline', Odds: '-115', Sportsbook: 'Circa',
    Grade: 'A-', Units: '1.00', 'Best Number': '-115', 'No-Bet Cutoff': '-130',
    Confidence: '8.5/10', Status: 'Pending', Access: 'VIP', Featured: 'Yes',
    'Official Bet': 'Yes', 'Pick of the Day Eligible': 'Yes',
    'Full Analysis': 'The market prices this close to a coin flip, while the supporting model makes Los Angeles a substantially larger favorite. The moneyline avoids unnecessary spread variance and is preferred over laying points.',
    Risk: 'Chicago’s recent improvement and close-game variance.'
  })
]

const free = [
  record('Free', { Date:'2026-07-10', Sport:'Basketball', League:'WNBA', Game:'Connecticut Sun vs Golden State Valkyries', Pick:'Over 153.5', 'Bet Type':'Game Total', Grade:'B+', Units:'0.75', 'Best Number':'153.5', 'No-Bet Cutoff':'155.5', Confidence:'7.8/10', Status:'Pending', Access:'Free', 'Official Bet':'Yes', Writeup:'The supporting model projects a total near 160, leaving value over the posted number.' }),
  record('Free', { Date:'2026-07-10', Sport:'Basketball', League:'NBA Summer League', Game:'Chicago Bulls vs Memphis Grizzlies', Pick:'Memphis Grizzlies ML', 'Bet Type':'Moneyline', Grade:'B+', Units:'0.75', 'No-Bet Cutoff':'-175', Confidence:'7.6/10', Status:'Pending', Access:'Free', 'Official Bet':'Yes', Writeup:'Memphis has the stronger projected roster and better continuity. The moneyline is preferred over laying six points.' }),
  record('Free', { Date:'2026-07-10', Sport:'Basketball', League:'NBA Summer League', Game:'Miami Heat vs Milwaukee Bucks', Pick:'Milwaukee Bucks ML', 'Bet Type':'Moneyline', Odds:'-120', Grade:'B', Units:'0.50', 'No-Bet Cutoff':'-135', Confidence:'7.2/10', Status:'Pending', Access:'Free', 'Official Bet':'Yes', Writeup:'Milwaukee projects to have the stronger top-end Summer League roster.' }),
  record('Free', { Date:'2026-07-10', Sport:'Basketball', League:'NBA Summer League', Game:'Toronto Raptors vs Boston Celtics', Pick:'Toronto Raptors -2.5', 'Bet Type':'Spread', Grade:'B', Units:'0.50', 'Best Number':'-2.5', 'No-Bet Cutoff':'-4', Confidence:'7.0/10', Status:'Pending', Access:'Free', 'Official Bet':'Yes', Writeup:'Toronto has a slight projected roster edge and the spread remains short.' }),
  record('Free', { Date:'2026-07-10', Sport:'Basketball', League:'NBA Summer League', Game:'Indiana Pacers vs Cleveland Cavaliers', Pick:'Cleveland Cavaliers -5', 'Bet Type':'Spread', Grade:'B-', Units:'0.50', 'Best Number':'-5', 'No-Bet Cutoff':'-6', Confidence:'6.8/10', Status:'Pending', Access:'Free', 'Official Bet':'Yes', Writeup:'Cleveland projects with better depth and defensive structure, but the five-point spread adds late-game risk.' })
]

const propsLab = [
  record('Props', { Date:'2026-07-10', Sport:'Soccer', League:'FIFA World Cup', Game:'Spain vs Belgium', Pick:'Over 2.5 Goals', Prop:'Over 2.5 Goals', Category:'Game Prop', Odds:'-125', Grade:'B+', Units:'0.50', Confidence:'7.7/10', Status:'Pending', Access:'Free', 'Official Bet':'Yes', Writeup:'Belgium’s attacking form and Spain’s chance creation support a higher-scoring quarterfinal.' }),
  record('Props', { Date:'2026-07-10', Sport:'Soccer', League:'FIFA World Cup', Game:'Spain vs Belgium', Pick:'Both Teams to Score - Yes', Prop:'Both Teams to Score - Yes', Category:'Game Prop', Odds:'-125', Grade:'B', Units:'0.50', Confidence:'7.3/10', Status:'Pending', Access:'Free', 'Official Bet':'Yes', Writeup:'Belgium has enough attacking quality to contribute while Spain should create multiple chances.' }),
  record('Props', { Date:'2026-07-10', Sport:'Soccer', League:'FIFA World Cup', Game:'Spain vs Belgium', Pick:'Lamine Yamal Anytime Scorer', Player:'Lamine Yamal', Prop:'Anytime Scorer', Odds:'+170', Grade:'B', Units:'0.50', Confidence:'7.1/10', Status:'Pending', Access:'Free', 'Official Bet':'Yes', Writeup:'Spain should control attacking territory and the plus-money price provides sufficient upside.' }),
  record('Props', { Date:'2026-07-10', Sport:'Basketball', League:'WNBA', Game:'Dallas Wings vs Toronto Tempo', Pick:'Paige Bueckers Over 5 Assists', Player:'Paige Bueckers', Prop:'Over 5 Assists', Odds:'-120', Grade:'B', Units:'0.50', Confidence:'7.2/10', Status:'Pending', Access:'Free', 'Official Bet':'Yes', Writeup:'Bueckers’ recent assist production and prior matchup support the over.' })
]

const lottoParlays = [
  record('Lotto', { Date:'2026-07-10', Sport:'Multi-Sport', League:'World Cup / WNBA / NBA Summer League', Game:'Spain vs Belgium; Sky vs Sparks; Bulls vs Grizzlies', Pick:'Spain to Advance + Sparks ML + Grizzlies ML', 'Bet Type':'3-Leg Parlay', Grade:'B+', Units:'0.50', Confidence:'7.7/10', Status:'Pending', Access:'Free', Featured:'No', 'Official Bet':'Yes', Writeup:'The parlay combines the strongest knockout advancement position, the best-supported WNBA moneyline edge, and Memphis without laying Summer League points.' }),
  record('Lotto', { Date:'2026-07-10', Sport:'Multi-Sport', League:'World Cup / WNBA', Game:'Spain vs Belgium; Sky vs Sparks', Pick:'Spain to Advance + Sparks ML', 'Bet Type':'2-Leg Parlay', Grade:'A-', Units:'0.75', Confidence:'8.3/10', Status:'Pending', Access:'Free', Featured:'No', 'Official Bet':'Yes', Writeup:'Safer two-leg version using the two VIP moneyline-style positions.' })
]

const longshots = [
  record('Longshots', { Date:'2026-07-10', Sport:'Soccer', League:'FIFA World Cup', Game:'Spain vs Belgium', Pick:'Kevin De Bruyne Anytime Scorer', Player:'Kevin De Bruyne', Prop:'Anytime Scorer', Odds:'+475', Grade:'C+', Units:'0.20', Confidence:'5.8/10', Status:'Pending', Access:'Free', 'Official Bet':'Yes', Writeup:'A small lottery-style exposure at a large plus price.' }),
  record('Longshots', { Date:'2026-07-10', Sport:'Soccer', League:'FIFA World Cup', Game:'Spain vs Belgium', Pick:'Charles De Ketelaere Anytime Scorer', Player:'Charles De Ketelaere', Prop:'Anytime Scorer', Odds:'+495', Grade:'C+', Units:'0.20', Confidence:'5.6/10', Status:'Pending', Access:'Free', 'Official Bet':'Yes', Writeup:'A small lottery-style scorer position at a large plus price.' })
]

const publicRows = [...free, ...propsLab, ...lottoParlays, ...longshots]
const allRows = [...vip, ...publicRows]

export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  res.status(200).json({
    ok: true,
    success: true,
    source: 'micks-picks-july-10-public-card',
    date: '2026-07-10',
    vip,
    vipPicks: vip,
    vipVault: vip,
    free,
    freePicks: free,
    props: propsLab,
    propsLab,
    lottoParlays,
    lotto: lottoParlays,
    parlays: lottoParlays,
    longshots,
    mainPicks: [...vip, ...free],
    activePicks: allRows,
    rows: allRows,
    records: allRows,
    picks: allRows,
    allRows,
    publicRows,
    message: 'July 10 public card released.'
  })
}
