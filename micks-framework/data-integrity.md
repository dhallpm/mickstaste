# Micks Picks Data Integrity Framework

## Source Of Truth
- Google Sheets is the current live source of truth for active picks, props, lotto parlays, longshots, results, sync log, and website feed data.
- Airtable is deprecated/legacy and must not control public website display, current picks, results, props, or odds output unless a future migration explicitly re-enables it.
- GitHub framework files in `micks-framework/` remain the source of truth for rules, grading logic, and source policy.
- ChatGPT conversation memory is temporary support only and must not be the only place a framework rule lives.

## Approved Source / Backup Policy
- DocSports (`docsports.com`) is an approved backup source for Micks Picks source acquisition and market context.
- Use DocSports as a secondary/backup reference for betting previews, matchups, trends, injuries/availability context, team form, odds discussion, and market framing when primary odds/news/model sources are incomplete.
- DocSports may support a pick, watchlist angle, pass, matchup note, or backup confidence label, but it must not be treated as an automatic A-grade source by itself.
- A-grade and official-card decisions still require independent confirmation from the broader framework: current sportsbook price, matchup/model edge, injury/news confirmation, implied probability vs estimated true probability, best number, no-bet cutoff, and conflict checks.
- If DocSports conflicts with sportsbook markets, injury reports, official lineups, or more current odds data, record the conflict in `Unresolved Conflict` and downgrade to Watchlist/Pass until resolved.
- Public cards should not expose backend/source-system wording. Use source notes internally through `Source Verification`, `Market Notes`, or `A-Hunt Source Notes`.

## Sync Priority
- Google Sheets wins for live website display and results unless a dedicated future source-of-truth migration is documented.
- Vercel/API workers should read Google Sheets-backed APIs for public site output.
- Backups must not overwrite valid current Google Sheets rows with blank, stale, or sample data.
- Manual backfill is allowed only when it preserves Record Key and required fields.

## Required Routing
- Straight free/VIP picks route to Master Picks / active picks feed.
- True player props route to Props Lab.
- Parlays, SGPs, lotto props, and safe 5-leg through 8-leg lotto parlays route to Lotto Parlays.
- Longshots, futures, ladders, HR sprinkles, and high-variance plus-money tickets route to Longshots.
- Props Lab must remain player-props-only.

## Row Quality
- Never create blank pick rows.
- A valid pick row requires Date, Game, Pick, Bet Type/market, Odds, and sport/league context.
- Optional analytics fields must not block card creation.
- If a destination rejects an optional field, remove the incompatible field and retry only within the guarded retry limit.
- Result rows require a real settlement marker: Result/Outcome, Profit/Loss, or clear Settlement Status / settlement wording.

## Website Feed
- Website feed should read Google Sheets-backed APIs first.
- Published cards require Status Active/Posted/Released/Pregame/Open and Result Pending.
- Review/draft/archive cards should stay hidden from the public feed unless deliberately published.
- No stale cards should remain when Date is outside the current card date unless Current Card is explicitly true.
- The public site must not display backend labels such as Google Sheets, Airtable, Results Archive source copy, or raw sync wording.

## Archive / Results
- Closed or graded picks move into the results feed/archive path.
- Archive rows must preserve Record Key, original table/category, date, market, odds, units, result, Profit/Loss, closing fields, access, source verification, and archive timestamp.
- Profit/Loss uses Odds and Units only.
- Closing Number is for CLV only.
- Props Results should include settled Props Lab rows when Result/Outcome/Profit-Loss or clear settlement wording confirms Win/Loss/Push/Void.

## Logs And Audit
- Every sync action should write to Sync Log.
- Sync Log should capture timestamp, direction, source, destination, table, record key, action, status, error message, changed fields, and sync batch ID.
- Do not expose private credentials or sync secrets in API responses.
