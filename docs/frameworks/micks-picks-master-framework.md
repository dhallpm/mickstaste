# Micks Picks Master Framework

_Last backed up: 2026-05-21_

## Core Model Purpose
Micks Picks is a sports betting analysis framework focused on identifying value, not simply predicting winners. The model grades picks by comparing true probability against sportsbook implied probability, then adjusting for matchup sustainability, injuries, market movement, variance, and exposure risk.

## Core Grading
- A+: rare premium edge only when the A+ gate clears.
- A: must clear the full A-grade gate; do not force A grades.
- B+: bridge between B and A when a candidate is strong but misses any A-grade gate requirement.
- B: lean or public/free pick unless prop/parlay exception applies.
- C: lean only, low exposure.
- Pass: no edge or bad number.

## A-Grade Hunt Mode
- Run an A-candidate search phase before final grading.
- Prioritize MLB pitcher K props, outs recorded, first 5 lines, team totals, lineup/weather/bullpen driven totals; WNBA injury/rotation spreads, pace totals, role-stable props; NBA role-stable props and rest/pace totals; NHL only after goalie confirmation.
- A requires 3 independent evidence paths, 5%+ edge versus implied probability or meaningful projection gap, price inside cutoff, confirmed role/news data as needed, no major unresolved source conflict, and a clear market misprice reason.
- A+ requires the A gate plus 7% to 10%+ edge or major stale-line/news mismatch, low number sensitivity, verified news, and strong price protection.
- Output an A-Candidate Queue with why each candidate passed or failed the gate.
- If no candidate passes, output `No A-grade found.`

## VIP Routing Rule
- Straight bets must clear the A-grade gate to qualify as A or A+.
- B+ straight bets are bridge plays, not A-grade plays.
- B-grade picks can be VIP only if they are props, parlays, longshots, or lotto cards.
- Moneylines, spreads, and totals must not route to prop result sheets.

## Nate Silver Style Layer
- Compare projected true probability versus market implied probability.
- Use EV edge, variance grade, confidence grade, and Bayesian updating.
- Avoid overreacting to one game unless matchup evidence confirms the result.
- Detect market overreaction, public inflation, stale lines, narrative bias, and favorite tax.

## Safe Parlay Diversification Formula
- No single anchor can appear on every ticket.
- No ML anchor should exceed about 40% exposure across safe parlay cards.
- 5-leg cards: max 2 repeated legs across builds.
- 6-leg cards: max 3 repeated legs.
- 7-leg cards: minimum 3 unique legs versus other tickets.
- 8-leg cards: minimum 4 unique legs versus other tickets.
- Rotate anchors across alt spreads, star floor props, rebound/assist floors, alt totals, hit props, and team totals.

## Source Stack
- odds-api.io for live odds and market pricing.
- RotoWire for injuries, lineups, minutes, batting orders, probable pitchers, goalies, and late scratches.
- VegasInsider for market context, odds comparison, consensus, trend notes, and public-facing writeup context.
- TeamRankings for supporting trends, ratings, pace, totals, ATS, and predictive context.
- StatMuse-style splits for usage, minutes, prop trends, on/off, and matchup filtering.
- KenPom for NCAA basketball only.
- Umpire Scorecards for MLB umpire tendencies.

## Guardrails
- Do not use stale slates.
- Validate today’s date and schedule before releasing picks.
- Do not include teams that do not play today.
- Require final sportsbook confirmation before betting.
- Keep straight bets, props, longshots, and lotto cards routed to their proper feeds.
