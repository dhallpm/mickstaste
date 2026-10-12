import assert from 'node:assert/strict'
import fs from 'node:fs'
const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]))
let date=`${parts.year}-${parts.month}-${parts.day}`;if(Number(parts.hour)<2){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-1);date=d.toISOString().slice(0,10)}
const r={date,section:'Lotto Parlays',type:'Half-point parlay',sportsbook:'Delaware',officialBet:'Yes',units:2,status:'Published',game:'NO-MIN',pick:'Bad ticket',legSelections:[{box:130,selection:'NO +2.5'},{box:129,selection:'MIN -2.5'}]}
fs.writeFileSync(new URL('../data/todays-picks.json',import.meta.url),JSON.stringify({lottoParlays:[r]}))
const {default:handler}=await import('../api/todays-picks.js');let payload;handler({}, {setHeader(){},status(){return this},json(v){payload=v}})
assert.equal(payload.lottoParlays.length,1);assert.equal(payload.totalExposure,0);assert.equal(payload.mainPicks.length,0);assert.match(payload.lottoParlays[0].status,/BLOCKED/);assert.match(payload.lottoParlays[0].writeup,/Impossible/)
console.log('PASS prospective static-card conflict remains visible as zero-unit Watchlist, never official exposure')
