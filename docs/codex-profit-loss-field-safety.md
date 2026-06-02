# Codex Task: Profit/Loss field safety

## Problem
Airtable warns that changing the Master Picks `Profit/Loss` field configuration impacts 11 dependencies: automations, interfaces, extensions, and API users.

Do **not** change the Airtable field type. It is currently Currency and should stay as-is to avoid breaking dependencies.

## Required behavior
The website and import flow should treat `Profit/Loss` as a legacy/fallback field only.

Primary P/L calculation must come from:

```text
Result + Units + Odds
```

Rules:

```text
Win:
+ odds = Units × Odds / 100
- odds = Units × 100 / abs(Odds)

Loss:
-Units

Push/Void:
0.00u

Pending:
Pending
```

## Current production safety already present
`api/import-airtable-records.js` already strips these blocked fields before Airtable writes:

```text
Result
Outcome
Profit/Loss
P/L
PL
Profit Loss
```

So new imports should not write Profit/Loss at all.

## Codex should verify
1. Do not change the Airtable schema/type for `Profit/Loss`.
2. Do not make CSV/JSON imports send `Profit/Loss`.
3. Results display should calculate P/L from Result + Units + Odds.
4. If `Profit/Loss` exists in Airtable, use it only as a fallback for legacy rows.
5. Future import helpers should omit `Profit/Loss` completely.
6. Manual pick entry should omit `Profit/Loss` completely.
7. Results page should not display broken zero-unit legacy rows.
8. No dependency-breaking Airtable field config changes.

## Files to inspect
- `api/import-airtable-records.js`
- `api/todays-picks.js`
- `lib/buildWebsiteFeed.js`
- results-related page/API files
- import helper pages:
  - `import-airtable.html`
  - `pick-entry.html`

## Acceptance checks
- Import helper successfully imports records with no `Profit/Loss` field.
- Pick entry successfully submits records with no `Profit/Loss` field.
- Results page computes P/L correctly after settlement.
- Airtable `Profit/Loss` field can remain Currency without breaking production.
- No code requires changing `Profit/Loss` to single-line text.
