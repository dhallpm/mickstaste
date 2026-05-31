import { calculateProfitLossUnits } from './calculateProfitLossUnits.js'
import { isClosedOrGraded } from './routePickCategory.js'
import {
  ACTIVE_AIRTABLE_TABLE_CONFIG,
  AIRTABLE_TABLE_RESOLVERS,
  AIRTABLE_TABLES,
  createAirtableRecords,
  deleteAirtableRecord,
  listAirtableRecords,
  listAirtableRecordsFromResolvedTable,
  flattenRecord,
  logSyncAction
} from './airtableClient.js'
import { buildRecordKey, withRecordKey } from './recordKey.js'

function firstText(...values) {
  return values.map(value => String(value ?? '').trim()).find(Boolean) || ''
}

function normalizeResult(row = {}) {
  const source = [row.Result, row.Outcome, row.Status, row['Display Status'], row['Pick Status']].join(' ')
  if (/\b(win|won|cash|cashed)\b/i.test(source)) return 'Win'
  if (/\b(loss|lost|lose|failed)\b/i.test(source)) return 'Loss'
  if (/\b(push)\b/i.test(source)) return 'Push'
  if (/\b(void|cancelled|canceled|no action)\b/i.test(source)) return 'Void'
  return ''
}

function isFinalized(row = {}) {
  return ['Win', 'Loss', 'Push', 'Void'].includes(normalizeResult(row))
}

function inferSide(row = {}) {
  const source = [row.Pick, row.Selection, row.Play, row.Market, row['Bet Type'], row.Type, row['Prop Type'], row['Full Analysis'], row.Writeup].join(' ')
  if (/\bover\b/i.test(source)) return 'Over'
  if (/\bunder\b/i.test(source)) return 'Under'
  return ''
}

function buildDisplayPick(row = {}) {
  const existing = firstText(row.Pick, row.Selection, row.Play, row['Card Title'], row.Name)
  if (existing && existing !== '--') return existing

  const player = firstText(row.Player, row.Athlete, row['Player Name'])
  const propType = firstText(row['Prop Type'], row.Market, row.Type, row.Category)
  const line = firstText(row.Line, row.Number, row['Best Number'])
  const side = inferSide(row) || (player && propType && line ? 'Over' : '')

  if (player && propType && line) return [player, side, line, propType].filter(Boolean).join(' ')
  if (player && propType) return [player, propType].filter(Boolean).join(' ')
  return firstText(row.Game, row.Matchup, row.Event, row.Legs, row['Parlay Type'])
}

function safeSourceTableLabel(row = {}) {
  const label = firstText(row.__sourceTableLabel, row['Original Table'])
  if (label && !/^tbl[a-zA-Z0-9]{10,}$/.test(label)) return label
  const table = firstText(row.__table)
  if (/^tbl[a-zA-Z0-9]{10,}$/.test(table)) return 'Master Picks'
  return table || 'Master Picks'
}

function normalizeArchiveFields(fields = {}, sourceRow = {}) {
  const pick = buildDisplayPick(sourceRow)
  const player = firstText(sourceRow.Player, sourceRow.Athlete, sourceRow['Player Name'])
  const propType = firstText(sourceRow['Prop Type'], sourceRow.Market, sourceRow.Type)
  const line = firstText(sourceRow.Line, sourceRow.Number, sourceRow['Best Number'])

  if (pick) fields.Pick = pick
  if (player) fields.Player = player
  if (propType) fields['Prop Type'] = propType
  if (line) fields.Line = line
  if (player || propType || line) {
    fields['Bet Type'] = firstText(fields['Bet Type'], sourceRow['Bet Type'], 'Prop')
    fields.Category = firstText(fields.Category, sourceRow.Category, 'Player Prop')
  }
  fields.Game = firstText(fields.Game, sourceRow.Game, sourceRow.Matchup, sourceRow.Event)
  fields.League = firstText(fields.League, sourceRow.League, sourceRow.Sport)
  fields.Sport = firstText(fields.Sport, sourceRow.Sport, sourceRow.League)
  return fields
}

