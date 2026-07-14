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
    Score:Number(row.Score || 0), score:Number(row.Score || 0), ScoreBreakdown:row.ScoreBreakdown || {}, scoreBreakdown:row.ScoreBreakdown || {},
    'Official Bet':row['Official Bet'] || row.officialBet || 'Yes', officialBet:row['Official Bet'] || row.officialBet || 'Yes'
  }
}

const rawVip = [{
  Sport:'WNBA', Matchup:'Toronto Tempo at Washington Mystics', Pick:'Toronto Tempo +2', Line:'+2', Grade:'A-', Units:1.00,
  Score:82, ScoreBreakdown:{micksModelEdge:25,vsinAgreement:15,docsAgreement:10,lineValue:15,injuryAdvantage:0,schedulingEdge:0,progressiveFade:7,favoriteInflationPass:5,sharpMoneyConfirmation:5},
  Confidence:'8.8/10', Status:'Pending', 'Official Bet':'Yes', 'Best Number':'+2 or better', 'No-Bet Cutoff':'Pick’em', 'Pick of the Day':'Yes',
  'Lineup Note':'Confirm the current starting groups before betting when practical. The release remains posted because the edge is tied to the model-to-market gap; pass only if the number moves past pick’em or material lineup news changes the matchup.',
  Writeup:'Toronto +2 is the strongest release on the board because this is one of the few spots where the market price, the strongest available projection and an independent outside handicap all point in the same direction. Circa made Washington a two-point favorite, but the VSiN TSI projection made Toronto approximately a 1.5-point favorite. That is roughly a 3.5-point discrepancy through pick’em, which is materially stronger than the small half-point or one-point differences that usually produce only a Free Pick. Doc’s Sports also preferred Toronto, giving this wager genuine source agreement rather than a single-model opinion.\n\nThe matchup supports the number. Toronto has enough experienced guard creation to keep the offense organized in the half court and enough perimeter shot-making to avoid relying only on transition. That matters late in a close game, when the ability to generate a clean first action and get into secondary offense becomes more valuable than raw pace. Washington has young scoring talent, but it can still be forced into difficult possessions when opponents take away early-clock opportunities and make the Mystics execute against a set defense.\n\nThe preferred game script is Toronto controlling turnovers, keeping Washington out of extended transition runs and entering the fourth quarter inside one possession. At that point, the +2 becomes increasingly valuable because the Tempo can cash with an outright win or a one-point loss. The main failure path is expansion-team volatility: Toronto can still suffer uneven bench stretches, defensive communication breakdowns or a prolonged third-quarter drought. That is why the play is A- rather than A or A+.\n\nThe scoring model assigns 82 points: 25 for the model edge, 15 for VSiN agreement, 10 for Doc’s agreement, 15 for line value, 7 for progressive-fade context, 5 for clearing the favorite-inflation screen and 5 for available market confirmation. Best Number: +2 or better. No-Bet Cutoff: pick’em. Confidence: 8.8/10. Final verdict: Toronto Tempo +2, A-, 1.00u, Pick of the Day.',
  'Full Analysis':'Opening Thesis: Toronto is receiving points in a matchup where the strongest available projection makes the Tempo the slight favorite. That model-to-market disagreement crosses pick’em and receives independent support from Doc’s Sports, creating a true VIP qualification rather than a quota fill.\n\nMarket Analysis: Circa opened Washington -2. VSiN’s TSI projection placed Toronto near -1.5, creating an approximate 3.5-point discrepancy through pick’em. +2 is the preferred entry, +1 remains playable and pick’em is the hard cutoff.\n\nModel Breakdown: Micks score 82/100. Model edge 25/25; VSiN agreement 15/15; Doc’s agreement 10/10; line value 15/15; injury advantage 0/10; scheduling edge 0/10; progressive-fade context 7/10; favorite-inflation pass 5/5; market confirmation 5/10. The score clears the A- threshold of 80 without unsupported injury or sharp-money claims.\n\nMatchup Analysis: Toronto’s best path is organized guard play, controlled tempo and enough half-court creation to prevent Washington from dictating the game through athleticism. Washington’s danger comes from young scoring bursts, early offense and transition opportunities.\n\nWhy It Wins: Toronto limits live-ball turnovers, makes Washington execute against a set defense and reaches the final five minutes in a one-possession game.\n\nHow It Loses: Toronto’s expansion rotation produces a major scoring drought, Washington creates separation through transition, or late lineup news materially changes the scoring balance.\n\nPrice Sensitivity: Best Number +2 or better. Playable at +1. No-Bet Cutoff pick’em.\n\nFinal Verdict: Toronto Tempo +2, A-, 1.00u, 8.8/10 confidence. This is today’s only play that clears the full VIP threshold.'
}]

