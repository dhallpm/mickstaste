# September 18 scoring correction

**The low scores reflected unfinished research, not measured weak bets.** The independent fair-probability calculation (25 points) and executable-price comparison (15 points) were missing. That left 40 points unevaluated before other unknown factors were also recorded as zero. Calling the resulting subtotals final Pass grades was incorrect. Those grades are withdrawn; no official wager was released or retrospectively added.

## What was missing, and what is now resolved

| Item | Current finding | Remaining work |
|---|---|---|
| Cease market | User screenshot: 7+ strikeouts -167; 8+ +112 | Verify the price again before execution |
| Texas lineup and umpire | Confirmed order retrieved; Tom Hanahan assigned at home plate | No unsupported umpire tendency bonus |
| Cease opportunities | Last ten starts and all nine hitters' strikeout rates vs right-handers obtained | Manager-specific workload and calibration checks |
| Independent Cease calculation | Reproducible provisional matchup and workload sensitivity now supplied | Out-of-sample validation; not an official probability estimate |
| Toronto/Boston moneylines | Starter, lineup and relief research available | Independent run/win distribution, EV and failure assessment |
| Other sport candidates | Original broad screening remains a historical snapshot | Candidate-specific probability and availability work still incomplete |
| Market splits, Doc's and outside models | Some exact-market evidence unavailable or stale | Supporting evidence; missing access alone is not proof of poor value |

## Cease: corrected player and game-script assessment

Cease has 236 strikeouts in 668 batters faced in the retrieved season data. Texas' confirmed order is Ezequiel Duran, Corey Seager, Josh Jung, Brandon Nimmo, Wyatt Langford, Jake Burger, Nicky Lopez, Elias Diaz and Evan Carter. Each hitter's season strikeouts and plate appearances against right-handers are frozen in the accompanying inputs file. The script supporting seven strikeouts is enough plate appearances through repeated trips into that order while Cease retains his strikeout ability. Walks and long counts can consume pitches and shorten the outing, but innings alone are an inadequate opportunity measure.

