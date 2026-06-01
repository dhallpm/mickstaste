import { buildWebsiteFeed } from '../lib/buildWebsiteFeed.js'
import { sendError } from '../lib/syncAuth.js'

function text(...values) {
  return values.map(value => String(value ?? '').trim()).find(Boolean) || ''
}

function rowToOdds(row = {}) {
  return {
    date: row.date || row.Date || '',
    league: text(row.league, row.League, row.sport, row.Sport),
    game: text(row.game, row.Game, row.Matchup, row.Event),
    pick: text(row.pick, row.Pick, row.Selection, row.Play),
    betType: text(row.betType, row['Bet Type'], row.market, row.Market, row.category, row.Category),
    odds: text(row.odds, row.Odds, row.Price),
    sportsbook: text(row.sportsbook, row.Sportsbook, row.book, row.Book, 'CSV / Manual Import'),
    bestMarket: text(row.bestMarket, row.bestNumber, row['Best Number'], row.lineNumber, row.Line, row.Number, row.odds, row.Odds),
    movement: text(row.movement, row['Line Movement'], row['Market Notes'], 'Imported odds'),
    confirmation: text(row.confirmation, row.sourceVerification, row['Source Verification'], 'Imported from Micks Picks feed'),
    status: text(row.status, row.Status, row.releaseStatus, row['Release Status'])
  }
}

export default async function handler(req, res) {
  try {
    const feed = await buildWebsiteFeed({
      date: req.query?.date,
      league: req.query?.league
    })
    const rows = [
      ...(feed.free || []),
      ...(feed.vip || []),
      ...(feed.props || []),
      ...(feed.lottoParlays || []),
      ...(feed.longshots || [])
    ]
      .map(rowToOdds)
      .filter(row => row.pick && row.odds)

    res.status(200).json({
      success: true,
      source: 'airtable',
      sourceOfTruth: feed.sourceOfTruth || 'Airtable',
      date: feed.date,
      count: rows.length,
      rows,
      warnings: feed.warnings || []
    })
  } catch (error) {
    console.error(error)
    sendError(res, error)
  }
}