const rawFree = [
  {
    Sport:'WNBA', Matchup:'Portland Fire at Connecticut Sun', Pick:'Connecticut Sun +1 or better', Line:'Conditional +1 or better', Grade:'B', Units:0.50,
    Score:64, ScoreBreakdown:{micksModelEdge:10,vsinAgreement:15,docsAgreement:0,lineValue:12,injuryAdvantage:0,schedulingEdge:5,progressiveFade:7,favoriteInflationPass:5,sharpMoneyConfirmation:10},
    Status:'Pending', 'Official Bet':'Yes', 'Best Number':'+1.5 or better', 'No-Bet Cutoff':'+1',
    'Lineup Note':'Confirm Brittney Griner and the current Connecticut rotation when practical. This is a price-conditional release: do not play Connecticut as a favorite or at pick’em.',
    Writeup:'Connecticut is an official play only when the Sun are receiving points. That distinction matters because VSiN’s available projection treated the matchup close to pick’em and supported Connecticut when the market offered plus points, but it did not justify laying -1, -2 or paying a taxed moneyline. The correct Micks approach is to publish the opinion with strict parameters rather than pretend the same edge exists at every price.\n\nAt +1.5 or better, Connecticut gains protection in a matchup expected to remain competitive. A one-point loss still cashes, and the wager avoids asking the Sun to create margin against a Portland team capable of producing volatile scoring stretches. Connecticut’s preferred path is to keep the game in the half court, avoid giving Portland easy transition chances and lean on experienced interior offense when the pace slows.\n\nThe uncertainty around Brittney Griner and the current rotation prevents a stronger grade. Portland’s expansion status also cuts both ways: it can create mistakes, but it can also create unpredictability. The failure path is Connecticut becoming a favorite before bet time, losing key interior availability or allowing Portland to dictate pace.\n\nMicks score: 64/100, a B-grade release. Best Number: +1.5 or better. No-Bet Cutoff: +1. Do not play Connecticut at pick’em or as a favorite.',
    'Full Analysis':'Opening Thesis: Connecticut is playable only as an underdog because the available projection supports the Sun near pick’em, not as a favorite.\n\nMarket Analysis: +1.5 or better creates a usable cushion. +1 is the absolute cutoff. Any move to pick’em or Connecticut -1 removes the value.\n\nModel Breakdown: 64/100. VSiN agreement and line value carry the score; the lack of Doc’s consensus and unresolved rotation information cap the grade.\n\nMatchup Analysis: Connecticut’s best path is a controlled half-court game with interior touches and fewer transition possessions.\n\nWhy It Wins: The Sun keep the game within one possession and either win outright or lose by one.\n\nHow It Loses: Key rotation pieces are unavailable, Portland creates repeated transition scores, or the market moves through the cutoff.\n\nFinal Verdict: Connecticut +1 or better, B, 0.50u.'
  },
  {
    Sport:'NBA Summer League', Matchup:'Denver Nuggets vs Oklahoma City Thunder', Pick:'Oklahoma City Thunder -1.5', Line:'-1.5 (-120)', Grade:'B', Units:0.50,
    Score:63, ScoreBreakdown:{micksModelEdge:10,vsinAgreement:0,docsAgreement:0,lineValue:12,injuryAdvantage:0,schedulingEdge:8,progressiveFade:8,favoriteInflationPass:5,sharpMoneyConfirmation:20},
    Status:'Pending', 'Official Bet':'Yes', 'Best Number':'-1.5', 'No-Bet Cutoff':'-2.5',
    'Lineup Note':'Check active Summer League participants when practical. The play remains published; pass if multiple primary Oklahoma City creators are ruled out or the spread exceeds -2.5.',
    Writeup:'Oklahoma City is the preferred Summer League side because the market asks for only a conventional two-point victory. That small margin requirement is important in a developmental environment where rotations can change quickly and fourth-quarter lineups often look different from the units that created the pregame edge. The Thunder do not need to dominate; they need to be slightly better across the full rotation.\n\nOklahoma City’s organizational profile favors length, ball movement and multiple decision-makers. In Summer League, that gives a team more ways to survive when one scorer goes cold or one unit is changed unexpectedly. The preferred game script is the Thunder limiting live-ball turnovers, creating enough transition offense from their defensive activity and winning the reserve minutes by a small margin.\n\nThe main risk is Summer League variance itself: players can rest without much warning, minutes can be reduced and late fouling can turn a correct side into a failed cover. Those factors cap every Summer League play at B and 0.50u.\n\nMicks score: 63/100. Best Number: -1.5. Playable at -2. No-Bet Cutoff: -2.5. Final verdict: Thunder -1.5, B, 0.50u.',
    'Full Analysis':'Opening Thesis: Oklahoma City has a modest rotation edge in a game priced close to pick’em.\n\nMarket Analysis: -1.5 minimizes the margin requirement. -2 remains acceptable; -2.5 is the hard cutoff.\n\nModel Breakdown: 63/100. The score is driven by number quality, organizational continuity and a low spread. No unsupported VSiN or Doc’s points were awarded.\n\nMatchup Analysis: Oklahoma City should have enough length and secondary creation to produce organized offense across multiple lineups.\n\nWhy It Wins: The Thunder limit turnovers, win the reserve minutes and execute better late.\n\nHow It Loses: Late scratches, experimental rotations, poor free-throw shooting or meaningless closing fouls erase the edge.\n\nFinal Verdict: Oklahoma City -1.5, B, 0.50u.'
  },
  {
    Sport:'NBA Summer League', Matchup:'Houston Rockets vs Philadelphia 76ers', Pick:'Philadelphia 76ers -5', Line:'-5', Grade:'B', Units:0.50,
    Score:62, ScoreBreakdown:{micksModelEdge:10,vsinAgreement:0,docsAgreement:0,lineValue:10,injuryAdvantage:0,schedulingEdge:7,progressiveFade:10,favoriteInflationPass:5,sharpMoneyConfirmation:20},
    Status:'Pending', 'Official Bet':'Yes', 'Best Number':'-5', 'No-Bet Cutoff':'-6',
    'Lineup Note':'Check active Summer League participants when practical. The card stays published; pass if Philadelphia removes multiple primary handlers or the spread reaches -6.',
    Writeup:'Philadelphia is the second and final Summer League side on the official card. The 76ers have the stronger projected rotation and more usable creation across the first and second units, giving them a better chance to build margin during the bench-heavy stretches that often decide Summer League games. The -5 spread already requires more than simple superiority, so the handicap must include a realistic separation path.\n\nThat path comes from Philadelphia’s ability to use multiple handlers, attack the paint and avoid relying on one scorer for every productive possession. If the Sixers control turnovers and generate consistent rim pressure, they can build a two- or three-possession lead before the most unstable fourth-quarter combinations enter. The wager becomes vulnerable when Philadelphia settles for difficult perimeter attempts or loses its primary creators earlier than expected.\n\nThe main failure paths are late lineup changes, poor free-throw shooting and a backdoor run after the best players leave the floor. Those are structural Summer League risks and the reason the play cannot exceed B or 0.50u.\n\nMicks score: 62/100. Best Number: -5. -5.5 is the highest acceptable compromise. No-Bet Cutoff: -6. Final verdict: 76ers -5, B, 0.50u.',
    'Full Analysis':'Opening Thesis: Philadelphia has the stronger projected rotation, but the five-point requirement and Summer League variance prevent a premium grade.\n\nMarket Analysis: -5 is the target, -5.5 is the maximum compromise and -6 is the cutoff.\n\nModel Breakdown: 62/100. The play earns points for number quality, lineup depth and a credible margin path, but no VSiN or Doc’s agreement points were awarded.\n\nMatchup Analysis: Philadelphia should have more stable creation across its first and second units and a better path to paint pressure.\n\nWhy It Wins: The 76ers win the non-starter minutes, control turnovers and enter the fourth quarter with a usable cushion.\n\nHow It Loses: Personnel decisions change, the Sixers shoot poorly at the line or a late backdoor erases the margin.\n\nFinal Verdict: Philadelphia -5, B, 0.50u.'
  }
]

