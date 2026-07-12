const SETTLED_VALUES = new Set([
  'graded', 'settled', 'final', 'completed', 'complete',
  'win', 'won', 'loss', 'lost', 'push', 'void', 'voided',
  'cancelled', 'canceled'
])

function normalized(value) {
  return String(value || '').trim().toLowerCase()
}

function isActivePick(row = {}) {
  const status = normalized(row.Status || row.status || row['Release Status'])
  const result = normalized(row.Result || row.result || row.Outcome || row.outcome)
  const official = normalized(row['Official Bet'] || row.officialBet)
  if (SETTLED_VALUES.has(status) || SETTLED_VALUES.has(result)) return false
  if (official === 'no') return false
  return true
}

const birthdayNote = 'July 12 sports birthdays (Vinícius Júnior, James Rodríguez, Nico Williams, Shai Gilgeous-Alexander, Christian Vieri, etc.) are narrative only and should not be treated as edge.'

const rawVip = [
  {
    Section: 'VIP', Sport: 'WNBA', Matchup: 'Toronto Tempo at New York Liberty', Pick: 'New York Liberty -6.5', Line: '-6.5', Grade: 'A-', Units: 1.00, Confidence: '9.0/10', Status: 'Pending', 'Official Bet': 'Yes', 'Best Number': '-6.5 or better', 'No-Bet Cutoff': '-8',
    Writeup: 'New York owns the strongest two-way matchup profile on the WNBA board. The Liberty have the better interior scoring, defensive ceiling and late-game execution, while Toronto still carries expansion-level volatility over four quarters.',
    'Full Analysis': 'Short Take: New York is the premium side because the Liberty combine the best roster, matchup and number balance on today’s board.\n\nWhy This Play: The Liberty have more reliable half-court creation, stronger interior options and the defensive personnel to force Toronto into difficult possessions. The full-game spread offers more value than laying roughly -270 on the moneyline.\n\nMatchup Edge: New York can attack Toronto inside, control the glass and create separation through defensive stops. Toronto can compete in stretches, but sustaining efficient offense for four quarters against a title-caliber opponent is the larger challenge.\n\nMarket and Number Context: -6.5 remains modest relative to the moneyline and projected mismatch. The number becomes less attractive beyond -8, where late-game variance and a backdoor cover begin to outweigh the edge.\n\nRisk and Variance: Toronto’s pace and expansion unpredictability create volatility, and New York can occasionally start slowly.\n\nFinal Take: Liberty -6.5 is the best combination of matchup quality, market value and probability on the slate. Grade A-, 1.00u.'
  }
]

