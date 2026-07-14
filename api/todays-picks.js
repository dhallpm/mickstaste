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
    'Official Bet':row['Official Bet'] || row.officialBet || 'Yes', officialBet:row['Official Bet'] || row.officialBet || 'Yes'
  }
}

const rawVip = [{
  Sport:'WNBA', Matchup:'Toronto Tempo at Washington Mystics', Pick:'Toronto Tempo +2', Line:'+2', Grade:'A-', Units:1.00,
  Confidence:'8.8/10', Status:'Pending', 'Official Bet':'Yes', 'Best Number':'+2 or better', 'No-Bet Cutoff':'Pick’em', 'Pick of the Day':'Yes',
  Writeup:'Toronto +2 is the strongest release because the number creates a meaningful gap between the market and the best independent projection available. Circa installed Washington as a two-point favorite, while the VSiN TSI projection made Toronto approximately a 1.5-point favorite. That is roughly a 3.5-point swing through pick’em, which is large enough to meet the Micks Picks VIP model-consensus threshold when another independent source agrees. Doc’s Sports also supported Toronto on the underdog side, giving this play directional confirmation rather than leaving it dependent on one model. Toronto has enough experienced guard creation to keep the game organized late, and receiving points is valuable in a matchup the model treats as close to Toronto-favored. The wager can cash through an outright Tempo win or a one-point loss, and the small spread reduces the margin burden compared with laying Washington. Expansion-team volatility remains the main risk: Toronto can still suffer scoring droughts or inconsistent defensive stretches, and Washington has young talent capable of creating separation at home. The edge is tied directly to the available number, so do not chase after the market crosses pick’em. Toronto +2 is the qualified A- VIP release at 1.00u.',
  'Full Analysis':'Opening Thesis: Toronto is being offered points in a matchup where the strongest available VSiN projection made the Tempo the slight favorite. The model-to-market discrepancy and independent Doc’s Sports agreement create the rare consensus needed for an A- VIP release.\n\nWhy It Made VIP: Circa priced Washington -2, while VSiN projected Toronto around -1.5. That approximately 3.5-point difference crosses pick’em and is materially stronger than the small directional gaps that normally produce only B-grade candidates. Doc’s Sports independently preferred Toronto, so the wager is not based on a single projection.\n\nMatchup Edge: Toronto has enough veteran ball handling and half-court creation to avoid relying entirely on transition scoring. In a close game, the Tempo should be capable of generating organized late possessions and forcing Washington to execute against a set defense.\n\nMarket and Number Context: +2 is the target and +1 remains acceptable. Pick’em is the no-bet cutoff because the model edge becomes substantially less attractive after the underdog cushion disappears.\n\nHow It Cashes: Toronto wins outright, or stays within one possession by controlling turnovers, avoiding a prolonged third-quarter drought and executing in the final minutes.\n\nRisk: Toronto is still an expansion team, and rotation volatility can create uneven stretches. Washington’s young scoring talent can punish poor transition defense and turn a close handicap into separation.\n\nFinal Verdict: Toronto Tempo +2, A-, 1.00u. This is today’s Pick of the Day and the only play that clears the full VIP threshold.'
}]

