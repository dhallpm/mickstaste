# Micks Picks Bankroll Framework

## Unit Philosophy
- Units communicate risk, not certainty.
- Profit/Loss is calculated from Odds and Units only.
- Closing Number and CLV must never affect Profit/Loss.

## Grade To Unit Guidance
- A+ = rare premium plays, normally 1.25 to 1.5 units only when the A+ gate clears.
- A = strongest plays, normally 1.0 to 1.5 units unless the market is volatile or liquidity is low.
- B+ = bridge grade between B and A, normally 0.75 to 1.0 units; use when a candidate is strong but misses any A-grade gate requirement.
- B = standard positive-edge plays, normally 0.75 to 1.0 units.
- C = thin edge or number-sensitive plays, normally 0.25 to 0.5 units.
- Pass = 0 units and no release.
- Lotto parlays and longshots are small-unit plays regardless of upside.

## A-Grade Gate
- A requires 3 independent evidence paths, 5%+ edge versus implied probability or a meaningful projection gap, current price inside cutoff, confirmed role/news data, no major unresolved source conflict, and a clear market misprice reason.
- A+ requires the full A gate plus 7% to 10%+ edge or a major stale-line/news mismatch, low number sensitivity, verified news, and strong price protection.
- Do not lower A-grade standards to fill a card. If no candidate passes, output `No A-grade found.`

## Confidence
- Confidence is not a guarantee. It reflects data completeness, edge size, market quality, role certainty, and timing.
- High confidence requires current source verification and a still-playable number.
- Low confidence or incomplete cards must remain draft/review.

## Exposure Rules
- Avoid overexposure to one game, one injury thesis, one team, or one public narrative.
- Correlated plays should be disclosed and sized together.
- Do not stack a side, total, and multiple props unless the combined exposure is intentional.

## Price Discipline
- Every card should include Best Number and No Bet Cutoff when data allows.
- Do not chase public steam after the cutoff.
- If the number is gone, the card becomes Pass or review even if the handicap was right.

## Safe Version Vs Value Version
- Safe version receives the normal unit recommendation.
- Value version receives reduced units unless it has both strong edge and acceptable volatility.
- Plus-money and alt-line versions should be treated as higher variance.

## Settlement
- Win/loss/push/void settlement must use the recorded Odds and Units.
- Push and void are 0.00u.
- Archive rows must preserve original price, units, result, and source verification.
