export function normalizeUnitSize(value) {
  if (value === undefined || value === null || value === '') return ''
  const raw = String(value).trim()
  const number = Number(raw.replace(/[^\d.+-]/g, ''))
  if (!Number.isFinite(number)) return ''

  // Some import paths accidentally store 75/50/25 where Micks Picks means 0.75u/0.50u/0.25u.
  // Only convert whole-number percentages in the common stake range; keep normal unit values like 1 or 2 intact.
  if (!raw.includes('.') && /^\d+$/.test(raw.replace(/[^\d]/g, '')) && number >= 10 && number <= 100) {
    return Number((number / 100).toFixed(2))
  }

  return Number(number.toFixed(2))
}

export function displayUnitSize(value) {
  const units = normalizeUnitSize(value)
  if (units === '') return ''
  return `${units.toFixed(units % 1 === 0 ? 0 : 2)}u`
}

export default normalizeUnitSize
