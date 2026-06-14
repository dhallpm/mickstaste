import { buildWebsiteFeed } from '../lib/buildWebsiteFeed.js'
import { sendError } from '../lib/syncAuth.js'

function gradeValue(row = {}) {
  return String(row.grade || row.Grade || '').trim().toUpperCase()
}

function isAOrBetter(row = {}) {
  const grade = gradeValue(row)
  return grade === 'A' || grade === 'A+'
}

function isMasterPick(row = {}) {
  const section = String(row.section || '').toLowerCase()
  const table = String(row.originalTable || row.__table || row.Table || '').toLowerCase()
  return (!section || section === 'picks') && !/(props?|lotto|parlay|longshot)/i.test(table)
}

function makePublicCard(row = {}) {
  const card = {
    ...row,
    access: 'Free',
    fullAnalysisLocked: true,
    homePreview: row.homePreview || row.analysisPreview || row.writeup || row.description || '',
    analysisPreview: row.analysisPreview || row.writeup || row.description || ''
  }
  delete card.fullAnalysis
  return card
}

function keyOf(row = {}) {
  return String(row.recordKey || row.id || `${row.date || ''}|${row.game || ''}|${row.pick || ''}|${row.grade || ''}`)
}

function dedupe(rows = []) {
  return Array.from(new Map(rows.map(row => [keyOf(row), row])).values())
}

function reclassifyBelowAMasterPicks(result = {}) {
  const vip = Array.isArray(result.vip) ? result.vip : []
  const free = Array.isArray(result.free) ? result.free : []
  const vipVault = Array.isArray(result.vipVault) ? result.vipVault : []

  const belowAMasterFromVip = vip.filter(row => isMasterPick(row) && !isAOrBetter(row))
  const belowAMasterFromVault = vipVault.filter(row => isMasterPick(row) && !isAOrBetter(row))
  const moveToFree = dedupe([...belowAMasterFromVip, ...belowAMasterFromVault])
  const movedKeys = new Set(moveToFree.map(keyOf))

  const keptVip = vip.filter(row => !movedKeys.has(keyOf(row)))
  const keptVault = vipVault.filter(row => !movedKeys.has(keyOf(row)))

  if (!moveToFree.length && keptVault.length === vipVault.length && keptVip.length === vip.length) return result

  const warnings = [...(result.warnings || [])]
  if (moveToFree.length) {
    warnings.push(`Reclassified/removed ${moveToFree.length} Master Picks below A grade from VIP/Vault and kept them Free only.`)
  }

  return {
    ...result,
    free: dedupe([...free, ...moveToFree.map(makePublicCard)]),
    vip: keptVip,
    vipVault: keptVault,
    warnings
  }
}

export default async function handler(req, res) {
  try {
    const rawResult = await buildWebsiteFeed({
      date: req.query?.date,
      league: req.query?.league
    })
    const result = reclassifyBelowAMasterPicks(rawResult)
    if (result.warnings?.length) {
      console.warn('Today picks Google Sheets diagnostics:', result.warnings)
    }

    res.status(200).json({
      success: true,
      source: result.source,
      sourceOfTruth: result.sourceOfTruth,
      spreadsheetId: result.spreadsheetId,
      date: result.date,
      warnings: result.warnings || [],
      free: result.free,
      vip: result.vip,
      vipVault: result.vipVault,
      props: result.props,
      lottoParlays: result.lottoParlays,
      longshots: result.longshots
    })
  } catch (error) {
    console.error(error)
    sendError(res, error)
  }
}
