export function assertSyncAuthorized(req) {
  const secret = process.env.SYNC_SECRET
  if (!secret) return
  const userAgent = String(req.headers?.['user-agent'] || '').toLowerCase()
  const vercelCron = req.headers?.['x-vercel-cron'] || userAgent.includes('vercel-cron')
  if (vercelCron) return

  const provided = req.headers?.['x-sync-secret'] ||
    req.headers?.authorization?.replace(/^Bearer\s+/i, '') ||
    req.query?.secret ||
    req.body?.secret

  if (provided !== secret) {
    const error = new Error('Unauthorized sync request')
    error.statusCode = 401
    throw error
  }
}

export function sendError(res, error) {
  res.status(error?.statusCode || 500).json({
    success: false,
    error: error?.message || 'Unknown error',
    ...(error?.details ? { details: error.details } : {})
  })
}
