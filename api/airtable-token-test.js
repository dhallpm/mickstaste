import { runAirtableTokenTest } from '../lib/airtableTokenTest.js'
import { sendError } from '../lib/syncAuth.js'

export default async function handler(req, res) {
  try {
    const result = await runAirtableTokenTest()
    res.status(200).json(result)
  } catch (error) {
    console.error(error)
    sendError(res, error)
  }
}
