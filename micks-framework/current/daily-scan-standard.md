# Standard command: Run Micks Picks for today's slate

Effective: 2026-09-18. Permanent, user-requested workflow.

The command **“run micks picks for today's slate”** (including capitalization, apostrophe and minor wording variants) means execute this entire workflow. It is an on-demand research command, not a recurring task and not a claim that monitoring is running.

## Start with the current state

1. Resolve the slate date in America/New_York unless Darren supplies a different date. Timestamp research and prices. Exclude completed games from pregame recommendations; label future-day positions separately.
2. Load `framework.md/.json`, `candidate-scoring-and-writeup-standard.md`, `source-registry.md`, `reference-guide-inventory.md`, `market-intelligence-layer.md/.json`, applicable sport modules, `progressive-knowledge.md/.json`, and recent recorded releases/results. Read the Market AI Replica, Futures Lab, Favorite Inflation, and active adjustment modules where applicable. Recover missing modules from the other Micks repository instead of silently omitting them.
3. Preserve the user's mode settings. NFL is in standard mode; Recovery Mode+ remains active for non-NFL daily candidates. Do not re-enable NFL recovery mode or disable another sport's mode without instruction.
4. Audit what was actually released, what was actually bet, and what was only watched. A screenshot of available odds is not a wager receipt. A missed price is not a loss, win, or push in the betting ledger.

## Inventory and research every applicable lane

Build a dated sport/event inventory before selecting picks. Include MLB, NFL, college football/basketball, NBA/WNBA, NHL, soccer, tennis, golf, motorsports, CFL/UFL, UFC/DWCS/boxing and other markets actually on the available board. Classify each lane as active, no scheduled event, already started/closed, or coverage unavailable. An empty or failed API is not proof of no events; cross-check a league source when needed. Never claim worldwide completeness from a limited league list.

Address Master Picks, Props Lab, first-half/first-five/team-total and other derivatives, NRFI/YRFI, Futures Lab, Lotto Parlays, Longshots, watch/live-only candidates, passes and Pick of the Day. Empty sections are valid outputs.

Use the cumulative source registry, including:

- VSiN main, current analysis, models/ratings, Circa sheets, opening/current prices, ticket/handle splits, props, F5, first-inning tools and JOLT/VOLT where applicable.
- All four required Doc's URLs: main/free picks, statistics, videos and AI-v3. Also check the three legacy free-pick listing pages. Record the actual selection; titles and marketing claims earn no confirmation.
- Action Network, Covers, TeamRankings, StatMuse and the applicable Sports Reference sites.
- Primary league/team injury, lineup, roster, starter, goalie, rotation and game-status evidence; current beat reporting when material.
- MLB: Savant, FanGraphs, pitcher command/velocity/whiffs, opponent contact/K profile, probable and confirmed starters, batting orders, last two days of individual relief usage (three where obtainable), availability uncertainty, umpire assignment/profile, park/weather/roof, pitch count and leash.
- Basketball: minutes, usage, role, pace, efficiency, travel/rest, injury timing, expansion-team volatility and recent cover margins.
- Football: QB/OL health, pace/pass rate, pressure, efficiency, explosive plays, role/opportunity and weather. NFL adds the mandatory guide reconciliation below.
- Soccer: xG, starting XI/goalkeeper, fixture congestion and exact market/settlement; tennis: surface, hold/break, fatigue and match status; combat: active bout and weigh-in confirmation; motorsports: entry, practice/qualifying, starting position and race status.

Log source URL/file, event date, publication/as-of time if available, retrieval time, observed facts and status: CURRENT, STALE, INACCESSIBLE, NOT APPLICABLE or SUPPORTING ONLY. A successful HTTP response, blank interactive table or subscription heading is not verified data. Try a lawful accessible alternative for a material gap; never bypass access controls. Distinguish source coverage from candidate verification and disclose unresolved gaps.

## Cross-reference all applicable guides and systems

Find originals using `reference-guide-inventory.md`, including the persistent Reference Guides folder. Read relevant pages, not just a prior summary. Inventory newly supplied guides and preserve dated provenance. Mark guides unrelated to the day's sport NOT APPLICABLE; do not fabricate a baseball or college guide because only NFL publications were supplied.

