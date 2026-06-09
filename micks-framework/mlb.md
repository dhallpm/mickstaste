# Micks Picks MLB Framework

## Purpose
MLB cards must separate starting pitcher edge, bullpen edge, lineup edge, umpire edge, weather/park context, and market price. MLB picks should not be released from team names, pitcher ERA, or public narrative alone.

## Required MLB Inputs
- Probable pitchers and confirmed starters.
- Confirmed batting orders when available.
- Current odds and best available sportsbook number.
- Starting pitcher skill and command indicators.
- Bullpen workload/stability.
- Lineup pressure metrics.
- Weather, wind, park factor, and roof status when relevant.
- Umpire profile when available.
- Market movement and public inflation context.
- Series-level team trend context when available.

## Starting Pitcher Command Stability Layer
Weight more than raw ERA:
- Zone percentage.
- BB/9 and walk percentage.
- First-pitch strike percentage.
- Pitch-location consistency.
- Recent command deterioration.
- Velocity decline.
- K-BB%.

Use this for:
- strikeout props.
- walks props.
- earned-runs props.
- first 5 totals.
- team totals.
- live overs when command breaks down.

## Bullpen Stability Engine
Track:
- Bullpen innings over the last 3 days.
- High-leverage reliever usage.
- Back-to-back appearances.
- Inherited runners allowed/scored.
- Blown saves.
- Travel fatigue.
- Left/right matchup availability.

Rules:
- Use First 5 when the starter edge is strong but bullpen risk is high.
- Use full game when both starter and bullpen edges align.
- Avoid full-game moneylines when the bullpen edge contradicts the starter handicap.
- Bullpen edge is weighted higher than team batting average, recent wins, or public perception when deciding full-game exposure.

## Regression Alert Engine
Flag pitchers or teams when:
- ERA is materially better/worse than FIP or xFIP.
- BABIP is unsustainably low/high.
- Strand rate is unsustainably high/low.
- Strikeout rate is declining.
- Velocity is down.
- Hard-hit rate or barrel rate is rising.

Regression flags should affect sides, totals, pitcher props, and team totals.

## Lineup Pressure Metrics
Do not rely on batting average alone. Use:
- OBP.
- Hard-hit percentage.
- Barrel rate.
- Chase rate.
- Contact quality.
- Platoon splits.
- Defensive efficiency behind the pitcher.
- Bullpen matchup pressure.

## Home/Road And Venue Weighting
Increase weighting for:
- Home/road ERA splits.
- OPS allowed by venue.
- Home strikeout rate.
- Park dimensions.
- Wind direction.
- Temperature and humidity.
- Roof status.

## Series-Level Team Trend Filters
Use weekend/series trend reports as supporting evidence, not as standalone picks. These filters upgrade or downgrade MLB plays only when they align with odds value, probable pitchers, bullpen edge, lineup context, and market price.

### Elite Road Team Filter
Upgrade road teams when:
- Road record is at least 8 games over .500.
- Road profit is +5 units or better.
- Road offense scores 5+ runs per game.

Rule: elite road teams become more valuable when facing teams with losing home records, especially if the market still prices mostly from overall record.

### Home/Road Split Mismatch
Upgrade ML, series, and alt run-line exposure when:
- The road team has a strong road profile.
- The home team has a losing or materially weaker home profile.
- The home/road gap is 8+ games or creates a clear unit-profit mismatch.

### Hot/Cold Team Form Filter
Do not upgrade a team from win streak alone. Only upgrade recent form when:
- Run differential is improving.
- Bullpen stability is improving.
- Offensive production supports the streak.
- Starting pitching quality is stable or improving.

Downgrade cold teams when losses are supported by cold bats, bullpen collapse, injuries, and poor command metrics rather than bad luck only.

### Interleague Filter
When interleague win-rate gap exceeds about 10 percentage points and sample size is meaningful, upgrade the stronger interleague profile by 0.25 grade if price still offers value.

### Divisional Performance Filter
When divisional record differs by 8+ games and sample is at least 15 games, upgrade the stronger divisional team if the matchup also supports it through pitching, bullpen, and lineup layers.

