function rec(section,data){const access=data.Access||(section==='VIP'?'VIP':'Free');return{...data,section,__section:section,originalTable:section,access,Access:access,date:data.Date,sport:data.Sport,league:data.League,game:data.Game,pick:data.Pick,market:data['Bet Type']||data.Prop||'',odds:data.Odds||'',grade:data.Grade||'',units:data.Units||'',confidence:data.Confidence||'',status:data.Status||'Pending',notes:data.Writeup||data['Full Analysis']||'',source:'Micks Picks July 11 premium writeup card'}}

const vip=[
rec('VIP',{Date:'2026-07-11',Sport:'Soccer',League:'FIFA World Cup',Game:'England vs Norway',Pick:'England to Advance','Bet Type':'To Advance',Odds:'-220',Grade:'A-',Units:'1.00','Best Number':'-220 or better','No-Bet Cutoff':'-250',Confidence:'8.6/10',Status:'Pending',Access:'VIP',Featured:'Yes','Official Bet':'Yes','Pick of the Day Eligible':'Yes','Full Analysis':`Opening Thesis: England is the more complete side over a full knockout match, and the to-advance market gives us the safest way to back that edge without needing the result settled inside 90 minutes.

Matchup Edge: England carries the deeper midfield, the stronger bench, and more ways to control the match if the opening plan stalls. Norway is dangerous when the game becomes stretched because Erling Haaland can turn one transition into a goal, but Norway is far more dependent on direct moments than sustained territorial pressure. England should own more of the ball, create the cleaner sequence of chances, and have the better options available if the match reaches extra time.

Market and Number: The regulation moneyline leaves us exposed to a draw after 90 minutes. Taking England to advance protects against extra time and penalties while still aligning us with the stronger overall squad. The preferred number is -220 or better. Once the market moves beyond -250, the value becomes too thin relative to knockout variance.

Why It Made VIP: England has the superior squad depth, stronger midfield control, better late-match options, and the safer advancement profile. This is not graded A because Norway's transition threat is real and knockout football always introduces volatility.

Risk: Haaland can punish a single defensive mistake, and a low-event match can remain level deep into the second half.`,Risk:'Norway counterattacks, Haaland finishing, and knockout volatility.'}),
rec('VIP',{Date:'2026-07-11',Sport:'Soccer',League:'FIFA World Cup',Game:'Argentina vs Switzerland',Pick:'Argentina to Advance','Bet Type':'To Advance',Odds:'-290',Grade:'A-',Units:'1.00','Best Number':'-290 or better','No-Bet Cutoff':'-325',Confidence:'8.4/10',Status:'Pending',Access:'VIP',Featured:'Yes','Official Bet':'Yes','Full Analysis':`Opening Thesis: Argentina owns the higher attacking ceiling, the greater individual quality, and the superior knockout pedigree, making the to-advance market the preferred way to back the favorite.

Matchup Edge: Switzerland's defensive organization can make this uncomfortable, especially if the match remains scoreless into the second half. Argentina, however, has more creators, more one-on-one quality, and more tactical flexibility when facing a compact block. That matters because the key question is not simply whether Argentina dominates possession, but whether it can solve a disciplined defense over 90 or 120 minutes. Argentina has more ways to do that than Switzerland has ways to generate sustained offense.

Market and Number: The 90-minute moneyline creates unnecessary draw exposure in a match where Switzerland may prioritize shape and patience. The to-advance price gives Argentina extra time and penalties as additional paths to cash. We want -290 or better and will not chase beyond -325 because the edge compresses quickly at a heavy price.

Why It Made VIP: Argentina has the stronger attack, better knockout experience, deeper individual talent, and more reliable late-match solutions. The A- grade reflects Switzerland's ability to slow the game and reduce total possessions.

Risk: Switzerland can keep the match compressed, force Argentina into lower-quality attempts, and extend the contest into extra time.`,Risk:'Swiss defensive structure, low-event game state, and knockout variance.'})]

