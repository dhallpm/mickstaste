# Research readiness and betting grades

Effective 2026-09-18. This correction controls conflicting missing-data instructions in older modules.

## Separate the questions

1. Research readiness: do we have enough reliable information to assess this market?
2. Betting quality: does the completed handicap support this exact price?
3. Release eligibility: does it satisfy the existing sport, grade, failure and exposure rules?

An incomplete research subtotal must never be displayed as a final 110-point grade or used to conclude that a bet is bad value. Missing and negative evidence are different.

## Factor states

- VERIFIED: record points and evidence. A checked factor with no advantage can legitimately score zero.
- UNKNOWN: value is null; record why it is missing, its materiality and the next check. Do not silently convert this to zero or an adverse finding.
- NOT_APPLICABLE: document why; no bonus points and no denominator rescaling.
- CONTRADICTED: document the adverse evidence and reassess the handicap; do not merely label a conflicting source unavailable.

For unresolved factors, report supported minimum and possible maximum separately, not an exact score. Never normalize a thin sample of available factors to 110. A conservative grade floor may be used only after all essential inputs are complete and the supported minimum independently clears every release requirement. It must be labeled as a floor. Optional unknowns cannot by themselves establish a value pass.

## Essential market-specific inputs

- Exact event, selection, settlement rule, current status and dated executable price.
- Relevant starter/player role, materially important availability, and lineup assumptions with their uncertainty.
- A reproducible fair probability or outcome distribution: data, as-of date, formula/model version, workload/possession assumptions, uncertainty and failure scenarios.
- Expected value at the offered price, scenario sensitivity, a justified price limit, and the required failure/exposure checks.

For pitcher strikeouts, use batters faced and pitch-count/leash scenarios, not innings alone. An early innings exit can still include many batters and strikeout chances. Review pitcher strikeout/walk skill, opponent order and handedness/contact, substitutions and current workload restrictions. Recent hit rates are a diagnostic, not the forecast.

For moneylines, quantify starter, batting-order, relief and venue effects on the run/win distribution; an ERA comparison alone is insufficient. For totals/NRFI, estimate the applicable run distribution and settlement conditions. For football/basketball/other props use the relevant opportunity and efficiency model.

## Supporting inputs

Public handle/ticket splits, Doc's AI-v3, a particular outside opinion, and an umpire tendency are ordinarily supporting inputs. A paywall or unavailable vendor is not an automatic veto. Try primary data or another accessible route. Missing assignment/tendency is essential only when a documented market-specific rule or sensitivity makes it material; preserve existing explicit sport gates and explain their application.

Do not invent agreement with an absent Micks forecast. An outside model is not independent Micks output. If opinions were encountered first, disclose that order and construct the model transparently; the earlier exposure does not excuse leaving the calculation unfinished.

## Required dispositions

- INCOMPLETE / UNGRADED: essential analysis is missing. Score and grade null, 0u. List precisely what remains.
- WATCH / PROVISIONAL MODEL: a documented estimate exists but unresolved material assumptions or validation limit its use. No release grade, 0u.
- PASS_VALUE: a completed, sufficiently supported handicap finds the price outside its justified range.
- PASS_FRAMEWORK: completed evidence fails a named release rule; this does not necessarily mean negative EV.
- READY: all essential checks and existing release gates passed. Positive units require the normal release process.

Do not use "all candidates failed the model" when the model was not completed. Distinguish sources unavailable from calculations the analyst did not do. Show a short missing-input board and continue useful calculations before asking the user for more screenshots.

## Unchanged rules

The 110-point weights, grade thresholds, NFL standard mode, non-NFL Recovery Mode+, failure-score requirements and exposure limits are unchanged. No free points are awarded for missing data. New probability methods begin as provisional research with explicit limitations and prospective validation, not silently calibrated engines.