const rawFree = [
  {
    Section: 'Free Picks', Sport: 'WNBA', Matchup: 'Chicago Sky at Dallas Wings', Pick: 'Dallas Wings -9.5', Line: '-9.5', Grade: 'B+', Units: 0.75, Status: 'Pending', 'Official Bet': 'Yes', 'Best Number': '-9.5', 'No-Bet Cutoff': '-11',
    Writeup: 'Dallas has the offensive and depth advantage, but the large spread keeps this below VIP status. The Wings have the cleaner path to sustained scoring and can create separation if their guards control tempo.',
    'Full Analysis': 'Short Take: Dallas is the preferred side, but this remains a controlled position because the market is asking for a near double-digit margin.\n\nWhy This Play: The Wings have more offensive creation, more lineup depth and more ways to punish Chicago over four quarters.\n\nMarket and Number Context: -9.5 is playable, but the value deteriorates quickly above -10.5. Doc’s Sports disagreement on Chicago +9.5 is also a reason to cap the grade at B+.\n\nRisk and Variance: Backdoor exposure is significant in the final minutes of a large-spread WNBA game.\n\nFinal Take: Dallas -9.5, B+, 0.75u.'
  },
  {
    Section: 'Free Picks', Sport: 'WNBA', Matchup: 'Seattle Storm at Washington Mystics', Pick: 'Washington Mystics -5.5', Line: '-5.5', Grade: 'B+', Units: 0.75, Status: 'Pending', 'Official Bet': 'Yes', 'Best Number': '-5.5', 'No-Bet Cutoff': '-6.5',
    Writeup: 'Washington has the home-court and half-court execution edge in a lower-total matchup. The smaller expected possession count favors the more stable team, although the move from -3.5 to -5.5 reduces the original value.',
    'Full Analysis': 'Short Take: Washington is the preferred home favorite, but line movement prevents a higher grade.\n\nMatchup Edge: The Mystics project as the more consistent half-court team and should benefit from a game environment where every possession carries more weight.\n\nMarket and Number Context: Directional agreement exists from Doc’s Sports, but its analysis used -3.5. At -5.5 the play remains viable; above -6.5 the edge is too thin.\n\nRisk and Variance: Seattle’s volatility can work in either direction and create late spread pressure.\n\nFinal Take: Mystics -5.5, B+, 0.75u.'
  },
  {
    Section: 'Free Picks', Sport: 'WNBA', Matchup: 'Indiana Fever at Las Vegas Aces', Pick: 'Las Vegas Aces -4.5', Line: '-4.5', Grade: 'B', Units: 0.50, Status: 'Pending', 'Official Bet': 'Yes', 'Best Number': '-4.5', 'No-Bet Cutoff': '-6',
    Writeup: 'Las Vegas has the higher late-game execution ceiling and the more dependable offensive structure. Indiana is dangerous enough in transition and from the perimeter to keep the stake at half a unit.',
    'Full Analysis': 'Short Take: The Aces are the preferred side at a manageable number.\n\nMatchup Edge: Las Vegas has more reliable shot creation and should be better positioned in closing possessions.\n\nMarket and Number Context: -4.5 is fair; the play loses appeal at -6 or higher.\n\nRisk and Variance: Indiana’s scoring ceiling and pace create backdoor and outright upset risk.\n\nFinal Take: Aces -4.5, B, 0.50u.'
  },
  {
    Section: 'Free Picks', Sport: 'MLB', Matchup: 'Arizona Diamondbacks at Los Angeles Dodgers', Pick: 'Los Angeles Dodgers -1.5', Line: '-1.5 (-110)', Grade: 'B+', Units: 0.75, Status: 'Pending', 'Official Bet': 'Yes', 'Best Number': '-1.5 at -110', 'No-Bet Cutoff': '-130',
    Writeup: 'The run line is the better expression than laying roughly -210 on the moneyline. Los Angeles has the deeper lineup and more paths to create a multi-run margin, with Doc’s Sports also supporting the Dodgers side.',
    'Full Analysis': 'Short Take: Back the Dodgers’ talent edge without paying the heavy moneyline tax.\n\nMatchup Edge: Los Angeles has the deeper offense and a stronger path to adding late runs against bullpen depth.\n\nMarket and Number Context: -1.5 at -110 offers substantially better value than the moneyline. Do not chase beyond -130.\n\nRisk and Variance: Divisional familiarity and one-run baseball outcomes remain the primary threats.\n\nFinal Take: Dodgers -1.5, B+, 0.75u.'
  },
  {
    Section: 'Free Picks', Sport: 'MLB', Matchup: 'Kansas City Royals at Baltimore Orioles', Pick: 'Baltimore Orioles -1.5', Line: '-1.5 (+130)', Grade: 'B', Units: 0.50, Status: 'Pending', 'Official Bet': 'Yes', 'Best Number': '+130', 'No-Bet Cutoff': '+110',
    Writeup: 'Baltimore owns the preferred offensive ceiling, and the plus-money run line gives a better payoff than laying the moneyline. The risk is a competitive one-run Orioles win that fails to cover.',
    'Full Analysis': 'Short Take: Use the plus-money run line to express Baltimore’s offensive advantage.\n\nMatchup Edge: The Orioles have more lineup upside and a better chance to create a crooked inning.\n\nMarket and Number Context: +130 is attractive enough for a small position; below +110 the reward no longer compensates for the margin requirement.\n\nRisk and Variance: Baltimore can win without covering, so this remains a B-grade play.\n\nFinal Take: Orioles -1.5, B, 0.50u.'
  },
  {
    Section: 'Free Picks', Sport: 'MLB', Matchup: 'Houston Astros at Texas Rangers', Pick: 'Texas Rangers ML', Line: '-135', Grade: 'B', Units: 0.50, Status: 'Pending', 'Official Bet': 'Yes', 'Best Number': '-135 or better', 'No-Bet Cutoff': '-150',
    Writeup: 'Texas is the preferred side, but the moneyline is cleaner than requiring a multi-run win against a capable Houston lineup and bullpen. This reduces margin variance in a close divisional matchup.',
    'Full Analysis': 'Short Take: Texas is the side, but the moneyline is the proper market.\n\nMatchup Edge: The Rangers have the preferred overall pitching and home-field profile.\n\nMarket and Number Context: -135 is acceptable; avoid chasing beyond -150. The original -1.5 idea created unnecessary exposure to a one-run result.\n\nRisk and Variance: Houston has enough offensive and bullpen quality to keep this tight.\n\nFinal Take: Rangers ML, B, 0.50u.'
  },
  {
    Section: 'Free Picks', Sport: 'NBA Summer League', Matchup: 'Oklahoma City Thunder vs Golden State Warriors', Pick: 'Golden State Warriors -6.5', Line: '-6.5', Grade: 'B', Units: 0.50, Status: 'Pending', 'Official Bet': 'Yes', 'Best Number': '-6.5', 'No-Bet Cutoff': '-7.5',
    Writeup: 'Golden State projects with the better Summer League depth and shot creation. The edge is real, but developmental rotations and fourth-quarter substitutions keep the stake modest.',
    'Full Analysis': 'Short Take: Golden State has the stronger roster profile, but Summer League variance limits confidence.\n\nMatchup Edge: The Warriors have more reliable creation and enough depth to pressure Oklahoma City’s secondary units.\n\nMarket and Number Context: -6.5 is playable; above -7.5 the backdoor risk becomes too costly.\n\nRisk and Variance: Summer League rotations can change rapidly and create meaningless late scoring swings.\n\nFinal Take: Warriors -6.5, B, 0.50u.'
  },
  {
    Section: 'Free Picks', Sport: 'NBA Summer League', Matchup: 'New Orleans Pelicans vs Phoenix Suns', Pick: 'Phoenix Suns -5.5', Line: '-5.5', Grade: 'B', Units: 0.50, Status: 'Pending', 'Official Bet': 'Yes', 'Best Number': '-5.5', 'No-Bet Cutoff': '-6.5',
    Writeup: 'Phoenix has the preferred roster balance and interior profile. The spread is still in a reasonable favorite range, but Summer League volatility keeps this at half a unit.',
    'Full Analysis': 'Short Take: Phoenix is the preferred side based on roster balance and size.\n\nMatchup Edge: The Suns should have advantages on the glass and in half-court structure.\n\nMarket and Number Context: -5.5 is acceptable; do not chase beyond -6.5.\n\nRisk and Variance: Late substitutions and developmental priorities can erase otherwise sound handicaps.\n\nFinal Take: Suns -5.5, B, 0.50u.'
  },
  {
    Section: 'Free Picks', Sport: 'NBA Summer League', Matchup: 'Portland Trail Blazers vs Orlando Magic', Pick: 'Orlando Magic -4.5', Line: '-4.5', Grade: 'B', Units: 0.50, Status: 'Pending', 'Official Bet': 'Yes', 'Best Number': '-4.5', 'No-Bet Cutoff': '-5.5',
    Writeup: 'Orlando has the slight roster and defensive edge. This is a standard small Summer League position rather than a foundational play because closing rotations remain unpredictable.',
    'Full Analysis': 'Short Take: Orlando has the cleaner two-way profile at a manageable number.\n\nMatchup Edge: The Magic project to defend more consistently and create better half-court possessions.\n\nMarket and Number Context: -4.5 is playable; pass above -5.5.\n\nRisk and Variance: Summer League lineup changes and late-game fouling can swing the result.\n\nFinal Take: Magic -4.5, B, 0.50u.'
  }
]

