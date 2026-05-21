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
Starting Pitcher Quality + Command Stability + Bullpen Stability + Lineup Pressure + Weather/Wind/Park + Umpire Profile + Market Inflation = MLB Projection.

## Routing
- MLB sides/totals/team totals route to Master Picks or website feed.
- MLB player props route to Props Lab only if they are true player props.
- HR ladders, lotto props, parlays, and longshots route to Longshots or Lotto Parlays, not Props Lab.
