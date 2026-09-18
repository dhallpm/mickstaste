Research completeness correction (September 18, 2026): apply research-readiness.md before legacy scoring instructions. Unknown data is null, not negative evidence; incomplete core research is UNGRADED. Existing weights, modes and release standards remain unchanged.

# Micks Picks Framework — Current Operating Setup

## Standard daily command — effective 2026-09-18

“Run Micks Picks for today's slate” invokes the complete workflow in [daily-scan-standard.md](daily-scan-standard.md) and loads [progressive-knowledge.md](progressive-knowledge.md). This includes all applicable sports/market scans, original-guide and current-prediction reconciliation, the 110-point framework, shadow/futures modules, player/game-script writeups, price gates and a source audit. Preserve NFL standard mode and non-NFL Recovery Mode+. Dated reports live under `micks-framework/runs/YYYY-MM-DD/`. Missing essential evidence blocks release; zero official bets is a valid outcome.

Backup date: 2026-07-11

## Principle

Micks Picks is **Micks-first**. Outside handicappers and models are supporting confirmation only, not the engine.

## NFL Week 2+ reconciliation

Before scoring any NFL side, total, prop, derivative or parlay leg, load `nfl-2026-reference-module` and `nfl-post-week1-reconciliation`.

Cross-reference the stored VSiN and Fantasy Life guide priors with verified current-season role/efficiency, the newest Fantasy Life weekly projection/utilization layer, the newest VSiN model/system layer and the current executable price. Show the Guide/System Reconciliation Table and Fantasy Projection Delta Board on every full NFL scan.

The Fantasy Life magazine and current Fantasy Life pages are one source family. The VSiN guide, models and systems are one source family. An unresolved material contradiction caps the candidate at 81/110 and requires `WATCH/PASS` until resolved.

NFL is in standard operating mode as of 2026-09-17. Recovery Mode+ does not apply to NFL; it remains active for non-NFL daily-card candidates unless separately disabled. NFL uses the normal grade ladder with A-range releases enabled, a normal B (74/110) official-release floor, and standard card limits. A B- is limited to a fully verified small release of 0.25u or less.

## Required sections every run

- Master Picks
- Props Lab
- Lotto Parlays
- Longshots
- Watchlist / Live-only angles
- Passes
- Pick of the Day
- Separate import JSON files
- Complete all-sections import JSON

## Grading

| Grade | Meaning |
|---|---|
| A+ | Rare premium straight bet. VIP eligible. |
| A | Strong straight bet. VIP eligible. |
| A- | Strong premium play with one material variance concern. VIP eligible. |
| B+ | Strong public play with multiple verified edges. |
| B | Playable straight bet. |
| B- | Small straight bet. |
| C | Lean, watchlist, longshot, live-only, or optional sprinkle. |
| Pass | No edge. |

Below A-/A/A+ must normalize to Free unless the user explicitly overrides access.

## Card limits

- Max official straight bets: 4 unless the user explicitly approves a larger slate
- Max official props: 3 unless the user explicitly approves a larger slate
- Max main parlay: 1
- Max longshots: 3
- Longshot exposure max: 0.15u unless user asks for lotto card
- Target official exposure: 1.25u to 2.25u on normal cards
- Larger tournament or all-sports slates must show the total unit risk before publishing
- Do not force plays from every sport

For NFL, the limits above replace the Recovery Mode+ 1–2-play cap. The Failure Score and strongest failure path remain mandatory diagnostics, but the Recovery Mode+ 7/10 minimum is not an NFL hard gate.

## Pick of the Day eligibility

Must have all of the following:

- Real team/player/matchup
- Real odds
- Units > 0
- Grade A+, A, A-, B+, or B
- Status Pending, Released, VIP Released, or Free Released
- Not Watchlist
- Not Pass
- Not live-only
- Not a generic framework rule

Never eligible:

