export async function runClosingOddsWorker(options = {}) {
  const startedAt = new Date().toISOString()

  return {
    startedAt,
    dryRun: !!options.dryRun,
    status: 'scaffold-created',
    nextSteps: [
      'Add Google Sheets credentials to Vercel environment variables',
      'Connect Results Archive scanning',
      'Implement public/static odds-source parsers',
      'Write verified odds back into Results Archive and Static Closing Odds Lookup'
    ]
  }
}
