function parseNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const cleaned = String(value).replace(/[^\d.+-]/g, '')
  if (!cleaned) return null
  const number = Number(cleaned)
  return Number.isFinite(number) ? number : null
}

function normalizeResult(value) {
  return String(value || '').trim().toLowerCase()
}

export function calculateProfitLossUnits(pick = {}) {
  const odds = parseNumber(pick.Odds ?? pick.odds)
  const units = parseNumber(pick.Units ?? pick.units ?? pick['Units to Commit'])
  const result = normalizeResult(pick.Result ?? pick.result ?? pick.Grade ?? pick.grade)

  if (!result || result === 'pending') return ''
  if (!Number.isFinite(odds) || !Number.isFinite(units)) return ''
  if (['push', 'void', 'cancelled', 'canceled', 'no action'].includes(result)) return '0.00u'
  if (['loss', 'lost', 'l'].includes(result)) return `${(-Math.abs(units)).toFixed(2)}u`
  if (!['win', 'won', 'w'].includes(result)) return ''

  const profit = odds > 0
    ? (Math.abs(units) * odds) / 100
    : (Math.abs(units) * 100) / Math.abs(odds)
  return `${profit >= 0 ? '+' : ''}${profit.toFixed(2)}u`
}

export default calculateProfitLossUnits