- Elite Favorite Set-1 Loss Live Watchlist
- No Game Today
- Pass Today
- Game 3 Watchlist
- Live Watchlist
- Any Units = 0 row
- Odds = Watchlist, Live only, Pass, or N/A

Pick of the Day display fields:

- Pick
- Game
- Sport/League
- Grade
- Units
- Odds
- Best Number
- No Bet Cutoff
- Short writeup

## Correlation rules

One strong game angle = one official play.

Avoid official same-game stacks such as:

- side + pitcher strikeouts + pitcher outs + team total
- spread + same-game total + same-game prop unless independent
- favorite ML + run line + alt line unless ladder is Longshot

Secondary same-script plays go to Watchlist, Longshots, or Pass.

## Source rules

Priority order:

1. Current odds and line movement
2. Injury/lineup/pitcher/goalie confirmations
3. Team matchup and game-script analysis
4. Market splits/sharp money
5. Models/projections
6. Outside handicappers
7. Historical trends

If sources conflict, downgrade to B-, C, Watchlist, or Pass unless Micks has a clear independent reason.

Outside sources such as Doc's Sports and VSiN may confirm, challenge, or downgrade a play, but may never replace independent Micks analysis. Writeups must distinguish verified facts, model projections, external opinions, and Micks conclusions.

## Permanent writeup style

This is the required Micks Picks editorial standard for every future card, API record, Airtable import, website card, VIP release, text blast, and recap. Do not revert to one- or two-sentence generic summaries.

### Universal rules

Every official pick must:

1. State the betting thesis immediately.
2. Explain the actual matchup or role-based edge.
3. Include market context: odds, best number, and no-bet cutoff when available.
4. Explain how the bet is expected to cash.
5. Identify the most important failure path or variance concern.
6. Connect the grade and unit size to the strength of the evidence.
7. Use customer-facing language with no backend, routing, JSON, prompt, model-debug, or import terminology.
8. Avoid unsupported statistics, invented injuries, invented trends, and false consensus claims.
9. Preserve the exact pick, market, grade, units, odds, best number, and cutoff supplied by the final card.
10. Be written specifically for the listed matchup; generic copy is not acceptable.

### Required analysis sections

Use these concepts in this order. Headings may be displayed or incorporated naturally depending on the page design:

1. **Opening Thesis** — the clearest one- or two-sentence reason the wager belongs on the card.
2. **Matchup Edge** — tactical, personnel, role, pitching, lineup, pace, usage, or style advantage.
3. **Projection / Metric Edge** — verified model gap, usage expectation, efficiency profile, market-implied probability, or other measurable support.
4. **Market and Number Context** — current price, preferred market, best number, cutoff, line movement, and why an alternate market was rejected.
5. **How It Cashes** — the expected game script or statistical path required for the ticket to win.
6. **Risk and Variance** — the strongest opposing case, injury uncertainty, blowout/backdoor risk, foul trouble, bullpen risk, extra-time risk, or other failure path.
7. **Micks Picks Verdict** — why the evidence supports the assigned grade and unit size.

### Tier standards

#### VIP picks

- Target length: 300–600 words when the available verified information supports it.
- Minimum usable length: 225 words.
- Must include all seven required analysis concepts.
- Must explain why the selected market is superior to the obvious alternative, such as To Advance versus 90-minute moneyline or run line versus expensive moneyline.
- Must include Best Number, No-Bet Cutoff, confidence, risk, and why the play made VIP.
- Must never merely restate the pick or rely on reputation, rankings, or consensus.
- VIP analysis belongs in `Full Analysis`; a separate concise public teaser may be stored in `Writeup` or `Home Preview`.

#### Free picks

- Target length: 125–225 words.
- Minimum usable length: 100 words.
- Must include Opening Thesis, Matchup Edge, Market and Number Context, How It Cashes, Risk, and Verdict.
- Give real value without publishing every premium note reserved for VIP.
- State why the play remains Free rather than VIP when the limiting factor is meaningful.

#### Props Lab

