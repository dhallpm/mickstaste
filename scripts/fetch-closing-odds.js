import { runClosingOddsWorker } from '../lib/closingOddsWorker.js'

const dryRun = process.argv.includes('--dry-run')

runClosingOddsWorker({ dryRun })
  .then(result => {
    console.log('Micks Picks Closing Odds Worker')
    console.log(JSON.stringify(result, null, 2))
    process.exit(0)
  })
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
