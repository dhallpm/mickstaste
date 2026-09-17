# Micks Picks Reference Guide Inventory

Status: Controlling inventory
Effective date: 2026-09-17

## Repository inventory audit

The full trees of `dhallpm/mickspicks-vip` and `dhallpm/mickstaste` were audited on 2026-08-24.

### Physical guide files stored in repositories

No PDF betting-guide files are currently stored in either repository.

### Extracted/stored guide knowledge currently present

1. **2026 VSiN NFL Betting Guide**
   - Sport: NFL
   - Storage form: extracted baseline knowledge in `micks-framework/current/nfl-2026-reference-module.md` and `.json`
   - Uses: preseason power-rating baseline, roster/QB context, coaching/scheme changes, schedule analysis, regression screens, market strategy, sides/totals/props/futures baseline.
   - Freshness: preseason/season baseline only. Must be reconciled against current odds, injuries, inactives, depth charts, usage and current-season efficiency.

2. **Fantasy Life Fantasy Football 2026**
   - Sport: NFL / player roles and props
   - Storage form: extracted baseline knowledge in `micks-framework/current/nfl-2026-reference-module.md` and `.json`
   - Uses: player projections, depth-chart assumptions, expected roles, routes/targets/carries, fantasy-derived usage baselines.
   - Freshness: preseason baseline only. Current role and health always override. Beginning with Week 2, compare every applicable magazine projection with Fantasy Life's current weekly projection, rankings and utilization evidence.

## Mandatory guide usage policy

Reference guides are not generic daily scan websites. They are persistent baseline inputs that must be consulted whenever their sport/market is active and their contents are applicable.

For each applicable candidate, record internally:
- Guide consulted
- Applicable baseline finding
- Current-data confirmation or contradiction
- Whether the guide assumption is still CURRENT, PARTIALLY CURRENT, STALE, or OVERRIDDEN
- Influence on the independent handicap
- Current weekly projection and delta from the stored guide
- Reason for any material projection change
- Strongest agreement and strongest contradiction across guide, current data and market

A guide cannot earn outside-handicapper confirmation merely because it agrees with a pick. Its role is to establish priors/baselines that are then tested against current information.

The Fantasy Life magazine, weekly Fantasy Life projections, rankings and Utilization Report are one source family. The VSiN guide, current VSiN models and VSiN systems are one source family. Multiple pages from one family cannot satisfy the independent-confirmation requirement.

## NFL phase weighting

- Preseason / Week 1: guide baselines can carry substantial prior weight after roster/injury verification.
- Week 2: verified player opportunity can move faster than team efficiency; use the explicit data-class weights in `nfl-post-week1-reconciliation.md`.
- Weeks 3-4: continue the module's staged blend, increasing current-season weight while regressing efficiency more than role.
- Week 5 onward: current-season evidence normally dominates; guide information remains useful mainly for structural context such as scheme, coaching, schedule and original market expectations.

## Current-data override hierarchy

Current verified information always outranks stored guide assumptions, especially:
1. QB/injury/inactive news
2. Current depth chart and role
3. Current odds and market movement
4. Current snap/route/carry/target data
5. Current-season efficiency
6. Weather and game-day conditions

## Future guide ingestion

Whenever a betting guide, preview book, projection package, PDF or season magazine is supplied:
1. Inventory it here by publisher, sport, season, filename/source and date received.
2. Extract actionable concepts into the applicable sport reference module.
3. Preserve the original guide when repository storage/licensing permits; otherwise preserve only user-authorized notes/extracted framework rules.
4. Tag every extracted projection or assumption with its season/date context.
5. Add it to the applicable daily candidate workflow.
6. Never let stale guide information silently override current evidence.

## Post-Week 1 scan requirement — 2026

Every full NFL scan must produce a Guide/System Reconciliation Table and Fantasy Projection Delta Board before the candidate scorecard. The output must identify added and removed candidates, player-level usage changes, updated game scripts, current prices and no-bet cutoffs.

An unresolved material contradiction between the stored guide, verified role/health evidence and current weekly projection caps the candidate at 81/110 and blocks a Recovery Mode+ release.

## Audit conclusion — updated 2026-09-17

At audit time, the only identifiable stored guide-derived knowledge in the repositories is the NFL 2026 reference module based on the VSiN 2026 NFL Betting Guide and Fantasy Life Fantasy Football 2026. No separate MLB, WNBA/NBA, NHL, soccer, UFC/boxing, tennis, NASCAR, college football or college basketball guide files/modules were found in the repository trees.

The stored guides are now wired to the active post-Week 1 reconciliation module. Current Fantasy Life and VSiN weekly forecasts must be checked as live layers rather than treated as interchangeable with the preseason publications.
