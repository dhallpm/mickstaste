# Micks Picks Futures Lab

Status: Permanent framework module
Effective date: 2026-08-24

## Purpose

Futures are evaluated separately from the daily Micks Picks card. They use longer-horizon probability modeling, market de-vigging, scenario simulation, structural roster/schedule analysis, and portfolio correlation controls. Futures exposure does not count against the daily Recovery Mode+ play cap or daily unit target.

## Eligible markets

- Season win totals and alternate win totals
- Make/Miss playoffs
- Division, conference and championship winners
- Awards (MVP, Cy Young, Rookie of the Year, etc.)
- Statistical leaders
- Season-long player props
- Tournament winners / To Advance style long-horizon markets
- Relegation/promotion or equivalent season outcomes where legal and liquid

## Core principle

Start with an independent Micks probability estimate. Market prices and outside models are then used to calibrate, challenge and update that estimate. Do not reverse-engineer the Micks probability merely to match the market.

## Probability engine

For each candidate:

1. Build a baseline probability from current team/player strength, schedule, role, health and structural factors.
2. Convert available sportsbook prices to implied probabilities.
3. De-vig the market when multiple mutually exclusive outcomes are available.
4. Build a market-consensus probability from multiple books, favoring liquid and high-limit markets.
5. Incorporate independent projection/model evidence when available.
6. Run scenario or Monte Carlo simulation when the market can be modeled from game/team/player distributions.
7. Reconcile model, simulation and market consensus; document large disagreements instead of averaging them away.
8. Convert final Micks probability to fair American odds.
9. Compute expected value versus the executable price.

### Core formulas

For American odds:
- Negative odds -A: implied probability = A / (A + 100)
- Positive odds +B: implied probability = 100 / (B + 100)

For a two-way market, simple proportional de-vig probability for outcome i:
- p_i_fair = p_i_raw / sum(p_raw)

For multi-outcome markets, use proportional de-vig as the default only when no superior method is justified. If the book margin is highly asymmetric, note the limitation.

Expected value per 1 unit risked:
- Positive odds +B: EV = p * (B/100) - (1-p)
- Negative odds -A: EV = p * (100/A) - (1-p)

Fair decimal odds = 1 / p. Convert fair decimal odds back to American odds for display.

## Futures score — 100 points

- Independent Micks probability/model edge: 25
- De-vigged market-consensus quality and price advantage: 15
- Independent external model/projection agreement: 15
- Roster/role/health durability: 10
- Schedule/path/format advantage: 10
- Market Intelligence (movement, respected money, liquidity, timing): 10
- Simulation robustness / scenario breadth: 10
- Portfolio fit / correlation / opportunity cost: 5

Unsupported factors receive zero. Never invent model projections, betting splits, simulations, injury assumptions or liquidity claims.

## Release gates

A futures bet normally requires:
- Futures score >= 78/100
- Failure score >= 7/10
- Positive estimated EV >= 5%
- Preferred estimated EV >= 8% for long-dated markets
- At least two independent support paths beyond the current sportsbook price
- Executable price at or better than the posted No-Bet Cutoff
- No unresolved major injury/role/status issue that materially changes the probability

High-variance outrights with thin liquidity may require 10%+ estimated EV before release.

## Grades and units

- A: 0.50u maximum initial futures position
- A-: 0.40u
- B+: 0.30u
- B: 0.20u
- B- / speculative: 0.10u or Watchlist
- C: Watchlist / price target only
- Pass: no position

Futures use a separate bankroll ledger.

Initial portfolio limits unless explicitly overridden:
- Maximum total open futures exposure: 2.00u
- Maximum exposure to one team/player outcome cluster: 0.75u
- Maximum single future: 0.50u
- Maximum highly correlated championship/division/playoff cluster: 0.75u
- Maximum awards exposure tied to one player/team narrative: 0.50u

Do not count potential profit as exposure; use amount risked.

## Correlation controls

Treat correlated futures as one risk cluster. Examples:
- Team Over wins + Make playoffs + Win division + Win conference
- QB MVP + team Over wins + team conference future
- Pitcher Cy Young + team division + team win total where the same health assumption drives all three

A second correlated future must either improve portfolio payoff shape or offer materially superior EV. Do not stack multiple prices that all lose for the same reason without explicitly capping the cluster.

## Market and line-shopping protocol

For each candidate, record:
- Sportsbook
- Executable odds
- Market consensus range
- Best available price
- Micks fair probability
- Micks fair odds
- De-vigged market probability
- Estimated EV
- Best Number
- No-Bet Cutoff
- Timestamp
- Market liquidity classification: High / Medium / Thin / Unknown

For outrights, line shopping is mandatory because price dispersion can materially change EV.

## Source stack

Use current sources when accessible and applicable. Outside models are inputs, not automatic picks.

