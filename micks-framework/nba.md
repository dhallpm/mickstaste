# Micks Picks NBA Framework

## Card Standard
- NBA cards must start with the market price, the best available number, and an estimated true probability.
- Do not publish an NBA pick unless the play has a clear edge, a verified book price, and current injury/news context.
- Default incomplete NBA candidates to review mode. Missing injury timing, missing odds, or stale matchup data should downgrade the card.

## Core Scoring
- Implied probability comes from American odds.
- EV edge = estimated true probability minus implied probability.
- Best Number is the playable book price at release time.
- No Bet Cutoff is the last acceptable price before the edge disappears.
- Confidence reflects edge quality, injury certainty, matchup stability, and market confirmation.

## Grading
- A = strong edge, clean injury context, stable role/minutes, strong matchup or market signal, playable number still available.
- B = positive edge with one moderate uncertainty such as rotation volatility, price movement, or matchup dependency.
- C = small edge or situational angle that is playable only at the listed number.
- Pass = no current edge, stale number, bad injury timing, public inflation, or incomplete source verification.

## Matchup Layer
- Pace matters most when both teams support the same possession environment.
- Efficiency edges should separate shot quality from recent shooting variance.
- Defensive matchup edges should identify the actual weak point: rim pressure, corner threes, pull-up creation, transition, or foul rate.
- Regression spots matter when a team's recent results are driven by unsustainable shooting, opponent variance, or turnover luck.
- Public-team inflation is a downgrade when the market price has moved mostly because of brand, star narrative, or recent national TV result.

## Injury And News Timing
- Re-check injury reports close to release, especially for questionable starters, late scratches, and back-to-back rest.
- Minutes security is mandatory for player-driven sides and totals.
- If a star is questionable or minutes-limited, use review mode until the role and rotation are confirmed.
- Do not fill injury notes with guesses. Say what is known and what still needs confirmation.

## Market Movement
- Positive movement supports confidence only when it agrees with the handicap and the number is still playable.
- Chasing a moved number without edge is a Pass.
- Best Number and No Bet Cutoff should protect the user from stale prices.
- Closing Number is for CLV only, never for profit/loss.

## Safe Version Vs Value Version
- Safe version: the least fragile way to express the edge, usually moneyline, spread, team total, or a reduced-volatility prop line.
- Value version: higher payout or more price-sensitive expression that requires strict cutoff discipline.
- Publish the safe version unless the value version has both better edge and acceptable variance.
