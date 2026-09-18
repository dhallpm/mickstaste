"""Research completeness is distinct from betting quality; no stake automation."""
def assess(factors, essential_missing, threshold=82, failure_score=None,
           minimum_failure=7, ev=None, projection_provisional=False):
    lower = upper = 0
    unknown = []
    for name, f in factors.items():
        maximum = f['maximum']
        if f['status'] == 'UNKNOWN':
            if f.get('points') is not None:
                raise ValueError('Unknown evidence must have null points')
            unknown.append(name)
            upper += maximum
        elif f['status'] == 'NOT_APPLICABLE':
            if f.get('points') not in (None, 0):
                raise ValueError('No bonus for nonapplicable factors')
        elif f['status'] in ('VERIFIED', 'CONTRADICTED'):
            points = f['points']
            if not isinstance(points, (int, float)) or not 0 <= points <= maximum:
                raise ValueError('Invalid verified points')
            lower += points
            upper += points
        else:
            raise ValueError('Unknown factor state')
    result = dict(score=None, grade=None, supported_minimum=lower,
                  possible_maximum=upper, unknown_factors=unknown,
                  essential_missing=essential_missing, units=0)
    if essential_missing:
        result['status'] = 'INCOMPLETE_UNGRADED'
    elif projection_provisional:
        result['status'] = 'WATCH_PROVISIONAL_MODEL'
    elif ev is None:
        result['status'] = 'INCOMPLETE_UNGRADED'
        result['essential_missing'] = ['Expected value calculation']
    elif ev <= 0:
        result['status'] = 'PASS_VALUE'
    elif failure_score is None:
        result['status'] = 'INCOMPLETE_UNGRADED'
        result['essential_missing'] = ['Failure assessment']
    elif failure_score < minimum_failure or upper < threshold:
        result['status'] = 'PASS_FRAMEWORK'
    elif lower < threshold:
        result['status'] = 'WATCH_EVIDENCE'
    else:
        result['status'] = 'READY_FOR_RELEASE_REVIEW'
        result['grade_floor'] = next(g for cut,g in [(96,'A+'),(91,'A'),(86,'A-'),(82,'B+'),(74,'B'),(66,'B-'),(58,'C'),(0,'Pass')] if lower >= cut)
    if not result['essential_missing'] and not unknown and not projection_provisional:
        result['score'] = lower
    return result
