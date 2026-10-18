// Every competition the pipeline knows how to fill, and where each one comes
// from. A competition is only shown with data if one of its sources returned
// something on this run; the rest of the catalogue stays "not connected".

const relegation = (n) => ({ relegate: [-n, -1] })
const relegationWithPlayoff = { relegation_playoff: [-3, -3], relegate: [-2, -1] }
const zoneLabels = {
  qualify: 'Promotion',
  playoff: 'Promotion play-offs',
  relegate: 'Relegation',
  relegation_playoff: 'Relegation play-off',
}

/** Season label for a European autumn-to-spring league, such as "2026-27". */
export function europeanSeason(now = new Date()) {
  const y = now.getUTCFullYear()
  const start = now.getUTCMonth() >= 6 ? y : y - 1
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`
}

export const leagues = [
  {
    slug: 'premier-league', name: 'Premier League', shortName: 'Premier League', confederation: 'UEFA', country: 'gb-eng',
    tz: 'Europe/London', openfootball: 'en.1', footballData: 'PL', zones: relegation(3),
  },
  {
    slug: 'championship', name: 'EFL Championship', shortName: 'Championship', confederation: 'UEFA', country: 'gb-eng',
    tz: 'Europe/London', openfootball: 'en.2', footballData: 'ELC', zones: { qualify: [1, 2], playoff: [3, 6], relegate: [-3, -1] },
  },
  {
    slug: 'la-liga', name: 'LaLiga', shortName: 'LaLiga', confederation: 'UEFA', country: 'es',
    tz: 'Europe/Madrid', openfootball: 'es.1', footballData: 'PD', zones: relegation(3),
  },
  {
    slug: 'bundesliga', name: 'Bundesliga', shortName: 'Bundesliga', confederation: 'UEFA', country: 'de',
    tz: 'Europe/Berlin', openfootball: 'de.1', footballData: 'BL1', zones: relegationWithPlayoff,
  },
  {
    slug: 'serie-a', name: 'Serie A', shortName: 'Serie A', confederation: 'UEFA', country: 'it',
    tz: 'Europe/Rome', openfootball: 'it.1', footballData: 'SA', zones: relegation(3),
  },
  {
    slug: 'ligue-1', name: 'Ligue 1', shortName: 'Ligue 1', confederation: 'UEFA', country: 'fr',
    tz: 'Europe/Paris', openfootball: 'fr.1', footballData: 'FL1', zones: relegationWithPlayoff,
  },
  {
    slug: 'eredivisie', name: 'Eredivisie', shortName: 'Eredivisie', confederation: 'UEFA', country: 'nl',
    tz: 'Europe/Amsterdam', openfootball: 'nl.1', footballData: 'DED',
  },
  {
    slug: 'primeira-liga', name: 'Primeira Liga', shortName: 'Primeira Liga', confederation: 'UEFA', country: 'pt',
    tz: 'Europe/Lisbon', openfootball: 'pt.1', footballData: 'PPL', zones: relegationWithPlayoff,
  },
  {
    slug: 'brasileirao-serie-a', name: 'Brasileirão Série A', shortName: 'Brasileirão', confederation: 'CONMEBOL', country: 'br',
    tz: 'America/Sao_Paulo', openfootball: 'br.1', calendarYear: true, footballData: 'BSA', zones: relegation(4),
  },
].map((l) => ({ ...l, section: 'clubs', zoneLabels }))

/**
 * Cup competitions. football-data.org's free plan covers these; openfootball
 * has the 2026 World Cup.
 */
export const cups = [
  {
    slug: 'world-cup-2026', name: 'FIFA World Cup 2026', shortName: 'World Cup 2026', section: 'nations', confederation: 'FIFA',
    tz: 'America/New_York', openfootballWorldCup: '2026', national: true,
  },
  {
    slug: 'champions-league', name: 'UEFA Champions League', shortName: 'Champions League', section: 'intercontinental', confederation: 'UEFA',
    tz: 'Europe/Paris', footballData: 'CL',
    // League phase since 2024-25: 1-8 to the round of 16, 9-24 to the knockout play-offs.
    zones: { qualify: [1, 8], playoff: [9, 24] },
    zoneLabels: { qualify: 'Round of 16', playoff: 'Knockout play-offs' },
  },
  {
    slug: 'copa-libertadores', name: 'CONMEBOL Libertadores', shortName: 'Libertadores', section: 'intercontinental', confederation: 'CONMEBOL',
    tz: 'America/Sao_Paulo', footballData: 'CLI',
    zones: { qualify: [1, 2], continental: [3, 3] },
    zoneLabels: { qualify: 'Round of 16', continental: 'Into the Sudamericana' },
  },
]

export const newsFeeds = [
  { name: 'BBC Sport', url: 'https://feeds.bbci.co.uk/sport/football/rss.xml' },
  { name: 'The Guardian', url: 'https://www.theguardian.com/football/rss' },
  { name: 'ESPN', url: 'https://www.espn.com/espn/rss/soccer/news' },
]