const rawFree = [
  {
    Sport:'FIFA World Cup', Matchup:'Spain vs France — Semifinal', Pick:'France To Advance', Line:'-155', Grade:'B', Units:0.50,
    Status:'Pending', 'Official Bet':'Yes', 'Best Number':'-155 or better', 'No-Bet Cutoff':'-170',
    Writeup:'France is the preferred team to reach the final, but this remains a controlled Free Pick because the matchup is genuinely close and respected analysis is divided. The To Advance market is the correct expression: it protects the wager if the semifinal is tied after 90 minutes and moves through extra time or penalties, whereas the regulation moneyline loses on a draw. France enters with greater direct attacking speed and multiple players capable of creating a decisive moment, while Kylian Mbappé remains the tournament’s leading scoring threat. Current team reporting indicates Aurélien Tchouaméni is available, although he has been managing a hamstring issue, and Mbappé has also dealt with a minor ankle concern. Those health details and Spain’s ability to control possession prevent a higher grade. The cashing path is France disrupting Spain’s midfield rhythm, attacking the space behind an aggressive press and remaining dangerous even if the match becomes tactical late. Play -155 or better and pass beyond -170; at a worse price, the margin between these teams no longer compensates for knockout variance.',
    'Full Analysis':'Opening Thesis: France has the stronger direct attacking ceiling, but the semifinal is too balanced for VIP treatment. To Advance is preferable to the 90-minute moneyline because it preserves extra time and penalties.\n\nMatchup Edge: Spain wants long possession sequences and territorial control. France can challenge that structure with midfield physicality and rapid attacks through Mbappé, Dembélé, Olise and the supporting runners. If France breaks the first pressure line, Spain can be exposed before its shape resets.\n\nTeam News: Tchouaméni is available but has managed a hamstring issue, while Mbappé has carried a minor ankle concern. Those factors must be respected even though France’s attacking depth remains excellent.\n\nMarket Context: France -155 to advance is playable. The price becomes too expensive beyond -170 because Spain is too strong to justify a heavily taxed position.\n\nHow It Cashes: France prevents Spain from monopolizing the ball, creates the better transition chances and survives any 90-minute draw through the protected advancement market.\n\nRisk: Spain can suffocate the game through possession, force France deeper than desired and limit transition volume. External analysis is split, which caps the grade.\n\nFinal Verdict: France To Advance, B, 0.50u.'
  },
  {
    Sport:'NBA Summer League', Matchup:'Denver Nuggets vs Oklahoma City Thunder', Pick:'Oklahoma City Thunder -1.5', Line:'-1.5 (-120)', Grade:'B', Units:0.50,
    Status:'Pending', 'Official Bet':'Yes', 'Best Number':'-1.5', 'No-Bet Cutoff':'-2.5',
    Writeup:'Oklahoma City is the preferred Summer League side because the spread is small enough that the Thunder only need a conventional two-point victory. That matters in a developmental environment where late rotations, experimental lineups and fourth-quarter substitutions can erase a larger margin. The Thunder organization generally places a premium on length, ball movement and multi-position decision-making, giving this roster a reasonable path to winning both the starting and reserve minutes. The handicap does not require Oklahoma City to dominate; it requires the Thunder to avoid extended turnover-driven droughts and execute slightly better in the closing possessions. The principal risk is Summer League uncertainty itself. Players can be rested without much notice, minutes can change after one strong appearance, and late fouling can turn a correct side into a failed cover. Those factors cap every Summer League selection at B and 0.50u. Take -1.5, remain playable at -2 and pass once the number moves beyond -2.5.',
    'Full Analysis':'Opening Thesis: Oklahoma City has a modest roster and developmental-structure edge in a game priced close to pick’em.\n\nMatchup Edge: The Thunder should have enough length and secondary creation to produce organized offense across more than one lineup combination.\n\nNumber Context: -1.5 minimizes the margin requirement. -2 remains acceptable, while -2.5 is the cutoff.\n\nHow It Cashes: Oklahoma City limits live-ball turnovers, wins the reserve minutes and executes better during the final five minutes.\n\nRisk: Late scratches, experimental rotations, poor free-throw shooting and meaningless closing fouls are all material Summer League hazards.\n\nFinal Verdict: Thunder -1.5, B, 0.50u.'
  },
  {
    Sport:'NBA Summer League', Matchup:'Houston Rockets vs Philadelphia 76ers', Pick:'Philadelphia 76ers -5', Line:'-5', Grade:'B', Units:0.50,
    Status:'Pending', 'Official Bet':'Yes', 'Best Number':'-5', 'No-Bet Cutoff':'-6',
    Writeup:'Philadelphia is the second and final Summer League side on the official card. The 76ers are the clearer market favorite, but the -5 spread already demands more than simple superiority, so the position remains a half-unit B play. Philadelphia’s projected advantage is in usable depth and the ability to generate offense through multiple handlers rather than depending on one scorer. That gives the Sixers a path to create separation during bench-heavy stretches, which is often where Summer League games turn. The bet cashes if Philadelphia controls turnovers, gets consistent paint pressure and enters the fourth quarter with enough margin to withstand developmental substitutions. The failure path is familiar: a late lineup change, poor free-throw shooting or a backdoor run after the best creators leave the floor. This is why the framework limits the card to two Summer League sides and refuses to upgrade either one above B. Play -5, accept -5.5 only cautiously and pass at -6 or worse.',
    'Full Analysis':'Opening Thesis: Philadelphia has the stronger projected rotation, but the five-point requirement and Summer League variance prevent a larger position.\n\nMatchup Edge: The 76ers should have more stable creation across the first and second units, improving their chances of building margin instead of relying on one hot scorer.\n\nNumber Context: -5 is the target. -5.5 is the maximum compromise and -6 is the no-bet cutoff.\n\nHow It Cashes: Philadelphia wins the non-starter minutes, attacks the rim and avoids the empty possessions that allow an underdog to remain inside the number.\n\nRisk: Personnel decisions can change quickly, and a late backdoor remains possible even if Philadelphia controls most of the game.\n\nFinal Verdict: 76ers -5, B, 0.50u.'
  }
]

const rawProps = []
const rawLotto = []
const rawLongshots = []
const birthdayNote = 'July 14 sports birthdays are narrative only and should not be treated as edge.'

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
  const totalUnits = allRows.reduce((sum, row) => sum + Number(row.Units || 0), 0)
  res.status(200).json({
    ok:true, success:true, source:'micks-picks-july-14-final', date:CARD_DATE,
    expiresAt:'2026-07-15T02:00:00-04:00', vip, vipPicks:vip, vipVault:vip,
    free, freePicks:free, props:propsLab, propsLab, lottoParlays, lotto:lottoParlays,
    parlays:lottoParlays, longshots, mainPicks:[...vip, ...free], activePicks:allRows,
    rows:allRows, records:allRows, picks:allRows, allRows, publicRows,
    straightAndPropsUnits:Number(totalUnits.toFixed(2)), parlayUnits:0,
    totalUnits:Number(totalUnits.toFixed(2)), birthdayNote,
    message:validDate ? `${allRows.length} official picks posted for July 14, 2026.` : 'No active picks. The July 14 card expired at 2:00 AM Eastern.'
  })
}
