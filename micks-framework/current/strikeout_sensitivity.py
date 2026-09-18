"""Provisional Poisson-binomial sensitivity calculator, not a calibrated betting model.

Inputs are frozen pregame facts. Workload is treated as exogenous, a simplifying
assumption that misses correlation between walks, strikeouts and early removal.
"""
import json
import sys

def tail(probabilities, batters_faced, threshold):
    dist = [1.0]
    for i in range(batters_faced):
        q = probabilities[i % len(probabilities)]
        nxt = [0.0] * (len(dist) + 1)
        for k, mass in enumerate(dist):
            nxt[k] += mass * (1-q)
            nxt[k+1] += mass * q
        dist = nxt
    return sum(dist[threshold:])

def calculate(data, prior_pa=100):
    league = data['league']['strikeouts'] / data['league']['plate_appearances']
    p = (data['pitcher']['strikeouts'] + prior_pa*league) / (data['pitcher']['batters_faced'] + prior_pa)
    rates = []
    for b in data['lineup']:
        q = (b['strikeouts_vs_R'] + prior_pa*league)/(b['plate_appearances_vs_R'] + prior_pa)
        odds = (p/(1-p)) * (q/(1-q)) / (league/(1-league))
        rates.append(odds/(1+odds))
    scenarios = [{'batters_faced':n, 'p_7_plus':tail(rates,n,7), 'p_8_plus':tail(rates,n,8)} for n in [18,20,22,24,26]]
    ns = data['last_ten_batters_faced']
    mixed = {str(k):sum(tail(rates,n,k) for n in ns)/len(ns) for k in [7,8]}
    return dict(status='PROVISIONAL_SENSITIVITY_ONLY', prior_pa=prior_pa,
                league_k_rate=league, pitcher_shrunk_k_rate=p,
                lineup_matchup_rates=rates, scenarios=scenarios,
                empirical_workload_mixture=mixed,
                break_even={'7_plus_at_minus167':167/267,'8_plus_at_plus112':100/212},
                calibrated=False, official_release=False,
                limitations=['100-PA shrinkage is an assumption, not fitted calibration',
                  'League baseline is all handedness; batter inputs are versus right-handers',
                  'Independent plate appearances ignore within-game dependence',
                  'Recent workload mixture is not a manager-specific pitch-limit forecast',
                  'No park, catcher, umpire, velocity or lineup substitution adjustment',
                  'No out-of-sample calibration; scenario spread is not a confidence interval',
                  'Constructed after prices/outside opinions were observed; not a blind forecast'])

if __name__ == '__main__':
    print(json.dumps(calculate(json.load(open(sys.argv[1]))), indent=2))
