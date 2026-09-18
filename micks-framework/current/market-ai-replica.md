# Micks Picks Market AI Replica

Status: Permanent experimental decision module
Effective date: 2026-08-24
Purpose: Reproduce the observable decision behavior of successful market-aware betting models without copying or tailing any proprietary handicapper.

## Governing principle

This module is trained and audited from observable information only: posted selections, posted prices, historical market data, sport-specific fundamentals, independent projections, and closing prices. Doc's Sports AI-v3 is a benchmark sample, not the engine and not an automatic source of picks.

The objective is to discover which observable signals distinguish profitable selections from losing selections and then test those signals prospectively inside Micks Picks.

## Decision architecture

The required order is:

1. Independent Micks fair line / fair probability
2. Market dislocation measurement
3. Fundamental quality and matchup verification
4. Market regime assessment
5. Market microstructure assessment
6. Best market-expression selection
7. External calculated confirmation
8. Failure-case score
9. Pass / Watchlist / Release
10. Freeze release price and measure CLV later

Do not start from a Doc's pick and work backward to justify it on a live card.

# A. Market Dislocation Score

Market dislocation is separate from line movement. It measures the difference between Micks fair probability and the de-vigged market probability at the executable price.

Required fields:
- Micks fair probability
- Micks fair line / price
- raw sportsbook implied probability
- de-vigged market probability when available
- absolute probability gap
- expected value at executable price

Suggested interpretation for standard liquid markets:
- < 1.5 percentage points: weak/no edge
- 1.5 to 2.9 points: small edge
- 3.0 to 4.9 points: meaningful edge
- 5.0+ points: strong dislocation requiring verification rather than automatic release

For plus-money and futures markets also calculate expected value directly. A large probability gap produced by an unstable model must be shrunk rather than trusted blindly.

# B. Market Regime Score

Before ranking individual bets, classify each active sport/market family for current exploitability.

Inputs:
- data maturity
- sample-size stability
- public participation
- market liquidity
- price dispersion across books
- model disagreement across credible independent projections
- injury/lineup information uncertainty
- schedule density / fatigue uncertainty
- bookmaker market depth
- availability of high-quality derivative markets

Regime labels:
- GREEN: favorable hunting environment; broaden candidate search
- YELLOW: normal market; standard gates
- RED: highly efficient, information-poor, stale, or unstable; tighten gates / reduce volume

The Regime Score never creates a bet. It changes how aggressively Micks searches and how much confirmation is required.

# C. Market Microstructure Features

For each serious candidate record when available:
- opener
- Micks release candidate line
- current consensus line
- Circa/high-limit line
- closing line after release
- ticket percentage
- handle percentage
- ticket/handle gap
- direction and magnitude of line move
- timing of material move
- whether move preceded or followed public news
- resistance / stalled move despite one-sided tickets
- buyback / reversal
- price dispersion across books
- liquidity class
- whether Micks direction agrees with respected-market direction

Do not infer sharp money from one line move or ticket percentage.

# D. Fundamental Features

Use sport-specific fundamentals. Examples:

MLB:
- starting-pitcher projection
- xERA/FIP/xFIP/SIERA or equivalent
- K/BB, whiff, chase, contact quality
- lineup/platoon
- bullpen availability
- park/weather
- defensive/baserunning context

NBA/WNBA/CBB:
- adjusted offense/defense
- pace
- shot profile
- turnover/rebound/foul rates
- current rotation/minutes
- rest/travel
- matchup-specific usage

NFL/CFB/CFL:
- QB efficiency/value
- EPA/success rate
- OL/DL and pressure
- explosive plays
- pace/pass rate
- injuries and weather

NHL:
- goalie
- xG/shot quality
- 5v5 share
- special teams
- rest/travel

Soccer/UFC and other sports use their active Micks sport modules.

# E. Market-Expression Selector

For every underlying thesis, compare the reasonable ways to express it:
- ML vs spread/run line/puck line
- full game vs first half / first five
- side vs team total
- full-game total vs derivative total
- regulation vs To Advance
- player prop vs team/game derivative

