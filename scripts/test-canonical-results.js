import assert from 'node:assert/strict'
import handler from '../api/results.js'
let payload,code,urlSeen;const res={setHeader(){},status(v){code=v;return this},json(v){payload=v}}
global.fetch=async u=>{urlSeen=String(u);return {ok:true,json:async()=>({success:true,results:[{id:'old'},{id:'new'}],summary:{overall:{wins:1,losses:1}}})}}
await handler({},res);assert.equal(code,200);assert.match(urlSeen,/mickspicks.us\/data\/results.json/);assert.equal(payload.results.length,2);assert.equal(payload.summary.overall.wins,1)
global.fetch=async()=>({ok:false});await handler({},res);assert.equal(code,502);assert.deepEqual(payload.results,[])
global.fetch=async()=>({ok:true,json:async()=>({success:false,results:[]})});await handler({},res);assert.equal(code,502)
console.log('PASS single canonical archive, history/summary preservation, and failure handling')
