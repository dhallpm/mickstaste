// Micks Picks active-card source.
// Publishing updates this data file; the API route stays generic and date-aware.
// Settled rows and rows outside the effective Eastern card date are filtered by api/todays-picks.js.
export const activeCardRows = [
  {
    Date: '2026-08-23', Sport: 'MLB', League: 'MLB', Section: 'Props Lab', Access: 'Free',
    Matchup: 'Minnesota Twins at San Diego Padres', Pick: 'Bailey Ober Under 3.5 Strikeouts', Line: 'Under 3.5', Odds: '-117', Grade: 'B+', Units: 0.75,
    Status: 'Released', 'Official Bet': 'Yes', 'Pick of the Day': 'Yes', 'Best Number': 'Under 3.5 Ks (-105 or better)',
    'No-Bet Cutoff': '-125 or worse, or 2.5 Ks — rescore/pass', Score: '83/110', 'Failure Score': '7/10',
    Writeup: 'Bailey Ober Under 3.5 strikeouts is the August 23 release after the full Micks Picks scan and current BetRivers price check. Ober has carried a modest strikeout profile this season, and the exact 3.5 threshold remains reachable on the Under when his outing is driven more by contact than swing-and-miss. BetRivers is dealing -117, worse than the preferred -105 entry but still inside the -125 no-bet cutoff. The primary failure path is an isolated strikeout spike or a longer-than-expected outing against a favorable matchup. Recovery Mode+ keeps the stake at 0.75u.',
    'Full Analysis': 'Bailey Ober Under 3.5 strikeouts earns a B+ release because the current threshold, recent distribution and executable price all clear the Recovery Mode+ gates. Ober has not carried a dominant strikeout foundation this season, and several recent starts have finished below four strikeouts, making Under 3.5 a softer threshold than many standard pitcher-K markets. The handicap is not built on one average alone: the recent game-log distribution, broader swing-and-miss profile and workload context all point toward a realistic path to three or fewer strikeouts. Market context matters. The preferred entry was -105, while BetRivers is now offering -117. That deterioration is acceptable because the threshold remains 3.5 and the current price is still comfortably inside the -125 cutoff. The cashing path is a normal-length Ober outing in which contact and balls in play prevent a strikeout spike. The key failure path is an outlier whiff game or an unexpectedly long leash that gives him extra batters and a fourth strikeout. That variance keeps the play at B+ and 0.75u rather than A-range. Micks Verdict: B+, 0.75u. Best number: Under 3.5 Ks at -105 or better. Playable through approximately -120. No-bet cutoff: -125 or worse, or if the market drops to 2.5 strikeouts.'
  }
]

export default activeCardRows
