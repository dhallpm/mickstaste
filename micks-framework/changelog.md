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

---

## Future Update Rule
Every framework change should:
1. Update the relevant framework file.
2. Add a dated note here.
3. Include what changed and why.
4. Avoid undocumented framework drift.
