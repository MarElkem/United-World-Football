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

/** Cup competitions football-data.org's free plan covers. */
export const cups = [
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

// Competitions only TheSportsDB covers for free. `tsdb` lists the names it
// may use. `tsdbId` is our best guess at its league id, checked against those
// names before use; otherwise the league is searched for by country, then in
// the full list.
const extra = (slug, name, shortName, section, confederation, country, tz, tsdb, more = {}) => ({
  slug, name, shortName, section, confederation, country, tz, tsdb, ...more,
})
export const extras = [
  extra('fa-cup', 'FA Cup', 'FA Cup', 'clubs', 'UEFA', 'gb-eng', 'Europe/London', ['English FA Cup', 'FA Cup'], { cup: true, tsdbId: '4482', tsdbCountry: 'England' }),
  extra('la-liga-2', 'LaLiga 2', 'LaLiga 2', 'clubs', 'UEFA', 'es', 'Europe/Madrid', ['Spanish La Liga 2', 'Spanish Segunda Division', 'LaLiga2', 'Segunda Division'], { tsdbId: '4400', tsdbCountry: 'Spain' }),
  extra('bundesliga-2', '2. Bundesliga', '2. Bundesliga', 'clubs', 'UEFA', 'de', 'Europe/Berlin', ['German 2. Bundesliga', '2. Bundesliga'], { tsdbId: '4399', tsdbCountry: 'Germany' }),
  extra('ligue-2', 'Ligue 2', 'Ligue 2', 'clubs', 'UEFA', 'fr', 'Europe/Paris', ['French Ligue 2', 'Ligue 2'], { tsdbId: '4401', tsdbCountry: 'France' }),
  extra('egypt-premier-league', 'Egyptian Premier League', 'Egyptian PL', 'clubs', 'CAF', 'eg', 'Africa/Cairo', ['Egyptian Premier League'], { tsdbId: '4829', tsdbCountry: 'Egypt' }),
  extra('south-africa-premiership', 'Betway Premiership', 'Premiership', 'clubs', 'CAF', 'za', 'Africa/Johannesburg', ['South African Premier Soccer League', 'South African Premiership', 'Premier Soccer League'], { tsdbId: '4802', tsdbCountry: 'South Africa' }),
  extra('botola-pro', 'Botola Pro', 'Botola Pro', 'clubs', 'CAF', 'ma', 'Africa/Casablanca', ['Moroccan Botola Pro', 'Moroccan Championship', 'Botola Pro'], { tsdbCountry: 'Morocco' }),
  extra('npfl', 'Nigeria Premier Football League', 'NPFL', 'clubs', 'CAF', 'ng', 'Africa/Lagos', ['Nigerian Professional Football League', 'Nigerian Premier League', 'Nigeria Premier Football League'], { tsdbCountry: 'Nigeria' }),
  extra('j1-league', 'J1 League', 'J1 League', 'clubs', 'AFC', 'jp', 'Asia/Tokyo', ['Japanese J1 League', 'J1 League', 'Japanese J League'], { tsdbId: '4633', tsdbCountry: 'Japan' }),
  extra('saudi-pro-league', 'Saudi Pro League', 'Saudi Pro League', 'clubs', 'AFC', 'sa', 'Asia/Riyadh', ['Saudi Pro League', 'Saudi-Arabian Pro League', 'Saudi Professional League'], { tsdbId: '4668', tsdbCountry: 'Saudi Arabia' }),
  extra('k-league-1', 'K League 1', 'K League 1', 'clubs', 'AFC', 'kr', 'Asia/Seoul', ['South Korean K League 1', 'K League 1', 'Korean K League 1'], { tsdbId: '4689', tsdbCountry: 'South Korea' }),
  extra('mls', 'Major League Soccer', 'MLS', 'clubs', 'Concacaf', 'us', 'America/New_York', ['American Major League Soccer', 'Major League Soccer', 'MLS'], { tsdbId: '4346', tsdbCountry: 'USA' }),
  extra('liga-mx', 'Liga MX', 'Liga MX', 'clubs', 'Concacaf', 'mx', 'America/Mexico_City', ['Mexican Primera League', 'Liga MX', 'Mexican Liga MX'], { tsdbId: '4350', tsdbCountry: 'Mexico' }),
  extra('liga-profesional', 'Liga Profesional', 'Liga Profesional', 'clubs', 'CONMEBOL', 'ar', 'America/Argentina/Buenos_Aires', ['Argentinian Primera Division', 'Argentine Primera Division', 'Liga Profesional de Futbol'], { tsdbId: '4406', tsdbCountry: 'Argentina' }),
  extra('a-league', 'A-League Men', 'A-League', 'clubs', 'OFC', 'au', 'Australia/Sydney', ['Australian A-League', 'A-League', 'A-League Men'], { tsdbId: '4356', tsdbCountry: 'Australia' }),
  extra('nz-national-league', 'National League', 'NZ National League', 'clubs', 'OFC', 'nz', 'Pacific/Auckland', ['New Zealand National League'], { tsdbCountry: 'New Zealand' }),
  extra('europa-league', 'UEFA Europa League', 'Europa League', 'intercontinental', 'UEFA', undefined, 'Europe/Paris', ['UEFA Europa League'], { cup: true, tsdbId: '4481' }),
  extra('conference-league', 'UEFA Conference League', 'Conference League', 'intercontinental', 'UEFA', undefined, 'Europe/Paris', ['UEFA Europa Conference League', 'UEFA Conference League'], { cup: true, tsdbId: '5071' }),
  extra('copa-sudamericana', 'CONMEBOL Sudamericana', 'Sudamericana', 'intercontinental', 'CONMEBOL', undefined, 'America/Sao_Paulo', ['CONMEBOL Copa Sudamericana', 'Copa Sudamericana'], { cup: true, tsdbId: '4724' }),
  extra('caf-champions-league', 'CAF Champions League', 'CAF Champions League', 'intercontinental', 'CAF', undefined, 'Africa/Cairo', ['CAF Champions League'], { cup: true, tsdbId: '4720' }),
  extra('caf-confederation-cup', 'CAF Confederation Cup', 'CAF Confed. Cup', 'intercontinental', 'CAF', undefined, 'Africa/Cairo', ['CAF Confederation Cup'], { cup: true }),
  extra('afc-champions-league-elite', 'AFC Champions League Elite', 'ACL Elite', 'intercontinental', 'AFC', undefined, 'Asia/Riyadh', ['AFC Champions League Elite', 'AFC Champions League'], { cup: true, tsdbId: '4517' }),
  extra('nations-league', 'UEFA Nations League', 'Nations League', 'nations', 'UEFA', undefined, 'Europe/Paris', ['UEFA Nations League'], { cup: true, national: true, tsdbId: '4490' }),
  extra('friendlies', 'International friendlies', 'Friendlies', 'nations', 'FIFA', undefined, 'UTC', ['International Friendlies', 'Friendlies'], { cup: true, national: true, tsdbId: '4562' }),
]

// ESPN league codes for the extras (pipeline/sources/espn.mjs). ESPN is tried
// first; TheSportsDB fills in when ESPN has nothing.
const ESPN = {
  'fa-cup': 'eng.fa', 'la-liga-2': 'esp.2', 'bundesliga-2': 'ger.2', 'ligue-2': 'fra.2',
  'egypt-premier-league': 'egy.1', 'south-africa-premiership': 'rsa.1', 'botola-pro': 'mar.1', npfl: 'nga.1',
  'j1-league': 'jpn.1', 'saudi-pro-league': 'ksa.1', 'k-league-1': 'kor.1', mls: 'usa.1', 'liga-mx': 'mex.1',
  'liga-profesional': 'arg.1', 'a-league': 'aus.1', 'europa-league': 'uefa.europa', 'conference-league': 'uefa.europa.conf',
  'copa-sudamericana': 'conmebol.sudamericana', 'caf-champions-league': 'caf.champions', 'caf-confederation-cup': 'caf.confed',
  'afc-champions-league-elite': 'afc.champions', 'nations-league': 'uefa.nations', friendlies: 'fifa.friendly',
}
for (const e of extras) if (ESPN[e.slug]) e.espn = ESPN[e.slug]

// Official RSS feeds, which publishers offer so readers and sites can show
// their headlines with a link back. `tags` place a feed's stories on the globe
// (country or confederation) when the headline alone does not say.
export const newsFeeds = [
  { name: 'BBC Sport', url: 'https://feeds.bbci.co.uk/sport/football/rss.xml', lang: 'en' },
  { name: 'The Guardian', url: 'https://www.theguardian.com/football/rss', lang: 'en' },
  { name: 'Sky Sports', url: 'https://www.skysports.com/rss/12040', lang: 'en' },
  {
    name: 'BBC Sport Africa', url: 'https://feeds.bbci.co.uk/sport/africa/rss.xml', lang: 'en',
    tags: [{ kind: 'confederation', id: 'caf', label: 'Africa' }],
  },
  {
    name: 'Marca', url: 'https://e00-marca.uecdn.es/rss/futbol/primera-division.xml', lang: 'es',
    tags: [{ kind: 'country', id: 'es', label: 'Spain' }],
  },
  {
    name: 'Kicker', url: 'https://newsfeed.kicker.de/news/fussball', lang: 'de',
    tags: [{ kind: 'country', id: 'de', label: 'Germany' }],
  },
  {
    name: 'RMC Sport', url: 'https://rmcsport.bfmtv.com/rss/football/', lang: 'fr',
    tags: [{ kind: 'country', id: 'fr', label: 'France' }],
  },
  {
    name: 'ge (Globo)', url: 'https://ge.globo.com/rss/ge/futebol/', lang: 'pt',
    tags: [{ kind: 'country', id: 'br', label: 'Brazil' }],
  },
]