const rawProps = [
  {
    Sport:'FIFA World Cup', Matchup:'Spain vs France — Semifinal', Pick:'Both Teams to Score — Yes', Line:'-145', Grade:'B', Units:0.50,
    Score:66, ScoreBreakdown:{micksModelEdge:10,vsinAgreement:10,docsAgreement:5,lineValue:10,injuryAdvantage:0,schedulingEdge:5,progressiveFade:6,favoriteInflationPass:5,sharpMoneyConfirmation:15},
    Status:'Pending', 'Official Bet':'Yes', 'Best Number':'-145 or better', 'No-Bet Cutoff':'-160',
    'Lineup Note':'Confirm the expected attacking starters when practical. The prop remains published; pass if a major attacker is unexpectedly absent or the price exceeds -160.',
    Writeup:'Both Teams to Score is the cleanest way to use the attacking quality in this semifinal without forcing a side. Spain should control long stretches through possession and counter-pressing, which creates repeated entries into the final third. France has the transition speed and individual quality to punish the space that appears when Spain pushes numbers forward. The prop does not require either team to control the match for 90 minutes; it requires each side to produce one decisive sequence.\n\nThe cashing path is straightforward. Spain generates enough territorial pressure to create one high-quality chance, while France converts one transition, set piece or individual action. The failure path is tactical caution after the first goal, poor finishing or one side successfully forcing the other into low-value possession. Knockout soccer can become conservative, so the price matters.\n\nMicks score: 66/100. The prop receives support for the matchup structure and a reasonable threshold, but the -145 price prevents a higher grade. Best Number: -145 or better. No-Bet Cutoff: -160. Final verdict: BTTS Yes, B, 0.50u.',
    'Full Analysis':'Opportunity Path: Spain can score through sustained possession and pressure; France can score through transition, set pieces or individual quality.\n\nThreshold and Price: The market needs one goal from each side. -145 is acceptable; -160 is the cutoff.\n\nFailure Path: Tactical caution, poor finishing or an early lead causing the match to slow.\n\nMicks Score: 66/100. Final Verdict: BTTS Yes, B, 0.50u.'
  },
  {
    Sport:'WNBA', Matchup:'Toronto Tempo at Washington Mystics', Pick:'Marina Mabrey Over 22 Points', Line:'Over 22 (-102)', Grade:'B', Units:0.50,
    Score:68, ScoreBreakdown:{micksModelEdge:12,vsinAgreement:5,docsAgreement:10,lineValue:12,injuryAdvantage:0,schedulingEdge:5,progressiveFade:4,favoriteInflationPass:5,sharpMoneyConfirmation:15},
    Status:'Pending', 'Official Bet':'Yes', 'Best Number':'22 at -110 or better', 'No-Bet Cutoff':'22.5 or -120',
    'Lineup Note':'Confirm Mabrey is active when practical. The prop remains published; pass if her role is reduced, the line rises above 22.5 or the price is worse than -120.',
    Writeup:'Mabrey’s scoring role gives this over a real opportunity path rather than a reputation-based case. She should handle a large share of Toronto’s primary creation, perimeter volume and late-clock shot attempts. That creates several ways to reach 23 points: normal three-point volume, drives that produce free throws and sustained fourth-quarter usage if the game remains competitive.\n\nThe Toronto side already projects well enough to support a close game, which matters because Mabrey is more likely to retain full scoring responsibility deep into the fourth quarter. She does not need an extreme shooting performance if the volume is intact, but the threshold is still high enough that normal efficiency is required. A poor perimeter night, reduced minutes or Washington forcing the ball out of her hands are the main failure paths.\n\nMicks score: 68/100. Doc’s Sports support and the near-even price help, but the threshold prevents a B+ upgrade. Best Number: 22 at -110 or better. No-Bet Cutoff: 22.5 or any price worse than -120. Final verdict: Mabrey Over 22, B, 0.50u.',
    'Full Analysis':'Role: Primary scorer and creator.\n\nOpportunity: Expected high shot volume, perimeter attempts, drives and late-clock possessions.\n\nThreshold: Needs 23 points to win at 22. The line is playable at 22; 22.5 is the cutoff.\n\nPrice: -110 or better preferred; -120 is the maximum tax.\n\nCashing Path: Competitive game, normal minutes and average shooting efficiency.\n\nFailure Path: Reduced role, poor perimeter shooting, foul trouble or Washington traps forcing the ball away.\n\nMicks Score: 68/100. Final Verdict: Over 22, B, 0.50u.'
  },
  {
    Sport:'WNBA', Matchup:'Toronto Tempo at Washington Mystics', Pick:'Sonia Citron Under 18 Points', Line:'Under 18 (-113)', Grade:'B-', Units:0.25,
    Score:58, ScoreBreakdown:{micksModelEdge:8,vsinAgreement:0,docsAgreement:10,lineValue:10,injuryAdvantage:0,schedulingEdge:5,progressiveFade:5,favoriteInflationPass:5,sharpMoneyConfirmation:15},
    Status:'Pending', 'Official Bet':'Yes', 'Best Number':'18 or higher', 'No-Bet Cutoff':'17.5 or -125',
    'Lineup Note':'Confirm Citron is active and expected to hold her normal role when practical. The prop remains published; pass if the number drops below 18.',
    Writeup:'Citron’s scoring ability is the reason this remains a small B- position rather than a standard half-unit prop. The under case is based on distribution and threshold. Washington has several young options capable of absorbing possessions, so Citron does not automatically need to carry the full scoring burden. Toronto’s preferred side profile also supports the possibility of Washington facing more difficult half-court possessions than the market expects.\n\nThe under cashes if Citron’s volume is normal rather than elevated, if Toronto limits clean transition looks and if Washington distributes creation across multiple players. The primary failure path is efficient perimeter shooting or an unusual free-throw spike. Because Citron can beat the number without extraordinary minutes, the position stays at 0.25u.\n\nMicks score: 58/100, which is below the normal B threshold but acceptable as a B- small-position prop exception. Best Number: Under 18 or higher. No-Bet Cutoff: 17.5 or a price worse than -125. Final verdict: Citron Under 18, B-, 0.25u.',
    'Full Analysis':'Role: Important Washington scorer, but not guaranteed to dominate every possession.\n\nOpportunity: The under depends on normal rather than elevated shot volume and fewer transition opportunities.\n\nThreshold: 18 is the minimum playable number. Pass at 17.5.\n\nPrice: -125 is the maximum acceptable tax.\n\nCashing Path: Distributed Washington usage, average efficiency and Toronto forcing more half-court possessions.\n\nFailure Path: Hot three-point shooting, elevated free throws or unexpected usage concentration.\n\nMicks Score: 58/100. Final Verdict: Under 18, B-, 0.25u.'
  }
]

