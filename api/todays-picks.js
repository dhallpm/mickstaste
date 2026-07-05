const VIP_PICKS = [
  {
    date: '2026-07-05', sport: 'WNBA', league: 'WNBA', category: 'VIP', access: 'VIP', section: 'vip', originalTable: 'VIP',
    game: 'Dallas Wings vs Toronto Tempo', pick: 'Dallas Wings -5.5', cardTitle: 'Dallas Wings -5.5', betType: 'Spread', market: 'Spread',
    odds: '-110', units: '1.00u', grade: 'A-', confidence: '8.6/10', bestNumber: '-5.5', lineNumber: '-5.5', noBetCutoff: '-7 or worse',
    status: 'Active', releaseStatus: 'VIP Released', sportsbook: 'Circa / shop best spread', risk: 'Medium', featured: 'Yes',
    writeup: 'Dallas has the cleaner favorite profile at home against Toronto, with the market showing a clear gap between the Wings and Tempo.',
    fullAnalysis: `Dallas Wings -5.5 is the cleanest VIP position on the July 5 slate because it gives us a true favorite profile without forcing an inflated moneyline or a risky parlay. Circa has Dallas priced as a clear favorite, and that matters because the spread is still within a playable range. The Wings do not need a blowout to cash this number; they need a controlled home win with offensive efficiency and enough separation late.\n\nToronto is dangerous enough offensively to avoid reckless exposure, but the defensive profile is the reason this play fits. The Tempo have shown enough leakage on that end that Dallas can get to scoring runs and force Toronto into catch-up basketball. That is exactly the kind of setup where a mid-range favorite can cover without needing everything to go perfectly.\n\nMicks Verdict: VIP A-, 1.00u. Play -5.5. Still playable to -6.5. Pass at -7 or worse.`
  },
  {
    date: '2026-07-05', sport: 'WNBA', league: 'WNBA', category: 'VIP', access: 'VIP', section: 'vip', originalTable: 'VIP',
    game: 'Indiana Fever vs Las Vegas Aces', pick: 'Las Vegas Aces -3', cardTitle: 'Las Vegas Aces -3', betType: 'Spread', market: 'Spread',
    odds: '-110', units: '0.75u', grade: 'B+', confidence: '8.0/10', bestNumber: '-3', lineNumber: '-3', noBetCutoff: '-4.5 or worse',
    status: 'Active', releaseStatus: 'VIP Released', sportsbook: 'Circa / shop best spread', risk: 'Medium-High',
    writeup: 'Aces -3 is the correct side at the better market number, but it should not be treated as a max-unit A play.',
    fullAnalysis: `Las Vegas -3 is a playable VIP position because the number is meaningfully better than the wider market and gives the Aces a manageable cover target. The Aces still profile as the more complete roster, with better top-end talent, more proven late-game shot creation, and the ability to punish Indiana if the Fever go through scoring droughts.\n\nThat said, this cannot be imported as an A-grade play. The same Aces cover risk that hurt the card yesterday still matters. Las Vegas can win games without fully separating, and Indiana’s offensive ceiling is high enough to stay inside numbers if they shoot well or get a strong whistle.\n\nMicks Verdict: VIP B+, 0.75u. Play -3. Playable to -3.5. Pass at -4.5 or worse.`
  },
  {
    date: '2026-07-05', sport: 'MLB', league: 'MLB', category: 'VIP', access: 'VIP', section: 'vip', originalTable: 'VIP',
    game: 'Detroit Tigers vs Texas Rangers', pick: 'Detroit Tigers ML', cardTitle: 'Detroit Tigers ML', betType: 'Moneyline', market: 'Moneyline',
    odds: '-114', units: '0.75u', grade: 'B+', confidence: '8.1/10', bestNumber: '-114', lineNumber: '-114', noBetCutoff: '-130 or worse',
    status: 'Active', releaseStatus: 'VIP Released', sportsbook: 'Circa / shop best ML', risk: 'Medium',
    writeup: 'Detroit is worth a VIP add only at the cheaper Circa-style number. The edge disappears if the market gets close to the inflated DocSports price.',
    fullAnalysis: `Detroit Tigers ML fits the VIP card because it gives us side agreement without forcing a bad price. Circa’s number around -114 is the key. At that range, Detroit is a playable favorite with enough matchup and market support to justify B+ status. DocSports also lands on Detroit, but the higher listed price is not the number we want to chase.\n\nThe cleanest expression is the moneyline at the best available price. Micks Verdict: VIP B+, 0.75u. Play near -114 to -120. Playable to -125. Pass at -130 or worse.`
  }
]

