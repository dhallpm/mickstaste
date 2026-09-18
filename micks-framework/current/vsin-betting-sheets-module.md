# Micks Picks — VSiN Vegas Betting Sheets Module

Status: Permanent
Effective date: 2026-07-13
Primary source: https://vsin.com/tools/vegas-betting-sheets/
Applies to: Every daily all-sports market refresh, card build, prop scan, parlay construction, line validation, writeup, and pre-publication check.

## Purpose

The VSiN Vegas Betting Sheets page is a required daily market-input source because it provides access to current Circa betting sheets and links to VSiN sport-specific analysis and tools. It is used to establish the real betting board before Micks Picks grades any side, total, prop, derivative, or parlay.

VSiN and Circa data are inputs, not the final handicap. Micks Picks remains Micks-first. No VSiN opinion, split, rating, or article automatically becomes an official play.

## Required Daily Workflow

Run this sequence for every all-sports refresh:

1. Open the VSiN Vegas Betting Sheets page.
2. Access the current-date Circa all-sports sheets.
3. Confirm the date and discard stale sheets.
4. Inventory every active sport and game before selecting candidates.
5. Record current full-game spreads, moneylines, totals, alternate spreads, run lines, first-half lines, first-quarter lines, first-five lines, first-to-10 or first-to-15 markets, team totals, YRFI/NRFI markets, props, futures, and parlay-eligible prices when available.
6. Check VSiN daily analysis pages for the active sports.
7. Check VSiN betting splits, matchup ratings, power ratings, YRFI/NRFI tools, First Five tools, and prop tools when accessible.
8. Scan Doc's Sports and other approved sources for confirmation or disagreement.
9. Apply the Micks Picks matchup, injury, progressive-pattern, favorite-inflation, correlation, grade, and unit rules.
10. Publish only the plays that survive every gate at the current available number.

## Circa Sheet Requirements

For every official play, retain:

- sheet date;
- sport and league;
- event and start time;
- current Circa line and price;
- full-game spread, moneyline, and total;
- relevant derivative line;
- best number;
- no-bet cutoff;
- line used when the handicap was made;
- whether the current line has moved inside or outside the cutoff;
- source sheet filename when available.

Do not publish a line from memory or from an earlier sheet when a current Circa sheet is available.

## VSiN Tool Use by Market

### Straight sides and totals

Use:

- daily game analysis;
- matchup ratings;
- power ratings;
- betting splits;
- opening versus current line;
- Circa full-game board.

A VSiN side or rating is supporting evidence only. The final pick must have an independent Micks matchup case and pass the progressive-pattern scan.

### MLB Props Lab

Use:

- YRFI/NRFI tools;
- First Five tools;
- starting-pitcher matchup data;
- lineup and weather confirmation;
- Circa first-inning, First Five, team-total, and prop prices.

A high full-game total alone is not enough to release a YRFI. A low total alone is not enough to release an NRFI.

### WNBA and basketball derivatives

Use:

- betting splits;
- power ratings;
- full-game, first-half, first-quarter, and first-to-10 lines;
- injury and projected-rotation confirmation;
- favorite-inflation status.

When a strong team has a poor full-game cover profile, evaluate early derivatives before the spread or moneyline parlay.

### NBA Summer League

Use:

- current Circa lines;
- VSiN daily Summer League analysis when available;
- confirmed active rosters, recent minutes, rest, and likely rotation changes.

No Summer League side may be released solely from a power rating or team name.

### Props and Lotto Parlays

Use VSiN tools to identify candidate markets, then apply:

- exact price validation;
- line cutoff;
- independent Micks confirmation;
- duplicate-exposure rules;
- favorite-inflation restrictions;
- correlation review;
- leg-count limits;
- minimum acceptable parlay return.

Do not convert overpriced favorites into a moneyline parlay merely to create action.

## Data Accessibility and Fallback Rules

When a VSiN tool or endpoint is inaccessible, paywalled, broken, or fails to decode:

1. Do not invent percentages, ratings, picks, or sharp-money claims.
2. Record the specific VSiN input as unavailable.
3. Continue with the Circa betting sheets if they are accessible.
4. Use approved primary or independent sources for injuries, lineups, schedules, and matchup information.
5. Downgrade or pass any play that required the unavailable input for confirmation.
6. Writeups must state that VSiN confirmation was unavailable when that materially affected the grade.

The Vegas Betting Sheets page can validate the market board even when VSiN splits or model tools are unavailable.

## Source Weighting

Required order:

1. Current Circa sheet and current market price.
2. Confirmed injury, lineup, pitcher, goalie, roster, and availability information.
3. Micks matchup and game-script analysis.
4. Progressive Pattern and Favorite Inflation modules.
5. VSiN betting splits, matchup ratings, power ratings, YRFI, First Five, and prop tools.
6. VSiN daily editorial analysis.
7. Doc's Sports and other approved external handicappers.
8. Historical trends.

VSiN is never allowed to override a bad number, stale line, unresolved injury, failed pattern gate, or excessive correlated exposure.

## Props Lab Qualification

A VSiN-derived prop candidate must meet all of the following before release:

- exact market and price confirmed on the current board;
- independent role, matchup, scoring-path, or event-path support;
- line is inside the no-bet cutoff;
- no duplicate exposure that violates card-level limits;
- no unsupported use of betting splits;
- minimum B grade under the normal Props Lab rules;
- writeup explains the exact cashing path and failure path.

## Lotto Parlay Qualification

A VSiN-derived parlay candidate must meet all of the following:

- every leg independently qualifies at B- or better;
- no Level 2 or Level 3 Favorite Inflation leg unless the governing module explicitly permits the lower-variance derivative;
- no two active inflation-alert teams in the same official parlay;
- no leg included only because its moneyline is short;
- no more than one duplicated straight-play exposure unless explicitly approved and disclosed;
- combined price meets the minimum-return requirement;
- stake remains smaller than straight-bet exposure;
- writeup explains each leg, correlation, duplication, and price requirement.

## Required Record Fields

Future cards should support:

- `VSiN Betting Sheets Checked`
- `VSiN Sheet Date`
- `VSiN Sheet Filename`
- `Circa Opening Line`
- `Circa Current Line`
- `Circa Derivative Market`
- `VSiN Daily Analysis Checked`
- `VSiN Betting Splits Checked`
- `VSiN Power Rating Checked`
- `VSiN Matchup Rating Checked`
- `VSiN YRFI NRFI Checked`
- `VSiN First Five Checked`
- `VSiN Prop Tool Checked`
- `VSiN Data Availability`
- `VSiN Directional Signal`
- `VSiN Influence Level`
- `Independent Micks Confirmation`
- `Line Validation Status`
- `Best Number`
- `No Bet Cutoff`

## Publishing Validation

Before declaring a card final:

1. Confirm the current-date VSiN/Circa sheet was checked.
2. Confirm every listed line matches the final source data.
3. Confirm no already-started event is published as a pregame play.
4. Confirm unavailable VSiN data was not fabricated.
5. Confirm all props and parlays passed their specific qualification gates.
6. Confirm Favorite Inflation and Progressive Pattern restrictions were applied.
7. Confirm total card exposure and duplicate team exposure are within limits.
8. Confirm writeups distinguish Circa prices, VSiN information, outside opinions, and Micks conclusions.
9. Confirm the final API and website display the same picks and numbers.
10. Verify the live endpoint after deployment.

## Governing Rule

Use the VSiN Vegas Betting Sheets page to establish the real daily market board and access current Circa lines. Use VSiN tools to find and challenge candidates. Use the Micks Picks framework to decide whether the wager belongs on the card.