const rawLotto = [{
  Sport:'Cross-Sport', Matchup:'Tempo / 76ers', Pick:'Toronto Tempo ML + Philadelphia 76ers ML', Line:'Parlay', Grade:'B-', Units:0.25,
  Score:57, ScoreBreakdown:{micksModelEdge:8,vsinAgreement:5,docsAgreement:5,lineValue:8,injuryAdvantage:0,schedulingEdge:5,progressiveFade:8,favoriteInflationPass:5,sharpMoneyConfirmation:13},
  Status:'Pending', 'Official Bet':'Yes', 'Best Number':'Minimum -105 combined return', 'No-Bet Cutoff':'Worse than -120 combined return',
  'Lineup Note':'Confirm active participants when practical. The parlay remains published, but do not play at a price worse than -120 and do not add extra legs.',
  Writeup:'This two-leg parlay is intentionally limited to Toronto Tempo ML and Philadelphia 76ers ML. Each leg removes the spread requirement from a preferred side: Toronto only needs to win outright instead of covering +2, while Philadelphia only needs to win instead of covering five points. Reducing the construction to two legs lowers the number of independent failure points and avoids the random-favorite stacking that often turns a reasonable parlay into a poor bet.\n\nThe legs are independent rather than correlated. That means one game does not improve the probability of the other, so the only justification for combining them is price and margin reduction. The ticket still duplicates existing straight-game exposure, which is why the stake is capped at 0.25u and why no third leg should be added.\n\nMicks score: 57/100. This is not straight-bet confidence; it is a small construction grade. Best Number: approximately -105 or better combined. No-Bet Cutoff: worse than -120. Final verdict: Tempo ML + 76ers ML, B-, 0.25u.',
  'Full Analysis':'Leg One: Toronto ML converts the VIP spread opinion into an outright-win requirement.\n\nLeg Two: Philadelphia ML removes the five-point Summer League margin requirement.\n\nCorrelation: The games are independent. There is no same-game correlation benefit.\n\nWhy Only Two Legs: A third leg would add more failure probability than useful payout improvement.\n\nPrice Requirement: -105 or better preferred; pass worse than -120.\n\nFailure Path: Either favorite loses outright.\n\nMicks Score: 57/100. Final Verdict: B-, 0.25u.'
}]