const FREE_PICKS = [
  { date: '2026-07-05', sport: 'Soccer', league: 'FIFA World Cup', category: 'Free', access: 'Free', section: 'free', originalTable: 'Master Picks', game: 'England vs Mexico', pick: 'First Half Draw', cardTitle: 'England/Mexico 1H Draw', betType: 'First Half Result', market: '1H Draw', odds: '+100', units: '0.35u', grade: 'B', confidence: '7.3/10', bestNumber: '+100', lineNumber: '+100', noBetCutoff: '-110 or worse', status: 'Active', releaseStatus: 'Free Released', sportsbook: 'Shop best 1H price', risk: 'Medium-High', writeup: 'England/Mexico profiles as a cagey knockout match early. Instead of forcing a full-game side, the better angle is the first-half draw.' },
  { date: '2026-07-05', sport: 'MLB', league: 'MLB', category: 'Free', access: 'Free', section: 'free', originalTable: 'Master Picks', game: 'Minnesota Twins vs New York Yankees', pick: 'New York Yankees ML', cardTitle: 'New York Yankees ML', betType: 'Moneyline', market: 'Moneyline', odds: '-131', units: '0.50u', grade: 'B', confidence: '7.2/10', bestNumber: '-131', lineNumber: '-131', noBetCutoff: '-145 or worse', status: 'Active', releaseStatus: 'Free Released', sportsbook: 'Circa / shop best ML', risk: 'Medium', writeup: 'Yankees ML is playable as a smaller free-card position. The matchup points to New York as the better side, but the price is not cheap enough for VIP.' },
  { date: '2026-07-05', sport: 'MLB', league: 'MLB', category: 'Free', access: 'Free', section: 'free', originalTable: 'Master Picks', game: 'San Diego Padres vs Los Angeles Dodgers', pick: 'Los Angeles Dodgers -1.5', cardTitle: 'Los Angeles Dodgers -1.5', betType: 'Run Line', market: 'Run Line', odds: 'EVEN', units: '0.50u', grade: 'B', confidence: '7.1/10', bestNumber: 'EVEN', lineNumber: '-1.5', noBetCutoff: '-115 or worse', status: 'Active', releaseStatus: 'Free Released', sportsbook: 'Circa / shop best run line', risk: 'Medium-High', writeup: 'Dodgers -1.5 is the better way to attack the matchup because the moneyline is too expensive.' }
]

const PROPS = [
  { date: '2026-07-05', sport: 'MLB', league: 'MLB', category: 'Props', access: 'Free', section: 'props', originalTable: 'Props Lab', game: 'San Diego Padres vs Los Angeles Dodgers', player: 'Fernando Tatis Jr.', pick: 'Fernando Tatis Jr. Home Run Yes', cardTitle: 'Fernando Tatis Jr. HR Yes', prop: 'Home Run Yes', betType: 'Player Prop', market: 'HR Prop', odds: '+340', units: '0.10u', grade: 'C+', confidence: '6.4/10', bestNumber: '+340', lineNumber: 'HR Yes', noBetCutoff: '+300 or worse', status: 'Active', releaseStatus: 'Props Lab', sportsbook: 'Circa / shop HR price', risk: 'Very High', writeup: 'Props Lab only. HR props are high variance, so this stays small at 0.10u.' },
  { date: '2026-07-05', sport: 'MLB', league: 'MLB', category: 'Props', access: 'Free', section: 'props', originalTable: 'Props Lab', game: 'San Diego Padres vs Los Angeles Dodgers', player: 'Shohei Ohtani', pick: 'Shohei Ohtani Home Run Yes', cardTitle: 'Shohei Ohtani HR Yes', prop: 'Home Run Yes', betType: 'Player Prop', market: 'HR Prop', odds: '+425', units: '0.10u', grade: 'C+', confidence: '6.3/10', bestNumber: '+425', lineNumber: 'HR Yes', noBetCutoff: '+380 or worse', status: 'Active', releaseStatus: 'Props Lab', sportsbook: 'Circa / shop HR price', risk: 'Very High', writeup: 'Props Lab only. Ohtani HR Yes is high-variance lottery exposure, not a core play.' },
  { date: '2026-07-05', sport: 'MLB', league: 'MLB', category: 'Props', access: 'Free', section: 'props', originalTable: 'Props Lab', game: 'Philadelphia Phillies vs Kansas City Royals', player: 'Aaron Nola', pick: 'Aaron Nola Over 4.5 Strikeouts', cardTitle: 'Aaron Nola Over 4.5 Ks', prop: 'Over 4.5 Strikeouts', betType: 'Player Prop', market: 'Strikeout Prop', odds: '-155', units: '0.25u', grade: 'B-', confidence: '6.9/10', bestNumber: '-155', lineNumber: 'Over 4.5 Ks', noBetCutoff: '-170 or worse', status: 'Active', releaseStatus: 'Props Lab', sportsbook: 'Circa / shop K prop', risk: 'Medium-High', writeup: 'Cleaner prop than the HR lottos, but the juice keeps it small.' }
]

