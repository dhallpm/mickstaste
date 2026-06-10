const BOX_SCORE_HINTS = /\bbox\s*score\b|\bplayer\s+stats?\b|\bteam\s+stats?\b|\bscoring\s+summary\b|\bbatting\b|\bpitching\b|\bgamecast\b|\bfinal stats?\b/i
const RECAP_HINTS = /\brecap\b|\bpreview\b|\bstory\b|\barticle\b/i

export const RESULT_SOURCE_PRIORITY = [
  'official-box-score',
  'sports-reference',
  'media-box-score',
  'secondary'
]

export const RESULT_SOURCE_PROVIDERS = [
  {
    id: 'official-box-score',
    priority: 1,
    sourceName: 'Official league/team box score',
    domains: [
      'mlb.com',
      'statsapi.mlb.com',
      'nba.com',
      'wnba.com',
      'nhl.com'
    ],
    trustedBoxScore: true,
    secondaryOnly: false
  },
  {
    id: 'sports-reference',
    priority: 2,
    sourceName: 'Sports Reference box score',
    domains: [
      'sports-reference.com',
      'baseball-reference.com',
      'basketball-reference.com',
      'hockey-reference.com'
    ],
    trustedBoxScore: true,
    secondaryOnly: false
  },
  {
    id: 'media-box-score',
    priority: 3,
    sourceName: 'Media box score',
    domains: [
      'espn.com',
      'cbssports.com',
      'foxsports.com',
      'sports.yahoo.com',
      'yahoo.com'
    ],
    trustedBoxScore: true,
    secondaryOnly: false
  },
  {
    id: 'secondary',
    priority: 4,
    sourceName: 'Approved secondary source',
    domains: [
      'statmuse.com'
    ],
    trustedBoxScore: false,
    secondaryOnly: true
  }
]

function text(value) {
  return String(value ?? '').trim()
}

function hostFromUrl(value = '') {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return ''
  }
}

export function providerForUrl(url = '') {
  const host = hostFromUrl(url)
  return RESULT_SOURCE_PROVIDERS.find(provider =>
    provider.domains.some(domain => host === domain || host.endsWith(`.${domain}`))
  ) || {
    id: 'secondary',
    priority: 4,
    sourceName: 'Approved secondary source',
    domains: [],
    trustedBoxScore: false,
    secondaryOnly: true
  }
}

export function sourcePriorityForUrl(url = '') {
  return providerForUrl(url).priority
}

export function sourceNameForUrl(url = '') {
  const provider = providerForUrl(url)
  const host = hostFromUrl(url)
  if (provider.id === 'media-box-score') {
    if (/espn\.com$/.test(host)) return 'ESPN box score'
    if (/cbssports\.com$/.test(host)) return 'CBS Sports box score'
    if (/foxsports\.com$/.test(host)) return 'FOX Sports box score'
    if (/yahoo\.com$/.test(host)) return 'Yahoo Sports box score'
  }
  if (provider.id === 'official-box-score') {
    if (/mlb\.com$/.test(host)) return 'MLB official box score'
    if (/wnba\.com$/.test(host)) return 'WNBA official box score'
    if (/nba\.com$/.test(host)) return 'NBA official box score'
    if (/nhl\.com$/.test(host)) return 'NHL official box score'
  }
  if (provider.id === 'sports-reference') {
    if (/baseball-reference\.com$/.test(host)) return 'Baseball Reference box score'
    if (/basketball-reference\.com$/.test(host)) return 'Basketball Reference box score'
    if (/hockey-reference\.com$/.test(host)) return 'Hockey Reference box score'
  }
  if (/statmuse\.com$/.test(host)) return 'StatMuse secondary confirmation'
  return provider.sourceName
}

export function collectResultSourceUrls(row = {}) {
  const fields = [
    'Official Box Score URL',
    'Box Score URL',
    'Result Source URL',
    'Settlement Source URL',
    'Sports Reference URL',
    'Baseball Reference URL',
    'Basketball Reference URL',
    'Hockey Reference URL',
    'ESPN Box Score URL',
    'CBS Box Score URL',
    'FOX Box Score URL',
    'Yahoo Box Score URL',
    'StatMuse URL',
    'Source Verification',
    'Settlement Source',
    'Settlement Notes'
  ]

  const found = []
  for (const field of fields) {
    const value = text(row[field])
    if (!value) continue
    const matches = value.match(/https?:\/\/[^\s,)"']+/gi) || []
    found.push(...matches.map(url => url.replace(/[.)\]]+$/, '')))
  }

  return Array.from(new Set(found)).sort((a, b) => sourcePriorityForUrl(a) - sourcePriorityForUrl(b))
}

export function isBoxScoreLikeContent(content = '', provider = {}) {
  if (!text(content)) return false
  if (provider.trustedBoxScore && BOX_SCORE_HINTS.test(content)) return true
  if (provider.trustedBoxScore && /\bfinal\b/i.test(content) && /\b(points?|runs?|goals?|hits?|rbi|strikeouts?|shots?)\b/i.test(content)) return true
  return false
}

export function isRecapOnlyContent(content = '', provider = {}) {
  if (!text(content)) return true
  return RECAP_HINTS.test(content) && !isBoxScoreLikeContent(content, provider)
}

export async function fetchResultSource(provider, url, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch
  const sourceName = sourceNameForUrl(url)
  if (!fetchImpl) {
    return {
      status: 'needs_review',
      sourceName,
      sourceUrl: url,
      finalScore: {},
      playerStats: {},
      notes: 'Fetch is unavailable for source confirmation.'
    }
  }

  try {
    const response = await fetchImpl(url, { headers: { 'User-Agent': 'MicksPicksSettlement/1.0' } })
    const body = await response.text()
    const boxScore = isBoxScoreLikeContent(body, provider)
    const recapOnly = isRecapOnlyContent(body, provider)
    return {
      status: boxScore || !recapOnly ? 'verified' : 'needs_review',
      sourceName,
      sourceUrl: url,
      finalScore: {},
      playerStats: {},
      notes: boxScore
        ? 'Trusted source returned box score/stat-table evidence.'
        : 'Source did not expose a clear box score/stat table.',
      rawText: body
    }
  } catch (error) {
    return {
      status: 'needs_review',
      sourceName,
      sourceUrl: url,
      finalScore: {},
      playerStats: {},
      notes: `Source fetch failed: ${error.message || String(error)}`
    }
  }
}

export default RESULT_SOURCE_PROVIDERS