const free=[
rec('Free',{Date:'2026-07-11',Sport:'Baseball',League:'MLB',Game:'Arizona Diamondbacks vs Los Angeles Dodgers',Pick:'Los Angeles Dodgers -1.5','Bet Type':'Run Line',Odds:'-125',Grade:'B+',Units:'0.75','Best Number':'-1.5 at -125 or better','No-Bet Cutoff':'-140',Confidence:'7.8/10',Status:'Pending',Access:'Free','Official Bet':'Yes',Writeup:`The Dodgers are the stronger team in lineup depth, run creation, and overall pitching quality, but the straight moneyline is too expensive to justify. Laying 1.5 runs gives us a more efficient way to attack the talent gap without paying the full favorite tax. Los Angeles is built to separate late because its lineup can pressure multiple bullpen arms and create scoring from more than one part of the order.

The matchup still carries divisional variance, and Arizona has enough offensive ability to stay competitive if the Dodgers fail to convert early opportunities. That is why this remains B+ rather than VIP. The preferred entry is -1.5 at -125 or better; once the price reaches -140, the payout no longer compensates for the additional run-line risk.

Risk: A one-run Dodgers win, missed early scoring chances, or a strong Arizona bullpen sequence.`}),
rec('Free',{Date:'2026-07-11',Sport:'Baseball',League:'MLB',Game:'New York Yankees vs Washington Nationals',Pick:'New York Yankees -1.5','Bet Type':'Run Line',Odds:'-122',Grade:'B',Units:'0.50','Best Number':'-1.5 at -122 or better','No-Bet Cutoff':'-135',Confidence:'7.2/10',Status:'Pending',Access:'Free','Official Bet':'Yes',Writeup:`New York has the lineup power and starting-pitching profile to win this game by margin. The Yankees can create separation with one swing, but the stronger reason to prefer the run line is their ability to generate repeated scoring chances against weaker pitching depth. Washington may keep the game close early, yet the full nine-inning matchup favors New York's offense and bullpen depth.

This is held to a half-unit because road favorites carry added volatility: the Yankees may lose the ninth-inning offensive opportunity, and bullpen performance can turn a comfortable lead into a one-run result. We want -1.5 at -122 or better and will pass if the price moves beyond -135.

Risk: Road-favorite sequencing, bullpen leakage, and a one-run win.`}),
rec('Free',{Date:'2026-07-11',Sport:'Basketball',League:'WNBA',Game:'Portland Fire vs Atlanta Dream',Pick:'Atlanta Dream -13.5','Bet Type':'Spread',Odds:'-110',Grade:'B',Units:'0.50','Best Number':'-13.5','No-Bet Cutoff':'-15',Confidence:'7.0/10',Status:'Pending',Access:'Free','Official Bet':'Yes',Writeup:`Atlanta owns the clear talent, depth, and two-way advantage. The Dream should control the glass, create more efficient half-court offense, and force Portland into difficult possessions over a full game. This is the type of matchup where the stronger team can build separation through repeated small edges rather than needing an unusually hot shooting night.

The concern is the number. At -13.5, the handicap is no longer just about Atlanta winning comfortably; it also requires the Dream to maintain focus deep into a likely blowout. Backdoor risk rises sharply when starters sit late and bench units trade empty possessions. That keeps the play at B and 0.50u. We will not chase past -15.

Risk: Fourth-quarter bench minutes, pace reduction, and a late Portland backdoor cover.`}),
rec('Free',{Date:'2026-07-11',Sport:'Basketball',League:'WNBA',Game:'New York Liberty vs Minnesota Lynx',Pick:'Minnesota Lynx -5','Bet Type':'Spread',Odds:'-110',Grade:'B',Units:'0.50','Best Number':'-5','No-Bet Cutoff':'-6',Confidence:'7.0/10',Status:'Pending',Access:'Free','Official Bet':'Yes',Writeup:`Minnesota has the stronger two-way profile and the benefit of home court, giving the Lynx the better baseline in a high-level matchup. Their defensive structure should make New York work for clean looks, while Minnesota's balance gives it more ways to score if the game slows into a half-court battle.

The reason this is only a B is the quality of the opponent and the lack of clear market separation. New York has enough shot creation and veteran experience to keep the game inside one or two possessions, and outside models have not produced a unanimous edge on Minnesota. The play is acceptable at -5, but the value is gone beyond -6.

Risk: New York's perimeter shot-making, late-game free throws, and a close finish against an elite opponent.`}),
rec('Free',{Date:'2026-07-11',Sport:'Basketball',League:'WNBA',Game:'Phoenix Mercury vs Las Vegas Aces',Pick:'Over 170.5','Bet Type':'Game Total',Odds:'-110',Grade:'B',Units:'0.50','Best Number':'170.5','No-Bet Cutoff':'172',Confidence:'7.3/10',Status:'Pending',Access:'Free','Official Bet':'Yes',Writeup:`The total is the cleaner angle because the side market is divided, while both teams have paths to push this game into a high-possession scoring environment. Las Vegas can generate efficient offense through A'ja Wilson's interior usage and second-chance opportunities, while Phoenix has enough shot creation to contribute even if it trails.

A competitive first half is ideal, but the over can also benefit from late-game fouling if the margin stays within reach. The concern is the already elevated number: a slow opening quarter or poor three-point shooting can leave little room for recovery. We want 170.5 and will not play above 172.

Risk: Early pace suppression, inefficient perimeter shooting, or a blowout that kills late-game scoring urgency.`}),
rec('Free',{Date:'2026-07-11',Sport:'Basketball',League:'NBA Summer League',Game:'Miami Heat vs Orlando Magic',Pick:'Orlando Magic -4.5','Bet Type':'Spread',Odds:'-110',Grade:'B',Units:'0.50','Best Number':'-4.5','No-Bet Cutoff':'-5.5',Confidence:'7.0/10',Status:'Pending',Access:'Free','Official Bet':'Yes',Writeup:`Orlando projects with the slightly stronger Summer League roster and better top-end creation. The Magic should have more reliable scoring options when possessions break down, which matters in a setting where offensive structure is often limited and individual shot creation becomes disproportionately valuable.

Summer League remains one of the highest-variance betting environments because rotations can change without notice and coaching priorities differ from standard regular-season games. That volatility keeps the play at a half-unit. The number is playable at -4.5, but we will not chase beyond -5.5.

Risk: Late scratches, experimental rotations, and end-game variance from inexperienced lineups.`}),
rec('Free',{Date:'2026-07-11',Sport:'Basketball',League:'NBA Summer League',Game:'Denver Nuggets vs Minnesota Timberwolves',Pick:'Minnesota Timberwolves -5','Bet Type':'Spread',Odds:'-110',Grade:'B',Units:'0.50','Best Number':'-5','No-Bet Cutoff':'-6',Confidence:'7.0/10',Status:'Pending',Access:'Free','Official Bet':'Yes',Writeup:`Minnesota has the more appealing young core and better projected depth, giving the Timberwolves a stronger full-game profile. Their roster should be more capable of sustaining offense across multiple units, while Denver appears more dependent on a narrower group of contributors.

The spread remains within a normal Summer League favorite range, but this market can move quickly based on availability. Because the edge is roster-based rather than tied to stable regular-season rotations, the stake stays at 0.50u. Playable at -5, with a hard stop at -6.

Risk: Rotation uncertainty, volatile three-point shooting, and late-game bench execution.`})]

