// Micks Picks active-card source.
// Publishing updates this data file; the API route stays generic and date-aware.
// Settled rows and rows outside the effective Eastern card date are filtered by api/todays-picks.js.
export const activeCardRows = [
  {
    Date: '2026-08-16',
    Sport: 'WNBA',
    League: 'WNBA',
    Section: 'VIP',
    Access: 'VIP',
    Matchup: 'Portland Fire vs Phoenix Mercury',
    Pick: 'Under 178.5',
    Line: 'Under 178.5',
    Odds: '-112',
    Grade: 'A',
    Units: 1.25,
    Status: 'Pending',
    'Official Bet': 'Yes',
    'Pick of the Day': 'Yes',
    'Best Number': 'Under 178.5 (-112)',
    'No-Bet Cutoff': 'Below 176.5 — rescore/pass',
    Score: '90/110',
    Writeup: 'The BetRivers 178.5 gives Micks two extra points over the 176.5 number originally evaluated and roughly seven points of separation from the 171.5 TSI projection. The personnel and recent-scoring profile still support a lower-possession, lower-output game.',
    'Full Analysis': 'Micks makes Portland/Phoenix Under 178.5 the top play on the August 16 card. The current executable number is materially better than the original 176.5 target, increasing the cushion against the model projection. Kelsey Plum being unavailable and Phoenix playing below its offensive baseline strengthen the Under path, while Portland does not require a high-tempo script to remain competitive. Micks Verdict: A, 1.25u. Best number Under 178.5 (-112). Play 176.5 or better; below 176.5 requires a rescore.'
  },
  {
    Date: '2026-08-16',
    Sport: 'WNBA',
    League: 'WNBA',
    Section: 'VIP',
    Access: 'VIP',
    Matchup: 'Indiana Fever vs Atlanta Dream',
    Pick: 'Atlanta Dream -1.5',
    Line: '-1.5',
    Odds: '-115',
    Grade: 'A-',
    Units: 1.00,
    Status: 'Pending',
    'Official Bet': 'Yes',
    'Best Number': 'Atlanta -1.5 (-115)',
    'No-Bet Cutoff': 'Atlanta -3 or worse — rescore',
    Score: '85/110',
    Writeup: 'Atlanta -1.5 is the exact release number that cleared the Micks scoring framework. VSiN projects Atlanta stronger than market and Doc’s independently supports the Dream side, giving this play real cross-source confirmation.',
    'Full Analysis': 'Atlanta Dream -1.5 combines model separation, a playable market number and independent source agreement. The Micks framework scores the side at 85/110 with VSiN support and Doc’s confirmation. The number remains inside the preferred range through -2.5, but -3 or worse should be rescored rather than chased. Micks Verdict: A-, 1.00u at Atlanta -1.5 (-115).'
  },
  {
    Date: '2026-08-16',
    Sport: 'MLB',
    League: 'MLB',
    Section: 'Props Lab',
    Access: 'Free',
    Matchup: 'Miami Marlins at Cincinnati Reds',
    Pick: 'Eury Perez 7+ Strikeouts',
    Line: '7+ Strikeouts',
    Odds: '-118',
    Grade: 'A-',
    Units: 1.00,
    Status: 'Pending',
    'Official Bet': 'Yes',
    'Best Number': '7+ Strikeouts (-118)',
    'No-Bet Cutoff': '-130 or worse — rescore',
    Score: '80/110',
    Writeup: 'Perez draws a Cincinnati lineup with one of the highest strikeout rates against right-handed pitching. His recent strikeout form and road swing-and-miss profile provide the required opportunity path, and 7+ at -118 is slightly better than the equivalent O6.5 -120 market.',
    'Full Analysis': 'Eury Perez 7+ strikeouts is the top Props Lab entry for August 16. The matchup supplies a strong strikeout path against a Cincinnati offense that has carried an elevated K rate versus right-handed pitching, while Perez has repeatedly reached this threshold in recent starts. BetRivers 7+ at -118 is the preferred structure over O6.5 -120 because both require seven strikeouts to win but 7+ carries the slightly better price. Micks Verdict: A-, 1.00u. Play to roughly -125; -130 or worse requires a rescore.'
  }
]

export default activeCardRows
