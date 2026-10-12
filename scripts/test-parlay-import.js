import assert from 'node:assert/strict'
import {googleSheetsBatchAppend} from '../lib/googleSheetsPickStore.js'
const bad={type:'Half-point parlay',sportsbook:'Delaware',Units:2,Status:'Released',legSelections:[{box:130,selection:'NO +2.5'},{box:129,selection:'MIN -2.5'}]}
await assert.rejects(googleSheetsBatchAppend('lottoParlays',[bad],{dryRun:true}),/Impossible opposing spreads/)
await assert.rejects(googleSheetsBatchAppend('lottoParlays',[bad]),/Impossible opposing spreads/)
const good=await googleSheetsBatchAppend('lottoParlays',[{...bad,legSelections:[{box:130,selection:'NO +10.5'},{box:129,selection:'MIN +5.5'}]}],{dryRun:true});assert.equal(good.ok,true)
console.log('PASS import rejects conflicts before credentials/network, including preview;valid middle retained')