const propsLab=[
rec('Props',{Date:'2026-07-11',Sport:'Soccer',League:'FIFA World Cup',Game:'England vs Norway',Pick:'Both Teams to Score - Yes',Prop:'BTTS Yes',Odds:'-110',Grade:'B',Units:'0.50',Confidence:'7.1/10',Status:'Pending',Access:'Free','Official Bet':'Yes',Writeup:`England should generate enough possession and final-third volume to score, while Norway's transition game gives it a credible path to answer. Haaland changes the profile of this market because Norway does not need sustained pressure to create a high-quality chance; one turnover, direct pass, or set-piece sequence can be enough.

The bet does not require Norway to control the game, only to convert one of its limited high-leverage opportunities. England's attacking depth provides the other side of the equation. The main concern is a cautious knockout script where both teams protect against the first mistake.

Risk: A low-event opening hour, conservative tactics, or England controlling the match without conceding transition space.`}),
rec('Props',{Date:'2026-07-11',Sport:'Soccer',League:'FIFA World Cup',Game:'Argentina vs Switzerland',Pick:'Argentina Team Total Over 1.5',Prop:'Team Total',Odds:'-115',Grade:'B+',Units:'0.50',Confidence:'7.7/10',Status:'Pending',Access:'Free','Official Bet':'Yes',Writeup:`Argentina has multiple ways to reach two goals: sustained possession, individual creation, set pieces, and late-game transition chances if Switzerland is forced to open up. The team total avoids needing Switzerland to contribute and keeps the handicap focused on the stronger attack.

Switzerland is organized enough to make this uncomfortable, but that defensive structure can become more vulnerable after the first goal. If Argentina scores early, the match state should create better opportunities for a second. The B+ grade reflects Argentina's attacking ceiling while respecting the possibility of a controlled 1-0 result.

Risk: Switzerland's compact block, slow tempo, and Argentina settling for game control after taking the lead.`}),
rec('Props',{Date:'2026-07-11',Sport:'Basketball',League:'WNBA',Game:'New York Liberty vs Minnesota Lynx',Pick:'Breanna Stewart Over 19.5 Points',Player:'Breanna Stewart',Prop:'Points Over 19.5',Odds:'-110',Grade:'B',Units:'0.50',Confidence:'7.1/10',Status:'Pending',Access:'Free','Official Bet':'Yes',Writeup:`Stewart's usage, shot volume, and ability to score at all three levels make 20 points a reachable threshold in a competitive game. New York will need its primary creators involved throughout, and Stewart should continue receiving touches even if Minnesota's defense forces the Liberty away from their first option.

The over is supported by expected minutes and offensive responsibility rather than a narrow shooting-efficiency assumption. She can get there through field goals, free throws, and second-chance opportunities. The concern is Minnesota's defensive length and the possibility of New York spreading scoring more evenly than expected.

Risk: Defensive attention, foul trouble, or an inefficient shooting night.`}),
rec('Props',{Date:'2026-07-11',Sport:'Basketball',League:'WNBA',Game:'New York Liberty vs Minnesota Lynx',Pick:'Kayla McBride Over 2.5 Threes',Player:'Kayla McBride',Prop:'Three-Pointers Over 2.5',Odds:'+105',Grade:'B',Units:'0.50',Confidence:'7.0/10',Status:'Pending',Access:'Free','Official Bet':'Yes',Writeup:`McBride's perimeter role and willingness to shoot make this an attractive plus-money ceiling prop. Minnesota should create several catch-and-shoot opportunities through drive-and-kick action, and New York's defensive attention on interior threats can leave McBride space beyond the arc.

The price matters here. At plus money, we do not need an overwhelming hit-rate advantage; we need enough volume to justify the payout. Three made threes is realistic if she reaches her normal attempt range. The risk is that Minnesota attacks more through the paint or McBride's volume falls below expectation.

Risk: Reduced attempts, early foul trouble, or cold shooting variance.`}),
rec('Props',{Date:'2026-07-11',Sport:'Basketball',League:'WNBA',Game:'Phoenix Mercury vs Las Vegas Aces',Pick:'A’ja Wilson Over 24.5 Points',Player:'A’ja Wilson',Prop:'Points Over 24.5',Odds:'-110',Grade:'B+',Units:'0.50',Confidence:'7.6/10',Status:'Pending',Access:'Free','Official Bet':'Yes',Writeup:`Wilson's usage and scoring responsibility make her the centerpiece of the Las Vegas offense in a game projected for elevated scoring. She can attack Phoenix inside, draw fouls, and create efficient attempts without depending on three-point variance. Her role also gives her a strong chance to remain involved deep into the fourth quarter if the game stays competitive.

The over is supported by both volume and efficiency pathways: post touches, face-up drives, free throws, and offensive rebounds. The main concern is game script. A blowout could reduce late minutes, while aggressive double teams could shift more possessions toward teammates.

Risk: Reduced fourth-quarter minutes, persistent double teams, or an unusually low free-throw rate.`}),
rec('Props',{Date:'2026-07-11',Sport:'Basketball',League:'WNBA',Game:'Phoenix Mercury vs Las Vegas Aces',Pick:'A’ja Wilson Over 9.5 Rebounds',Player:'A’ja Wilson',Prop:'Rebounds Over 9.5',Odds:'-110',Grade:'B',Units:'0.50',Confidence:'7.1/10',Status:'Pending',Access:'Free','Official Bet':'Yes',Writeup:`Wilson's minutes, interior positioning, and two-way responsibility give her a strong path to double-digit rebounds. Phoenix should generate enough shot volume to create opportunities on the defensive glass, while Wilson's offensive rebounding ability adds a second route to the over.

The line is efficient, so this is not a premium-grade prop, but the role is stable and the game environment supports enough total possessions. The biggest threat is not matchup quality; it is distribution. Teammates can absorb rebounds if Phoenix's misses are long, and a lopsided score could reduce Wilson's late minutes.

Risk: Blowout minutes, long-rebound distribution, and foul trouble.`})]

const lottoParlays=[]
const longshots=[]
const birthdayNotes='July 11 football birthdays (Hugo Sánchez, Lucas Ocampos, Tony Cottee, Éric Abidal, etc.) are narrative only and should not be treated as edge.'
const publicRows=[...free,...propsLab],allRows=[...vip,...publicRows]
const totalUnits=allRows.reduce((sum,row)=>sum+Number(row.Units||0),0)
export default function handler(req,res){res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, max-age=0');res.status(200).json({ok:true,success:true,source:'micks-picks-july-11-premium-writeups',date:'2026-07-11',vip,vipPicks:vip,vipVault:vip,free,freePicks:free,props:propsLab,propsLab,lottoParlays,lotto:lottoParlays,parlays:lottoParlays,longshots,mainPicks:[...vip,...free],activePicks:allRows,rows:allRows,records:allRows,picks:allRows,allRows,publicRows,totalUnits:Number(totalUnits.toFixed(2)),birthdayNotes,message:'July 11 card live with expanded premium writeups for all 15 official plays.'})}