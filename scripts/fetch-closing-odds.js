#!/usr/bin/env node
'use strict';

const { runClosingOddsWorker } = require('../lib/closingOddsWorker');

function readArgs(argv) {
  const args = { dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') args.dryRun = true;
    if (arg === '--limit') {
      args.limit = Number(argv[i + 1]);
      i += 1;
    }
  }
  return args;
}

runClosingOddsWorker(readArgs(process.argv.slice(2)))
  .then(summary => {
    console.log(JSON.stringify(summary, null, 2));
    process.exit(summary.ok ? 0 : 1);
  })
  .catch(err => {
    console.error(err.stack || err.message);
    process.exit(1);
  });
