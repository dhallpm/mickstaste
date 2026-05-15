/* updated lotto-props.js with enhanced lotto detection */

function isLottoProp(row){
const t=lClean(`${row.betType} ${row.market} ${row.pick} ${row.writeup} ${row.fullAnalysis}`);

const must=['lotto','ladder','longshot','long shot','sprinkle','moonshot','high risk','high-risk','hr ladder','home run ladder','sog ladder','alt pra','alt points','alt rebounds','alt assists','same game prop','sgp prop','prop parlay','plus-money prop','plus money prop','2+ total bases','3+ total bases','4+ total bases','2+ hits','3+ hits','home run sprinkle','hr sprinkle','alt tb','alt total bases'];

if(must.some(w=>t.includes(w)))return true;

if(t.includes('home run')&&t.includes('over'))return true;
if(t.includes('anytime touchdown')||t.includes('first touchdown'))return true;

/* AUTO CLASSIFY PLUS MONEY PLAYER UPSIDE PROPS */
const odds=lNum(row.odds);
const upsideWords=['home run','2+ total bases','3+ total bases','4+ total bases','2+ hits','3+ hits','2+ sog','3+ sog','4+ sog','30+ points','35+ points','40+ points','double double','triple double','itd','inside the distance'];

if(upsideWords.some(w=>t.includes(w)) && odds >= 150)return true;

/* AUTO CLASSIFY FEATURED VIP HIGH-VARIANCE PROPS */
if((lVip(row)||lClean(row.featured)==='yes') && odds >= 175)return true;

return false;
}