const rawPropsLab = [
  {
    Section: 'Props Lab', Sport: 'WNBA', Matchup: 'Toronto Tempo at New York Liberty', Pick: 'Liberty First to 10 Points', Line: '-150', Grade: 'B', Units: 0.50, Status: 'Pending', 'Official Bet': 'Yes', 'Best Number': '-150 or better', 'No-Bet Cutoff': '-165',
    Writeup: 'This isolates New York’s opening matchup and shot-quality advantage without requiring a full-game cover. The Liberty should have the better first-unit execution and more dependable early scoring options.',
    'Full Analysis': 'Short Take: Use New York’s early offensive edge in a short race market.\n\nCashing Path: The Liberty need only establish their interior and half-court advantages before Toronto settles into the game.\n\nMarket Context: -150 is acceptable for the probability profile, but the play becomes too expensive beyond -165.\n\nRisk: A slow shooting start can lose the market before the broader matchup edge appears.\n\nFinal Take: Liberty first to 10, B, 0.50u.'
  },
  {
    Section: 'Props Lab', Sport: 'MLB', Matchup: 'Arizona Diamondbacks at Los Angeles Dodgers', Pick: 'Yes Run First Inning', Line: '-125', Grade: 'B', Units: 0.50, Status: 'Pending', 'Official Bet': 'Yes', 'Best Number': '-125 or better', 'No-Bet Cutoff': '-135',
    Writeup: 'The 9.5-run total and Dodgers offensive ceiling support early scoring exposure. One productive opening rally is enough, but the negative price requires discipline.',
    'Full Analysis': 'Short Take: This is the strongest remaining early-offense derivative on the board.\n\nCashing Path: Either lineup can generate a first-inning run, with Los Angeles providing the primary offensive pressure.\n\nMarket Context: -125 is playable in a 9.5-total environment; do not chase beyond -135.\n\nRisk: Strong opening pitching or sequencing failure can beat a sound offensive setup.\n\nFinal Take: Dodgers/Diamondbacks YRFI, B, 0.50u.'
  }
]

