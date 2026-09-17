# Micks Picks Master Source Registry

Status: Permanent controlling source registry
Effective date: 2026-08-23
Applies to: Every full all-sports Micks Picks scan, rerun, candidate build, props scan, NRFI/YRFI scan, market refresh, and pre-publication validation.

## Governing Rule

This file is the canonical research-source checklist for Micks Picks. A full scan is not complete until every applicable required source below has been checked, marked stale/inaccessible, or documented as not applicable to the active sport/market.

No source creates a bet by itself. Micks Picks remains Micks-first. Sources confirm, challenge, downgrade, or invalidate a handicap.

If another file in `micks-framework/current/` names a source that is not listed here, add it here before the next full scan. This registry is cumulative across the current framework and historical modules; do not silently drop a source because it was omitted from a condensed framework file.

## Scan Status Labels

For every source used in a full run, internally classify it as one of:

- CURRENT — current-date data available and checked
- STALE — source checked but data is not current enough to score
- INACCESSIBLE — source or specific tool could not be accessed
- NOT APPLICABLE — source does not apply to today's active sport/market
- SUPPORTING ONLY — useful context but not eligible to create independent confirmation by itself

Never invent data for a source marked STALE or INACCESSIBLE.

---

# 1. Market Board, Odds, Line Movement and Betting Splits

## VSiN — mandatory every full scan

- Main: https://vsin.com/
- Vegas Betting Sheets / Circa: https://vsin.com/tools/vegas-betting-sheets/
- Daily sport analysis pages for all active sports
- Betting splits
- Matchup ratings
- Power ratings
- MLB YRFI/NRFI tools
- MLB First Five tools
- Player prop tools / projections
- Team analyzers when available
- JOLT/VOLT or equivalent current model/edge tools when available

Required checks:
- current Circa line
- opening/current movement
- full-game and derivative prices
- ticket percentage
- handle percentage
- public-versus-respected-money gaps
- line movement relative to splits

## Circa Sports

Use current Circa numbers obtained through the VSiN Vegas Betting Sheets or other verified Circa market source when available.

Required fields for official candidates:
- opening line
- current line
- relevant derivative
- best number
- no-bet cutoff

## Action Network

- https://www.actionnetwork.com/

Use for:
- current odds/market comparison
- injuries/news when current
- public betting and market movement when explicitly sourced
- consensus context

## Covers

- https://www.covers.com/

Use for:
- current matchup pages
- odds/line movement
- injuries
- trends only as secondary context
- consensus/public-market context when verifiable

## Sportsbook / user screenshots

User-provided current book screenshots are primary execution evidence for the actual bettable number. Compare them against market-reference sources before release.

## Micks 2.0 Market Intelligence — mandatory for serious official candidates

Use `market-intelligence-layer.md` as the controlling module.

For every serious candidate, record when available:
- opening line / price
- current line / price
- best executable line / price
- ticket percentage
- handle / money percentage
- Circa or another high-limit reference
- market family and liquidity class
- timing of material line moves
- known injury, lineup, weather, starter, goalie, or role news that explains movement
- whether the market confirms or contradicts the independent Micks handicap

The Market Intelligence Score is 20 points maximum:
- sharp / respected movement: 0–6
- ticket / handle divergence: 0–5
- liquidity / market quality: 0–4
- movement timing / reversal quality: 0–5

Unavailable or unverified data scores zero. Ticket percentage alone is not sharp-money evidence. A line move alone is not proof of respected action. Do not double-count one market event through multiple sources.

---

# 2. Cross-Sport Statistical and News Validation

## TeamRankings — mandatory when sport is supported

- https://www.teamrankings.com/
- https://www2.teamrankings.com/

Use for:
- matchup statistics
- efficiency
- recent splits
- home/away splits
- scoring margins
- offensive/defensive rates
- ATS/cover performance when available
- close-game performance
- sport-specific rankings

## StatMuse — mandatory where useful

- https://www.statmuse.com/

Use for:
- last 5/10/15/20 form
- player/team splits
- threshold hit-rate validation
- recent scoring/rebounding/assist/strikeout production
- direct comparison questions

Do not use a raw StatMuse average without distribution/threshold context when grading props.

## Sports Reference network — mandatory when sport is supported

- Main: https://www.sports-reference.com/
- Baseball Reference: https://www.baseball-reference.com/
- Basketball Reference: https://www.basketball-reference.com/
- Pro Football Reference: https://www.pro-football-reference.com/
- Hockey Reference: https://www.hockey-reference.com/
- FBref: https://fbref.com/
- College Football Reference: https://www.sports-reference.com/cfb/
- College Basketball Reference: https://www.sports-reference.com/cbb/
- Stathead: https://www.sports-reference.com/stathead/

