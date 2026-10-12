import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'micks-ticket-feed-'))
try {
 for(const d of ['api','lib','data'])fs.mkdirSync(path.join(fixture,d))
 fs.writeFileSync(path.join(fixture,'package.json'),'{"type":"module"}')
 fs.copyFileSync(new URL('../api/todays-picks.js',import.meta.url),path.join(fixture,'api/todays-picks.js'))
 fs.copyFileSync(new URL('../lib/parlayValidation.js',import.meta.url),path.join(fixture,'lib/parlayValidation.js'))
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]))
 let date=`${parts.year}-${parts.month}-${parts.day}`;if(Number(parts.hour)<2){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-1);date=d.toISOString().slice(0,10)}
 const r={date,section:'Lotto Parlays',type:'Half-point parlay',sportsbook:'Delaware',officialBet:'Yes',units:2,status:'Published',game:'NO-MIN',pick:'Bad ticket',legSelections:[{box:130,selection:'NO +2.5'},{box:129,selection:'MIN -2.5'}]}
 fs.writeFileSync(path.join(fixture,'data/todays-picks.json'),JSON.stringify({lottoParlays:[r]}))
 const {default:handler}=await import(pathToFileURL(path.join(fixture,'api/todays-picks.js')))
 let payload;handler({}, {setHeader(){},status(){return this},json(v){payload=v}})
 assert.equal(payload.lottoParlays.length,1);assert.equal(payload.totalExposure,0);assert.equal(payload.mainPicks.length,0);assert.match(payload.lottoParlays[0].status,/BLOCKED/);assert.match(payload.lottoParlays[0].writeup,/Impossible/)
 console.log('PASS isolated prospective static-card conflict remains zero-unit Watchlist, never official exposure')
} finally {fs.rmSync(fixture,{recursive:true,force:true})}