- Target length: 90–160 words.
- Minimum usable length: 75 words.
- Must emphasize role, minutes or opportunity, usage/volume, matchup, threshold, price, and failure path.
- Player props must explain why the player can reach the exact posted number; team or game props must explain the scoring or event pathway.
- Avoid broad statements such as “high usage” unless the role or expected opportunity is described.

#### Lotto Parlays

- Target length: 100–175 words.
- Must explain every leg, whether the legs are independent or correlated, why the combination is preferable to adding more legs, and why the stake is smaller than straight-bet exposure.
- Must disclose duplication with straight plays when applicable.
- Do not call a parlay safe. Use terms such as lower-variance version, preferred combination, or small-stake construction.

#### Longshots

- Target length: 60–120 words.
- Must explain the plausible upset or scoring path, the price-driven upside, and strict bankroll discipline.
- Must clearly label the play as high variance and never present it as a core position.

#### Watchlist / live-only angles

- Target length: 40–100 words.
- Must specify the exact trigger, acceptable live number, game-state condition, and reason no pregame wager is being made.

#### Passes

- Target length: 30–90 words.
- Must state the specific conflict, pricing issue, uncertainty, correlation problem, or missing confirmation that prevented release.

### Writing quality rules

Use:

- Direct sportsbook and handicapping language
- Concrete matchup detail
- Clear differentiation between model projection and market price
- Short paragraphs suitable for mobile cards
- Active voice
- Honest uncertainty

Avoid:

- “This matchup gives enough paths”
- “This creates a specific handicap, not just a lean”
- “We like this spot” without explaining why
- Repetitive “should” statements
- Empty claims of sharp money, consensus, steam, or value
- Guaranteed-win language, locks, or certainty claims
- Birthday, superstition, or narrative notes as handicapping evidence
- Copying an outside handicapper's wording

### Field mapping

- `Writeup`: customer-facing concise analysis appropriate to the pick tier.
- `Full Analysis`: complete VIP-style structured breakdown when the pick is VIP or when a full report is requested.
- `Risk`: strongest failure path, not a generic disclaimer.
- `Market Notes`: price movement, alternative-market comparison, best number, and cutoff context.
- `Why This Play`, `Matchup Edge`, `Projection Edge`, `Key Metrics`, and `Final Take`: use when the destination supports structured fields.
- `Home Preview`: public teaser that does not expose protected VIP numbers or full reasoning.

### Publishing validation

Before a card is declared live:

1. Confirm every official pick has a tier-compliant writeup.
2. Confirm no writeup contains backend or internal-system language.
3. Confirm VIP full analysis is visible only in the protected VIP destination.
4. Confirm Free, Props, Parlays, and Longshots render in their proper sections.
5. Confirm the displayed unit total equals the sum of all official plays, with parlays and longshots separately identified when excluded.
6. Confirm the public and VIP repositories use the same final pick facts while respecting access gating.
7. Verify the live endpoint after deployment; do not rely only on a successful GitHub commit.

## Full Analysis format

Every official pick should include:

1. Opening Thesis / Why We Like It
2. Matchup Edge / Game Script
3. Projection or Metric Edge
4. Market and Number Context
5. How It Cashes
6. Risk / What Can Go Wrong
7. Best Number / Cutoff
8. Micks Picks Verdict

## Airtable import format

```json
{
  "batches": [
    { "table": "picks", "records": [] },
    { "table": "propsLab", "records": [] },
    { "table": "lottoParlays", "records": [] },
    { "table": "longshots", "records": [] }
  ]
}
```

Valid table aliases:

- picks
- propsLab
- lottoParlays
- longshots

Do not include these fields in new import JSON:

- Result
- Outcome
- Profit/Loss
- Profit-Loss

## Results archive

Final results:

- Win
- Loss
- Push
- Void
- Cancelled

After settlement:

1. Calculate Profit/Loss, ROI, CLV, and CLV Result.
2. Copy completed record to Results Archive.
3. Include Original Table, Original Record ID, Record Key, and Archived At.
4. Delete from active source table only after archive creation succeeds.
5. Avoid duplicates by Record Key or Original Record ID.

