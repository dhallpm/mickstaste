# Micks Picks NFL 2026 Reference Module

## Status and scope

This module is a permanent Micks Picks reference for NFL sides, totals, player props, futures, awards and derivative markets.

Primary baseline sources:

- **2026 VSiN NFL Betting Guide**
- **Fantasy Life Fantasy Football 2026**

These are preseason and season-long reference guides. They provide baseline power ratings, projections, player-role assumptions, depth-chart context, coaching and scheme notes, regression screens, schedule analysis and market strategy. They are not current injury reports, inactive lists, depth charts, odds screens or final betting authorities.

This module applies directly to the NFL. The **Annual Guide Source Policy** below applies to every Micks Picks sport whenever a comparable season guide, preview book or projection package is supplied.

## Controlling source hierarchy

For an NFL daily card, use this order:

1. Current Circa and market odds, key-number movement and price availability.
2. Confirmed quarterback status, injuries, inactives, offensive-line combinations and weather.
3. Current depth chart, snap share, routes, carries, targets, red-zone role and coaching usage.
4. Current-season matchup data: EPA, success rate, yards per play, pressure, explosive-play rate, points per drive, third-down and red-zone efficiency.
5. Micks independent power rating, projected line and projected total.
6. Current VSiN models, power ratings, matchup ratings and betting splits.
7. The two 2026 guide baselines in this module.
8. Outside handicappers and historical trends.

A preseason guide may create or strengthen a candidate. It may not override current quarterback news, current role evidence, a confirmed inactive, meaningful line movement or an updated Micks projection.

## Post-Week 1 mandatory reconciliation

Beginning with Week 2, load `nfl-post-week1-reconciliation.md` and `.json` before scoring any NFL candidate.

Every side, total, prop, derivative and parlay leg must cross-reference:

1. the applicable VSiN guide prior;
2. the applicable Fantasy Life magazine prior;
3. verified Week 1/current-season usage and efficiency;
4. the newest Fantasy Life weekly projection, ranking and utilization evidence;
5. the newest VSiN model, power rating, system and market evidence;
6. the updated independent Micks projection and executable sportsbook number.

Fantasy Life magazine projections and current Fantasy Life pages are one source family. VSiN guide, model, system and editorial pages are one source family. Agreement inside one family cannot be counted as multiple independent confirmations.

The reconciliation must identify what changed, why the projection changed and whether the guide assumption is `CONFIRMED`, `PARTIALLY CURRENT`, `STALE` or `OVERRIDDEN`. An unresolved material contradiction caps the candidate at 81/110 and blocks a Recovery Mode+ release.

## NFL side framework

Every spread or moneyline candidate must address:

- Micks projected spread versus the current market.
- Whether the difference crosses a key number, especially 3, 7 or 10.
- Starting quarterback value and the quality of the backup.
- Pass protection versus opposing pass rush.
- Secondary quality versus the opponent’s receiving structure.
- Run-blocking and run-defense matchup.
- Current offensive and defensive EPA or comparable efficiency.
- Yards per play, points per drive, third-down conversion and red-zone performance.
- Turnover differential and whether it is likely to regress.
- One-score-game performance and whether recent close-game results are sustainable.
- Coaching, coordinator, play-caller and scheme changes.
- Rest, travel, opponent bye, short week, international game and schedule clustering.
- Weather, wind and field conditions.
- Current ticket/handle splits and corresponding line movement.

### Power-rating construction hierarchy

When maintaining NFL power ratings, weight the roster in this order:

1. Quarterback play.
2. Ability to pressure the opposing quarterback.
3. Defensive-back play and coverage/turnover creation.
4. Offensive pass protection.
5. Skill and volume of offensive playmakers.

Use team-specific home and road field values when available. Do not apply a blanket three-point home-field adjustment.

### Grade controls

- VIP A- or higher normally requires at least a two-point Micks edge, two independent support paths and no unresolved quarterback or major inactive uncertainty.
- A larger raw model edge does not qualify automatically if it is driven by stale preseason assumptions.
- Crossing a key number against the wager requires a downgrade or Pass unless new information independently justifies the move.
- If the best number is gone, enforce the posted cutoff. Do not chase.
- Betting splits are supporting evidence only. They cannot turn a weak matchup into a premium play.