Use for:
- current and historical player/team game logs
- season and career statistics
- home/away and situational splits
- schedule/result and box-score verification
- historical matchup and threshold context
- advanced statistics where available
- WNBA/NBA player and team history through Basketball Reference
- NFL player/team history through Pro Football Reference
- NHL player/team history through Hockey Reference
- soccer player/team/competition statistics through FBref
- college football/basketball historical validation

Rules:
- Treat Sports Reference as statistical/historical verification, not a betting-market or line-movement source.
- Prefer current official league/team sources for same-day injury, lineup, starter, rotation, game-status, and transaction confirmation.
- Do not let historical head-to-head records override current personnel, role, market, or matchup evidence.
- Use threshold distributions/game logs rather than raw averages when evaluating player props whenever possible.
- Stathead may be used for deeper historical queries when accessible.

## ESPN

- https://www.espn.com/

Use for:
- schedules
- box scores
- injuries
- depth charts / lineups when current
- standings and official-stat cross-checks

## Opta / The Analyst

- https://theanalyst.com/

Use for:
- advanced soccer/football analytics
- possession, expected-goals and efficiency context
- tournament and team-strength context where applicable

## NY Post Sports

- https://nypost.com/sports/

Use as a current article/beat-information source when the article is directly relevant. It is not a model or primary statistical authority.

## Credible current articles and credentialed beat reporters

Required when injuries, rotations, minutes, pitcher workload, quarterback usage, goalie status, rest/shutdown risk, or coaching comments materially affect the handicap.

Official team/league reporting outranks rumor aggregation.

---

# 3. Doc's Sports — mandatory exact URLs supplied by user

- Main / Free Picks: https://www.docsports.com/#freepicks
- Match statistics: https://www.docsports.com/statistics/matches.html
- Free-pick videos: https://www.docsports.com/video/free-picks/
- AI-v3 dynamic handicapper page: https://www.docsports.com/cappers.html?cap_id=88

Rules:
- Check all four on every full scan.
- Treat the AI-v3 page as dynamic current-state content; never assume yesterday's selection remains current.
- If an individual page is stale, mark it STALE and award zero confirmation points.
- A Doc's opinion is supporting confirmation only.
- AI-v3 marketing claims, historical-profit claims, or model descriptions do not earn score points.
- When AI-v3 has a current relevant selection, record agreement/disagreement with Micks and use it only as supporting confirmation.
- Do not infer a pick from a video title when the actual selection is not visible.

---

# 4. MLB Primary Research Stack — mandatory for MLB candidates

## Baseball Savant / Statcast

- https://baseballsavant.mlb.com/

Use for:
- pitch velocity
- pitch mix
- whiff rate
- chase rate
- called-strike + whiff indicators
- barrel rate
- hard-hit rate
- expected statistics
- batted-ball quality
- pitcher movement / arsenal changes
- batter platoon and pitch-type vulnerabilities

## FanGraphs

- https://www.fangraphs.com/

Use for:
- wRC+
- K% / BB%
- FIP / xFIP
- WAR context
- bullpen performance
- splits
- plate-discipline metrics
- pitching workload/context

## Baseball Reference

- https://www.baseball-reference.com/

Use for:
- game logs
- historical splits
- starter usage
- batting/pitching summaries
- park and team context
- schedule/result verification

Baseball Reference is also part of the mandatory cross-sport Sports Reference network above; this MLB section defines its baseball-specific use.

## Umpire Scorecards — mandatory for umpire-sensitive MLB markets

- https://umpscorecards.com/

Check when an umpire assignment is available, especially for:
- NRFI/YRFI
- game totals
- First Five totals
- pitcher strikeout props
- pitcher walk props
- borderline command/contact handicaps

Track where available:
- called-strike accuracy
- expected/actual run impact
- consistency
- zone tendency
- historical hitter/pitcher lean

Umpire data is a supporting adjustment, not a standalone bet signal. If the assignment is not confirmed, do not assume an umpire.

## MLB official / lineup and probable-pitcher sources

- https://www.mlb.com/

Use for:
- probable pitchers
- confirmed lineups when posted
- injuries/transactions
- game status

Reliable lineup/beat sources may supplement MLB.com when they are faster, but official confirmation takes priority.

## MLB weather and park context

- https://www.weather.gov/

Mandatory checks for outdoor MLB games:
- temperature
- wind speed/direction
- precipitation/delay risk
- humidity when material
- roof/open-air status where relevant

Park factor must be considered for totals, team totals, HR props, and YRFI/NRFI.

## Bullpen availability — mandatory

For every MLB side/total/team-total/F5-to-full-game comparison, check:
- bullpen innings over the prior 2 days
- closer/high-leverage usage
- back-to-back availability
- recent bullpen performance
- likely bridge relievers

