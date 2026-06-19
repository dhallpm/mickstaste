# Micks Picks Framework Changelog

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