### Lefty/Righty Split Filter
Handedness splits are A-tier supporting evidence when:
- Sample is greater than 10 games.
- Run production differs by 1+ run per game versus handedness.
- The projected starter handedness matches the split.

Use lefty/righty team splits for sides, team totals, props, and series-level angles.

### Series Betting Formula
Bullpen Edge + Road/Home Split + Handedness Split + Interleague/Division Strength + Current Form + Command Stability + Market Price = Series Projection.

Series bets should still include exact price, best number, no-bet cutoff, grade, and units.

## Umpire Scorecards Layer
Use Umpire Scorecards as an MLB-specific edge layer when plate umpire data is available.

Track:
- Pitcher-friendly, hitter-friendly, or neutral zone classification.
- Called strike rate.
- Zone accuracy and consistency.
- Walk tendency.
- Strikeout tendency.
- Historical over/under tendency.
- Run environment impact.

Rules:
- Pitcher-friendly umpire upgrades unders, F5 unders, pitcher strikeouts, and pitcher outs.
- Pitcher-friendly umpire downgrades hitter overs and walks props.
- Hitter-friendly or tight-zone umpire upgrades overs, walks, team totals, and hitter props.
- Tight-zone umpire can shorten starter outings and expose bullpens earlier.
- Umpire edge matters most for F5 totals, strikeout props, walks props, pitcher outs, and team totals.
- Umpire edge matters less for full-game MLs unless it creates clear bullpen cascade risk.

## Public Ace Inflation Fade
Downgrade overpriced public favorites when:
- The ace name is carrying the price more than current form.
- Command metrics are unstable.
- Bullpen risk is ignored by market.
- Public consensus is heavy but true edge is thin.
- Yankees/Dodgers/big-market tax creates negative EV.

## RotoWire MLB Usage
RotoWire is high priority for:
- Probable pitchers.
- Confirmed lineups.
- Late scratches.
- Batting orders.
- Bullpen notes.
- Weather/park notes when available.
- Injury and rest news.

Do not release major MLB exposure before confirming probable pitchers and lineups when the play depends on them.

## VegasInsider MLB Usage
VegasInsider is supporting context for:
- Market odds comparison.
- Consensus/public pressure.
- Matchup writeups.
- Trend notes.
- Public-facing analysis language.

VegasInsider does not override live odds/API validation.

## MLB Formula
Starting Pitcher Quality + Command Stability + Bullpen Stability + Lineup Pressure + Weather/Wind/Park + Umpire Profile + Series-Level Trend Filters + Market Inflation = MLB Projection.

## Post-June 8 MLB Total Volatility Cap
Full-game MLB totals are risk-adjusted before grade assignment. Projection edge alone cannot push a volatile full-game total onto the official card.

Every official MLB total must include:
- Park/Weather Risk.
- Blow-Up Risk: Low / Medium / High.
- Whether volatility capped the grade.

Any MLB total in an extreme run environment is capped at B-/Watchlist unless at least 4 run-suppression confirmations exist.

Extreme run environment includes:
- Las Vegas Ballpark.
- Minor-league or neutral-site hitter park.
- Heat or altitude boosting carry.
- Total of 10.5 or higher.
- Homer-prone starter.
- Tired or bad bullpen.
- Market moving Over.

Run-suppression confirmations include:
- Both starters confirmed and projected for real length.
- Bullpens rested and above average.
- Weather/park neutral or pitcher-friendly.
- Umpire not Over-leaning.
- Market not strongly moving against the Under.
- Lineup strength does not add major power/contact risk.

If Under projection edge exists but park/weather favors offense, downgrade one full grade, move to watchlist, or switch to first 5 if starter path is the real edge. When totals are volatile, prefer side, first-5, team-total, or prop expressions with stronger certainty.

## Routing
- MLB sides/totals/team totals route to Master Picks or website feed.
- MLB player props route to Props Lab only if they are true player props.
- HR ladders, lotto props, parlays, and longshots route to Longshots or Lotto Parlays, not Props Lab.