const rawLongshots = []
const birthdayNote = 'July 14 sports birthdays are narrative only and should not be treated as edge.'
const publishingRule = 'Lineup confirmation and exact live-price confirmation are advisory, not publication blockers. Every card supplies a Best Number and No-Bet Cutoff so the bettor can make the final pass decision.'
const scoringRule = {
  factors:{micksModelEdge:25,vsinAgreement:15,docsAgreement:10,lineValue:15,injuryAdvantage:10,schedulingEdge:10,progressiveFade:10,favoriteInflationPass:5,sharpMoneyConfirmation:10},
  grades:{'90-100':'A+','85-89':'A','80-84':'A-','70-79':'B+','60-69':'B','below-60':'Pass or B- small-position exception for props/parlays only'},
  vipRule:'VIP requires a score of 80 or higher. No quota. Some days may have zero VIP picks.'
}

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
    ok:true, success:true, source:'micks-picks-july-14-premium-writeups-scored', date:CARD_DATE,
    expiresAt:'2026-07-15T02:00:00-04:00', vip, vipPicks:vip, vipVault:vip,
    free, freePicks:free, props:propsLab, propsLab, lottoParlays, lotto:lottoParlays,
    parlays:lottoParlays, longshots, mainPicks:[...vip, ...free], activePicks:allRows,
    rows:allRows, records:allRows, picks:allRows, allRows, publicRows,
    straightAndPropsUnits:Number(straightAndPropsUnits.toFixed(2)),
    parlayUnits:Number(parlayUnits.toFixed(2)), totalUnits:Number(totalUnits.toFixed(2)),
    birthdayNote, publishingRule, scoringRule,
    message:validDate ? `${allRows.length} official picks posted for July 14, 2026.` : 'No active picks. The July 14 card expired at 2:00 AM Eastern.'
  })
}
