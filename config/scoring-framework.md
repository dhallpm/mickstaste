# Micks Picks Scoring Framework

Effective: 2026-08-20

## Purpose

This file is the persisted decision framework for daily Micks Picks candidate scoring. Every candidate — full-game sides/totals, derivatives, NRFI/YRFI, and player props — must be evaluated through the same core framework, with market-specific modules layered on top. The goal is to maximize expected unit return, not card size.

## Core Score — 110 Points

### 1. Matchup Edge — 0 to 20
Measures the underlying sports edge before price.
- 17-20: major structural edge supported by multiple independent indicators
- 13-16: clear edge with limited counter-signals
- 9-12: moderate edge
- 5-8: thin edge
- 0-4: no actionable edge

### 2. Market / Price Value — 0 to 20
Measures whether the available number preserves expected value.
- 17-20: materially better than fair/consensus or strong derivative price efficiency
- 13-16: playable number with clear value
- 9-12: modest edge after vig
- 5-8: stale or deteriorated number
- 0-4: bad number / chase

Price-decay rule: if a plus-money play loses 15-20 cents or more from the number that created the original edge, fully rescore. If the edge no longer clears threshold, PASS.

### 3. Form / Splits / Situational Fit — 0 to 15
Includes recent form, opponent-specific splits, home/away, handedness, rest, travel, pace, park, weather, surface, and schedule context where relevant.

RECENCY OVERRIDE: season-long strength cannot erase a meaningful current-form warning. For team scoring markets, explicitly check last 5/10/15 games, runs/points per game, frequency of failing the proposed threshold, quality of contact/shot creation, and performance against the relevant pitcher/defense archetype. If recent form materially contradicts the bet, Form/Splits is capped at 8/15 unless there is a specific, evidence-backed reason for an immediate rebound.

### 4. Availability / Role Certainty — 0 to 15
Includes injuries, lineup certainty, minutes, starting status, usage, bullpen availability, rotation role, and workload.

Returning-from-injury rule: first game back after missed time is capped at B+ unless unrestricted workload is affirmatively supported by credible pregame reporting and normal role evidence.

### 5. Independent Confirmation — 0 to 10
Use VSiN, Doc's Sports, TeamRankings, StatMuse, credible articles, beat reports, official injury reports, lineup sources, and other independent inputs.

Agreement alone does not earn full points. The reasoning must independently support the same handicap. Recommendation articles cannot substitute for primary statistical validation.

### 6. Market Structure / Failure-Path Quality — 0 to 15
Measures whether the chosen market isolates the actual edge and avoids fragile assumptions.
- Prefer derivatives only when they cleanly isolate the edge.
- Penalize markets that require extra outcomes not established by the handicap.
- Explicitly model the most plausible failure path before awarding 12+ points.

MANDATORY FAILURE-CASE SCORE: every official candidate receives a separate 0-10 failure-case score before release. This score is a gate and does not add to the 110-point total.
- 8-10: primary failure paths are low probability and directly addressed by the market structure
- 6-7: acceptable but meaningful counter-path remains
- 4-5: fragile; maximum B
- 0-3: PASS

The failure-case review must identify at least one credible way the bet loses even if the main handicap is directionally correct.

### 7. Correlation / Portfolio Fit — 0 to 5
Penalize multiple plays relying on the same fragile game script, player role, offensive environment, injury assumption, or analytical thesis.

### 8. Execution / Information Quality — 0 to 10
Includes confirmed lineups, weather, starting pitchers, injury reports, market availability, and timing quality.

## Standard Grade Thresholds

- A+: 94-110 — rare, exceptional edge
- A: 88-93
- A-: 82-87
- B+: 75-81
- B: 69-74
- B-: 64-68
- C: 58-63 — lean/watchlist/live/longshot only
- Below 58: PASS

## Recovery Mode — ACTIVE

Recovery Mode is active following the Aug. 17-19 drawdown. It overrides the standard grade/stake table until the exit condition is met.

### Recovery grading/staking
- A+, A and A- scores may still be displayed analytically, but **A-range releases are suspended**.
- Highest official release grade: **B+**.
- B+ stake: **0.75u maximum**.
- B stake: **0.50u maximum**.
- B- stake: **0.25u maximum**.
- C and below: no standard straight release.
- Normal daily exposure cap: **1.50u**.
- Exceptional daily exposure cap: **2.00u**, only with three distinct evidence paths per play and no material correlation.
- Maximum 3 standard straights while Recovery Mode is active.

