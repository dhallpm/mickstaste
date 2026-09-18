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
