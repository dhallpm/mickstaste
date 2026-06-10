import { google } from 'googleapis'

const DEFAULT_SPREADSHEET_ID = '15txBM8qsck7f0ZA_za7xYEykBxKpuq0no3x7yHcKNeE'

const DEFAULT_TABS = {
  picks: 'Master Picks',
  propsLab: 'Props Lab',
  lottoParlays: 'Lotto Parlays',
  longshots: 'Longshots'
}

const BLOCKED_FIELDS = new Set(['Result', 'Outcome', 'Profit/Loss', 'P/L', 'PL', 'Profit Loss', 'Record ID', 'Airtable Record ID', 'id', 'airtableRecordId', '__table'])

const DEFAULT_HEADERS = {
  picks: ['Date','Sport','League','Game','Pick','Bet Type','Odds','