## Betting-splits protocol

Treat tickets and handle as different information:

- **Tickets** measure the share of bets.
- **Handle** measures the share of money.

Use DraftKings-style ticket data as a public-position indicator and Circa data as the preferred high-limit market input when both are available.

Screening thresholds:

- A 65%/35% ticket split is a useful public/contrarian warning threshold, not an automatic fade.
- A Circa handle-to-ticket gap of approximately 10 percentage points or more is meaningful enough to investigate.
- The strongest confirmation is a low-ticket side with higher Circa handle and line movement in the same direction.
- Conflicting splits, stale snapshots or movement against the alleged sharp side receive no scoring credit.
- Weight splits most heavily during the final 24 hours before kickoff. Early-week splits can change materially.

Never claim sharp action unless the exact book, ticket percentage, handle percentage, timestamp and corresponding line movement are verified.

## NFL totals framework

A total candidate must evaluate:

- Projected plays and pace.
- Neutral-script pass rate and projected dropback rate.
- Offensive and defensive EPA, success rate and yards per play.
- Explosive pass and explosive run rates.
- Offensive-line health and pressure/sack matchup.
- Quarterback efficiency, mobility, turnover risk and health.
- Red-zone efficiency and points per drive.
- Third-down sustainability.
- Run-game efficiency and expected clock behavior.
- Coordinator/play-caller changes and personnel usage.
- Weather, wind, precipitation, temperature and playing surface.
- Expected game script and the risk of one team suppressing pace.
- Market movement and whether the move crossed a key total range.

A recent scoring average alone is insufficient. Separate sustainable efficiency from turnover, field-position, defensive-touchdown and red-zone variance.

## NFL player-prop framework

The annual guides are most useful for establishing a role and projection baseline. Every official player prop must still be updated with current information.

Required inputs:

- Independent Micks projection and at least one external projection.
- Current sportsbook line and price.
- Expected snaps and routes.
- Carries, targets and targets per route.
- Yards per route or comparable efficiency, with sample-size context.
- Goal-line and red-zone role.
- Target competition and backfield committee risk.
- Offensive-line and quarterback context.
- Opponent coverage, pressure and run-defense matchup.
- Expected game script.
- Injury status, workload restrictions and return-from-injury risk.

### Projection-gap screen

Use this as a candidate screen, not an automatic grade:

- Less than 5% difference from the market: normally Pass.
- 5% to 9.9%: requires strong current role confirmation; normally B- maximum.
- 10% to 14.9%: can qualify for B with a stable role and acceptable price.
- 15% or greater: can qualify for B+ or higher only when current role, health, matchup and price independently support the projection.

Reduce the grade when the projection assumes a full workload that has not been demonstrated. A strong efficiency metric without a path to snaps, routes, carries or targets is not a bet.

### Position-specific requirements

**Quarterbacks**

- Project attempts, sacks, pressure, designed rushing and scramble volume.
- Separate passing-volume opportunity from efficiency.
- Account for offensive line, receiver health and expected score state.

**Running backs**

- Separate early-down, passing-down and goal-line roles.
- Confirm expected carry share, route share and target share.
- Grade committee backs conservatively.
- A backup becomes a candidate only after the starter’s status and the likely replacement structure are confirmed.

**Wide receivers and tight ends**

- Confirm routes, target share, targets per route and alignment.
- Evaluate target competition, personnel grouping and quarterback fit.
- Distinguish deep-threat volatility from stable underneath volume.
- For tight ends, verify route participation rather than relying on nominal starter status.

## Rookie-market rules

Role and usage outrank draft buzz.

- First-round and top-10 receivers can earn immediate volume, but current depth chart and quarterback quality remain required.
- Rookie running backs need a credible 200-carry or high-value receiving path; draft capital alone is insufficient.
- Rookie quarterback markets depend heavily on the expected first start and projected attempts, not highlight-based efficiency assumptions.
- First-round rookie tight ends may earn earlier receiving roles than historical stereotypes suggest, but route participation and personnel packages must be verified.
- Committee competition, negative game script and uncertain start dates require conservative projections.

