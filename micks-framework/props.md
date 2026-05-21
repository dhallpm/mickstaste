# Micks Picks Props Framework

## Props Lab Standard
- Props Lab is for true player props only.
- Moneylines, spreads, game totals, team totals, parlays, lotto props, futures, and longshots must not route to Props Lab.
- Every prop needs player, team, opponent, league, game, prop type, line, odds, units, status, and source verification.

## Core Prop Inputs
- Minutes security or participation expectation.
- Usage rate and role stability.
- Matchup allowance by position, action type, or stat category.
- Pace and efficiency environment.
- Injury/news impact on role, touches, shots, assists, rebounds, or defensive assignments.
- Market movement from opener/current price when available.

## NBA/WNBA Props Logic
- Points props require shot volume, efficiency context, defender matchup, blowout risk, and usage shift.
- Rebounds props require minutes, position, opponent shot profile, pace, and teammate availability.
- Assists props require on-ball role, potential assists, teammate shooting, opponent defensive pressure, and lineup spacing.
- PRA/RA/PA props require correlation across categories and should be downgraded when one leg is role-fragile.
- Threes props require attempts, defensive scheme, catch-and-shoot profile, and price sensitivity.

## Grading
- A = strong projection edge, secure role, clean matchup, current injury news, and playable number.
- B = positive edge with manageable volatility or one dependency.
- C = thin edge at the current number only.
- Pass = uncertain minutes, stale line, unverified injury impact, bad price, or low-data projection.

## Best Number And No Bet Cutoff
- Best Number is the line/price used for the card.
- No Bet Cutoff must be stated for both line and odds when possible.
- A prop that moves through the key line should often become Pass even if the side is still directionally correct.

## Market And News Timing
- Late injury news can create real prop value, but only after confirming the affected role.
- Never assume a replacement usage bump without minutes and rotation support.
- If the provider data cannot verify news timing, keep the card in review mode.

## Archive And Routing
- Active player props route to Props Lab.
- Closed/graded player props route to Results Archive through the Airtable archive worker unless a specific prop archive table is configured.
- Parlay and lotto props never go to Props Lab.
