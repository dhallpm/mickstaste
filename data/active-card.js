// Micks Picks active-card source.
// Publishing updates this data file; the API route stays generic and date-aware.
// Settled rows and rows outside the effective Eastern card date are filtered by api/todays-picks.js.
export const activeCardRows = [
  {
    Date: '2026-09-13', Sport: 'NFL', League: 'NFL', Section: 'Free', Access: 'Free',
    Matchup: 'New York Jets at Tennessee Titans', Pick: 'New York Jets +1.5', Line: '+1.5', Odds: '-110', Grade: 'B+', Units: 0.75,
    Status: 'Pending', 'Official Bet': 'Yes', 'Pick of the Day': 'Yes', 'Best Number': 'Jets +2 or better',
    'No-Bet Cutoff': 'Pick’em / Jets favored — rescore', Score: '81/110', 'Failure Score': '8/10', 'Market AI Replica': '84/100',
    Writeup: 'New York +1.5 is the preferred straight-side expression. The market has moved materially toward the Jets from an opener around Tennessee -3, while independent matchup work supports New York’s improved offensive-line environment against a Tennessee team that entered the season with protection concerns. The number still gives the Jets the field-goal-margin path while retaining plus points.',
    'Full Analysis': 'Jets +1.5 earns a B+ grade and 0.75u. The handicap combines favorable market movement, matchup support and independent confirmation rather than relying on a single trend. Tennessee opened around -3 and has been bet down toward -1.5, a meaningful repricing toward New York. Micks score: 81/110. Market AI Replica: 84/100. Failure score: 8/10. Best number: Jets +2 or better. Playable: +1.5 at -115 or better. No-bet cutoff: pick’em or Jets favored, at which point the edge must be rescored.'
  },
  {
    Date: '2026-09-13', Sport: 'NFL', League: 'NFL', Section: 'Free', Access: 'Free',
    Matchup: 'Green Bay Packers at Minnesota Vikings', Pick: 'Minnesota Vikings -1.5', Line: '-1.5', Odds: '-114', Grade: 'B+', Units: 0.75,
    Status: 'Pending', 'Official Bet': 'Yes', 'Best Number': 'Vikings -1 (-110 or better)',
    'No-Bet Cutoff': 'Vikings -2.5; rescore at -3', Score: '80/110', 'Failure Score': '7/10', 'Market AI Replica': '82/100',
    Writeup: 'Minnesota -1.5 is released at the current BetRivers price shown at -114. The market has flipped from Green Bay favoritism toward Minnesota, and the matchup case is reinforced by the preseason guide work on Minnesota’s roster and defensive outlook versus Green Bay personnel concerns. The key is staying below the field goal.',
    'Full Analysis': 'Vikings -1.5 earns a B+ grade and 0.75u. The current BetRivers screenshot confirms Minnesota -1.5 at -114. The broader market has repriced the matchup from Green Bay being favored earlier in the cycle to Minnesota being favored at home. Guide-based personnel and defensive evidence supports the direction of that move. Micks score: 80/110. Market AI Replica: 82/100. Failure score: 7/10. Best number: Minnesota -1 at -110 or better. Playable: -1.5 at -115 or better. No-bet cutoff: -2.5, with a mandatory rescore at -3.'
  },
  {
    Date: '2026-09-13', Sport: 'NFL', League: 'NFL', Section: 'Lotto Parlays', Access: 'Free',
    Matchup: 'Jets at Titans / Packers at Vikings', Pick: 'Jets +1.5 / Vikings -1.5', Line: '2-Leg Parlay', Odds: 'Price at book', Grade: 'B+', Units: 0.25,
    Status: 'Pending', 'Official Bet': 'Yes', 'Best Number': 'Jets +2 or better / Vikings -1 or better',
    'No-Bet Cutoff': 'Jets PK or Vikings -3 — pass/rescore', Score: '82/110', 'Failure Score': '7/10', 'Market AI Replica': '84/100',
    Writeup: 'The two-leg Lotto Parlay combines the two strongest straight-side positions on the September 13 card without adding a lower-confidence third leg. Keep both legs inside their individual execution cutoffs.',
    'Full Analysis': 'Two-leg Lotto Parlay: New York Jets +1.5 and Minnesota Vikings -1.5. Grade B+, 0.25u. Micks score: 82/110. Market AI Replica: 84/100. Failure score: 7/10. Best construction uses Jets +2 or better and Vikings -1 or better when available. Playable at Jets +1.5 and Vikings -1.5. No-bet cutoff: Jets pick’em or Minnesota -3; rescore if either threshold is reached.'
  },
  {
    Date: '2026-08-24', Sport: 'MLB', League: 'MLB', Section: 'Free', Access: 'Free', Matchup: 'Colorado Rockies at Washington Nationals', Pick: 'Rockies/Nationals Under 8.5 Runs', Line: 'Under 8.5', Odds: '-120', Grade: 'B+', Units: 0.75, Status: 'Pending', 'Official Bet': 'Yes'
  },
  {
    Date: '2026-08-24', Sport: 'WNBA', League: 'WNBA', Section: 'Props Lab', Access: 'Free', Matchup: 'Atlanta Dream at Los Angeles Sparks', Pick: 'Dearica Hamby Under 13.5 Points', Line: 'Under 13.5 Points', Odds: '-110', Grade: 'B+', Units: 0.75, Status: 'Pending', 'Official Bet': 'Yes'
  },
  {
    Date: '2026-08-23', Sport: 'MLB', League: 'MLB', Section: 'Props Lab', Access: 'Free', Matchup: 'Minnesota Twins at San Diego Padres', Pick: 'Bailey Ober Under 3.5 Strikeouts', Line: 'Under 3.5', Odds: '-117', Grade: 'B+', Units: 0.75, Status: 'Graded', Result: 'Win', 'Profit/Loss': '+0.64u', 'Official Bet': 'Yes'
  },
  {
    Date: '2026-08-23', Sport: 'MLB', League: 'MLB', Section: 'Free', Access: 'Free', Matchup: 'Minnesota Twins at San Diego Padres', Pick: 'Walker Buehler Over 15.5 Outs Recorded', Line: 'Over 15.5 Outs', Odds: '+104', Grade: 'B+', Units: 0.75, Status: 'Graded', Result: 'Win', 'Profit/Loss': '+0.78u', 'Official Bet': 'Yes'
  }
]

export default activeCardRows
