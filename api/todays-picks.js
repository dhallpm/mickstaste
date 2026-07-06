const VIP_PICKS = [
  {
    date: '2026-07-06', sport: 'Soccer', league: 'FIFA World Cup', category: 'VIP', access: 'VIP', section: 'vip', originalTable: 'VIP',
    game: 'Spain vs Portugal', pick: 'Spain to Advance', cardTitle: 'Spain to Advance', betType: 'To Advance', market: 'To Advance', odds: '-210', units: '1.00u', grade: 'A-', confidence: '8.6/10', bestNumber: '-210', lineNumber: '-210', noBetCutoff: '-240 or worse', status: 'Active', releaseStatus: 'VIP Released', sportsbook: 'Circa / shop best advance price', risk: 'Medium', featured: 'Yes',
    writeup: 'Spain is the preferred side, but the advance market is safer than Spain 90-minute ML because knockout draw risk matters.',
    fullAnalysis: 'Spain to Advance is the preferred VIP structure over Spain 90-minute ML because the matchup supports Spain as the stronger side without requiring them to win inside regulation. The advance market protects against a 90-minute draw while still backing the better team to survive the tie. Micks Verdict: VIP A-, 1.00u. Play around -210. Playable to -225. Pass worse than -240.',
    birthdayNotes: 'July 6 football birthdays, for example Zé Roberto and Rory Delap, are narrative only and should not be treated as edge.'
  },
  {
    date: '2026-07-06', sport: 'Soccer', league: 'FIFA World Cup', category: 'VIP', access: 'VIP', section: 'vip', originalTable: 'VIP',
    game: 'USA vs Belgium', pick: 'Over 2.5 Goals', cardTitle: 'USA/Belgium Over 2.5 Goals', betType: 'Total', market: 'Total', odds: '-125', units: '0.75u', grade: 'B+', confidence: '8.1/10', bestNumber: '-125', lineNumber: 'Over 2.5', noBetCutoff: '-140 or worse', status: 'Active', releaseStatus: 'VIP Released', sportsbook: 'Circa / shop best total', risk: 'Medium', featured: 'Yes',
    writeup: 'The better angle is goals instead of a side. Both attacks have enough chance creation to push this over.',
    fullAnalysis: 'USA/Belgium Over 2.5 remains the best total angle on the July 6 World Cup board. Both sides have enough attacking quality to create chances, and the market does not give either team a dominant side edge. Micks Verdict: VIP B+, 0.75u. Play around -125. Playable to -135. Pass at -140 or worse.',
    birthdayNotes: 'July 6 football birthdays, for example Zé Roberto and Rory Delap, are narrative only and should not be treated as edge.'
  }
]

