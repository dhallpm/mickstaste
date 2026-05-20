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

  if (!Number.isFinite(odds) || !Number.isFinite(units)) return 0
  if (['push', 'void', 'cancelled', 'canceled', 'no action'].includes(result)) return 0
  if (['loss', 'lost', 'l'].includes(result)) return -Math.abs(units)
  if (!['win', 'won', 'w'].includes(result)) return 0

  if (odds > 0) return Number(((Math.abs(units) * odds) / 100).toFixed(2))
  return Number(((Math.abs(units) * 100) / Math.abs(odds)).toFixed(2))
}

export default calculateProfitLossUnits
