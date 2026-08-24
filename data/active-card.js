// Micks Picks active-card source.
// Publishing updates this data file; the API route stays generic and date-aware.
// Settled rows and rows outside the effective Eastern card date are filtered by api/todays-picks.js.
export const activeCardRows = [
  {
    Date: '2026-08-24', Sport: 'MLB', League: 'MLB', Section: 'Free', Access: 'Free',
    Matchup: 'Colorado Rockies at Washington Nationals', Pick: 'Rockies/Nationals Under 8.5 Runs', Line: 'Under 8.5', Odds: '-120', Grade: 'B+', Units: 0.75,
    Status: 'Pending', 'Official Bet': 'Yes', 'Best Number': 'Under 8.5 (-115 or better)',
    'No-Bet Cutoff': 'Under 8.5 worse than -130, or total 7.5 — pass', Score: '86/110', 'Failure Score': '8/10', 'Market AI Replica': '87/100',
    Writeup: 'Colorado/Washington Under 8.5 is the preferred expression at the available BetRivers price of -120. The underlying run projection sits below eight, while the broader market has already shown Under pressure from an opener around 8.5 toward 8. Buying the half-run to 8.5 protects against an eight-run finish and remains inside the price cutoff. The play combines projected-total edge, weak offensive context and market confirmation rather than relying on one trend.',
    'Full Analysis': 'Rockies/Nationals Under 8.5 earns a B+ grade and 0.75u stake. The calculated run environment projects below the posted total, with the working projection around 7.7 runs. Market movement from roughly 8.5 toward 8 provides independent confirmation that the lower-scoring thesis is not isolated to the Micks model. At BetRivers, Under 8.5 -120 is preferred to Under 8 -109 because the additional half-run eliminates the push at exactly eight for a manageable price premium. The handicap also benefits from weak offensive context on both sides, but the bet is not upgraded to A-range because baseball totals retain substantial bullpen, sequencing and home-run variance. Micks Verdict: B+, 0.75u. Best number: Under 8.5 at -115 or better. Current executable number: -120. No-bet cutoff: worse than -130 at 8.5 or a drop to 7.5.'
  },
  {
    Date: '2026-08-24', Sport: 'WNBA', League: 'WNBA', Section: 'Props Lab', Access: 'Free',
    Matchup: 'Atlanta Dream at Los Angeles Sparks', Pick: 'Dearica Hamby Under 13.5 Points', Line: 'Under 13.5 Points', Odds: '-110', Grade: 'B+', Units: 0.75,
    Status: 'Pending', 'Official Bet': 'Yes', 'Pick of the Day': 'Yes', 'Best Number': 'Under 13.5 points (-110 or better)',
    'No-Bet Cutoff': '12.5 points, or materially worse than -120 — pass/rescore', Score: '86/110', 'Failure Score': '8/10', 'Market AI Replica': '87/100',
    Writeup: 'Dearica Hamby Under 13.5 points is released at -110 for 0.75u. The projection sits more than a point below the market threshold, while her recent scoring distribution and usage profile provide additional support for the Under. The 13.5 number is important because it preserves a full point of cushion over a 12-point type projection; a move to 12.5 materially changes the wager and triggers a pass/rescore.',
    'Full Analysis': 'Dearica Hamby Under 13.5 points earns a B+ grade and 0.75u at the requested -110 entry. The core of the handicap is a calculated projection below the market line, supported by recent scoring outcomes and a usage/efficiency profile that does not require an extreme defensive assumption to cash. The Under can win through ordinary shot volume and efficiency rather than needing an injury, foul trouble or blowout. The principal failure paths are a usage spike, unusually efficient shooting, or increased free-throw volume. Those risks keep the stake at 0.75u. Micks Verdict: B+, 0.75u. Best number: Under 13.5 at -110 or better. Playable through approximately -120. No-bet cutoff: 12.5 points or a materially worse price that removes the projected edge.'
  },
  {
    Date: '2026-08-23', Sport: 'MLB', League: 'MLB', Section: 'Props Lab', Access: 'Free',
    Matchup: 'Minnesota Twins at San Diego Padres', Pick: 'Bailey Ober Under 3.5 Strikeouts', Line: 'Under 3.5', Odds: '-117', Grade: 'B+', Units: 0.75,
    Status: 'Graded', Result: 'Win', 'Profit/Loss': '+0.64u', 'Official Bet': 'Yes', 'Pick of the Day': 'Yes', 'Best Number': 'Under 3.5 Ks (-105 or better)',
    'No-Bet Cutoff': '-125 or worse, or 2.5 Ks — rescore/pass', Score: '83/110', 'Failure Score': '7/10', Writeup: 'Bailey Ober Under 3.5 strikeouts.', 'Full Analysis': 'Graded winner from the August 23 card.'
  },
  {
    Date: '2026-08-23', Sport: 'MLB', League: 'MLB', Section: 'Free', Access: 'Free',
    Matchup: 'Minnesota Twins at San Diego Padres', Pick: 'Walker Buehler Over 15.5 Outs Recorded', Line: 'Over 15.5 Outs', Odds: '+104', Grade: 'B+', Units: 0.75,
    Status: 'Graded', Result: 'Win', 'Profit/Loss': '+0.78u', 'Official Bet': 'Yes', 'Best Number': 'Over 15.5 outs (+100 or better)', 'No-Bet Cutoff': '-120 or worse, or 16.5 outs — pass', Score: '84/110', 'Failure Score': '7/10', Writeup: 'Walker Buehler Over 15.5 outs recorded.', 'Full Analysis': 'Graded winner from the August 23 card.'
  }
]

export default activeCardRows
