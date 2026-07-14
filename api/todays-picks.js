const CARD_DATE = '2026-07-14'
const SETTLED = new Set(['graded','settled','final','completed','complete','win','won','loss','lost','push','void','voided','cancelled','canceled'])
const norm = value => String(value || '').trim().toLowerCase()

function easternCardDate(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false
  }).formatToParts(now).filter(part => part.type !== 'literal').map(part => [part.type, part.value]))
  const current = `${parts.year}-${parts.month}-${parts.day}`
  if (Number(parts.hour) >= 2) return current
  const prior = new Date(`${current}T12:00:00Z`)
  prior.setUTCDate(prior.getUTCDate() - 1)
  return prior.toISOString().slice(0, 10)
}

function active(row) {
  const status = norm(row.Status || row.status || row['Release Status'])
  const result = norm(row.Result || row.result || row.Outcome || row.outcome)
  return !SETTLED.has(status) && !SETTLED.has(result) && norm(row['Official Bet'] || row.officialBet) !== 'no'
}

function imported(row, section, access = 'Free') {
  const matchup = row.Matchup || row.Game || ''
  const pick = row.Pick || ''
  const sport = row.Sport || row.League || ''
  const line = row.Line || row.Odds || ''
  return {
    ...row, Date:CARD_DATE, date:CARD_DATE, Section:section, section,
    Access:access, access:access.toLowerCase(), Sport:sport, sport,
    League:sport, league:sport, Matchup:matchup, matchup, Game:matchup, game:matchup,
    Pick:pick, pick, Line:line, line, Odds:line, odds:line,
    Grade:row.Grade, grade:row.Grade, Units:Number(row.Units || 0), units:Number(row.Units || 0),
    Status:row.Status || 'Pending', status:row.Status || 'Pending',
    Writeup:row.Writeup || '', writeup:row.Writeup || '',
    'Full Analysis':row['Full Analysis'] || '', fullAnalysis:row['Full Analysis'] || '', full:row['Full Analysis'] || '',
    'Best Number':row['Best Number'] || '', bestNumber:row['Best Number'] || '', best:row['Best Number'] || '',
    'No-Bet Cutoff':row['No-Bet Cutoff'] || '', noBetCutoff:row['No-Bet Cutoff'] || '', cutoff:row['No-Bet Cutoff'] || '',
    'Lineup Note':row['Lineup Note'] || 'Confirm the current lineup before betting when practical. Lineup confirmation is advisory and is not required for this card to remain published.',
    lineupNote:row['Lineup Note'] || 'Confirm the current lineup before betting when practical. Lineup confirmation is advisory and is not required for this card to remain published.',
    'Official Bet':row['Official Bet'] || row.officialBet || 'Yes', officialBet:row['Official Bet'] || row.officialBet || 'Yes'
  }
}

const rawVip = [{
  Sport:'WNBA', Matchup:'Toronto Tempo at Washington Mystics', Pick:'Toronto Tempo +2', Line:'+2', Grade:'A-', Units:1.00,
  Confidence:'8.8/10', Status:'Pending', 'Official Bet':'Yes', 'Best Number':'+2 or better', 'No-Bet Cutoff':'Pick’em', 'Pick of the Day':'Yes',
  'Lineup Note':'Confirm the current starting groups before betting when practical. The release remains posted because the edge is tied to the model-to-market gap; pass only if the number moves past pick’em or material lineup news changes the matchup.',
  Writeup:'Toronto +2 is the strongest release because the number creates a meaningful gap between the market and the best independent projection available. Circa installed Washington as a two-point favorite, while the VSiN TSI projection made Toronto approximately a 1.5-point favorite. That is roughly a 3.5-point swing through pick’em, which is large enough to meet the Micks Picks VIP model-consensus threshold when another independent source agrees. Doc’s Sports also supported Toronto on the underdog side, giving this play directional confirmation rather than leaving it dependent on one model. Toronto has enough experienced guard creation to keep the game organized late, and receiving points is valuable in a matchup the model treats as close to Toronto-favored. The wager can cash through an outright Tempo win or a one-point loss. Expansion-team volatility remains the primary risk, so the edge is tied directly to the available number. Take +2 or +1 and pass once the market moves beyond pick’em.',
  'Full Analysis':'Opening Thesis: Toronto is receiving points in a matchup where VSiN made the Tempo the slight favorite. The model-to-market discrepancy and Doc’s Sports agreement create the consensus required for A- VIP status.\n\nMarket Context: Circa offered Toronto +2 while VSiN projected Toronto near -1.5, creating an approximate 3.5-point difference through pick’em. +2 is best, +1 remains playable and pick’em is the cutoff.\n\nHow It Cashes: Toronto wins outright or stays within one possession by controlling turnovers and executing in the closing minutes.\n\nRisk: Expansion-team rotation volatility and Washington’s young scoring talent can create separation. Confirm lineups when practical, but lineup confirmation is advisory rather than a publishing requirement.\n\nFinal Verdict: Toronto Tempo +2, A-, 1.00u.'
}]

