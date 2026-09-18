# Micks Picks Framework — Current Setup

## Standard daily command — effective 2026-09-18

“Run Micks Picks for today's slate” invokes the complete workflow in [daily-scan-standard.md](daily-scan-standard.md) and loads [progressive-knowledge.md](progressive-knowledge.md). This includes all applicable sports/market scans, original-guide and current-prediction reconciliation, the 110-point framework, shadow/futures modules, player/game-script writeups, price gates and a source audit. Preserve NFL standard mode and non-NFL Recovery Mode+. Dated reports live under `micks-framework/runs/YYYY-MM-DD/`. Missing essential evidence blocks release; zero official bets is a valid outcome.

Effective date: 2026-09-17

This folder stores the active Micks Picks operating framework used for daily all-sports runs, candidate scoring, Pick of the Day selection, Futures Lab evaluation, results archiving, research-agent work and site publishing.

## Core principle

Micks Picks is **Micks-first**. Outside handicappers, VSiN, Doc’s Sports, AI-v3, Action Network, Covers, ESPN, TeamRankings, StatMuse, Sports Reference, Perplexity and any other source are supporting confirmation only. They do not create the handicap or grade by themselves.

The required daily-card decision order is:

1. Independent Micks handicap and fair-price estimate
2. Matchup / role / injury / lineup verification
3. NFL guide/current-projection reconciliation when NFL is active
4. Market Intelligence Layer
5. External-model and handicapper confirmation
6. Failure-case analysis
7. Final 110-point score, grade, units, Best Number and No-Bet Cutoff

## Master source registry — controlling

`source-registry.md` is the canonical checklist for every full Micks Picks research scan and rerun.

A full scan is not complete until every applicable source category in that registry has been checked and classified as CURRENT, STALE, INACCESSIBLE, NOT APPLICABLE, or SUPPORTING ONLY.

## NFL post-Week 1 reconciliation — mandatory

`nfl-post-week1-reconciliation.md` and `.json` control every NFL scan from Week 2 forward.

Before any NFL candidate is scored, cross-reference the stored VSiN and Fantasy Life guide priors with verified current-season usage/efficiency, current Fantasy Life weekly projections/utilization, current VSiN models/systems and the executable market. Every scan must show a Guide/System Reconciliation Table and Fantasy Projection Delta Board.

Fantasy Life pages are one source family; VSiN pages are one source family. An unresolved material contradiction caps the candidate at 81/110 and requires `WATCH/PASS` until resolved.

NFL is in standard operating mode as of 2026-09-17. Recovery Mode+ no longer applies to NFL candidates. NFL uses the normal grade ladder, A-range eligibility and standard card limits in `framework.md/.json`; Recovery Mode+ remains active for non-NFL daily-card candidates unless separately disabled.

## Micks 2.0 Market Intelligence Layer

`market-intelligence-layer.md` is a permanent active module.

It adds a 20-point market-intelligence component to the existing 110-point daily-card scoring framework:

- Sharp / respected movement: 0–6
- Ticket / handle divergence: 0–5
- Liquidity / market quality: 0–4
- Movement timing / reversal quality: 0–5

The market layer is read only **after** the independent handicap is formed. It may confirm, challenge or downgrade Micks; it may never create a play by itself.

Doc’s Sports AI-v3 (`https://www.docsports.com/cappers.html?cap_id=88`) is a dynamic comparison source for this layer when it has a current relevant selection. Model descriptions or marketing claims do not earn score points.

## Market AI Replica — experimental shadow module

`market-ai-replica.md` and `market-ai-replica.json` define a permanent experimental shadow engine built from observable market behavior rather than proprietary Doc's internals.

Every serious candidate on a full Micks scan now receives a shadow Market AI Replica evaluation after the normal Micks handicap has been built. The replica measures:

- independent fair-line strength
- market dislocation / EV
- fundamental confirmation
- market microstructure
- independent calculated-model agreement
- best market expression
- market regime quality
- failure-case robustness

The replica can return a shadow candidate or PASS, but it does not override the official 110-point Micks release framework. Results and CLV are reviewed after 20, 50 and 100 shadow candidates before replica-derived weighting can be promoted into the official score.

`ai-v3-audit-ledger.csv` is the controlling historical benchmark schema. Historical Doc's AI-v3 rows must be independently verified before their result, line, P/L arithmetic, CLV or trigger tags are used as training evidence. Unknown historical market fields stay UNKNOWN rather than being inferred.

