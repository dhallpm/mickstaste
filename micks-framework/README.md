# Micks Picks Framework Knowledge Base

This folder is the permanent source of truth for the Micks Picks betting analytics framework.

## Purpose
Store the rules, grading logic, betting systems, routing rules, bankroll rules, odds/CLV logic, and archive/data-integrity rules outside of ChatGPT memory so the website, Sheets, Codex, Vercel workers, and future tools can all reference the same framework.

## Core Structure
- `a-grade-hunt.md` - A-Grade Hunt Mode, A/A+ gate rules, B+ bridge grade, and A-Candidate Queue output.
- `current/a-grade-hunt-rules.json` - current A-Hunt rules config loaded by daily Micks Picks generation.
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

## Source of Truth Priority
1. GitHub framework files in this folder
2. Google Sheets data/results
3. Vercel workers/site code
4. ChatGPT conversation memory as temporary support only

ChatGPT memory should not be the only permanent place where framework rules live.