Record:
- expected edge for each available expression
- variance
- dependency on bullpen/bench/late-game factors
- price sensitivity
- correlation with other open positions

The selected bet must be the best expression of the underlying edge, not merely the most familiar market.

# F. AI-v3 Historical Audit Feature Map

For every reconstructable historical AI-v3 selection, store:
- date
- sport
- game
- pick
- market family
- posted line
- posted odds
- stated units
- actual final score/result
- result verified Y/N
- displayed-result error Y/N
- posted-profit arithmetic verified Y/N
- opener
- close
- CLV direction/magnitude
- ticket percentage
- handle percentage
- high-limit/reference move
- liquidity class
- Micks reconstructed fair probability/line
- independent model 1 probability/line
- independent model 2 probability/line
- market dislocation
- fundamental edge category
- market regime label
- likely trigger tags
- win/loss/push

Trigger tags include:
- UNDERLYING_METRICS_VS_SURFACE
- REPUTATION_PRICE_DISLOCATION
- REVERSE_LINE_MOVEMENT
- HANDLE_TICKET_DIVERGENCE
- HIGH_LIMIT_CONFIRMATION
- STEAM
- BUYBACK_RESISTANCE
- PLUS_MONEY_VALUE
- DERIVATIVE_EXPRESSION
- FAVORITE_PRICE_VALUE
- TOTAL_PROJECTION_GAP
- ROLE_OR_INJURY_INFORMATION
- SCHEDULE_REST
- OTHER

Unknown features stay UNKNOWN; never backfill a plausible explanation as fact.

# G. Winner-vs-Loser Pattern Test

No trigger earns permanent weight because it appears on winners alone.

For each trigger calculate separately:
- frequency among verified winners
- frequency among verified losses
- win rate when trigger present
- win rate when trigger absent
- average CLV when trigger present
- sample size
- sport/market-family breakdown

A candidate signal becomes eligible for additional Micks weight only when:
1. sample size is meaningful,
2. it appears materially more often or performs materially better among winners than losses,
3. the pattern survives at least one sport/market-family split or out-of-sample period,
4. it is not simply duplicate evidence from another feature.

Do not optimize weights to maximize the historical Doc's sample. Prospective Micks performance is the real test.

# H. Benchmark Audit Rules

The Doc's table is not assumed error-free. Separately verify:
- final score
- W/L/P grading
- listed sport/market
- stated units
- dollar P/L arithmetic

Known table-quality issues already observed include sport-label mismatches, occasional displayed-score errors, and unit/dollar inconsistencies. Therefore benchmark record fields must have verification flags before they are used for model training.

The published headline record/profit is not used as ground truth until independently recalculated from verified rows.

# I. Replica Score

Experimental Market AI score: 100 points.

- Independent fair-line strength: 25
- Market dislocation / EV: 20
- Fundamental confirmation: 15
- Market microstructure: 15
- Independent calculated-model agreement: 10
- Market-expression advantage: 5
- Market regime quality: 5
- Failure-case robustness: 5

Suggested experimental interpretation:
- 85+: strong replica candidate; still must pass normal Micks release gates
- 78-84: watch/research; may become official only when standard framework also clears
- 70-77: watchlist
- <70: pass

The replica score is an experimental comparison score and does not override the official Micks 110-point framework until prospective evidence supports doing so.

# J. Prospective Shadow Testing

For every future full Micks scan:
1. Score the normal card using the official Micks framework.
2. Independently assign Market AI Replica scores to serious candidates.
3. Record candidates the replica would choose, including PASS days.
4. Do not increase stake solely because the replica agrees.
5. Track result and CLV of replica-qualified candidates whether or not officially released.
6. Review after 20, 50, and 100 shadow candidates.

Promote replica-derived weighting into the official framework only if it improves out-of-sample CLV and/or risk-adjusted results rather than merely fitting the historical AI-v3 sample.

# K. Pass Discipline

A PASS is a valid model output.

No sport must produce a daily bet. No daily card must contain a minimum number of plays. The model should prefer zero positions to marginal positions below the required probability, price, failure-case, or market-quality gates.