Do not publish a rookie Over solely because the player was drafted early. Do not publish an Under solely because the player is inexperienced.

## Handcuff and replacement-player rules

Maintain a weekly replacement-role map for every backfield and high-volume receiving position.

Track:

- Direct backup versus committee replacement.
- Early-down, passing-down and goal-line succession.
- Offensive scoring environment.
- Coaching history with committees.
- The replacement player’s efficiency and pass-protection ability.

An injury to a starter does not automatically transfer 100% of the role to the next player on the depth chart.

## Futures and season-win-total framework

Season markets are high variance. Use alternate win totals only when the Micks conviction is materially stronger than the base market and the price compensates for added variance.

Required checks:

- Starting quarterback and backup quality.
- Offensive-line and defensive-front depth.
- Schedule strength, early-season difficulty and clustered road/home games.
- Bye placement and number of opponents coming off byes.
- Coaching stability and coordinator changes.
- Tanking, late-season shutdown or coach-firing risk.
- Turnover differential regression.
- One-score-game regression.
- Point differential versus actual record.
- Scoring/allowance profile versus actual wins.
- Current power rating versus posted win total.

Historical improvement/decline systems are candidate screens only. They must be paired with current personnel, coaching, schedule and market evidence.

## Regression module

Flag teams for further study when any of these conditions appear:

- Negative turnover differential with better point differential or underlying efficiency.
- Positive turnover differential with weak point differential.
- Extreme one-score-game record.
- Ten or more wins despite weak scoring or poor defensive allowance.
- Losing record despite positive point differential.
- Major year-over-year win increase supported heavily by turnovers and close wins.
- Strong or weak red-zone and third-down results that conflict with broader efficiency.

Do not label regression as guaranteed. Explain the mechanism expected to normalize.

## Annual Guide Source Policy — all sports

Whenever the user supplies a season guide, projection magazine or preview package for any sport:

1. Store the file in the persistent Micks Picks Reference Guides library.
2. Record the sport, season, publisher, file name and date accessed.
3. Extract only the concepts relevant to that sport.
4. Create or update both human-readable and machine-readable framework rules.
5. Treat the guide as a baseline source below current odds, injuries, lineups and live performance data.
6. Date-stamp all team and player projections.
7. Reconcile conflicts with current information; current verified information wins.
8. Do not transfer a sport-specific finding to another sport without a justified analogous rule.
9. Do not copy publisher language into customer-facing writeups.
10. Track whether the guide-based assumption helped or hurt after grading.

## 2026 baseline data policy

The VSiN preseason power ratings and Fantasy Life team/player projections are reference baselines for the 2026 NFL season. Once current-season data becomes reliable, blend and then replace stale preseason assumptions.

Recommended phase weighting:

- Preseason and Week 1: guide baseline may carry substantial weight, subject to confirmed rosters and injuries.
- Week 2: current player opportunity may outweigh the guide when a representative full-game role is verified, while one-game team efficiency remains heavily regressed.
- Weeks 2-4: use the explicit role, team-tendency, efficiency and trench weights in `nfl-post-week1-reconciliation.md`; do not use a single blanket blend.
- Week 5 onward: current-season role, health and performance normally take priority.

The current Fantasy Life weekly forecast is a comparison output, not an additional independent weighting bucket. Record its delta from the magazine baseline and the information that caused the change.

## Post-card review additions

For every graded NFL pick, classify any miss under one or more of these labels:

- Power-rating error.
- Quarterback/injury information error.
- Offensive-line or pass-rush mismatch error.
- Role or workload projection error.
- Market timing/key-number error.
- Split interpretation error.
- Turnover or red-zone variance.
- Weather/game-script error.
- Duplicate exposure.
- Correct handicap, adverse variance.

Track closing-line value separately from the result. A win with poor process is not automatically a framework success, and a loss with verified closing-line value is not automatically a bad handicap.