const rawFree = [
  {
    Sport:'WNBA', Matchup:'Portland Fire at Connecticut Sun', Pick:'Connecticut Sun +1 or better', Line:'Conditional +1 or better', Grade:'B', Units:0.50,
    Status:'Pending', 'Official Bet':'Yes', 'Best Number':'+1.5 or better', 'No-Bet Cutoff':'+1',
    'Lineup Note':'Confirm Brittney Griner and the current Connecticut rotation when practical. This is a price-conditional release: do not play Connecticut as a favorite or at pick’em.',
    Writeup:'Connecticut is publishable only in the underdog range. VSiN’s available projection treated the game close to pick’em and supported the Sun when the market offered plus points, but that support did not justify laying Connecticut -2. The correct Micks approach is therefore a price-parameter card rather than withholding the play entirely. Connecticut +1.5 or better gives the Sun a small cushion in a matchup expected to remain competitive, while the number also protects against a one-point loss. Portland’s expansion volatility and the uncertainty surrounding Connecticut’s rotation prevent a higher grade. Confirm Griner’s status and the current starting group when practical, but lineup confirmation is advisory. The bettor should pass automatically if Connecticut is pick’em or favored; +1 is the absolute cutoff.',
    'Full Analysis':'This release is controlled entirely by price. Connecticut +1.5 or better is playable; +1 is the cutoff. Do not convert the opinion into Sun -1, -2 or a taxed moneyline. Rotation confirmation is recommended but does not block publication.'
  },
  {
    Sport:'NBA Summer League', Matchup:'Denver Nuggets vs Oklahoma City Thunder', Pick:'Oklahoma City Thunder -1.5', Line:'-1.5 (-120)', Grade:'B', Units:0.50,
    Status:'Pending', 'Official Bet':'Yes', 'Best Number':'-1.5', 'No-Bet Cutoff':'-2.5',
    'Lineup Note':'Check active Summer League participants when practical. The play remains published; pass if multiple primary Oklahoma City creators are ruled out or the spread exceeds -2.5.',
    Writeup:'Oklahoma City is preferred because the spread is small enough that the Thunder need only a conventional two-point win. The organization’s Summer League groups generally emphasize length, ball movement and multi-position creation, giving this roster a plausible edge across more than one lineup combination. The main risk is the developmental environment: minutes can change abruptly, players can rest and late fouling can swing a cover. Those factors cap the release at B and 0.50u. Lineup confirmation is recommended but no longer a publication requirement. Take -1.5, remain comfortable at -2 and pass beyond -2.5.',
    'Full Analysis':'The small spread minimizes the margin requirement. Oklahoma City needs to win the reserve minutes, limit turnovers and execute better late. Summer League volatility caps the grade. Use -2.5 as the hard cutoff even if lineups remain unconfirmed.'
  },
  {
    Sport:'NBA Summer League', Matchup:'Houston Rockets vs Philadelphia 76ers', Pick:'Philadelphia 76ers -5', Line:'-5', Grade:'B', Units:0.50,
    Status:'Pending', 'Official Bet':'Yes', 'Best Number':'-5', 'No-Bet Cutoff':'-6',
    'Lineup Note':'Check active Summer League participants when practical. The card stays published; pass if Philadelphia removes multiple primary handlers or the spread reaches -6.',
    Writeup:'Philadelphia has the stronger projected rotation and more usable creation across its first and second groups, giving the 76ers a path to build separation during bench-heavy stretches. The -5 spread already requires more than simple superiority, which is why the position remains B, 0.50u. Philadelphia must control turnovers, create paint pressure and enter the fourth quarter with enough margin to withstand developmental substitutions. Late scratches, poor free-throw shooting and backdoor scoring are the main hazards. Lineup confirmation is advisory rather than mandatory. Play -5, accept -5.5 only cautiously and pass at -6 or worse.',
    'Full Analysis':'Philadelphia’s depth and multiple handlers support the favorite, but the five-point requirement and Summer League volatility prevent an upgrade. The market cutoff is -6. Confirm lineups when possible, but do not remove the card solely because they are not yet official.'
  }
]

