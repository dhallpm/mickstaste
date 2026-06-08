# Micks Picks A-Grade Hunt Framework

## Purpose
A-Grade Hunt Mode is a pre-grading search phase. It looks for candidates that might deserve A or A+ before the normal card routing step, then forces each candidate through an explicit gate. The goal is to find rare premium edges without lowering the standard for an A.

## Operating Rule
- Do not force A grades.
- A card with no A-grade is valid when no candidate clears the gate.
- If no candidate clears the gate, the run output must say: `No A-grade found.`
- B+ is the bridge between B and A. Use B+ when a pick is stronger than a normal B but misses any A-grade gate requirement.
- A and A+ must include the exact bet, odds, sportsbook, units, best number, cutoff, and gate evidence.

## A-Hunt Market Priorities
1. MLB pitcher strikeout props, outs recorded, first 5 lines, team totals, and lineup/weather/bullpen driven totals.
2. WNBA injury or rotation spreads, pace totals, and role-stable props.
3. NBA role-stable props and rest/pace totals.
4. NHL only after starting goalie confirmation.

## A Grade Gate
An A grade requires all of the following:
- Three independent evidence paths.
- 5%+ edge versus implied probability or a meaningful projection gap.
- Current price inside the no-bet cutoff.
- Confirmed injury, lineup, starter, weather, goalie, minutes, or role data as needed for the market.
- No major unresolved source conflict.
- Clear market misprice reason.

## A+ Gate
An A+ requires the full A gate plus:
- 7% to 10%+ edge, or a major stale-line/news mismatch.
- Low number sensitivity.
- Verified news.
- Strong price protection.

## Required A-Hunt Fields
When the destination supports them, output:
- `A Grade Gate Result`
- `A Grade Evidence Count`
- `Market Misprice Reason`
- `Unresolved Conflict`
- `A-Hunt Source Notes`

## A-Candidate Queue
Every run should include an A-Candidate Queue explaining why each candidate passed or failed the A-grade gate. Passing the normal pick gate does not automatically mean passing the A-grade gate.

For each candidate, include:
- Candidate pick and market.
- Proposed grade after the A gate.
- Gate result.
- Evidence count.
- Market misprice reason.
- Unresolved conflict status.
- A-Hunt source notes.
- Failed A or A+ requirements when applicable.

## Guardrails
- Do not treat a strong matchup angle as an A without price edge and source confirmation.
- Do not treat stale or missing odds as A evidence.
- Do not upgrade a pick to A because it is the best pick on a weak slate.
- If role, lineup, starter, weather, or goalie data is still unresolved and material to the bet, the candidate cannot be A.
- If the current number is outside cutoff, the candidate cannot be A even if the handicap is correct.