His September 7 and 13 five-inning starts included **22 and 24 batters faced**, respectively. The earlier explanation overstated those short outings as evidence of reduced strikeout opportunity or a confirmed pitch restriction. No restriction was established from those outings alone. [MLB game logs](https://statsapi.mlb.com/api/v1/people/656302/stats?stats=gameLog&group=pitching&season=2026), [confirmed lineup and officials](https://statsapi.mlb.com/api/v1/game/822847/boxscore).

At **-167, seven or more needs 62.55%** to break even. Eight or more at **+112 needs 47.17%**. These are price calculations, not predictions.

The new shadow calculation combines season pitcher and hitter strikeout rates, shrinks both toward the league rate using an explicitly assumed 100-PA prior, and computes a Poisson-binomial distribution over a fixed number of batters faced. It produces these sensitivity scenarios:

| Batters faced | Estimated 7+ | Estimated 8+ |
|---|---:|---:|
| 18 | 41.7% | 24.3% |
| 20 | 55.0% | 36.6% |
| 22 | 66.2% | 48.6% |
| 24 | 76.3% | 60.8% |
| 26 | 83.4% | 70.6% |

**These are unvalidated scenarios, not a confidence interval or a betting recommendation.** They show why workload matters: -167 fails the 20-batter scenario but clears the 22- and 24-batter scenarios. The equal-weight recent-workload mixture is saved for inspection, but must not be promoted as calibrated fair odds. The method does not yet model the relationship between walks, strikeouts, pitch count and early removal, or adjust for velocity, substitutions, catcher and park. It was built after seeing market prices and outside opinions, which is disclosed rather than used as a reason to abandon the calculation.

**Corrected Cease status: WATCH / PROVISIONAL MODEL, ungraded, 0u officially released.** The prior price-based Pass was not supported by a completed probability estimate. This does not establish that -167 is good value either.

## Permanent process correction

- Research completeness, betting quality and release eligibility are separate fields.
- Unknown inputs have null points. Verified adverse evidence may earn zero; unsupported bonus points are never awarded.
- An essential missing probability/EV input produces INCOMPLETE / UNGRADED. PASS VALUE requires a completed nonpositive EV calculation; PASS FRAMEWORK identifies the actual failed gate.
- Optional unavailable feeds do not automatically veto a play. Supported score bounds can guide further research; incomplete subtotals are never shown as final grades or normalized to 110.
- Every incomplete candidate identifies the missing calculation or fact. Outside opinions do not replace Micks probabilities, and encountering them first does not excuse failing to calculate a disclosed forecast.
- NFL remains in standard mode. Existing non-NFL thresholds, weights and stake rules remain unchanged. This correction does not create plays or rewrite prior official results.

The scoring helper and provisional projection have regression checks. This establishes correct data handling and reproducible arithmetic; it does not establish profitable or calibrated forecasting performance.


---

# Earlier 1:14 p.m. ET research snapshot — not current market instructions

The following preserves earlier research context. Its incomplete grades have been withdrawn. Lineup and Cease updates above take precedence; quoted prices and missing-data descriptions below describe the earlier snapshot.

# Micks Picks — September 18, 2026

**Official card: NO BET — 0.00u. No Pick of the Day or A-grade release.** The broad slate screen is finished; candidate verification remains incomplete. The prices below are dated market references, not verified BetRivers offers or automatic betting triggers. Latest MLB/WNBA/CFB benchmark refresh: **1:14 p.m. ET**.

NFL remains in standard mode. Non-NFL daily picks still require **82/110 and Failure Score 7/10** under the existing Recovery Mode+ rules. No candidate completed the research required for an official release. Fair probabilities, EV and hard price cutoffs have not been established; they have not been invented to create releases.

## First research alternatives

| Candidate | Reference number | Grade / units | What prevents release |
|---|---|---|---|
| Toronto ML at Texas, 8:05 p.m. ET | -137 | Ungraded / 0u | Independent fair-price estimate, batting-order verification and executable price |
| Boston ML at Tampa Bay, 7:10 p.m. ET | +113 | Ungraded / 0u | Independent fair-price estimate, batting-order verification and executable price |
| Texas Tech -7.5 vs Houston, 8 p.m. ET | -108 | Ungraded / 0u | Independent cover estimate and current availability/OL verification |
| Dylan Cease strikeouts | Threshold and price unverified | Ungraded / 0u | Actual market, Texas order and innings/strikeout distribution |

Reference book: DraftKings via [ESPN's dated MLB board](https://www.espn.com/mlb/scoreboard/_/date/20260918) and [college board](https://www.espn.com/college-football/scoreboard/_/date/20260918). **Playable ranges and no-bet cutoffs: not established—no bet until regraded.** A better price alone does not resolve the missing handicap inputs.

**Toronto player and game script.** Dylan Cease's 236 strikeouts in 166.1 innings, 2.38 ERA and 72 walks give him a strong strikeout foundation with a real command risk. The plausible winning script is Cease limiting Texas traffic while Toronto creates enough offense against Kumar Rocker to hand over a lead. Toronto's September 17 off day helps the relief situation. But Cease walked five and worked only five innings in his September 13 start: an early exit can erase the starter advantage. Corey Seager and Wyatt Langford are relevant Texas threats in the expected order; the final lineup still matters. Prefer researching the moneyline before paying for a two-run margin or adding a correlated strikeout prop. This is an inference from the verified pitching/workload data, not a quantified win forecast. [Savant](https://baseballsavant.mlb.com/savant-player/dylan-cease-656302), [recent starts](https://www.statmuse.com/mlb/ask/dylan-cease-stats-this-season), [expected lineups](https://www.rotowire.com/baseball/daily-lineups.php).

**Boston player and game script.** Ranger Suarez has a 3.33 ERA, 130 strikeouts and 40 walks over 137.2 innings. The Boston thesis is efficient run prevention and enough offense against Ian Seymour to bring the late relievers into a manageable game. Willson Contreras is a relevant expected right-handed bat against Seymour; Tampa's Junior Caminero and Jonathan Aranda are major threats to that script. Boston's recent box scores show no repeated reliever across September 16–17, and Garrett Whitlock threw 12 pitches September 17. That supports further availability research, not a guarantee he will pitch. The total is now 7 on this feed, leaving little room to build a separate Under merely from Suarez's name. [Suarez data](https://baseballsavant.mlb.com/savant-player/ranger-suarez-624133), [September 17 box score](https://statsapi.mlb.com/api/v1/game/822845/boxscore).

The outside checks add context but cannot manufacture Micks edge: Peterson's Toronto fair line is -141, close to this -137 reference; Burke discusses Boston +113. Both are VSiN opinions, and neither is an independent Micks calculation. Doc's Boston/Toronto articles carry materially different prices and earn no confirmation. [Peterson](https://vsin.com/mlb/mlb-picks-today-greg-peterson-best-bets-friday-september-18/), [Burke](https://vsin.com/mlb/mlb-picks-today-adam-burkes-best-bets-for-friday-september-18/).

## College football and WNBA decisions

**Houston +7.5: pass.** Conner Weigman gives Houston a competitive offensive route, but VSiN's current ratings project Texas Tech by roughly 12.5–14.2, and Burke's separate handicap is Tech -10.5. These are outside estimates, all from one publisher family. They challenge a Houston release and justify researching Tech, without establishing an independent Tech bet. The Texas Tech script needs Hammond and the offensive line to sustain drives; the failure path is protection/availability trouble that keeps Houston within one score. Early two-game/common-opponent comparisons require heavy caution. Lubbock's current NWS forecast does not provide a strong adverse-weather Under argument. [Ratings](https://data.vsin.com/college-football/weekly-power-ratings/), [preview](https://vsin.com/college-football/college-football-week-3-picks-houston-vs-texas-tech/), [NWS](https://forecast.weather.gov/MapClick.php?lat=33.585&lon=-101.885).

**Miami–Wake total 55.5: pass both ways.** Darian Mensah and Malachi Toney support an explosive Miami script, while Gio Lopez provides Wake's path to contributing points. The market reference rose from 50.5 to 55.5, and Burke favors the Over. Other VSiN scoring estimates are lower. No independent pace/possession and scoring projection resolves that conflict. Portland State–Oregon's extreme spread is also a pass; late substitutions and margin behavior are not verified. [Miami preview](https://vsin.com/college-football/college-football-week-3-picks-miami-vs-wake-forest/).

**WNBA: no release.** Toronto +15.5 -115 does not have the verified four-point independent projection gap needed for a strong release. Clark is **probable (back)** in the September 17 4:45 p.m. ET league report, not officially questionable; that report also lists Toronto's Mabrey, Morrow and Sykes out and Conde questionable. New York +6.5 -110 has limited or conflicting outside value. Golden State -12.5 -115 has widely differing ratings and unresolved Portland roles. Expected lineups are not confirmed rotations; no favorite-inflation screen was marked passed without comparable closing-margin evidence. [Dated league report](https://ak-static.cms.nba.com/referee/wnba_injury/Injury-Report_2026-09-17_04_45PM.pdf), [current ratings](https://data.vsin.com/wnba/daily-power-ratings/).

## Framework scoring and market audit

**Correction:** The incomplete subtotals and final Pass grades originally displayed here are withdrawn. All 13 original candidates were missing core research and are UNGRADED. Original values remain only in the superseded assessment audit in candidates.json and Git history. No official releases were changed.

Sharp-money and ticket/handle claims are unverified for these candidates. The public split view was insufficient; JOLT/VOLT/prop tools returned no usable current rows. Some opening fields conflict across market types, so no sharp/timing credit is awarded from that metadata. ESPN's field named `close` is a latest pregame reference here, **not** a recorded final closing line or CLV.

## Every market lane

| Lane | Decision |
|---|---|
| Master Picks | No official straight bets; Toronto/Boston first research alternatives |
| Props Lab | Cease K research only; no executable threshold/price or confirmed opponent order |
| F5 / first half / team totals | Reviewed as alternative expressions; current candidate-specific quotes and independent distributions not established |
| NRFI/YRFI | No release: VSiN/Ballpark Pal feed unavailable on repeat check; plate umpires, confirmed top orders and exact prices incomplete |
| Futures Lab | MLB probability/odds sources screened; no independent Micks probability, simulation, de-vigged executable consensus or release EV established |
| Market AI Replica | Shadow only; incomplete evidence, no qualifying shadow candidate |
| Progressive Fade / Favorite Inflation | No validated trigger or clearance without 5/10/20 comparable margin/closing samples |
| Lotto Parlays | No new parlay from nonqualifying legs. September 20 four-leg Delaware teaser remains separate WATCH, units TBD pending info |
| Longshots | None released |
| Live only | No authorized automatic betting trigger; any in-game angle requires a fresh market/game-state review |
| Pick of the Day | None |

## Event inventory and coverage

All 15 MLB, three WNBA and three FBS-involving college games were screened from the dated board. Seven soccer fixtures across the five major European leagues, MLS and NWSL were inventoried. This is a named-league screen, not a claim that every event worldwide was verified.

| Sport | Event | ET start | Main reference | Disposition |
|---|---|---|---|---|
| CFB | Miami Hurricanes at Wake Forest Demon Deacons | 7:30 PM | MIA -20.5; total 55.5 | No release |
| CFB | Houston Cougars at Texas Tech Red Raiders | 8:00 PM | TTU -7.5; total 52.5 | No release |
| CFB | Portland State Vikings at Oregon Ducks | 10:30 PM | ORE -58.5; total 69.5 | No release |
| MLB | Chicago Cubs at Cincinnati Reds | 6:40 PM | CHC -143; total 8.5 | No release |
| MLB | Kansas City Royals at Pittsburgh Pirates | 6:40 PM | PIT -193; total 8.5 | No release |
| MLB | Milwaukee Brewers at Baltimore Orioles | 7:05 PM | MIL -148; total 8.5 | No release |
| MLB | Athletics Athletics at Cleveland Guardians | 7:10 PM | CLE -231; total 8.5 | No release |
| MLB | Boston Red Sox at Tampa Bay Rays | 7:10 PM | TB -136; total 7.0 | No release |
| MLB | Philadelphia Phillies at New York Mets | 7:10 PM | NYM -112; total 8.5 | No release |
| MLB | Detroit Tigers at Chicago White Sox | 7:40 PM | CHW -132; total 8.5 | No release |
| MLB | Toronto Blue Jays at Texas Rangers | 8:05 PM | TOR -137; total 7.5 | No release |
| MLB | Atlanta Braves at Houston Astros | 8:10 PM | ATL -120; total 8.0 | No release |
| MLB | Seattle Mariners at Colorado Rockies | 8:10 PM | SEA -193; total 10.5 | No release |
| MLB | Washington Nationals at St. Louis Cardinals | 8:15 PM | WSH -111; total 7.5 | No release |
| MLB | Minnesota Twins at Los Angeles Angels | 9:38 PM | MIN -115; total 8.0 | No release |
| MLB | Miami Marlins at San Diego Padres | 9:40 PM | SD -219; total 7.5 | No release |
| MLB | New York Yankees at Arizona Diamondbacks | 9:40 PM | NYY -118; total 8.0 | No release |
| MLB | San Francisco Giants at Los Angeles Dodgers | 10:15 PM | LAD -313; total 8.0 | No release |
| MLS | Red Bull New York at New York City FC | 7:30 PM | NYC -125; total 3.5 | No release |
| NWSL | Kansas City Current at San Diego Wave FC | 10:00 PM | SD +120; total 2.5 | No release |
| Soccer EPL | Chelsea at Brentford | 3:00 PM | CHE +155; total 3.5 | No release |
| Soccer France | Lens at AS Monaco | 2:45 PM | MON -105; total 2.5 | No release |
| Soccer Germany | 1. FC Union Berlin at Bayern Munich | 2:30 PM | MUN -5000; total 5.5 | No release |
| Soccer Italy | Sassuolo at Monza | 2:45 PM | SAS +150; total 2.5 | No release |
| Soccer Spain | Elche at Espanyol | 3:00 PM | ESP -130; total 2.5 | No release |
| WNBA | Indiana Fever at Toronto Tempo | 7:30 PM | IND -15.5; total 187.5 | No release |
| WNBA | New York Liberty at Minnesota Lynx | 7:30 PM | MIN -6.5; total 177.5 | No release |
| WNBA | Portland Fire at Golden State Valkyries | 10:00 PM | GS -12.5; total 160.5 | No release |

- **MLB unresolved checks:** primary probable-pitcher and lineup feeds disagree on some roles, especially Colorado and Philadelphia; Colorado weather risk is material to totals. Home-plate assignments were not confirmed. Detailed two-day relief audits were completed for Toronto/Texas and Boston/Tampa, not certified for all 30 teams. Texas's Jakob Junis pitched both September 16 and 17; Toronto was off September 17. Team-wide exhaustion is not inferred from bulk-starter innings. [Primary schedule](https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=2026-09-18&hydrate=probablePitcher), [weather board](https://www.rotowire.com/baseball/weather.php).
- **Soccer:** no release. Confirmed XIs, current xG and exact derivative prices were not established; FBref was inaccessible and the Opta fixture view did not return the required metrics. Seven listed league games do not cover every soccer competition.
- **NASCAR:** Bristol's Friday O'Reilly race is scheduled for 7:30 p.m. ET. Practice/qualifying and executable prices were not verified, so there is no race bet. [Official weekend schedule](https://www.nascar.com/weekend-schedule/weekend-schedule-for-2026-bristol-motor-speedway-chase-race/).
- **Golf:** the dated ESPN feeds show Biltmore Championship Asheville and BMW PGA Championship in progress. No pre-tournament price is presented as a live opportunity; live positions, round matchups and price/model comparisons remain unverified.
- **Tennis:** tournament headers were returned but dated match-level status, surface-adjusted estimates and executable prices were not verified; no release.
- **NFL, NBA, NHL, college basketball, UFL, CFL:** no September 18 event in the checked ESPN feeds. Where a primary schedule was not fully readable this remains a feed-coverage finding, not worldwide proof of inactivity.
- **UFC/DWCS/boxing:** no Friday official candidate from the covered schedules; next listed UFC/major boxing action is September 19. Smaller promotions and international baseball/other unlisted boards remain outside verified coverage. [UFC schedule](https://www.ufc.com/events), [major boxing schedule](https://www.espn.com/boxing/story/_/id/12508267/boxing-schedule).

## Guides, systems and progressive knowledge

The original **2026 VSiN NFL Betting Guide** and **2026 Fantasy Life magazine** were located, inventoried and their relevant Jets baseline pages checked. They are season priors; there is no NFL game on this dated slate. No NFL candidate or Sunday teaser leg was rescored using unrelated baseball/college data. No other sport-guide original was found in the audited Reference Guides folder or repository trees. This is an applicability audit, not a claim that all 258 PDF pages were reread.

The permanent command now requires applicable original-guide pages, current Fantasy Life utilization/weekly predictions, VSiN systems and independent Micks projections to be reconciled whenever NFL is active. Publisher families cannot be counted repeatedly as independent confirmation. The existing post-Week 1 weighting and June 8/July 12 controls remain in effect.

Sparks September 17 remains **not bet, price not met, 0u**, outside actual betting W/L and ROI. The progressive ledger now carries that correction, NFL mode, guide locations, stale-price checks and injury-label provenance into every run. No statistical weights or stakes were changed from one result. Rolling 20/50/100-play performance and CLV were not recomputed without a complete verified execution/closing-price ledger.

## Source coverage and deliverables

All four required Doc's routes plus its three legacy listing pages were checked. The audit distinguishes accessible content from stale prices, blank tools and unreadable data. Sports Reference pages, parts of FanGraphs, current prop/split tools and first-inning projections were unavailable or incomplete. The accessible FanGraphs playoff alternative was checked; outside probabilities alone did not pass Futures Lab.

Files in this run: `candidates.json`, `source-audit.json`, `guide-audit.json`, `event-inventory.json`, `bullpen-usage.json`, and empty section/complete official import payloads. The payloads document zero releases and were not submitted to replace the website card. Future commands load `current/daily-scan-standard.md/.json` and `current/progressive-knowledge.md/.json`.
