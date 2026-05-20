import { runAirtableDiagnostics } from '../lib/airtableDiagnostics.js'
import { sendError } from '../lib/syncAuth.js'

export default async function handler(req, res) {
  try {
    const result = await runAirtableDiagnostics()
    res.status(200).json(result)
  } catch (error) {
    console.error(error)
    sendError(res, error)
  }
}