### Recovery evidence requirement
Every B+ candidate must have at least **three independent evidence paths**:
1. primary matchup/statistical case;
2. independent current-data validation from a separate source or model;
3. market/price, situational, lineup, injury, weather, or role evidence that supports the same outcome.

Two articles repeating the same reasoning count as one evidence path, not two.

### Recovery exit condition
Recovery Mode stays active until at least 10 newly released official picks have been graded and that sample is both:
- net positive in units; and
- at least 55% wins on non-push decisions.

Do not remove Recovery Mode because of one good card.

## A-Range Hard Stops After Recovery

Even after Recovery Mode ends, A-range is prohibited with:
- unresolved injury/workload uncertainty
- materially deteriorated price
- single-source dependency
- weak lineup/weather confirmation where relevant
- fragile market structure where the handicap does not directly support the bet condition
- team-total or offensive Over with a material recent scoring slump that has not been independently explained/offset

## Market-Family Performance Penalty

Track rolling results by market family: full-game favorite/run line, F5, team total, full-game total, player prop type, WNBA spread, NRFI/YRFI, etc.

If a market family loses 3 consecutive official releases or is below 35% over its last 5+ official releases:
- subtract 5 points from new candidates in that family;
- maximum release grade is B;
- require three independent evidence paths;
- penalty remains until that family records either 2 consecutive wins or a 4-2-or-better six-pick sample.

Current penalty flags entering Aug. 20:
- MLB favorite/run-line style sides: penalty active.
- MLB team-total Overs: penalty active.
- WNBA projection-gap spreads: penalty active.

Do not apply the penalty to unrelated market families merely because the overall card is losing.

## Market-Specific Modules

### MLB Run Lines
A moneyline edge does not automatically justify -1.5.

Mandatory Margin Creation test:
- offensive separation potential
- opponent bullpen vulnerability
- favorite bullpen ability to protect margin
- low one-run-game risk
- park/weather scoring environment
- starting-pitching mismatch large enough to create early separation

If the handicap mainly proves 'favorite likely wins' but not 'favorite likely wins by 2+', downgrade or choose ML/F5/team total instead.

### MLB Team Totals / Offensive Overs
Opponent pitcher weakness is only one half of the handicap. A bad opposing ERA/FIP/WHIP does NOT by itself create an Over.

Mandatory checks:
- offense runs/game last 5, 10 and 15
- proposed total hit rate over those samples
- team wRC+/OPS or comparable production over recent sample
- top-of-order current form
- confirmed lineup quality and missing bats
- handedness/platoon matchup
- starter pitch mix, velocity, whiff and command — not ERA alone
- bullpen quality/availability behind the starter
- park/weather
- price versus estimated true probability

BAD-PITCHER FALLACY PENALTY: if the main case is simply 'opposing starter has a bad ERA/WHIP/FIP,' Market Structure cannot exceed 8/15 and the play cannot be A-range.

OFFENSIVE-SLUMP RULE: if the offense has scored 2 or fewer in at least 5 of its previous 10 games, or is materially below its season scoring baseline across the last 10-15, an Over/team-total Over is capped at B unless current lineup/contact-quality evidence strongly demonstrates the slump is misleading.

THRESHOLD HIT-RATE RULE: before releasing a team total, calculate how often the team has actually cleared the proposed number in its last 10 and 20. A candidate cannot receive 15+ Market/Price points without a positive threshold hit-rate/value case.

### MLB F5 / First-Half Derivatives
Use only when the early-game edge is specifically stronger than full-game exposure.

Mandatory checks:
- starting-pitcher edge
- opponent top-of-order quality
- first-five scoring profile
- tie risk when laying -0.5
- whether expensive F5 ML protection is worth the price

Do not treat derivative pricing as automatically superior; the half-run requirement must be independently justified.

### NRFI / YRFI
Score alongside sides, totals, and props before final Top 5 selection.

Mandatory checks:
- both starting pitchers' first-inning run rates and command
- opposing top 3-4 hitters
- platoon splits
- park factor
- weather/wind
- recent first-inning form
- umpire tendencies where reliably available
- price versus estimated true probability

### Player Props — General
Props must have a clear opportunity path.

Mandatory checks:
- projected minutes/plate appearances/snaps
- role and usage
- injury/workload certainty
- matchup-specific opportunity
- line versus season/recent distribution
- price
- teammate availability
- game-script sensitivity

Do not rely on raw averages alone.

### Assist Props
Mandatory checks:
- potential assists
- teammate shooting/finishing quality
- opponent ball pressure
- turnover risk
- blitz/double-team frequency
- expected on-ball role
- secondary creators sharing possession load

A high-touch role can create turnovers instead of assists; score both paths.

