// Micks Picks active-card source.
// Publishing updates this data file; the API route stays generic and date-aware.
// Settled rows and rows outside the effective Eastern card date are filtered by api/todays-picks.js.
export const activeCardRows = [
  {
    Date: '2026-08-22', Sport: 'WNBA', League: 'WNBA', Section: 'Free', Access: 'Free',
    Matchup: 'Indiana Fever at New York Liberty', Pick: 'Under 186.5 Total Points', Line: 'Under 186.5', Odds: '-122', Grade: 'B+', Units: 0.75,
    Status: 'Released', 'Official Bet': 'Yes', 'Pick of the Day': 'Yes', 'Best Number': 'Under 186.5 (-115 or better)',
    'No-Bet Cutoff': '184.5 or lower, or -125 or worse at 186.5 — rescore/pass', Score: '83/110', 'Failure Score': '7/10',
    Writeup: 'Indiana Fever/New York Liberty Under 186.5 remains the top August 22 release even after the current BetRivers price moved to -122. The handicap is built on a meaningful projection-versus-market gap, with recent road/home scoring environments also landing below the posted total. The main counter-signal is Indiana’s strong offense and faster pace, which keeps this at B+ rather than A-range. Preserving the full 186.5 threshold is more important than dropping to a cheaper alternate total, so the current -122 execution remains playable but close to the price cutoff.',
    'Full Analysis': 'Indiana Fever at New York Liberty Under 186.5 earns a B+ release because the current total remains materially above the strongest projection baseline while still offering enough cushion against normal scoring variance. The core edge is the gap between the market total and a lower projected scoring environment, supported by recent Indiana road and New York home results that have generally landed below this number. Market structure matters here: BetRivers is now dealing Under 186.5 at -122. That is worse than the preferred -115 or better entry, but preserving 186.5 is preferable to paying less juice for a lower alternate such as 185.5 because one full point has real settlement value near this range. The cashing path is a competitive but not fully efficient game in which pace does not translate into elite shooting for four quarters. The main failure path is Indiana’s top-tier offense forcing New York into a high-possession shootout, especially if transition scoring and free throws spike. That variance keeps the wager at B+ and 0.75u rather than A-range. Micks Verdict: B+, 0.75u. Best number: Under 186.5 at -115 or better. Current execution: -122 is playable. No-bet cutoff: -125 or worse at 186.5, or if the total falls to 184.5 or lower.'
  }
]

export default activeCardRows