## Futures Lab

`futures-lab.md` and `futures-lab.json` control all long-horizon markets. `futures-source-registry.md` is the futures-specific model/source checklist.

Futures are evaluated separately from the daily card. They use independent Micks probability estimates, multi-book de-vigged market consensus, independent projection/model inputs, scenario or Monte Carlo simulation where appropriate, roster/role/health/schedule analysis, Market Intelligence, EV and correlation controls.

Futures use a separate 100-point score and separate bankroll ledger. They do **not** consume Recovery Mode+ daily official-play slots.

Default Futures Lab release gates:
- score >= 78/100
- Failure Score >= 7/10
- estimated EV >= 5%
- 8%+ preferred for long-dated markets
- 10%+ preferred for thin, high-variance outrights
- at least two independent support paths beyond the sportsbook price

## CLV tracking

Closing Line Value is a mandatory post-release diagnostic whenever a reliable comparable closing number is available.

Store release line/price, closing line/price, Beat Close / Neutral / Lost Close, CLV magnitude when calculable and closing-market source.

For futures, also track current-price / mark-to-market movement over the life of the position. Review rolling CLV over 20, 50 and 100 official plays by sport, market family, grade and release timing.

## Every run must include

1. Master Picks
2. Props Lab
3. NRFI/YRFI and derivative-market candidates where applicable
4. Futures Lab scan
5. Lotto Parlays
6. Longshots
7. Watchlist / Live-only angles
8. Passes
9. Pick of the Day
10. Scored candidate chart before final release
11. Market AI Replica shadow score for serious candidates
12. NFL Guide/System Reconciliation Table and Fantasy Projection Delta Board when NFL is active

## Official limits

Normal daily-card limits remain governed by the current framework and any active Recovery Mode rules. Do not force every sport to produce a bet. A PASS or zero-play card is a valid model output.

For NFL, standard limits apply: maximum four official straight bets, three official props and one main parlay, with 1.25u–2.25u target official exposure. These are limits and a planning range, not quotas. The normal NFL release floor is B (74/110); a B- may be released only as a fully verified play of 0.25u or less under the NFL reconciliation module.

Futures exposure is tracked separately under `futures-lab.md`.

## Recovery Mode+

When active for non-NFL daily-card candidates:
- Minimum daily-card release score: 82/110
- Minimum Failure Score: 7/10
- Current daily play cap applies
- No release based mainly on one model, one handicapper or one market signal
- Exact price must remain inside the No-Bet Cutoff
- Futures Lab positions do not consume the daily play cap

## Pick of the Day rules

Pick of the Day must be a real, actionable daily-card official release with a live price, positive units and a qualifying grade. Futures, watchlists, passes, live-only placeholders and generic framework rules are not Pick of the Day unless a separate Futures Feature designation is explicitly created.

## Results archive

After settlement, completed daily-card rows move to Results Archive and are removed from the active card. Results tracking should include Profit/Loss and CLV fields when reliable closing data is available.

Futures remain active until the market is closed/graded and use their own lifecycle fields including posted price, current price, fair probability, estimated EV, correlation group and final result.

## Key files

- `source-registry.md` — canonical full-scan source checklist and sport-specific research stack
- `nfl-2026-reference-module.md/.json` — stored 2026 VSiN and Fantasy Life guide priors
- `nfl-post-week1-reconciliation.md/.json` — mandatory Week 2+ guide, usage, projection and system reconciliation
- `candidate-scoring-and-writeup-standard.md` — controlling 110-point daily-card score and grade rules
- `market-intelligence-layer.md` — market movement, splits, liquidity, timing and CLV rules
- `market-ai-replica.md` — experimental market-aware shadow decision engine
- `market-ai-replica.json` — machine-readable replica configuration
- `ai-v3-audit-ledger.csv` — historical benchmark feature ledger
- `futures-lab.md` — Futures Lab probability, EV, scoring, exposure and tracking rules
- `futures-lab.json` — machine-readable Futures Lab configuration
- `futures-source-registry.md` — futures-specific model/source checklist
- `reference-guide-inventory.md` — stored annual-guide inventory and guide-ingestion policy
- `framework.md` — human-readable operating rules
- `framework.json` — machine-readable framework/config
- `perplexity-master-prompt.txt` — research-agent prompt
- `codex-maintenance-prompt.md` — site/framework maintenance prompt
