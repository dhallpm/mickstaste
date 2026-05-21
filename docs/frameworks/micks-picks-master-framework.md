# Micks Picks Master Framework

_Last backed up: 2026-05-21_

## Core Model Purpose
Micks Picks is a sports betting analysis framework focused on identifying value, not simply predicting winners. The model grades picks by comparing true probability against sportsbook implied probability, then adjusting for matchup sustainability, injuries, market movement, variance, and exposure risk.

## Core Grading
- A / A-: playable straight bet when market number still gives edge.
- B+ / B: lean or public/free pick unless prop/parlay exception applies.
- C: lean only, low exposure.
- Pass: no edge or bad number.

## VIP Routing Rule
- Straight bets must be A- or higher to qualify for VIP.
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