export function archiveFields(row = {}) {
  const result = normalizeResult(row)
  const fields = normalizeArchiveFields({ ...row }, row)
  delete fields.id
  delete fields.airtableRecordId
  delete fields.__table
  delete fields.__sourceTableLabel

  const unitProfitLoss = calculateProfitLossUnits({ ...row, Result: result })

  fields.Result = result
  fields.Outcome = result
  fields.Status = 'Closed'
  fields['Display Status'] = 'Closed'
  fields['Pick Status'] = 'Closed'
  fields['Profit/Loss Units'] = unitProfitLoss
  fields['P/L'] = unitProfitLoss
  delete fields['Profit/Loss']
  fields['Archived At'] = new Date().toISOString()
  fields['Archive Status'] = 'Archived'
  fields['Original Table'] = safeSourceTableLabel(row)
  fields['Source Airtable Record ID'] = row.airtableRecordId || row.id || ''
  fields['Record Key'] = row['Record Key'] || buildRecordKey({ ...row, Pick: fields.Pick })
  if (/^team total$/i.test(String(fields['Bet Type'] || ''))) delete fields['Bet Type']

  if (String(fields.Sport || '').toLowerCase() === 'mixed') delete fields.Sport
  if (String(fields.League || '').toLowerCase() === 'mixed') delete fields.League

  if (row['Closing Number'] || row['Closing Line']) {
    fields.CLV = row.CLV || row['Closing Value'] || ''
  }

  return fields
}

export async function archiveClosedBets(options = {}) {
  const startedAt = new Date().toISOString()
  const archived = []
  const warnings = []
  const createsByTable = new Map()
  const deletes = []
  let resultsArchiveTable = AIRTABLE_TABLES.resultsArchive

  try {
    const resolvedArchive = await listAirtableRecordsFromResolvedTable(AIRTABLE_TABLE_RESOLVERS.resultsArchive)
    resultsArchiveTable = resolvedArchive.tableName
    warnings.push(...resolvedArchive.warnings)
  } catch (error) {
    if (error.code !== 'AIRTABLE_RESOLVED_TABLE_NOT_FOUND') throw error
    warnings.push(...(error.warnings || []), 'Results Archive table was not found; archive writes will use the configured default.')
  }

  const existingArchiveKeys = new Set(
    (await listAirtableRecords(resultsArchiveTable).catch(() => []))
      .map(record => flattenRecord(record, resultsArchiveTable))
      .map(row => row['Record Key'] || buildRecordKey(row))
      .filter(Boolean)
  )

  for (const config of ACTIVE_AIRTABLE_TABLE_CONFIG) {
    let sourceTable = config.defaultName
    let records = []

    try {
      const resolved = await listAirtableRecordsFromResolvedTable(config)
      records = resolved.records
      sourceTable = resolved.tableName
      warnings.push(...resolved.warnings)
    } catch (error) {
      if (error.code !== 'AIRTABLE_RESOLVED_TABLE_NOT_FOUND') throw error
      warnings.push(...(error.warnings || []), `Skipped archive scan for ${config.defaultName}; no alias table was found.`)
      continue
    }

    for (const record of records) {
      const row = {
        ...flattenRecord(record, sourceTable),
        __sourceTableLabel: config.defaultName
      }
      if (!isClosedOrGraded(row)) continue
      if (!isFinalized(row)) {
        warnings.push(`Skipped ${buildDisplayPick(row) || record.id}: closed/graded marker exists but Result is not Win/Loss/Push/Void.`)
        continue
      }
      if (String(row['Archive Status'] || '').toLowerCase() === 'archived') continue

      const destinationTable = resultsArchiveTable
      const fields = archiveFields(withRecordKey(row))
      if (existingArchiveKeys.has(fields['Record Key'])) continue
      existingArchiveKeys.add(fields['Record Key'])
      createsByTable.set(destinationTable, [...(createsByTable.get(destinationTable) || []), fields])
      deletes.push({ tableName: sourceTable, recordId: record.id })
      archived.push({
        sourceTable: config.defaultName,
        archiveTable: destinationTable,
        pick: fields.Pick || buildDisplayPick(row),
        result: fields.Result,
        profitLossUnits: fields['Profit/Loss Units']
      })
    }
  }

  for (const [tableName, rows] of createsByTable.entries()) {
    if (!options.dryRun) await createAirtableRecords(tableName, rows)
  }

  if (!options.dryRun) {
    for (const item of deletes) {
      try {
        await deleteAirtableRecord(item.tableName, item.recordId)
      } catch (error) {
        if (!/\b403\b/.test(error.message)) throw error
        warnings.push(`Archived ${item.recordId}, but Airtable token cannot delete the closed source row.`)
      }
    }
  }

  await logSyncAction('Archive closed bets', {
    source: 'Airtable active tables',
    destination: 'Airtable archive tables',
    count: archived.length,
    message: options.dryRun ? 'Dry run only' : 'Finalized picks archived with Closed status, pick identity, and unit P/L'
  })

  return { startedAt, finishedAt: new Date().toISOString(), warnings, archivedCount: archived.length, archived }
}

export default archiveClosedBets