### Rebound Props
Mandatory checks:
- minutes certainty
- rebound chances
- opponent shot profile and expected misses
- player rebound share
- lineup size/spacing
- teammate rebound competition
- injury/conditioning status

### Strikeout Props
Mandatory checks:
- pitcher K rate / swinging-strike profile
- opponent strikeout rate and projected lineup
- pitch count / leash
- recent velocity and command
- umpire if material
- price versus threshold

Prefer skill-vs-opportunity props when the underlying event is directly controlled by the player and the threshold has a measurable distribution edge.

## Source Framework

Daily research should include, where applicable:
- all user-supplied research URLs
- Circa numbers / market reference
- VSiN model and market scan, including relevant analyzers/projections
- Doc's Sports free-pick/statistics/video scan
- **TeamRankings (teamrankings.com / www2.teamrankings.com)**
- StatMuse
- credible article sources
- official league/team injury reports
- credentialed beat reporters
- reliable lineup/news sources
- weather and park context

### TeamRankings scan requirements
Use TeamRankings as a primary statistical cross-check, not merely as an article source.

For MLB, check where available:
- matchup stats
- efficiency stats
- season vs recent splits
- home/away splits
- runs/game and run differential
- batting and pitching rates
- strikeout rates
- bullpen/run-prevention context
- close-game performance when relevant to ML/run-line decisions

For WNBA/NBA, check where available:
- points/game and opponent points/game
- average scoring margin
- pace/possession-related indicators
- rebounding
- assists/turnovers
- home/away and recent splits

For NFL/NCAAF/NCAAB and other supported sports, use the equivalent matchup, efficiency, scoring, margin, turnover, pace and split pages when available.

TeamRankings can confirm or contradict a thesis but does not automatically add points. If TeamRankings materially conflicts with VSiN/Doc's/StatMuse, document the conflict and reduce confidence until resolved.

No single source can make a play B+ during Recovery Mode or A-range after Recovery Mode. Every supplied URL and TeamRankings must be checked during a full daily scan; inaccessible/stale sources should be logged rather than silently skipped.

## Card Construction Rules

- Recovery Mode exposure cap: 1.50u normal / 2.00u exceptional
- Maximum 3 standard straights during Recovery Mode
- Maximum 3 props
- Maximum 1 parlay
- Maximum 3 longshots
- PASS aggressively rather than force volume
- Top 5 is a cap, not a quota
- Avoid multiple bets based on the same analytical thesis

## Review Rules From Aug 16-19, 2026

1. Do not overrate favorite superiority; choose the market that matches the proven edge.
2. First game back from injury cannot be A-range without affirmative workload evidence.
3. Assist props must price turnover and teammate-conversion risk.
4. Large line movement can invalidate an otherwise good handicap.
5. Derivatives are preferred only when they improve price without adding an unjustified condition.
6. Multiple correlated props from the same fragile offensive environment should be penalized.
7. Optimize for unit return, not number of releases.
8. Do not infer team-total value from a weak opposing starter alone.
9. Recent offensive form must be independently measured before any team-total Over.
10. Pitcher evaluation must include current stuff and underlying pitch traits.
11. Multiple team-total Overs require separately strong offensive-form cases.
12. A winning pick is not automatically evidence that its category deserves more weight.
13. Source/model agreement must be tested against a credible losing scenario before release.
14. When a market family repeatedly fails, reduce its score and stake instead of assuming variance will immediately reverse.

## Daily Workflow

1. Pull current market numbers.
2. Check every user-supplied research URL.
3. Scan VSiN and relevant tools/analyzers.
4. Scan Doc's Sports free picks, statistics and videos.
5. Scan TeamRankings matchup, efficiency and split pages for the candidate slate.
6. Pull StatMuse and credible article support.
7. Check injuries, lineups, weather, starting pitchers, minutes/workload, role, and recent team/player form.
8. Build candidate pool across sides, totals, derivatives, NRFI/YRFI, and props.
9. For MLB team totals, calculate last-10/20 threshold hit rates before scoring.
10. Score every candidate through the 110-point framework and relevant market-specific module.
11. Assign the mandatory 0-10 failure-case score.
12. Apply hard-stop rules, recency overrides, market-family penalties and correlation penalties.
13. Verify B+ candidates have three independent evidence paths during Recovery Mode.
14. Rank by expected value and execution quality.
15. Release only candidates that clear threshold; do not force a Top 5.
16. Display the scored candidate chart/table on every full run or rerun.
17. After settlement, grade, archive, update rolling market-family performance, and modify the framework only when a recurring process error is identified.