const FREE_PICKS = [
  { date: '2026-07-06', sport: 'WNBA', league: 'WNBA', category: 'Free', access: 'Free', section: 'free', originalTable: 'Master Picks', game: 'Connecticut Sun vs Minnesota Lynx', pick: 'Minnesota Lynx -13', cardTitle: 'Minnesota Lynx -13', betType: 'Spread', market: 'Spread', odds: '-110', units: '0.75u', grade: 'B+', confidence: '7.9/10', bestNumber: '-13', lineNumber: '-13', noBetCutoff: '-14.5 or worse', status: 'Active', releaseStatus: 'Free Released', sportsbook: 'Circa / shop best spread', risk: 'Medium-High', writeup: 'Minnesota is clearly superior, but the spread size keeps this out of VIP.' },
  { date: '2026-07-06', sport: 'WNBA', league: 'WNBA', category: 'Free', access: 'Free', section: 'free', originalTable: 'Master Picks', game: 'Golden State Valkyries vs Washington Mystics', pick: 'Golden State Valkyries -6', cardTitle: 'Golden State Valkyries -6', betType: 'Spread', market: 'Spread', odds: '-110', units: '0.50u', grade: 'B', confidence: '7.2/10', bestNumber: '-6', lineNumber: '-6', noBetCutoff: '-6.5 or worse', status: 'Active', releaseStatus: 'Free Released', sportsbook: 'Circa / shop best spread', risk: 'Medium-High', writeup: 'Golden State is the better team, but -6 is not cheap enough for a big position.' },
  { date: '2026-07-06', sport: 'WNBA', league: 'WNBA', category: 'Free', access: 'Free', section: 'free', originalTable: 'Master Picks', game: 'Seattle Storm vs Los Angeles Sparks', pick: 'Los Angeles Sparks -4', cardTitle: 'Los Angeles Sparks -4', betType: 'Spread', market: 'Spread', odds: '-110', units: '0.50u', grade: 'B', confidence: '7.1/10', bestNumber: '-4', lineNumber: '-4', noBetCutoff: '-4.5 or worse', status: 'Active', releaseStatus: 'Free Released', sportsbook: 'Circa / shop best spread', risk: 'Medium', writeup: 'Sparks have the home and offensive edge, but Seattle variance keeps this in Free tier.' },
  { date: '2026-07-06', sport: 'MLB', league: 'MLB', category: 'Free', access: 'Free', section: 'free', originalTable: 'Master Picks', game: 'Colorado Rockies vs Los Angeles Dodgers', pick: 'Los Angeles Dodgers -1.5', cardTitle: 'Los Angeles Dodgers -1.5', betType: 'Run Line', market: 'Run Line', odds: '-118', units: '0.50u', grade: 'B', confidence: '7.4/10', bestNumber: '-118', lineNumber: '-1.5', noBetCutoff: '-130 or worse', status: 'Active', releaseStatus: 'Free Released', sportsbook: 'Circa / shop best run line', risk: 'Medium', writeup: 'Dodgers ML is too expensive, so the run line is the better attack angle.' },
  { date: '2026-07-06', sport: 'MLB', league: 'MLB', category: 'Free', access: 'Free', section: 'free', originalTable: 'Master Picks', game: 'New York Mets vs Atlanta Braves', pick: 'Atlanta Braves ML', cardTitle: 'Atlanta Braves ML', betType: 'Moneyline', market: 'Moneyline', odds: '-126', units: '0.50u', grade: 'B', confidence: '7.5/10', bestNumber: '-126', lineNumber: '-126', noBetCutoff: '-145 or worse', status: 'Active', releaseStatus: 'Free Released', sportsbook: 'Circa / shop best ML', risk: 'Medium', writeup: 'Braves are playable at the reasonable favorite price.' },
  { date: '2026-07-06', sport: 'MLB', league: 'MLB', category: 'Free', access: 'Free', section: 'free', originalTable: 'Master Picks', game: 'Arizona Diamondbacks vs San Diego Padres', pick: 'Arizona Diamondbacks +1.5', cardTitle: 'Arizona Diamondbacks +1.5', betType: 'Run Line', market: 'Run Line', odds: '-195', units: '0.50u', grade: 'B', confidence: '7.0/10', bestNumber: '-195', lineNumber: '+1.5', noBetCutoff: '-210 or worse', status: 'Active', releaseStatus: 'Free Released', sportsbook: 'Circa / shop best run line', risk: 'Medium', writeup: 'Prefer the plus-run-and-a-half in a competitive price range instead of laying Padres juice.' }
]

const PROPS = [
  { date: '2026-07-06', sport: 'MLB/Soccer', league: 'Props Lab', category: 'Props', access: 'Free', section: 'props', originalTable: 'Props Lab', game: 'Props Lab', pick: 'No Official Props Released', cardTitle: 'No Official Props Released', betType: 'Props Notice', market: 'Props Hold', odds: 'N/A', units: '0.00u', grade: 'Pass', confidence: 'Pass', bestNumber: 'Need exact player and price', lineNumber: 'Props held', noBetCutoff: 'Do not play without exact number', status: 'Hold', releaseStatus: 'Props Held', sportsbook: 'TBD', risk: 'High', writeup: 'Props are held. No official props are released until exact player, market, odds, and sportsbook are confirmed.' }
]

