import unittest
from readiness import assess
from strikeout_sensitivity import tail

class ReadinessTests(unittest.TestCase):
    def test_missing_core_is_ungraded(self):
        r=assess({'x':{'maximum':110,'status':'VERIFIED','points':100}},['probability'],ev=.1,failure_score=9)
        self.assertIsNone(r['score']); self.assertIsNone(r['grade']); self.assertEqual(r['status'],'INCOMPLETE_UNGRADED')
    def test_missing_ev_is_ungraded(self):
        self.assertIsNone(assess({'x':{'maximum':110,'status':'VERIFIED','points':100}},[],failure_score=9)['score'])
    def test_unknown_does_not_become_negative(self):
        r=assess({'x':{'maximum':110,'status':'UNKNOWN','points':None}},[],ev=.1,failure_score=9)
        self.assertEqual(r['status'],'WATCH_EVIDENCE'); self.assertEqual(r['possible_maximum'],110); self.assertIsNone(r['score'])
    def test_actual_negative_ev_passes_value(self):
        self.assertEqual(assess({'x':{'maximum':110,'status':'VERIFIED','points':0}},[],ev=-.03)['status'],'PASS_VALUE')
    def test_provisional_model_cannot_release(self):
        r=assess({'x':{'maximum':110,'status':'VERIFIED','points':100}},[],ev=.1,failure_score=9,projection_provisional=True)
        self.assertEqual(r['status'],'WATCH_PROVISIONAL_MODEL'); self.assertIsNone(r['score']); self.assertEqual(r['units'],0)
    def test_unknown_cannot_have_points(self):
        with self.assertRaises(ValueError): assess({'x':{'maximum':10,'status':'UNKNOWN','points':0}},[])
    def test_na_gives_no_bonus(self):
        r=assess({'x':{'maximum':10,'status':'NOT_APPLICABLE','points':None}},[],ev=.1,failure_score=9)
        self.assertEqual(r['possible_maximum'],0)
    def test_supported_floor_with_optional_unknown(self):
        r=assess({'x':{'maximum':100,'status':'VERIFIED','points':90},'optional':{'maximum':10,'status':'UNKNOWN','points':None}},[],ev=.1,failure_score=9)
        self.assertEqual(r['status'],'READY_FOR_RELEASE_REVIEW'); self.assertEqual(r['grade_floor'],'A-'); self.assertIsNone(r['score'])
    def test_distribution(self):
        self.assertAlmostEqual(tail([.5],2,1),.75)
        self.assertGreater(tail([.3,.4],24,7),tail([.3,.4],20,7))
        self.assertGreater(tail([.3,.4],24,7),tail([.3,.4],24,8))

if __name__=='__main__': unittest.main()
