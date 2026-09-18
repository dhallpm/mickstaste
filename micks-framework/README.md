# Micks Picks Framework Knowledge Base

## Standard daily command — effective 2026-09-18

“Run Micks Picks for today's slate” invokes the complete workflow in [current/daily-scan-standard.md](current/daily-scan-standard.md) and loads [current/progressive-knowledge.md](current/progressive-knowledge.md). This includes all applicable sports/market scans, original-guide and current-prediction reconciliation, the 110-point framework, shadow/futures modules, player/game-script writeups, price gates and a source audit. Preserve NFL standard mode and non-NFL Recovery Mode+. Dated reports live under `micks-framework/runs/YYYY-MM-DD/`. Missing essential evidence blocks release; zero official bets is a valid outcome.

This folder is the permanent source of truth for the Micks Picks betting analytics framework.

## Purpose
Store the rules, grading logic, betting systems, routing rules, bankroll rules, odds/CLV logic, and archive/data-integrity rules outside of ChatGPT memory so the website, Sheets, Codex, Vercel workers, and future tools can all reference the same framework.

## Core Structure
- `current/README.md` - controlling active setup and module index.
- `current/source-registry.md` - mandatory full-scan source checklist.
- `current/candidate-scoring-and-writeup-standard.md` - controlling 110-point score and Recovery Mode+ gates for non-NFL candidates; NFL uses standard mode.
- `current/market-intelligence-layer.md/.json` - market movement, splits, liquidity, timing and CLV rules.
- `current/nfl-2026-reference-module.md/.json` - stored 2026 VSiN and Fantasy Life guide priors.
- `current/nfl-post-week1-reconciliation.md/.json` - mandatory Week 2+ NFL guide, usage, current-projection and betting-system reconciliation.
- `a-grade-hunt.md` - A-Grade Hunt Mode, A/A+ gate rules, B+ bridge grade, and A-Candidate Queue output.
- `current/a-grade-hunt-rules.json` - current A-Hunt rules config loaded by daily Micks Picks generation.
- `current/world-cup-path-leverage.json` - World Cup Path Leverage Mode for soccer futures, group winner, qualify/top-2, and live group-position markets.
- `current/post-june8-adjustments.md` - post-June 8 risk-adjustment rules for MLB totals, WNBA model gaps, props, and parlays.
- `current/post-june8-adjustments.json` - current Post-June 8 rules config loaded by daily Micks Picks generation.
- `mlb.md` - MLB framework
- `nba.md` — NBA and NBA playoff framework
- `wnba.md` — WNBA framework
- `ufc.md` — UFC framework
- `props.md` — player/team prop framework
- `lotto-parlays.md` — 5-leg, 6-leg, 7-leg, and 8-leg safe lotto parlay framework
- `bankroll.md` — units, exposure, risk, and grade sizing
- `closing-odds.md` — odds, closing number, CLV, and fallback policy
- `data-integrity.md` — sheet routing, archive cleanup, and display rules
- `changelog.md` — every future framework change should be recorded here

## Operating Rule
When the Micks Picks framework changes, update the relevant file and add a dated note to `changelog.md`.

From NFL Week 2 forward, no NFL candidate may be scored before completing the Guide/System Reconciliation Table and Fantasy Projection Delta Board required by `current/nfl-post-week1-reconciliation.md`.

## Source of Truth Priority
1. GitHub framework files in this folder
2. Google Sheets data/results
3. Vercel workers/site code
4. ChatGPT conversation memory as temporary support only

ChatGPT memory should not be the only permanent place where framework rules live.
