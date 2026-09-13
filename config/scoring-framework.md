# Micks Picks Scoring Framework

Effective: 2026-09-13

## Purpose

This file is the persisted decision framework for daily Micks Picks candidate scoring. Every candidate — full-game sides/totals, derivatives, NRFI/YRFI, and player props — must be evaluated through the same core framework, with market-specific modules layered on top. The goal is to maximize expected unit return, not card size.

## Core Score — 110 Points

### 1. Matchup Edge — 0 to 20
Measures the underlying sports edge before price.

### 2. Market / Price Value — 0 to 20
Measures whether the available number preserves expected value. Price-decay rule: if a plus-money play loses 15-20 cents or more from the number that created the original edge, fully rescore.

### 3. Form / Splits / Situational Fit — 0 to 15
Includes recent form, opponent-specific splits, home/away, handedness, rest, travel, pace, park, weather, surface, and schedule context.

### 4. Availability / Role Certainty — 0 to 15
Includes injuries, lineup certainty, minutes, starting status, usage, bullpen availability, rotation role, workload and NFL quarterback availability.

### 5. Independent Confirmation — 0 to 10
Use VSiN, Doc's Sports, TeamRankings, StatMuse, Silver Bulletin ELWAY/QBERT for NFL, credible articles, beat reports, official injury reports, lineup sources, and other independent inputs. Agreement alone does not earn full points; the reasoning must independently support the same handicap.

### 6. Market Structure / Failure-Path Quality — 0 to 15
Measures whether the chosen market isolates the actual edge and avoids fragile assumptions. Every official candidate receives a separate 0-10 failure-case score.

### 7. Correlation / Portfolio Fit — 0 to 5
Penalize multiple plays relying on the same fragile game script, player role, offensive environment, injury assumption, or analytical thesis.

### 8. Execution / Information Quality — 0 to 10
Includes confirmed lineups, weather, starting players, injury reports, market availability, and timing quality.

## Standard Grade Thresholds
- A+: 94-110
- A: 88-93
- A-: 82-87
- B+: 75-81
- B: 69-74
- B-: 64-68
- C: 58-63
- Below 58: PASS

## Recovery Mode — ACTIVE
A-range releases remain suspended. B+ maximum 0.75u; B 0.50u; B- 0.25u. Normal daily exposure cap 1.50u, exceptional cap 2.00u. Maximum 3 standard straights. Every B+ candidate requires three independent evidence paths.

## Market-Specific Modules
All prior MLB, WNBA/NBA, derivative, NRFI/YRFI and player-prop requirements remain active, including recent-form, opportunity, workload, lineup, price, market-family and failure-path checks.

## NFL — ELWAY / QBERT Module
Silver Bulletin's ELWAY and QBERT are mandatory NFL model inputs when current data are available.

### ELWAY checks
For every NFL side, total, derivative or futures candidate, capture where available:
- ELWAY projected win probability
- projected margin / implied fair spread
- projected score or total
- offensive and defensive efficiency/team ratings
- schedule-strength effects
- roster-strength versus performance-rating differences
- injury adjustments
- home-field and situational adjustments
- ELWAY playoff/Super Bowl probabilities for futures
- difference between ELWAY fair price and current market price

ELWAY is a calculated independent model, not an automatic betting signal. Its 2026 architecture emphasizes efficiency per drive, rolling team quality, roster movement, injuries and QBERT quarterback value. A disagreement with the market must be quantified before it earns Market/Price credit.

### QBERT checks
For every NFL candidate materially affected by quarterback play, capture where available:
- current QBERT rating
- projected next-start QBERT rating
- QB depth-chart / injury status
- QB point-spread value or replacement impact
- passing and rushing components
- opponent/conditions adjustment
- modeled injury risk

QBERT must not be double-counted with ELWAY. Because QBERT feeds into ELWAY, QBERT is primarily used to explain/validate the quarterback component of an ELWAY projection, identify late QB-status changes, and compare quarterback-specific disagreement with other models. ELWAY + QBERT normally count as one model family for Independent Confirmation unless the evidence being credited is demonstrably independent of ELWAY's incorporated QB input.

### NFL model-dislocation rules
- Calculate ELWAY fair spread/ML/total versus the executable market.
- A small disagreement is informational only; do not manufacture an edge from normal model noise.
- Prefer candidates where ELWAY disagreement is also supported by at least one independent non-Silver-Bulletin model/data path plus matchup/availability evidence.
- Explicitly flag conflicts between ELWAY and VSiN/market consensus rather than averaging them away.
- Recheck late injuries and weather because ELWAY/QBERT are periodically updated and may lag late-breaking information.
- For futures, compare ELWAY playoff/division/conference/Super Bowl probability with de-vigged market probability and calculate expected value before release.

### Silver Bulletin source pages
- ELWAY projections: https://www.natesilver.net/p/2026-elway-nfl-ratings-projections-playoff-odds
- ELWAY methodology: https://www.natesilver.net/p/how-our-elway-forecasts-work-methodology
- ELWAY vs. Vegas / Model Talk: https://www.natesilver.net/p/inside-elways-2026-nfl-forecast
- QBERT ratings: https://www.natesilver.net/p/qbert-2026-nfl-quarterback-ratings

## Source Framework
Daily research should include, where applicable:
- all user-supplied research URLs
- Circa numbers / market reference
- VSiN model and market scan
- Doc's Sports free-pick/statistics/video scan
- TeamRankings
- StatMuse
- credible article sources
- official league/team injury reports
- credentialed beat reporters
- reliable lineup/news sources
- weather and venue context
- **Silver Bulletin ELWAY + QBERT for every NFL full scan, rerun and futures scan when current model data are available**

No single source can make a play B+ during Recovery Mode or A-range after Recovery Mode. Silver Bulletin is an additional calculated model family, not a substitute for market validation or independent evidence.

## Daily Workflow
1. Pull current market numbers.
2. Check every user-supplied research URL.
3. Scan VSiN and relevant tools/analyzers.
4. Scan Doc's Sports free picks, statistics and videos.
5. Scan TeamRankings matchup, efficiency and split pages.
6. Pull StatMuse and credible article support.
7. **For NFL, pull current ELWAY projections and QBERT ratings; quantify model-vs-market spread/ML/total/futures gaps and QB impact.**
8. Check injuries, lineups/depth charts, weather, starters, workload, role, and recent form.
9. Build candidate pool across sides, totals, derivatives, NRFI/YRFI, props and futures where requested.
10. Score every candidate through the 110-point framework and relevant module.
11. Assign the mandatory 0-10 failure-case score.
12. Apply hard stops, recency overrides, market-family penalties and correlation penalties.
13. Verify B+ candidates have three independent evidence paths during Recovery Mode.
14. Rank by expected value and execution quality.
15. Release only candidates that clear threshold; do not force a Top 5.
16. Display the scored candidate chart/table on every full run or rerun.
17. After settlement, grade, archive, update rolling performance, and modify the framework only when a recurring process error is identified.
