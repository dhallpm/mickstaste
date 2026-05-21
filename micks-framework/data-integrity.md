# Micks Picks Data Integrity Framework

## Source Of Truth
- Airtable is the source of truth and operator layer for active picks, props, lotto parlays, longshots, results, sync log, and website feed data.
- Google Sheets is backup/archive only.
- Google Sheets must not overwrite active Airtable picks unless manual fallback/backfill is explicitly enabled.

## Sync Priority
- Airtable wins unless the Airtable field is blank, Sync Status is Needs Fallback, or Allow Sheet Override is true.
- Default run-sync must not import blank/current rows from Sheets.
- Sheets to Airtable is manual backfill only.
- Airtable to Sheets is the normal backup mirror.

## Required Routing
- Straight free/VIP picks route to Master Picks.
- True player props route to Props Lab.
- Parlays, SGPs, lotto props, and safe 5-leg through 8-leg lotto parlays route to Lotto Parlays.
- Longshots, futures, ladders, HR sprinkles, and high-variance plus-money tickets route to Longshots.
- Props Lab must remain player-props-only.

## Row Quality
- Never create blank Airtable rows.
- A valid pick row requires Date, Game, Pick, Bet Type/market, Odds, and sport/league context.
- Optional analytics fields must not block card creation.
- If Airtable rejects an optional field, remove the incompatible field and retry only within the guarded retry limit.

## Website Feed
- Website feed should read Airtable first.
- Published cards require Status Active/Posted/Released/Pregame/Open and Result Pending.
- Review/draft cards should stay hidden from the public feed unless deliberately published.
- No stale cards should remain when Date is outside the current card date unless Current Card is explicitly true.

## Archive
- Closed or graded picks move to archive tables.
- Archive rows must preserve Record Key, original table, date, market, odds, units, result, Profit/Loss, closing fields, access, source verification, and archive timestamp.
- Profit/Loss uses Odds and Units only.
- Closing Number is for CLV only.

## Logs And Audit
- Every sync action should write to Sync Log.
- Sync Log should capture timestamp, direction, source, destination, table, record key, action, status, error message, changed fields, and sync batch ID.
- Do not expose Airtable tokens, Google private keys, service account keys, or sync secrets in API responses.