FanGraphs, Baseball Reference, MLB game logs, and current team reporting may be used together.

## MLB market-family requirements

### NRFI/YRFI
Mandatory source categories:
- VSiN YRFI/NRFI tool when available
- Umpire Scorecards when assignment confirmed
- Baseball Savant starter command/whiff data
- top-of-order recent form and platoon splits
- park/weather
- current price

### Pitcher strikeout props
Mandatory source categories:
- Baseball Savant pitch/whiff data
- FanGraphs K%/BB% and opponent K profile
- StatMuse recent strikeout distribution
- confirmed lineup
- pitch count/leash reporting
- umpire when confirmed and material
- current prop price

### Team totals
Mandatory source categories:
- recent offense last 5/10/15
- threshold hit rate last 10/20
- Baseball Savant contact quality
- FanGraphs offense/platoon metrics
- opposing starter pitch traits
- bullpen availability
- park/weather
- current number/price

---

# 5. NFL / Football Sources

Load `nfl-2026-reference-module.md` plus `nfl-post-week1-reconciliation.md` before scoring an NFL market.

## Stored VSiN NFL Betting Guide

Use as a preseason/season baseline only. Current injuries, depth charts, usage and efficiency override guide assumptions.

Record the applicable power-rating, scheme, schedule, regression or market-strategy prior and mark it `CONFIRMED`, `PARTIALLY CURRENT`, `STALE` or `OVERRIDDEN`.

## Current VSiN NFL layer — mandatory

Check when accessible and applicable:

- NFL game projections and matchup ratings
- Makinen power ratings
- NFL injury report
- NFL prop projections / prop analyzer
- WR/CB matchup tool
- Week 2+ betting systems and current betting splits
- Vegas Betting Sheets / Circa numbers

The guide, current VSiN models, systems and articles are one source family. They do not count as multiple independent confirmations.

## Stored Fantasy Life Fantasy Football 2026 magazine

Use as the preseason baseline for projected plays, dropback rate, scoring environment, offensive-line grade, depth chart, player projection, routes/targets/carries and high-value role.

## Current Fantasy Life weekly layer — mandatory

- https://www.fantasylife.com/

Check and timestamp when accessible and applicable:

- weekly projections and rankings
- Utilization Report
- snap counts and air-yards data
- game-by-game analysis
- role upgrades/downgrades
- betting game model and player-prop tools

For every material change, record the magazine projection, current projection, delta and reason. The magazine and all current Fantasy Life pages are one source family.

## NFL official

- https://www.nfl.com/

Use for:
- schedules
- inactives
- injury information
- depth-chart context
- official game status

## Required NFL data categories

For sides/totals/props, obtain current data for:
- neutral-script pass rate / pass rate over expectation
- pace, plays, drives and seconds per snap
- EPA
- success rate
- yards per play
- pressure/sack rate
- explosive-play rate
- points per drive
- third-down efficiency
- red-zone efficiency
- neutral-script pass rate / pace
- offensive-line health
- offensive-line combinations and defensive rotations
- snap share
- route share
- carries/targets
- target share, first-read share and air-yard share
- two-minute, third-down, short-yardage and goal-line role
- red-zone role
- current weather
- ticket/handle splits and line movement

DraftKings-style ticket data may be used as a public-position indicator when verifiable. Circa handle/ticket gaps are preferred high-limit context when available.

## Mandatory NFL cross-reference before scoring

Every serious candidate must show:

1. VSiN guide prior.
2. Fantasy Life magazine prior.
3. Verified Week 1/current-season role and efficiency.
4. Current Fantasy Life projection/ranking/utilization update.
5. Current VSiN model/system position.
6. Updated independent Micks fair line/projection.
7. Exact executable market price, Best Number and No-Bet Cutoff.
8. Strongest agreement, strongest contradiction and guide-status label.

Do not score from fantasy points, final score or one explosive play. Early-season opportunity metrics receive more weight than one-game touchdowns or efficiency. Use the blending matrix and sample-quality exceptions in `nfl-post-week1-reconciliation.md`.

An unresolved material contradiction caps the candidate at 81/110. If the stored guide, current weekly projection or required current data is unavailable, disclose it and reduce confidence; the scan may not be labeled complete as though the lane had been checked.

---

# 6. NBA / WNBA / Basketball Sources

Mandatory source categories:
- VSiN current matchup/model pages
- TeamRankings
- StatMuse
- Basketball Reference / Sports Reference network
- official league/team injury reports
- current beat reporting
- confirmed starters / projected rotations
- current sportsbook line

Required metrics where applicable:
- pace / possessions
- offensive/defensive efficiency
- points per game / opponent points
- scoring margin
- rebounding
- assists/turnovers
- recent 5/10 form
- home/away splits
- minutes/usage
- potential assists / rebound chances where available
- foul trouble / matchup role risk

