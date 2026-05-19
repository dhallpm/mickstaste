# Micks Picks Closing Odds / CLV Framework

## Definitions
- Odds = original posted/bet price.
- Closing Number = final market close.
- Verified Closing Number = confirmed final market close.
- Profit/Loss = calculated from Odds only.
- CLV = Closing Number compared to Odds.

## Closing Odds Source Priority
1. Stored sportsbook line
2. BetRivers / DraftKings / FanDuel public market line
3. DonBest / Covers / TeamRankings
4. Odds API / OpticOdds historical endpoint
5. Manual verified screenshot/app check

## Data Integrity Rules
- Never display fallback explanation text as the actual Closing Number.
- Never use Closing Number to calculate Profit/Loss.
- Never overwrite manually verified values.
- Do not guess historical closing lines.
- Use confidence labels for public/static lookups.

## Confidence Labels
- High = exact matchup + market + date + side found
- Medium = matchup/date found but market ambiguous
- Low = broad search result only

## Fallback Rules
If no verified market close exists:
- keep `NEEDS ODDS LOOKUP`
- generate lookup query/URL
- pause CLV
- do not corrupt archive values

## Future Automation
Future Vercel/Apps Script worker should:
1. scan Results Archive
2. find NEEDS ODDS LOOKUP
3. search approved public/static sources
4. update staging table
5. only update Verified Closing Number on high confidence matches