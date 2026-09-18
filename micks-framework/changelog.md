# Micks Picks Framework Changelog

## 2026-09-18 — Standard daily command and progressive knowledge

- Made “run micks picks for today's slate” the full, on-demand all-sports workflow with all market lanes, guide/current-data reconciliation, scoring, player/game-script analysis and source audit.
- Added persistent markdown/JSON command configuration and a progressive-knowledge ledger; retained scoring weights, NFL standard mode and non-NFL Recovery Mode+.
- Located both original NFL guide PDFs, corrected their retrieval inventory, and kept their season priors distinct from current weekly projections.
- Preserved the Sparks odds-based pass as an unplayed 0u item outside betting W/L and ROI.
- Aligned JSON writeup targets with the existing controlling premium-writeup standard.
- Saved September 18 research, explicit data gaps, candidate diagnostics and empty official import payloads; did not replace the active website card.


## 2026-09-17 — NFL returned to standard operating mode

- Removed Recovery Mode+ from NFL candidates only; Recovery Mode+ remains active for non-NFL daily-card candidates unless separately disabled.
- Re-enabled the full NFL grade ladder, including A-range releases, and restored the normal card limits of four official straight bets, three official props and one main parlay.
- Set the normal NFL official-release floor at B (74/110), with a fully verified B- limited to 0.25u or less.
- Retained mandatory Failure Score and strongest-failure-path analysis without the Recovery Mode+ 7/10 hard gate.
- Retained all post-Week 1 guide/system reconciliation, source-family deduplication, price discipline, player/game-script requirements and no-forced-play rules.
- Made unresolved material guide/current-data contradictions `WATCH/PASS` until resolved.

## 2026-09-17
- Added and synchronized the permanent NFL post-Week 1 reconciliation module across the public and VIP framework repositories.
- Made the stored VSiN 2026 NFL guide and Fantasy Life Fantasy Football 2026 magazine explicit preseason priors that must be checked against current usage, injuries, weekly projections and prices before scoring.
- Added Fantasy Life weekly projections, rankings, Utilization Report, snap counts, air yards and game analysis as a mandatory current prediction layer.
- Added current VSiN game/prop projections, power ratings, injury tools, WR/CB matchups, systems and splits as a mandatory current layer.
- Added guide-status labels, publisher-family deduplication, Week 2–4 data-class blending, Week 1 power-rating controls, trench emphasis and opportunity-first prop recalculation.
- Added the Guide/System Reconciliation Table and Fantasy Projection Delta Board to every full NFL scan.
- Preserved Recovery Mode+: minimum 82/110, Failure Score at least 7/10, maximum 1–2 official plays and no forced releases.
- Added an 81/110 cap when a material guide/current-data contradiction remains unresolved.
- Replaced the stale public 100-point candidate standard with the controlling 110-point standard and synchronized the current source registry and scan prompt.

## 2026-05-19
- Created permanent GitHub framework knowledge base.
- Added structure for NBA, WNBA, UFC, props, lotto parlays, bankroll, and closing odds rules.
- Added static/public closing odds fallback framework.
- Added Results Archive fallback logic structure.
- Added separation rules for Odds vs Closing Number vs CLV.
- Added VIP Archive routing rules for parlays.
- Added stale props cleanup logic.
- Added public/static lookup staging design.

## 2026-05-21
- Filled the missing framework files listed by README: NBA, WNBA, UFC, props, lotto parlays, bankroll, and data integrity.
- Standardized A/B/C/Pass grading around implied probability, estimated true probability, EV edge, confidence, best number, and no-bet cutoff.
- Added sport-specific guidance for injury/news timing, market movement, matchup edge, pace/efficiency, regression, and public-team inflation.
- Added UFC-specific style matchup, cardio, durability, age/youth gap, and line movement rules.
- Added props rules keeping Props Lab strictly player-props-only.
- Added lotto parlay construction rules for 5-leg through 8-leg safe lotto parlays.
- Added Airtable source-of-truth and Google Sheets backup/archive-only data-integrity rules.
- Updated generator behavior to load every Markdown file in `micks-framework`.

## 2026-05-30
- Added MLB series-level trend filters.
- Added elite road team upgrade rules.
- Added home/road split mismatch weighting.
- Added interleague performance filter.
- Added divisional performance filter.
- Added handedness split filter (LHP/RHP).
- Increased bullpen edge weighting above simple batting-average and recent-win metrics.
- Added hot/cold team validation rules requiring support from run differential, bullpen quality, and offense.
- Added MLB series projection formula combining bullpen, home/road, handedness, interleague, form, command, and market price.

## 2026-06-08
- Added A-Grade Hunt Mode as a pre-grading A-candidate search phase.
- Added B+ as the bridge grade between B and A without lowering A standards.
- Added explicit A and A+ gate requirements covering independent evidence, edge size, price cutoff, confirmed role/news data, source conflicts, and market misprice reason.
- Added A-Candidate Queue output expectations and the valid `No A-grade found.` result.
- Added supported A-Hunt output fields: A Grade Gate Result, A Grade Evidence Count, Market Misprice Reason, Unresolved Conflict, and A-Hunt Source Notes.
- Added `current/a-grade-hunt-rules.json` as the current A-Hunt rules config loaded by daily Micks Picks generation.

## 2026-06-09
- Added `current/post-june8-adjustments.json` and `current/post-june8-adjustments.md` as the current Post-June 8 adjustment config loaded by daily Micks Picks generation.
- Added MLB full-game total risk adjustment before grade assignment, including Park/Weather Risk, Blow-Up Risk, Volatility Capped, and Tags output fields.
- Added the extreme run environment B-/Watchlist cap unless 4 run-suppression confirmations exist.
- Added parlay rejection for fragile high-volatility MLB totals.
- Added WNBA model-gap B+ and A-candidate upgrade path without lowering A-grade standards.
- Added role-stable prop priority and tags: Extreme Run Environment, Volatile Total Cap, Park/Weather Conflict, Role-Stable Prop, A-Hunt Candidate, and B+ Near-A.
- Added `current/world-cup-path-leverage.json` as the current World Cup Path Leverage Mode config loaded before grading World Cup futures, group winner, qualify/top-2, and live group-position markets.
- Added soccer/World Cup guardrails requiring sportsbook price, no-bet cutoff, market type, and path edge explanation before official card creation.
- Added output sections for World Cup Path Watchlist, Group Winner Edge Board, Live Group-Position Triggers, Host-Field Adjustment Notes, Bracket Collision Alerts, and Do-Not-Bet Heavy Chalk List.

## 2026-06-19
- Added DocSports (`docsports.com`) as an approved backup source for source acquisition, matchup previews, trends, line discussion, and market context.
- Updated source policy so DocSports can support watchlist/pass/context and backup confidence labels, but cannot alone create an A-grade or verified closing number.
- Updated data-integrity rules to reflect Google Sheets as the current live source of truth and Airtable as legacy/deprecated for public display.

---

## Future Update Rule
Every framework change should:
1. Update the relevant framework file.
2. Add a dated note here.
3. Include what changed and why.
4. Avoid undocumented framework drift.


## 2026-09-18 — research completeness correction
Separated missing evidence from verified zero-point factors; withdrew incomplete September 18 final grades and added a reproducible provisional Cease sensitivity calculation. No prior official release grades, stakes, results, operating modes or release gates changed.


## 2026-09-18 — user-directed restoration
Restored source/scan/guide handicapping and established score-based decisions. Removed the newly introduced readiness/probability helper and its new release gates. Preserved historical reports as records, not operative rules; preserved the user-requested NFL Recovery exemption.
