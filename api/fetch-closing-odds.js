'use strict';

const { runClosingOddsWorker } = require('../lib/closingOddsWorker');

module.exports = async function handler(req, res) {
  if (req.method && !['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    const query = req.query || {};
    const body = req.body || {};
    const summary = await runClosingOddsWorker({
      limit: query.limit || body.limit,
      dryRun: query.dryRun === '1' || body.dryRun === true
    });
    res.status(summary.ok ? 200 : 207).json(summary);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};