const rawLottoParlays = [
  {
    Section: 'Lotto Parlays', Sport: 'Cross-Sport', Matchup: 'Liberty / Dodgers', Pick: 'Liberty ML + Dodgers ML', Line: 'Parlay', Grade: 'B+', Units: 0.50, Status: 'Pending', 'Official Bet': 'Yes', 'Minimum Return': '-105 or better',
    Writeup: 'This combines two expensive favorites without requiring either to cover a spread. It is the safer parlay construction on the card, but the combined price must remain near even money.',
    'Full Analysis': 'Structure: New York Liberty ML plus Los Angeles Dodgers ML.\n\nWhy These Legs: Both teams own substantial talent and matchup advantages, while using moneylines removes the spread-margin requirement.\n\nPrice Requirement: Play only at approximately -105 or better.\n\nRisk: A parlay still fails if either favorite is upset, so the stake remains limited.\n\nFinal Take: B+, 0.50u.'
  },
  {
    Section: 'Lotto Parlays', Sport: 'NBA Summer League', Matchup: 'Warriors / Suns', Pick: 'Warriors ML + Suns ML', Line: 'Parlay', Grade: 'B', Units: 0.25, Status: 'Pending', 'Official Bet': 'Yes',
    Writeup: 'The moneylines reduce the late-game spread exposure that regularly appears in Summer League. Both preferred teams still carry meaningful rotation variance, so this remains a quarter-unit lotto play.',
    'Full Analysis': 'Structure: Golden State Warriors ML plus Phoenix Suns ML.\n\nWhy These Legs: Both teams are favored based on roster depth and matchup profile, while moneylines avoid asking them to maintain larger margins through unstable fourth-quarter rotations.\n\nRisk: Summer League personnel decisions can override normal game incentives.\n\nFinal Take: B, 0.25u.'
  }
]

const rawLongshots = []
const vip = rawVip.filter(isActivePick)
const free = rawFree.filter(isActivePick)
const propsLab = rawPropsLab.filter(isActivePick)
const lottoParlays = rawLottoParlays.filter(isActivePick)
const longshots = rawLongshots.filter(isActivePick)
const publicRows = [...free, ...propsLab, ...lottoParlays, ...longshots]
const allRows = [...vip, ...publicRows]
const straightAndPropsUnits = [...vip, ...free, ...propsLab].reduce((sum, row) => sum + Number(row.Units || 0), 0)
const parlayUnits = lottoParlays.reduce((sum, row) => sum + Number(row.Units || 0), 0)
const totalUnits = straightAndPropsUnits + parlayUnits

export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  res.status(200).json({
    ok: true, success: true, source: 'micks-picks-july-12-final', date: '2026-07-12',
    vip, vipPicks: vip, vipVault: vip,
    free, freePicks: free,
    props: propsLab, propsLab,
    lottoParlays, lotto: lottoParlays, parlays: lottoParlays,
    longshots,
    mainPicks: [...vip, ...free], activePicks: allRows, rows: allRows, records: allRows, picks: allRows, allRows, publicRows,
    straightAndPropsUnits: Number(straightAndPropsUnits.toFixed(2)),
    parlayUnits: Number(parlayUnits.toFixed(2)),
    totalUnits: Number(totalUnits.toFixed(2)),
    birthdayNote,
    message: `${allRows.length} active picks posted for July 12, 2026.`
  })
}
