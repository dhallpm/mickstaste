const date = '2026-07-08'

const vip = [
  { date, sport: 'WNBA', league: 'WNBA', section: 'vip', category: 'VIP', access: 'VIP', game: 'Indiana Fever vs Los Angeles Sparks', pick: 'VIP Pick Locked', cardTitle: 'VIP Pick Locked', betType: 'Spread', odds: 'VIP', grade: 'B+', units: '0.75u', status: 'Active', releaseStatus: 'VIP Released', featured: 'Yes', writeup: 'VIP pick locked. Full number, stake, no-bet cutoff, and full analysis are available inside the VIP Vault.' },
  { date, sport: 'MLB', league: 'MLB', section: 'vip', category: 'VIP', access: 'VIP', game: 'Milwaukee Brewers vs St. Louis Cardinals', pick: 'VIP Pick Locked', cardTitle: 'VIP Pick Locked', betType: 'Moneyline', odds: 'VIP', grade: 'B+', units: '0.75u', status: 'Active', releaseStatus: 'VIP Released', featured: 'Yes', writeup: 'VIP pick locked. Full number, stake, no-bet cutoff, and full analysis are available inside the VIP Vault.' }
]

const free = [
  { date, sport: 'MLB', league: 'MLB', section: 'free', category: 'Free', access: 'Free', game: 'Boston Red Sox vs Chicago White Sox', pick: 'Boston Red Sox ML', cardTitle: 'Red Sox ML vs White Sox', betType: 'Moneyline', odds: '-105', grade: 'B+', units: '0.75u', status: 'Active', releaseStatus: 'Free Released', writeup: 'Boston gets added after VSiN support and market movement pushed the Red Sox from dog range into favorite range. Playable near -105 to -120; pass at -125 or worse.' },
  { date, sport: 'MLB', league: 'MLB', section: 'free', category: 'Free', access: 'Free', game: 'Houston Astros vs Washington Nationals', pick: 'Over 9', cardTitle: 'Astros/Nationals Over 9', betType: 'Total', odds: '-110', grade: 'B', units: '0.50u', status: 'Active', releaseStatus: 'Free Released', writeup: 'The VSiN scan moved this from Astros +1.5 to the game total. Over 9 is the cleaner angle. Pass at 10 or higher.' },
  { date, sport: 'MLB', league: 'MLB', section: 'free', category: 'Free', access: 'Free', game: 'Colorado Rockies vs Los Angeles Dodgers', pick: 'Los Angeles Dodgers -1.5', cardTitle: 'Dodgers -1.5 vs Rockies', betType: 'Run Line', odds: '-126', grade: 'B', units: '0.50u', status: 'Active', releaseStatus: 'Free Released', writeup: 'Dodgers still have the talent gap, but run-line volatility keeps this as a smaller B-grade free-card position.' }
]

const props = [
  { date, sport: 'MLB', league: 'MLB', section: 'props', category: 'Props', access: 'Free', game: 'Houston Astros vs Washington Nationals', player: 'CJ Abrams', prop: 'Over 1.5 Hits + Runs + RBIs', pick: 'CJ Abrams Over 1.5 HRR', cardTitle: 'CJ Abrams O1.5 HRR', betType: 'Player Prop', odds: '-125', grade: 'B', units: '0.50u', status: 'Active', releaseStatus: 'Props Released', writeup: 'Abrams can clear this with a hit, run, RBI, or combined table-setting production.' },
  { date, sport: 'MLB', league: 'MLB', section: 'props', category: 'Props', access: 'Free', game: 'Boston Red Sox vs Chicago White Sox', player: 'Jake Bennett', prop: 'Over 4.5 Strikeouts', pick: 'Jake Bennett Over 4.5 Ks', cardTitle: 'Jake Bennett O4.5 Ks', betType: 'Player Prop', odds: '+110', grade: 'B', units: '0.50u', status: 'Active', releaseStatus: 'Props Released', writeup: 'Bennett Over 4.5 Ks is a plus-money prop with a reasonable strikeout path.' }
]

const lottoParlays = [
  { date, sport: 'MLB', league: 'MLB', section: 'longshots', category: 'Longshots', access: 'Free', game: 'Brewers/Cardinals + Red Sox/White Sox', pick: 'Brewers ML + Red Sox ML', cardTitle: 'Brewers ML + Red Sox ML', legs: 'Milwaukee Brewers ML / Boston Red Sox ML', betType: 'Lotto Parlay', odds: 'TBD', grade: 'B-', units: '0.25u', status: 'Active', releaseStatus: 'Lotto Released', writeup: 'Small two-leg MLB parlay using the two cleanest VSiN-supported moneyline positions.' },
  { date, sport: 'Multi-Sport', league: 'WNBA/MLB', section: 'longshots', category: 'Longshots', access: 'Free', game: 'Fever/Sparks + Brewers/Cardinals + Red Sox/White Sox', pick: 'Fever -6.5 + Brewers ML + Red Sox ML', cardTitle: 'Fever -6.5 + Brewers ML + Red Sox ML', legs: 'Indiana Fever -6.5 / Milwaukee Brewers ML / Boston Red Sox ML', betType: 'Lotto Parlay', odds: 'TBD', grade: 'C+', units: '0.15u', status: 'Active', releaseStatus: 'Lotto Released', writeup: 'Three-leg cross-sport lotto using the top WNBA side and two supported MLB moneylines.' },
  { date, sport: 'MLB', league: 'MLB', section: 'longshots', category: 'Longshots', access: 'Free', game: 'Dodgers/Rockies + Astros/Nationals', pick: 'Dodgers -1.5 + Astros/Nationals Over 9', cardTitle: 'Dodgers -1.5 + Astros/Nationals Over 9', legs: 'Dodgers -1.5 / Astros-Nationals Over 9', betType: 'Lotto Parlay', odds: 'TBD', grade: 'C', units: '0.10u', status: 'Active', releaseStatus: 'Lotto Released', writeup: 'Tiny MLB lotto pairing the Dodgers run-line angle with the Astros/Nats scoring angle.' },
  { date, sport: 'MLB', league: 'MLB Props', section: 'longshots', category: 'Longshots', access: 'Free', game: 'Props Lotto', pick: 'CJ Abrams O1.5 HRR + Jake Bennett O4.5 Ks', cardTitle: 'CJ Abrams O1.5 HRR + Jake Bennett O4.5 Ks', legs: 'CJ Abrams Over 1.5 HRR / Jake Bennett Over 4.5 Ks', betType: 'Props Lotto', odds: 'TBD', grade: 'C', units: '0.10u', status: 'Active', releaseStatus: 'Lotto Released', writeup: 'Optional props lotto only. Keep it tiny or skip.' }
]

const longshots = lottoParlays
const allRows = [...vip, ...free, ...props, ...lottoParlays]

export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  res.status(200).json({ success: true, ok: true, source: 'public-july-8-card-restore', date, vip, vipVault: vip, free, props, propsLab: props, lottoParlays, lotto: lottoParlays, parlays: lottoParlays, longshots, rows: allRows, records: allRows, picks: allRows, activePicks: allRows, allRows })
}