For every NFL candidate from Week 2 onward, produce the Guide/System Reconciliation Table and Fantasy Projection Delta Board in `nfl-post-week1-reconciliation.md/.json`: VSiN guide prior, Fantasy Life magazine prior, current role/efficiency, current Fantasy Life weekly projection/utilization, current VSiN system/model, updated independent Micks projection, exact price and strongest contradiction. Compare like units and time horizons; annual targets are not a weekly target forecast. Apply the existing staged role-versus-efficiency weights. Current verified health/role overrides stale priors. Missing numeric inputs stay unknown.

Systems require an exact rule, sample period/size, market, price assumptions and plausible mechanism. Do not shop for a favorable historical trend. VSiN publications are one family; Fantasy Life publications are one family. Repeated reporting of one fact is one evidence path.

## Build and score the card

1. Form and record the independent Micks hypothesis and reproducible fair-number estimate from fundamentals before reading outside selections or market narratives. Retain the initial snapshot. If an outside selection was already encountered, disclose that; do not backdate an independent prediction or relabel an outside model as Micks.
2. Verify the matchup, player opportunity and failure paths. Compare alternative market expressions instead of automatically stacking a side, prop and parlay.
3. Check exact current prices and movement, then outside confirmation. Book/date/market/line/odds must match. Different articles' prices are not a verified opening-to-current series. Record benchmark prices separately from executable user-book quotes and from genuine closing prices.
4. Apply all 110-point factors with evidence beside each. Unsupported inputs receive zero, and essential unverified inputs block release. An incomplete evidence subtotal is not a calibrated win probability. Do not invent a fair line, EV, grade or price cutoff to fill the table.
5. Run Progressive Fade and Favorite Inflation: distinct SU versus ATS/run-line 5/10/20 windows, comparable line bands, margin versus closing expectations, rest/travel, current role changes and reset conditions. Missing closing data cannot establish or clear an alert.
6. Apply Market Intelligence (6/5/4/5) without double-counting. Ordinary line movement does not establish sharp action. Run the 100-point Market AI Replica in shadow only; it does not replace the official framework.
7. Apply Failure Score, sport caps, units, correlation and card limits. Non-NFL recovery releases require 82/110 and Failure Score 7/10. NFL follows the existing standard-mode gate. Futures use their separate 100-point model/EV/portfolio gates.
8. Recheck news and current price before release. Every release needs a justified Best Number, playable range and no-bet cutoff. For a blocked candidate, use “not established—no bet until regraded” instead of implying that a better price alone authorizes a bet.

## Required output every run

- Date/time, scope, source/guide coverage and material verification gaps.
- Scored candidate chart: sport, game, exact market and price, book, score/grade, Failure Score, units, disposition and reasons.
- Official releases and total exposure, or explicit **NO BET**. No A-grade found when applicable. No forced Pick of the Day.
- Player-specific matchup analysis, expected winning game script, strongest failure path, price sensitivity and why a candidate is official/watch/pass. Use the tiered writeup lengths in the controlling scoring standard for releases; avoid filler on passes.
- First alternates and exact remaining verification/price requirements, added/removed picks and explanations.
- Explicit disposition for props, derivatives, NRFI/YRFI, futures, parlays and longshots. Keep future cards and TBD-unit tickets distinct from today's executable exposure.
- Dated report, source audit and machine-readable candidate record in `micks-framework/runs/YYYY-MM-DD/`. Produce section import payloads plus a complete payload using existing schemas; only official, approved releases belong in active import records.

Publishing to a website follows existing session authorization and the live endpoint validation workflow. The standard command itself does not mean a bet was placed or an alert was scheduled. A report-only run must not silently replace the active website card.

## Progressive knowledge after each run

Use `progressive-knowledge.md/.json`. Freeze release odds, units, grade and reasoning. Append verified results/CLV and classify process errors separately from ordinary variance. Review 20/50/100 official plays by sport, market, grade and timing; report actual sample counts and missing data. Prefer prospective shadow evaluation before changing model weights. Never rewrite earlier grades, count an unplayed selection, increase stakes to recover losses, or make a permanent tactical rule from one result.
