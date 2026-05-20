import { syncAirtableToSheets } from '../lib/syncAirtableToSheets.js'
import { syncSheetsToAirtableFallback } from '../lib/syncSheetsToAirtableFallback.js'

export default async function handler(req, res) {
  try {
    const dryRun = req.query?.dryRun === '1'
    const enableFallback = req.query?.fallback === '1' || req.body?.enableFallback === true
    const airtableToSheets = await syncAirtableToSheets({ dryRun })
    const sheetsFallback = await syncSheetsToAirtableFallback({ dryRun, enableFallback })

    res.status(200).json({
      success: true,
      sourceOfTruth: 'Airtable',
      airtableToSheets,
      sheetsFallback
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error?.message || 'Unknown error' })
  }
}
