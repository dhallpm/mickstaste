# Micks Picks — Birthday Filter

## Purpose
Check every active player on the daily slate across ALL sports for birthdays. Flag same-day birthdays, birthday-game spots, shared birthdays within the same game, and any player with meaningful birthday performance history.

Birthday data is a **secondary support signal only** — it never creates a bet by itself but can reinforce or add narrative color to a pick already supported by price, matchup, role, or lineup context.

---

## Priority Order in Framework
1. Sheet price vs. cutoff (primary)
2. Injury / lineup / starter / goalie confirmation (second)
3. Weather / travel / rest (third)
4. **Birthday filter ← runs here** (fourth — support only)
5. Source list checks (TeamRankings, UmpScorecards, VegasInsider, Action Network, StatMuse, etc.)

---

## Sports Coverage

### ⚾ MLB
- **Primary source:** Baseball Savant Birthday Index — https://baseballsavant.mlb.com/birthday-index
- **Backup source:** Baseball Almanac — https://www.baseball-almanac.com/players/baseball_births.php
- **Check:** Starting pitchers, full lineup starters, key relievers
- **Flag:** Player birthday today, shared birthday in same game, birthday wOBA/OPS splits
- **Use case:** Supports totals, individual props, and pitcher performance notes

### 🏀 NBA
- **Primary source:** Basketball Reference — https://www.basketball-reference.com
- **Backup:** ESPN rosters
- **Check:** All active roster players for that game day
- **Flag:** Star player birthday today, shared birthdays in same matchup
- **Use case:** Player props and game totals narrative note

### 🏀 WNBA
- **Primary source:** WNBA.com rosters — https://www.wnba.com
- **Backup:** Basketball Reference
- **Check:** All active roster players for that game day
- **Flag:** Birthday today, shared birthdays in same game
- **Use case:** Same as NBA — props and totals narrative support

### 🏒 NHL
- **Primary source:** Hockey Reference — https://www.hockey-reference.com
- **Backup:** NHL.com rosters
- **Check:** Starting goalies, top lines, power play units
- **Flag:** Goalie birthday today, star player birthday, shared birthdays in game
- **Use case:** Goalie prop support, game totals note

### 🏈 NFL (future season)
- **Primary source:** Pro Football Reference — https://www.pro-football-reference.com
- **Backup:** Team roster pages
- **Check:** Starting QB, skill position starters, key defenders
- **Flag:** QB birthday today, key skill player birthday, shared birthdays in game
- **Use case:** Props, totals, and matchup narrative support

### ⚽ Soccer / MLS / International
- **Primary source:** FBref — https://fbref.com
- **Backup:** Transfermarkt, Soccerway
- **Check:** Starting XI when available
- **Flag:** Goalkeeper birthday, key forward birthday, shared birthdays in match
- **Use case:** Match result and totals support note

### 🥊 UFC / Boxing / MMA
- **Primary source:** UFC Stats — http://www.ufcstats.com
- **Backup:** BoxRec — https://boxrec.com
- **Check:** Both fighters in every card bout
- **Flag:** Fighter birthday today or within 7 days of fight
- **Use case:** Fighter motivation/narrative note for moneyline or method props

### 🎾 Tennis
- **Primary source:** ATP official site — https://www.atptour.com
- **Backup:** WTA site, Tennis Abstract — https://www.tennisabstract.com
- **Check:** Both players in each match
- **Flag:** Player birthday today
- **Use case:** Narrative support for match winner or set props

### 🏎 NASCAR
- **Primary source:** NASCAR.com driver pages — https://www.nascar.com
- **Backup:** Racing Reference — https://www.racing-reference.info
- **Check:** All drivers in the field
- **Flag:** Driver birthday on race day
- **Use case:** Narrative note only — minimal edge weight in NASCAR

---

## Daily Checklist

1. Pull today's full slate by sport
2. For each game/match/bout, list all active participants
3. Compare each player/driver/fighter's birth date (MM-DD) to today's date
4. Flag any entry where:
   - A player's birthday is today → `birthday_today: true`
   - Two players in the same game share a birthday → `shared_birthday: true`
   - A player has a strong birthday performance history (MLB only via Birthday Index)

---

## Output Format Per Player

```json
{
  "player": "Player Name",
  "sport": "MLB",
  "team": "Team Name",
  "birth_date": "MM-DD-YYYY",
  "birthday_today": true,
  "birthday_index_woba": 0.000,
  "shared_birthday_in_game": false,
  "shared_with": "",
  "flag": "Birthday today — narrative support for prop",
  "pick_impact": "secondary"
}
```

---

## Upgrade / Downgrade Rules

| Condition | Action |
|---|---|
| Player birthday + strong price edge already present | Add birthday note to writeup |
| Player birthday but no price edge | Watchlist note only — no bet |
| Shared birthday in same game | Mention in slate notes — no line impact |
| Player historically weak on birthday (negative Birthday Index) | Minor downgrade on props |
| Player historically strong on birthday (positive Birthday Index) | Minor upgrade on props if price still good |
| Fighter birthday within 7 days of bout | Narrative motivation note |

---

## Hard Rule
Birthday data **never overrides** a price cutoff, a bad matchup, or an injury concern. It is always the last filter checked before the card is finalized. If the only reason to bet is a birthday, it's a pass.

---

## Sources Referenced
- Baseball Savant Birthday Index: https://baseballsavant.mlb.com/birthday-index
- Baseball Almanac: https://www.baseball-almanac.com/players/baseball_births.php
- Basketball Reference: https://www.basketball-reference.com
- Hockey Reference: https://www.hockey-reference.com
- Pro Football Reference: https://www.pro-football-reference.com
- FBref: https://fbref.com
- UFC Stats: http://www.ufcstats.com
- BoxRec: https://boxrec.com
- Tennis Abstract: https://www.tennisabstract.com
- NASCAR.com: https://www.nascar.com
- Racing Reference: https://www.racing-reference.info
- StatMuse: https://www.statmuse.com
- TheSportsDB API: https://www.thesportsdb.com/documentation
