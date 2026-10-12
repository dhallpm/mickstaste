const text = value => String(value ?? '').trim()
const value = (row, ...keys) => keys.map(k => row[k]).find(v => v !== undefined && v !== null && text(v) !== '')
const settled = row => /^(graded|settled|win|loss|push|void|cancelled)$/i.test(text(value(row,'Status','status','Result','result')))
export function ticketLegs(row = {}) {
  const structured = value(row,'legSelections','Leg Selections','legGrades')
  if (Array.isArray(structured)) return structured.map(l => typeof l === 'string' ? {selection:l} : l)
  const raw = value(row,'Legs','legs','Line','lineNumber')
  return typeof raw === 'string' ? raw.split(/\s*(?:;|\n|\||\s\/\s)\s*/).filter(Boolean).map(selection => ({selection})) : []
}
export function validateParlay(row = {}) {
  const label = [row.section,row.Section,row.type,row.Type,row.market,row.Market,row.sportsbook,row.Sportsbook].join(' ')
  if (!/parlay|teaser|lotto/i.test(label)) return {isTicket:false,valid:true,errors:[],warnings:[]}
  const legs = ticketLegs(row), errors = [], warnings = [], parsed = []
  const delaware = /Delaware|half.?point|big.?teaser/i.test(label)
  const wanted = Number(value(row,'requestedLegCount','requested_count','Leg Count','legCount'))
  if (!legs.length) errors.push('No exact leg selections supplied.')
  if (Number.isFinite(wanted) && wanted > 0 && legs.length !== wanted) errors.push(`Expected ${wanted} legs; received ${legs.length}.`)
  if (Number(value(row,'openSlots','open_slots') || 0)>0) errors.push('Ticket contains unfilled positions.')
  const seen = new Set()
  for (const leg of legs) {
    const selection = text(value(leg,'selection','pick','Pick'))
    if (/\bOPEN\b|not selected|TBD|ungraded/i.test(selection)) errors.push('Ticket contains an unfilled or ungraded selection.')
    const box = Number(value(leg,'box','cell','cellId') ?? selection.match(/^#(\d+)/)?.[1])
    if (/ungraded|hold|incomplete|pass/i.test([leg.grade,leg.Grade,leg.status,leg.Status].join(' ')) || leg.releaseEligible===false) errors.push(`Uncleared leg: ${selection}`)
    const period = text(value(leg,'period','Period') || 'full-game').toLowerCase()
    const match = selection.replace(/^#\d+\s*:?[ ]*/,'').match(/^(.+?)\s*([+-]\d+(?:\.\d+)?)(?:\s|\*|$)/)
    const total = selection.match(/\b(Over|Under|O|U)\s*(\d+(?:\.\d+)?)/i)
    const explicitGame = text(value(leg,'gameId','matchup','game','Game'))
    const game = explicitGame ? explicitGame.toLowerCase().replace(/\s+/g,' ') : delaware && Number.isInteger(box) && box>0 ? `cell-pair-${Math.floor((box-1)/2)}` : ''
    const duplicate = [game,period,selection.toLowerCase().replace(/\s+/g,'')].join('|')
    if (seen.has(duplicate)) errors.push(`Duplicate leg: ${selection}`)
    seen.add(duplicate)
    if (!game) {warnings.push(`Game identity missing for conflict review: ${selection}`);continue}
    if (total) parsed.push({game,period,kind:'total',direction:/^(under|u)$/i.test(total[1])?'under':'over',number:Number(total[2]),selection})
    else if (match) parsed.push({game,period,kind:'spread',team:match[1].toLowerCase().replace(/[^a-z]/g,''),number:Number(match[2]),selection})
  }
  for(let i=0;i<parsed.length;i++) for(let j=i+1;j<parsed.length;j++) {
    const a=parsed[i],b=parsed[j]
    if(a.game!==b.game||a.period!==b.period||a.kind!==b.kind)continue
    if(a.kind==='spread'&&a.team!==b.team&&a.number+b.number<=0) errors.push(`Impossible opposing spreads: ${a.selection} / ${b.selection}`)
    if(a.kind==='total'&&a.direction!==b.direction) {
      const over=a.direction==='over'?a:b, under=a.direction==='under'?a:b
      if(Math.floor(over.number)+1>=under.number)errors.push(`Impossible opposing totals: ${a.selection} / ${b.selection}`)
    }
  }
  return {isTicket:true,valid:errors.length===0,errors:[...new Set(errors)],warnings:[...new Set(warnings)],legCount:legs.length}
}
export function guardParlayRelease(row = {}) {
  if(settled(row))return row
  const check = validateParlay(row)
  if(!check.isTicket)return row
  const state = [row.Status,row.status,row.Grade,row.grade].join(' ')
  const ungraded = /ungraded|hold|incomplete|conflict/i.test(state)
  if(check.valid && !ungraded && check.warnings.length===0)return {...row,ticketValidation:check}
  const reason = [...check.errors,...check.warnings].join(' ') || 'Incomplete assessment or HOLD remains unresolved.'
  return {...row,ticketValidation:check,Status:'Watchlist - BLOCKED',status:'Watchlist - BLOCKED',Units:0,units:0,'Official Bet':'No',officialBet:'No',showFullAnalysis:true,cardTitle:text(row.cardTitle||row.Pick||row.pick)+' - BLOCKED',Writeup:`NO BET: ${reason}\n\n${text(row.Writeup||row.writeup)}`,writeup:`NO BET: ${reason}\n\n${text(row.Writeup||row.writeup)}`}
}
export function assertParlayImportable(row = {}) {
  if(settled(row))return
  const check=validateParlay(row)
  if(!check.isTicket)return
  const releasing = Number(value(row,'Units','units') || 0)>0 && !/watch|hold|draft|pass/i.test([row.Status,row.status,row['Release Status'],row.releaseStatus].join(' '))
  if(releasing && (!check.valid || check.warnings.length>0 || /ungraded|incomplete|conflict/i.test([row.Grade,row.grade].join(' ')))) {
    const error=new Error([...check.errors,...check.warnings].join(' ') || 'Ungraded ticket cannot be released.');error.code='INVALID_PARLAY';error.validation=check;throw error
  }
}