const rawProps = [
  {
    Sport:'FIFA World Cup', Matchup:'Spain vs France — Semifinal', Pick:'Both Teams to Score — Yes', Line:'-145', Grade:'B', Units:0.50,
    Status:'Pending', 'Official Bet':'Yes', 'Best Number':'-145 or better', 'No-Bet Cutoff':'-160',
    'Lineup Note':'Confirm the expected attacking starters when practical. The prop remains published; pass if a major attacker is unexpectedly absent or the price exceeds -160.',
    Writeup:'BTTS Yes expresses the attacking quality in the semifinal without requiring either team to win in regulation. Spain’s possession and pressing can generate sustained chances, while France has the transition speed to punish space behind that pressure. The market does carry knockout risk because either side may become conservative after taking the lead, but both teams have enough high-level creation to produce one goal apiece. The -145 price is acceptable for a half-unit B release; above -160 the cost outweighs the edge. Confirming the attacking lineups is recommended but not required for publication.',
    'Full Analysis':'The cashing path requires one Spain goal through territorial pressure and one France goal through transition or individual quality. Tactical caution is the failure path. Play through -155 and pass beyond -160.'
  },
  {
    Sport:'WNBA', Matchup:'Toronto Tempo at Washington Mystics', Pick:'Marina Mabrey Over 22 Points', Line:'Over 22 (-102)', Grade:'B', Units:0.50,
    Status:'Pending', 'Official Bet':'Yes', 'Best Number':'22 at -110 or better', 'No-Bet Cutoff':'22.5 or -120',
    'Lineup Note':'Confirm Mabrey is active when practical. The prop remains published; pass if her role is reduced, the line rises above 22.5 or the price is worse than -120.',
    Writeup:'Mabrey’s scoring role and recent production create a direct volume path to clearing 22 points. She can reach the number through a combination of primary creation, perimeter attempts and free throws rather than needing an extreme shooting performance from one area. The Toronto side already projects competitively, which supports a game script where its lead guard remains engaged deep into the fourth quarter. The threshold is not soft enough for a higher grade, and a poor shooting night remains the obvious failure path. Keep the stake at 0.50u, play 22 at -110 or better and pass if the market moves to 23 or charges beyond -120.',
    'Full Analysis':'Opportunity and usage support the over, but the threshold demands normal efficiency. Active status should be checked when practical; the published cutoff controls the final betting decision.'
  },
  {
    Sport:'WNBA', Matchup:'Toronto Tempo at Washington Mystics', Pick:'Sonia Citron Under 18 Points', Line:'Under 18 (-113)', Grade:'B-', Units:0.25,
    Status:'Pending', 'Official Bet':'Yes', 'Best Number':'18 or higher', 'No-Bet Cutoff':'17.5 or -125',
    'Lineup Note':'Confirm Citron is active and expected to hold her normal role when practical. The prop remains published; pass if the number drops below 18.',
    Writeup:'Citron’s scoring ability is respected, which is why this is only a quarter-unit B- position. The under is based on the 18-point threshold requiring a relatively strong scoring outcome in a matchup where Washington may distribute creation across several young options. Toronto’s preferred side profile also supports the possibility of Washington facing less comfortable half-court possessions. The risk is clear: Citron can exceed the number through efficient perimeter shooting or elevated free-throw volume. Play Under 18 or a better number, keep the price at -125 or better and pass if the market falls to 17.5.',
    'Full Analysis':'The under has a distribution and efficiency path, but Citron’s upside prevents a larger stake. The number must remain 18 or higher. Lineup confirmation is advisory.'
  }
]

