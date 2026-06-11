import assert from 'node:assert/strict'

import {
  customerAnalysisSections,
  evaluateCustomerFriendlyAnalysis,
  sanitizeCustomerFacingAnalysis
} from '../lib/customerFacingAnalysis.js'
import { cleanWebsiteRow } from '../lib/buildWebsiteFeed.js'

const genericTrendOnly = {
  Player: 'Shohei Ohtani',
  Opponent: 'San Diego Padres',
  Pick: 'Shohei Ohtani Over 6.5 Strikeouts',
  'Bet Type': 'Player Prop',
  'Best Number': 'Over 6.5 -120 or better',
  'No Bet Cutoff': 'Pass above -135',
  'Full Analysis': 'Trend data supports this play. Model edge is present. Positive EV based on matchup indicators.'
}

const genericGate = evaluateCustomerFriendlyAnalysis(genericTrendOnly)
assert.equal(genericGate.ok, false)
assert.equal(genericGate.status, 'Needs Customer-Friendly Rewrite')
assert.match(genericGate.issues.join(' '), /generic trend\/model language|projected edge/i)

const propCard = {
  __table: 'Props Lab',
  Date: '2026-06-11',
  League: 'MLB',
  Game: 'Los Angeles Dodgers vs San Diego Padres',
  Player: 'Shohei Ohtani',
  Opponent: 'San Diego Padres',
  Pick: 'Shohei Ohtani Over 6.5 Strikeouts',
  'Bet Type': 'Player Prop',
  Odds: '-115',
  Grade: 'A',
  Units: 1,
  'Best Number': 'Over 6.5 -120 or better',
  'No Bet Cutoff': 'Pass above -135',
  'Short Take': 'Ohtani has a real strikeout path against this Padres lineup at 6.5.',
  'Why This Play': 'This number is short because Shohei Ohtani is being priced closer to his season average than today matchup against the San Diego Padres.',
  'Matchup Edge': 'San Diego projects to run several high-whiff bats, and Ohtani pitch mix gives him two-strike finishers against their right-handed power.',
  'Projection Edge': 'Projected at 7.4 Ks vs market line of 6.5.',
  'Key Metrics': 'Padres projected K rate is elevated, Ohtani whiff rate supports 7-plus strikeouts, and pitch count expectation keeps 95 pitches in play.',
  Risk: 'The risk is efficiency. If Ohtani walks hitters early, pitch count can cap the strikeout ceiling.',
  'Final Take': 'Props Lab play at Over 6.5 -120 or better.'
}

const propGate = evaluateCustomerFriendlyAnalysis(propCard)
assert.equal(propGate.ok, true)
assert.match(sanitizeCustomerFacingAnalysis(propCard), /Why This Play:/)
assert.match(sanitizeCustomerFacingAnalysis(propCard), /Projection Edge: Projected at 7\.4 Ks vs market line of 6\.5/)
assert.match(sanitizeCustomerFacingAnalysis(propCard), /Risk: The risk is efficiency/)

const cleanedProp = cleanWebsiteRow(propCard)
assert.equal(cleanedProp.analysisQualityStatus, 'Customer-Friendly')
assert.equal(cleanedProp.whyThisPlay, propCard['Why This Play'])
assert.equal(cleanedProp.projectionEdge, propCard['Projection Edge'])
assert.equal(cleanedProp.risk, propCard.Risk)
assert.match(cleanedProp.fullAnalysis, /Final Take: Props Lab play/)

const teamTotal = {
  League: 'WNBA',
  Game: 'Atlanta Dream vs Chicago Sky',
  Pick: 'Chicago Sky +7.5',
  'Bet Type': 'Spread',
  'Best Number': '+7.5 or better',
  'No Bet Cutoff': '+6',
  'Why This Play': 'Chicago Sky are being priced as if this is a neutral pace spot against Atlanta Dream, but the matchup gives them enough half-court possessions to stay inside the number.',
  'Matchup Edge': 'Atlanta Dream can pressure the ball, but Chicago Sky do not need to win outright; they need to keep the game from becoming a transition track meet.',
  'Projection Edge': 'Projected fair spread closer to +5.5 vs available +7.5.',
  'Key Metrics': 'Pace is projected below market expectation, Chicago defensive rebounding limits runouts, and Atlanta half-court efficiency is less dangerous than its transition profile.',
  Risk: 'The risk is live-ball turnovers. If Chicago feeds Atlanta easy transition points, the spread protection can disappear.',
  'Final Take': 'Official play at +7.5; pass below +6.'
}

const teamGate = evaluateCustomerFriendlyAnalysis(teamTotal)
assert.equal(teamGate.ok, true)
assert.match(sanitizeCustomerFacingAnalysis(teamTotal), /Atlanta Dream/)
assert.match(sanitizeCustomerFacingAnalysis(teamTotal), /Chicago Sky/)
assert.match(sanitizeCustomerFacingAnalysis(teamTotal), /\+5\.5 vs available \+7\.5/)

const soccerDnb = {
  League: 'Soccer',
  Game: 'South Korea vs Czechia',
  Pick: 'South Korea Draw No Bet',
  'Bet Type': 'Draw No Bet',
  Odds: '+105',
  'Best Number': '+105 or better',
  'No Bet Cutoff': 'Pass below -105',
  'Why This Play': 'South Korea Draw No Bet keeps the draw protected, so this is not a No Bet status; it is a soccer market where a draw refunds/pushes instead of losing.',
  'Matchup Edge': 'South Korea chance quality and group motivation rate better than Czechia in this spot, especially if Czechia sit deeper after halftime.',
  'Projection Edge': 'Projected fair price is closer to -110 vs market +105 after accounting for draw probability.',
  'Key Metrics': 'South Korea xG edge is modest but real, Czechia xGA rises when they defend wide service, and draw probability is high enough to prefer DNB over moneyline.',
  Risk: 'The risk is a low-event match where Czechia turn one set piece into the only goal.',
  'Final Take': 'Official play only at +105 or better.'
}

const soccerGate = evaluateCustomerFriendlyAnalysis(soccerDnb)
assert.equal(soccerGate.ok, true)
assert.match(customerAnalysisSections(soccerDnb).whyThisPlay, /draw protected/)
assert.doesNotMatch(customerAnalysisSections(soccerDnb).whyThisPlay, /^No Bet$/i)

console.log('Customer-friendly analysis regression passed.')
