const CANONICAL_RESULTS = 'https://www.mickspicks.us/data/results.json'
export default async function handler(req,res) {
  res.setHeader('Content-Type','application/json')
  res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, max-age=0')
  try {
    const url = new URL(process.env.RESULTS_CANONICAL_URL || CANONICAL_RESULTS)
    url.searchParams.set('cache',String(Date.now()))
    const response = await fetch(url,{cache:'no-store',headers:{Accept:'application/json'}})
    if(!response.ok) throw new Error('Canonical archive unavailable')
    const payload = await response.json()
    if(payload.success===false || !Array.isArray(payload.results)) throw new Error('Invalid canonical archive')
    res.status(200).json({...payload,source:'canonical-verified-results',mirroredBy:'mickstaste'})
  } catch(error) {
    console.error('Canonical results feed failed:',error.message)
    res.status(502).json({success:false,error:'Results feed is temporarily unavailable.',results:[]})
  }
}