const LOTTO_PARLAYS = [
  { date: '2026-07-06', sport: 'Soccer', league: 'FIFA World Cup', category: 'Lotto Parlay', access: 'Free', section: 'lotto', originalTable: 'Lotto Parlays', game: 'Spain / USA-Belgium', pick: 'Spain to Advance + USA/Belgium Over 2.5 Goals', cardTitle: 'Spain to Advance + USA/Belgium Over 2.5', betType: 'Lotto Parlay', market: '2-Leg Parlay', odds: 'TBD', units: '0.25u', grade: 'B-', confidence: '7.3/10', bestNumber: 'Best available', lineNumber: '2-leg parlay', noBetCutoff: 'Do not chase if Spain exceeds -240 or Over exceeds -140', status: 'Active', releaseStatus: 'Lotto Released', sportsbook: 'Shop best prices', risk: 'High', writeup: 'Best soccer parlay build using the safer Spain market and the strongest USA/Belgium total angle.' },
  { date: '2026-07-06', sport: 'Multi-Sport', league: 'MLB/FIFA World Cup', category: 'Lotto Parlay', access: 'Free', section: 'lotto', originalTable: 'Lotto Parlays', game: 'Dodgers / Braves / Spain', pick: 'Dodgers -1.5 + Braves ML + Spain to Advance', cardTitle: 'Dodgers -1.5 + Braves ML + Spain to Advance', betType: 'Lotto Parlay', market: '3-Leg Parlay', odds: 'TBD', units: '0.15u', grade: 'C+', confidence: '6.8/10', bestNumber: 'Best available', lineNumber: '3-leg parlay', noBetCutoff: 'Do not chase bad numbers', status: 'Active', releaseStatus: 'Lotto Released', sportsbook: 'Shop best prices', risk: 'Very High', writeup: 'Small mixed-card lotto using two MLB positions plus the safer Spain advance angle.' },
  { date: '2026-07-06', sport: 'Multi-Sport', league: 'WNBA/MLB/FIFA World Cup', category: 'Lotto Parlay', access: 'Free', section: 'lotto', originalTable: 'Lotto Parlays', game: 'Lynx / Braves / Spain', pick: 'Minnesota Lynx ML + Braves ML + Spain to Advance', cardTitle: 'Lynx ML + Braves ML + Spain to Advance', betType: 'Lotto Parlay', market: '3-Leg Safer ML Parlay', odds: 'TBD', units: '0.20u', grade: 'C+', confidence: '6.9/10', bestNumber: 'Best available', lineNumber: '3-leg safer ML parlay', noBetCutoff: 'Do not chase bad combined pricing', status: 'Active', releaseStatus: 'Lotto Released', sportsbook: 'Shop best prices', risk: 'High', writeup: 'Safer lotto build using Lynx ML instead of the large spread.' }
]

const LONGSHOTS = []
const MAIN_PICKS = [...VIP_PICKS, ...FREE_PICKS]
const ALL_ROWS = [...MAIN_PICKS, ...PROPS, ...LOTTO_PARLAYS]

function makePublicVipTeaser(row = {}) {
  return { ...row, pick: 'VIP Pick Locked', cardTitle: 'VIP Pick Locked', game: row.league ? `${row.league} VIP Market Room` : 'VIP Market Room', betType: 'Members Only', category: 'VIP Vault', access: 'VIP', status: 'VIP Locked', releaseStatus: 'VIP Locked', grade: 'VIP', odds: 'Protected', units: 'Members', bestNumber: 'Members only', lineNumber: 'Protected VIP line', noBetCutoff: 'Protected portal', sportsbook: 'VIP Portal', fullAnalysisLocked: true, fullAnalysis: undefined, writeup: 'Full betting number, stake, sportsbook, and analysis are available inside the VIP Vault.' }
}

function payloadForPublic() {
  return { success: true, source: 'manual-july-6-active-card-props-clear', sourceOfTruth: 'Micks Picks API override', date: '2026-07-06', warnings: [], activePicks: MAIN_PICKS, rows: MAIN_PICKS, records: MAIN_PICKS, picks: MAIN_PICKS, mainPicks: MAIN_PICKS, free: FREE_PICKS, vip: VIP_PICKS.map(makePublicVipTeaser), vipVault: [], props: PROPS, propsLab: PROPS, lottoParlays: LOTTO_PARLAYS, lotto: LOTTO_PARLAYS, parlays: LOTTO_PARLAYS, longshots: LONGSHOTS, allRows: ALL_ROWS }
}

function payloadForVip() {
  return { success: true, source: 'manual-july-6-vip-full-feed-props-clear', sourceOfTruth: 'Micks Picks API override', date: '2026-07-06', warnings: [], activePicks: MAIN_PICKS, rows: MAIN_PICKS, records: MAIN_PICKS, picks: MAIN_PICKS, mainPicks: MAIN_PICKS, free: FREE_PICKS, vip: VIP_PICKS, vipVault: VIP_PICKS, props: PROPS, propsLab: PROPS, lottoParlays: LOTTO_PARLAYS, lotto: LOTTO_PARLAYS, parlays: LOTTO_PARLAYS, longshots: LONGSHOTS, allRows: ALL_ROWS }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  res.status(200).json(String(req.query?.vip || '').trim() === '1' ? payloadForVip() : payloadForPublic())
}