Results page reads Results Archive. Active pages exclude completed rows.

## MLB framework

Before MLB can grade B or higher:

- Starting pitcher confirmed
- Lineup confirmed or projected lineup supports handicap
- Weather/wind/park checked
- Bullpen usage last 2 days checked
- Current odds inside cutoff
- Not dependent on one source/capper
- At least two independent paths to cash

Team totals: do not assume pitcher early exit equals team total over. Need lineup, weather/park, and bullpen path.

Pitcher props: confirm starter, pitch count stability, opponent profile, and soft threshold.

## NBA framework

- Prefer spread protection over ML when close-game script is likely.
- Favor role-stable props such as rebounds, assists, usage, and minutes.
- Check injuries, minutes, foul trouble, pace, and late-game path.
- Full analysis needs actual game script.

Saved NBA lessons:

- Game 2 regression after extreme Game 1 outliers.
- Fade teams after 30+ point wins or 20+ ATS overperformance.
- Home bounce-back is stronger with structural edges.
- Unders when free throws/outlier/transition systems align.
- Fatigue normalization for Game 7 or short-rest dogs.

## WNBA framework

- Model gap plus injury/role confirmation required.
- Expansion-team volatility matters.
- Avoid forcing large favorites.
- Use live triggers when pregame number is uncertain.
- Avoid overreacting to small-sample blowouts.
- Fade inflated favorites after dominant or televised wins.
- Prefer coaching continuity and defensive structure for dogs in low-possession games.
- High-tempo guard-heavy matchups with weak transition defense can support Overs.
- Prefer live Overs after slow starts when pace and shot quality are healthy.

## NHL framework

- Confirm goalies.
- Account for injuries and special teams.
- Playoff ML coin flips stay B- or lower unless price is strong.
- Use live entry when pace/goalie/penalty flow determines edge.
- Watch goalie-change and adjustment spots in playoff series.

NHL sources: MoneyPuck, Natural Stat Trick, Evolving-Hockey, TeamRankings NHL.

## UFC / Boxing framework

- Confirm fight active.
- Confirm weigh-ins.
- Check line movement.
- Prefer one clear ML/value side over multiple underdog darts.
- Max one UFC longshot unless full fight card requested.

## Tennis framework

Pilot framework only. No A-grade until tracked.

Max grade: B+.
Max units: 0.50u.

Filters:

- Rating gap
- Surface Elo
- Hold/break percentage
- Fatigue
- Motivation
- Market type

Generic live rules are watchlist only unless actual player/match/odds/units are specified.

## Soccer / World Cup futures

- Futures use lower units because bankroll is tied up.
- Compare implied probability to realistic path.
- Consider group format, bracket path, travel, injuries, manager, and group strength.
- Exact finishing order is parlay-like and gets smaller units.

## NASCAR framework

Requires:

- Race status
- Current odds
- Starting position
- Practice/qualifying speed
- Simulation support
- Market type: outright, top-5, top-10, matchup

No official NASCAR after race starts unless using live-market edge. Without price, Watchlist only.

## Yahgis Picks

Yahgis Picks is a separate spot model, not a copy of Micks Picks.

Track:

- Exact line
- Yahgi grade/unit
- Micks cross-grade
- Justification
- Shared evidence
- Safest version
- Value version

Known tracked items:

- Spurs ATS win clarified as Spurs -3.5 with 2.5% bankroll exposure.
- KAT 30+ P+R +100 was a Yahgis A full-unit spot.

## Perplexity role

Perplexity should search and cite current data, but Micks framework does the handicapping.

## Codex role

Codex fixes site logic, enforces the permanent tiered writeup standard, validates Pick of the Day filters, protects Results Archive, separates watchlists, enforces correlation and parlay/longshot limits, preserves VIP/free gating, and verifies deployed endpoints before reporting completion.