WNBA expansion-team and roster-volatility context must be explicitly checked.

---

# 7. NHL Sources

## MoneyPuck

- https://moneypuck.com/

## Natural Stat Trick

- https://www.naturalstattrick.com/

## Evolving-Hockey

- https://evolving-hockey.com/

## TeamRankings NHL

- https://www.teamrankings.com/nhl/

## Hockey Reference / Sports Reference

- https://www.hockey-reference.com/

Use for historical game logs, player/team splits, schedules/results, and statistical verification.

Mandatory NHL checks:
- confirmed goalie
- injuries
- expected goals / shot quality
- five-on-five play
- special teams
- rest/travel
- current price

---

# 8. Soccer Sources

Use where applicable:
- Opta / The Analyst: https://theanalyst.com/
- FBref / Sports Reference: https://fbref.com/
- ESPN: https://www.espn.com/
- current league/team injury and lineup sources
- current odds / VSiN when available

Required checks:
- xG / chance quality
- lineup and goalkeeper
- rest/travel
- tournament format / To Advance structure
- home/away context
- current price

---

# 9. UFC / Boxing Sources

Mandatory checks:
- fight still active
- official weigh-ins
- current odds and movement
- opponent/style matchup
- credible current reporting

No weigh-in or bout-status uncertainty can be ignored for an official release.

---

# 10. Tennis Sources

Pilot market. Use:
- current odds
- surface results / surface Elo when available
- hold/break percentages
- fatigue / schedule
- injury reporting
- current draw/motivation context

Maximum grade/stake rules remain governed by the Tennis framework.

---

# 11. NASCAR / Motorsports Sources

Required checks:
- race status
- current odds
- starting position
- practice speed
- qualifying speed
- simulation/model support
- weather
- market type

No pre-race pick after the event starts.

---

# 12. Named Outside Handicappers / Supporting Sources Found in Framework

These may be checked when current and applicable, but never replace independent Micks analysis:

- Greg Peterson
- T Shoe
- VSiN editorial handicappers
- Doc's Sports handicappers
- Doc's Sports AI-v3
- Action Network analysts
- Covers analysts

Two articles repeating the same underlying argument count as one evidence path.

---

# 13. Perplexity / Research-Agent Role

Perplexity may be used to search and cite current data but does not handicap the card. The Micks framework determines the score, grade, units and release decision.

Research-agent output must be reconciled against primary sources before it earns independent-confirmation credit.

---

# 14. CLV Tracking — mandatory post-release diagnostic

For every official play when a reliable close can be obtained, record:
- release line / price
- closing line / price
- Beat Close / Neutral / Lost Close
- CLV magnitude when calculable
- closing-market source

CLV is not used to rewrite a settled result or retroactively change the grade. Review rolling CLV over 20, 50 and 100 official plays by sport, market family, grade and release timing.

---

# 15. Full Daily Scan Enforcement

Before a full Micks Picks run can be labeled COMPLETE:

1. Inventory every active sport on the current board.
2. Build the independent Micks handicap before consulting outside picks or market narratives.
3. Check VSiN main page and Vegas Betting Sheets/Circa.
4. Check all four required Doc's URLs, including the dynamic AI-v3 page.
5. Check TeamRankings for every supported active sport.
6. Check StatMuse where recent-form/player-distribution questions apply.
7. Check the applicable Sports Reference site for every supported active sport.
8. Check sport-specific primary sources from this registry.
9. Check injuries, lineups, pitchers, goalies, rotations and role changes.
10. Check weather/park/field conditions where relevant.
11. Check bullpen availability for MLB.
12. Check Umpire Scorecards for umpire-sensitive MLB markets when assignments are confirmed.
13. Check market splits, opening/current movement, liquidity, movement timing and exact executable price.
14. Score the Market Intelligence Layer out of 20 without double-counting signals.
15. Include props and NRFI/YRFI in the candidate pool before final ranking.
16. Apply the current Micks 110-point scoring framework, market-family penalties and failure-case score. Apply Recovery Mode+ to non-NFL candidates when active; NFL uses the standard operating rules in `nfl-post-week1-reconciliation`.
17. Record conflicts; do not average conflicting sources away.
18. Show the scored candidate chart/table on every full run/rerun.
19. If a required source is stale/inaccessible, state that explicitly and reduce confidence when material.
20. After settlement, capture CLV when a reliable close is available.
21. For every active NFL market, complete the Guide/System Reconciliation Table and Fantasy Projection Delta Board before scoring.

## Completion Standard

A scan is NOT complete merely because several websites were searched. Completion means every applicable source category in this registry was addressed for the active slate and market types under consideration.