const LOTTO_PARLAYS = [
  { date: '2026-07-05', sport: 'Multi-Sport', league: 'WNBA/MLB', category: 'Lotto Parlay', access: 'Free', section: 'lotto', originalTable: 'Lotto Parlays', game: 'Wings / Aces / Tigers', pick: 'Dallas Wings ML + Las Vegas Aces ML + Detroit Tigers ML', cardTitle: 'Wings ML + Aces ML + Tigers ML', legs: 'Dallas Wings ML / Las Vegas Aces ML / Detroit Tigers ML', betType: 'Lotto Parlay', market: '3-Leg Parlay', odds: '+230 estimated', units: '0.25u', grade: 'B-', confidence: '7.4/10', bestNumber: '+220 or better', lineNumber: '+230 estimated', noBetCutoff: 'Below +200', status: 'Active', releaseStatus: 'Lotto Released', sportsbook: 'Shop best parlay price', risk: 'High', writeup: 'Safer parlay version using moneylines instead of laying all spread legs. Small stake only.' },
  { date: '2026-07-05', sport: 'MLB', league: 'MLB', category: 'Lotto Parlay', access: 'Free', section: 'lotto', originalTable: 'Lotto Parlays', game: 'Yankees / Dodgers / Tigers', pick: 'Yankees ML + Dodgers -1.5 + Tigers ML', cardTitle: 'Yankees ML + Dodgers -1.5 + Tigers ML', legs: 'Yankees ML / Dodgers -1.5 / Tigers ML', betType: 'Lotto Parlay', market: '3-Leg Parlay', odds: 'TBD', units: '0.15u', grade: 'C+', confidence: '6.6/10', bestNumber: 'Best available', lineNumber: '3-leg parlay', noBetCutoff: 'Do not chase bad numbers', status: 'Active', releaseStatus: 'Lotto Released', sportsbook: 'Shop best prices', risk: 'Very High', writeup: 'Small lotto-only build using Yankees ML, Dodgers -1.5, and Tigers ML. High variance; capped at 0.15u.' }
]

const LONGSHOTS = []

function makePublicVipTeaser(row = {}) {
  return {
    ...row,
    pick: 'VIP Pick Locked',
    cardTitle: 'VIP Pick Locked',
    game: row.league ? `${row.league} VIP Market Room` : 'VIP Market Room',
    betType: 'Members Only',
    category: 'VIP Vault',
    access: 'VIP',
    status: 'VIP Locked',
    releaseStatus: 'VIP Locked',
    grade: 'VIP',
    odds: 'Protected',
    units: 'Members',
    bestNumber: 'Members only',
    lineNumber: 'Protected VIP line',
    noBetCutoff: 'Protected portal',
    sportsbook: 'VIP Portal',
    fullAnalysisLocked: true,
    fullAnalysis: undefined,
    writeup: 'Full betting number, stake, sportsbook, and analysis are available inside the VIP Vault.'
  }
}

function payloadForPublic() {
  return {
    success: true,
    source: 'manual-july-5-separated-tabs',
    sourceOfTruth: 'Micks Picks API override',
    date: '2026-07-05',
    warnings: [],
    free: FREE_PICKS,
    vip: VIP_PICKS.map(makePublicVipTeaser),
    vipVault: [],
    props: PROPS,
    lottoParlays: LOTTO_PARLAYS,
    longshots: LONGSHOTS
  }
}

function payloadForVip() {
  return {
    success: true,
    source: 'manual-july-5-vip-full-feed',
    sourceOfTruth: 'Micks Picks API override',
    date: '2026-07-05',
    warnings: [],
    vip: VIP_PICKS,
    vipVault: VIP_PICKS
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  res.status(200).json(String(req.query?.vip || '').trim() === '1' ? payloadForVip() : payloadForPublic())
}
