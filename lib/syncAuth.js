import crypto from 'node:crypto'

function timingSafeEqualStrings(a, b) {
  const ab = Buffer.from(String(a), 'utf8')
  const bb = Buffer.from(String(b), 'utf8')
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

function providedSecret(req) {
  const headerSecret = req.headers?.['x-sync-secret']
  if (typeof headerSecret === 'string' && headerSecret) return headerSecret
  const auth = req.headers?.authorization
  if (typeof auth === 'string' && auth.trim()) {
    return auth.replace(/^Bearer\s+/i, '').trim()
  }
  return ''
}

export function assertSyncAuthorized(req) {
  const secret = process.env.SYNC_SECRET
  // Fail closed: if no secret is configured, nothing is authorized.
  if (!secret) {
    const error = new Error('Sync is not configured: SYNC_SECRET is missing')
    error.statusCode = 500
    throw error
  }

  // Secret is accepted from headers only — never query params or request body,
  // which leak into logs, browser history, and referers.
  const provided = providedSecret(req)
  if (!provided || !timingSafeEqualStrings(provided, secret)) {
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
