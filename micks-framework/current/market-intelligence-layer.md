Research completeness correction (September 18, 2026): apply research-readiness.md before legacy scoring instructions. Unknown data is null, not negative evidence; incomplete core research is UNGRADED. Existing weights, modes and release standards remain unchanged.

# Micks Picks 2.0 — Market Intelligence Layer

Effective: 2026-08-23
Status: Permanent active module

## Governing principle

Micks Picks remains Micks-first. Build the independent handicap before reading market signals. Market information may confirm, contradict, downgrade, or improve price timing; it may never create an official bet by itself.

The order is mandatory:

1. Independent Micks handicap and fair-price estimate
2. Matchup / role / injury / lineup verification
3. Market Intelligence Layer
4. External-model and handicapper confirmation
5. Failure-case analysis
6. Final 110-point score, grade, units, Best Number and No-Bet Cutoff

Do not reverse this order to chase steam or copy a respected source.

## Market context — 10 points (v2, September 29, 2026)

The user-authorized `micks-110-v2-2026-09-29` daily scoring standard supersedes the former 20-point 6/5/4/5 allocation. This module remains an evidence audit; no market signal can create a pick by itself.

### Reference market context — 0–5

Assess the reliability, recency, comparability and coherence of the reference board for the exact market. 0 = absent/unusable; 1–2 = partial or materially stale; 3 = usable dated comparison with limitations; 4 = current credible comparison in a normal market; 5 = multiple independent current comparable references with clear market state. Do not award points merely because a sportsbook exists or the sport is liquid. The separate 20-point price factor assesses the user's offered number, so the same price advantage is not counted here again.

### Verified movement and timing — 0–3

0 = unavailable, contradictory or unusable; 1 = modest verified same-book movement relevant to the handicap; 2 = meaningful same-book movement with news/timing understood; 3 = persuasive independently supported movement/timing aligned with the Micks analysis. Record book, opening/current timestamps and exact market. Different capper prices do not establish movement. Call action sharp only when actual evidence supports that characterization.

### Ticket/handle evidence — 0–2

0 = unavailable, stale, balanced or opposing; 1 = current relevant supportive divergence with source/book/time; 2 = strong credible divergence with context and corroboration. Ticket share alone does not establish respected money. Missing splits cost at most the unsupported two points; no additional source-access penalty.

Unknown evidence is disclosed, never invented. Optional subfactor points are zero when unsupported while their evidence state is UNKNOWN; zero is not a finding of negative value. The full daily score retains a fixed 110 denominator and is never inflated by dropping unavailable categories. Core-unknown/UNGRADED handling is controlled by the current candidate scoring standard.

## Required market record for every serious candidate

Record when available:

- opening line / price
- current line / price
- best executable price
- ticket percentage
- handle / money percentage
- Circa or other high-limit reference
- market type and liquidity class
- time of meaningful moves
- known injury, lineup, weather, starter, goalie, or role news that explains movement
- whether movement confirms or contradicts Micks
- Market context score out of 10 (reference 5, movement/timing 3, splits 2)

Unavailable data must be marked unavailable and scored zero rather than inferred.

## Contradiction rule

Market disagreement is not an automatic pass. It is a reason to investigate.

If the independent Micks handicap is strong but the market moves materially against it:

1. Re-check injuries, lineups, starters, weather and breaking news.
2. Re-check whether the original number was stale.
3. Identify whether the move occurred in a liquid or thin market.
4. Reduce Market Intelligence points accordingly.
5. Downgrade or pass if no credible independent explanation remains.

A strong handicap may survive market disagreement only when the independent evidence is explicit and the price remains inside the No-Bet Cutoff.

## Doc's Sports AI-v3

Dedicated page: https://www.docsports.com/cappers.html?cap_id=88

This page is dynamic and must be checked as a current-state page, not treated as a static pick list.

Use it only as supporting evidence. When it publishes a current selection, record whether it agrees or disagrees with Micks. Its described emphasis on line movement, betting tickets, bettor profiling, market liquidity and predictive modeling makes it especially useful as a comparison source for this Market Intelligence Layer, but its output never receives automatic release authority.

Do not award points for marketing claims, historical-profit claims, or a model description. Points require a current, verifiable market signal or current selection relevant to the candidate.

## CLV tracking — post-release diagnostic

Closing Line Value is mandatory for every official play when a reliable closing number can be obtained.

Store:

- release line / price
- closing line / price
- CLV direction: Beat Close / Neutral / Lost Close
- CLV magnitude when calculable
- market source used for close

CLV is not used to rewrite the result of a settled wager and does not retroactively change its grade. It is a process-quality metric.

Review CLV in rolling windows of 20, 50 and 100 official plays by:

- sport
- market family
- grade
- release timing
- sportsbook / reference market when available

Repeatedly beating the close supports the pricing process even through short-term variance. Repeatedly losing the close is a model/process warning even during a winning streak.

## Anti-double-counting rule

Do not score the same market fact twice.

Examples:

- A Circa move can support Sharp Movement, but the same move cannot also be counted as an independent VSiN model opinion.
- Ticket/handle divergence and a news article reporting that same divergence are one evidence path.
- Doc's AI-v3 agreeing because it is reacting to the same market move is supporting confirmation, not a second sharp-money signal.

## Failure-case interaction

The Market Intelligence Score does not replace the Failure Score.

Every official play still requires an explicit strongest failure path. Under Recovery Mode+, a non-NFL candidate must satisfy both the current 110-point release threshold and the current minimum Failure Score. NFL is exempt from Recovery Mode+ and follows its standard-mode module, but strong market confirmation still cannot rescue a weak failure-case profile.
