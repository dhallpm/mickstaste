const INTERNAL_TITLE_PREFIX = /^(?:(?:manual\s+review|watchlist|review|manual|hold|pending|test)\s*:\s*)+/i
const INTERNAL_COPY_PREFIX = /\b(?:manual\s+review|watchlist|review|manual|hold|pending|test)\s*:\s*/gi
const MONEYLINE = /\bmoney\s*line\b|\bmoneyline\b/gi

function cleanTitle(value = '') {
  return String(value || '').trim().replace(/\s+/g, ' ')
}

export function sanitizeCustomerFacingTitle(value = '') {
  return cleanTitle(value)
    .replace(INTERNAL_TITLE_PREFIX, '')
    .replace(MONEYLINE, 'ML')
    .trim()
}

export function sanitizeCustomerFacingCopy(value = '') {
  return String(value || '')
    .replace(INTERNAL_COPY_PREFIX, '')
    .replace(MONEYLINE, 'ML')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim()
}

export default sanitizeCustomerFacingTitle
