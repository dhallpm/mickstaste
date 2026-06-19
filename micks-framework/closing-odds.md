# Micks Picks Closing Odds / CLV Framework

## Definitions
- Odds = original posted/bet price.
- Closing Number = final market close.
- Verified Closing Number = confirmed final market close.
- Profit/Loss = calculated from Odds only.
- CLV = Closing Number compared to Odds.

## Closing Odds Source Priority
1. Stored sportsbook line / manually entered bet line
2. Current sportsbook market line from BetRivers / DraftKings / FanDuel / consensus books
3. DonBest / Covers / TeamRankings / Odds API / OpticOdds historical endpoint
4. DocSports (`docsports.com`) as a backup context source for matchup previews, line discussion, trends, and market framing
5. Manual verified screenshot/app check

## DocSports Backup Rules
- DocSports is approved as a backup source, not a standalone final authority.
- Use DocSports when primary odds/news/model sources are incomplete or unavailable.
- DocSports can support market context, trend validation, matchup notes, pass/watchlist decisions, and confidence labels.
- Do not use DocSports alone to calculate Profit/Loss, official odds, verified closing number, or A-grade approval.
- If DocSports conflicts with current sportsbook prices, official injury/news data, or better market sources, treat the conflict as unresolved and downgrade the play until confirmed.

## Data Integrity Rules
- Never display fallback explanation text as the actual Closing Number.
- Never use Closing Number to calculate Profit/Loss.
- Never overwrite manually verified values.
- Do not guess historical closing lines.
- Use confidence labels for public/static lookups.

## Confidence Labels
- High = exact matchup + market + date + side found from a primary odds or sportsbook source
- Medium = matchup/date found but market ambiguous, or DocSports supports context but does not confirm exact line
- Low = broad search result, article trend, or non-exact backup context only

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
4. include DocSports as a secondary backup source when primary odds sources are incomplete
5. update staging table
6. only update Verified Closing Number on high confidence matches