### Cross-sport market sources
- VSiN and Circa market information
- Action Network odds, movement, futures analysis and public/respected-money context when verifiable
- Covers market pages and consensus context
- Multiple sportsbook boards, including user-provided screenshots and current major-book futures prices
- Doc's Sports, including the dynamic AI-v3 page, as supporting confirmation only

### NFL
- ESPN FPI and current team projections when available
- SumerSports analytics and team-strength metrics when available
- Fantasy Life projections/role data
- TeamRankings
- Pro Football Reference
- VSiN NFL guide/current power ratings
- Current injuries, depth charts, inactives and offensive-line status
- Stored 2026 VSiN NFL Betting Guide and Fantasy Life 2026 guide-derived baselines

### College Football
- ESPN FPI
- SP+ when current and accessible
- FEI when current and accessible
- TeamRankings
- Sports Reference CFB
- Action Network/VSiN market information
- Schedule, returning production, QB and coaching changes

### NBA / WNBA
- ESPN/BPI or equivalent current projection systems when available
- TeamRankings
- Basketball Reference
- StatMuse
- Current injury/rotation/minutes reporting
- VSiN and Action Network market information

### MLB
- FanGraphs projections, playoff odds, ZiPS/Steamer where available
- Baseball Savant
- Baseball Reference
- FanGraphs roster/depth and WAR projections
- VSiN and Action Network market information
- Current rotation/bullpen/injury data
- PECOTA or other independent projection systems when accessible

### NHL
- MoneyPuck models/playoff odds
- Evolving-Hockey
- Natural Stat Trick
- Hockey Reference
- TeamRankings
- Current goalie/roster/injury information
- VSiN and Action Network market information

### Soccer
- Opta / The Analyst supercomputer or competition forecasts when available
- ClubElo or equivalent team-strength ratings when current and accessible
- FBref
- Current injuries/lineups/fixture congestion
- Multiple sportsbook markets

### College Basketball
- KenPom when accessible
- Bart Torvik when accessible
- TeamRankings
- Sports Reference CBB
- Action Network/VSiN market information

### Awards / player futures
Use sport-specific role, usage, health and team-success inputs. Awards models must include the award's historical voting profile and team-success sensitivity where relevant, but narrative trends cannot replace performance probability.

## Simulation policy

Use simulation when the market is naturally path-dependent.

Examples:
- NFL/NBA/NHL/MLB season win totals: simulate remaining schedule using game-level win probabilities.
- Division/conference/championship: simulate schedule + playoff qualification + bracket paths.
- Player season totals: simulate games played, role/usage and per-game production distributions.
- Awards: estimate performance distribution plus playing-time and team-success paths; use wider uncertainty bands than for objective statistical markets.

Minimum preferred simulation size: 10,000 trials when computationally practical. More trials reduce sampling noise but do not fix bad assumptions.

## Uncertainty and shrinkage

Futures estimates must be more conservative than daily bets.

- Shrink extreme probabilities toward high-quality market consensus when model uncertainty is large.
- Reduce confidence for rookies, new coaches, uncertain rotations, recovering players, thin markets and highly path-dependent awards.
- As the season progresses, increase weight on current-season role and performance and reduce stale preseason assumptions.

## Failure score — 1 to 10

Score how well the handicap survives adverse scenarios.

A 7+ futures failure score normally requires:
- identified primary failure paths
- injury/availability sensitivity considered
- schedule/path sensitivity considered
- correlation and portfolio concentration checked
- market-price downside understood
- at least one scenario where the thesis still holds despite a moderate adverse development

## Futures Watchlist

Candidates that lack price edge but have strong underlying probability can be stored with a trigger:
- Buy at +X or better
- Buy Over/Under at Y or better
- Recheck after injury/news/schedule milestone
- Recheck after market overreaction

Do not release a future merely because the underlying team/player is highly rated.

## Tracking after release

At posting, freeze:
- exact market
- exact threshold/outcome
- odds
- sportsbook
- timestamp
- Micks fair probability
- fair odds
- estimated EV

Track current price over the life of the position. For futures, both closing-line value and mark-to-market movement are diagnostics.

When the market closes or the season begins and a comparable closing price exists, record:
- Closing Price
- Closing Implied Probability
- CLV / Beat Close / Neutral / Lost Close

Never compare a posted future with a materially different threshold/outcome to manufacture CLV.

## Website fields

Futures Lab cards should expose:
- Sport / League
- Market
- Pick
- Sportsbook / Posted Odds
- Current Best Price
- Micks Probability
- Market Fair Probability
- Micks Fair Odds
- Estimated EV
- Score
- Grade
- Units
- Best Number
- No-Bet Cutoff
- Market Intelligence note
- Primary failure path
- Posted date/time
- Status: Active / Watchlist / Closed / Graded

## Daily workflow integration

Every full Micks Picks all-sports scan must also check whether current futures markets offer a new material edge. Futures are not forced daily. If no candidate clears the futures gates, report no new Futures Lab release.

Futures do not consume Recovery Mode+ daily official-play slots.