const rawLotto = [{
  Sport:'Cross-Sport', Matchup:'Tempo / 76ers', Pick:'Toronto Tempo ML + Philadelphia 76ers ML', Line:'Parlay', Grade:'B-', Units:0.25,
  Status:'Pending', 'Official Bet':'Yes', 'Best Number':'Minimum -105 combined return', 'No-Bet Cutoff':'Worse than -120 combined return',
  'Lineup Note':'Confirm active participants when practical. The parlay remains published, but do not play at a price worse than -120 and do not add extra legs.',
  Writeup:'This two-leg parlay removes the spread requirement from Toronto and Philadelphia. Toronto only needs to win outright, while Philadelphia only needs to win its Summer League game. Reducing the construction from three legs to two lowers the number of independent failure points and removes all France exposure. The ticket still duplicates existing straight-game exposure, so the stake remains limited to 0.25u. Shop for approximately -105 or better and pass if the combined price is worse than -120.',
  'Full Analysis':'Structure: Toronto Tempo ML plus Philadelphia 76ers ML. Both legs remove spread requirements, and France has been removed entirely. Duplicate exposure is controlled through the 0.25u stake.'
}]

const rawLongshots = []
const birthdayNote = 'July 14 sports birthdays are narrative only and should not be treated as edge.'
const publishingRule = 'Lineup confirmation and exact live-price confirmation are advisory, not publication blockers. Every card supplies a Best Number and No-Bet Cutoff so the bettor can make the final pass decision.'

export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  const validDate = easternCardDate() === CARD_DATE
  const vip = validDate ? rawVip.map(row => imported(row, 'VIP', 'VIP')).filter(active) : []
  const free = validDate ? rawFree.map(row => imported(row, 'Free Picks')).filter(active) : []
  const propsLab = validDate ? rawProps.map(row => imported(row, 'Props Lab')).filter(active) : []
  const lottoParlays = validDate ? rawLotto.map(row => imported(row, 'Lotto Parlays')).filter(active) : []
  const longshots = validDate ? rawLongshots.map(row => imported(row, 'Longshots')).filter(active) : []
  const publicRows = [...free, ...propsLab, ...lottoParlays, ...longshots]
  const allRows = [...vip, ...publicRows]
  const straightAndPropsUnits = [...vip, ...free, ...propsLab].reduce((sum, row) => sum + Number(row.Units || 0), 0)
  const parlayUnits = lottoParlays.reduce((sum, row) => sum + Number(row.Units || 0), 0)
  const totalUnits = straightAndPropsUnits + parlayUnits
  res.status(200).json({
    ok:true, success:true, source:'micks-picks-july-14-france-removed', date:CARD_DATE,
    expiresAt:'2026-07-15T02:00:00-04:00', vip, vipPicks:vip, vipVault:vip,
    free, freePicks:free, props:propsLab, propsLab, lottoParlays, lotto:lottoParlays,
    parlays:lottoParlays, longshots, mainPicks:[...vip, ...free], activePicks:allRows,
    rows:allRows, records:allRows, picks:allRows, allRows, publicRows,
    straightAndPropsUnits:Number(straightAndPropsUnits.toFixed(2)),
    parlayUnits:Number(parlayUnits.toFixed(2)), totalUnits:Number(totalUnits.toFixed(2)),
    birthdayNote, publishingRule,
    message:validDate ? `${allRows.length} official picks posted for July 14, 2026.` : 'No active picks. The July 14 card expired at 2:00 AM Eastern.'
  })
}