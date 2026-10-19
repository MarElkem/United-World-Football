// TheSportsDB (https://www.thesportsdb.com), free v1 API with the public test
// key. Community-kept and patchy in places, so it only fills competitions no
// better source covers, and a table is only shown when it looks complete.
// League ids are looked up by name each run rather than hard-coded.

import { competitionStatus } from '../lib/football.mjs'
import { fetchJson, sleep } from '../lib/util.mjs'

const KEY = process.env.THESPORTSDB_KEY?.trim() || '123'
const API = `https://www.thesportsdb.com/api/v1/json/${KEY}`
export const SOURCE = 'TheSportsDB'
/** A supporter key (about $9 a month) lifts the free key's limits. */
export const isPremium = KEY !== '123'

let lastCall = 0
let limited = false
/** True once the free key has been told to slow down on this run. */
export const isLimited = () => limited

async function get(path) {
  if (limited) throw new Error('rate limited earlier in this run')
  const wait = lastCall + Number(process.env.TSDB_INTERVAL_MS ?? (isPremium ? 800 : 6500)) - Date.now()
  if (wait > 0) await sleep(wait)
  lastCall = Date.now()
  try {
    return await fetchJson(`${API}/${path}`)
  } catch (e) {
    if (/^429\b/.test(e.message)) limited = true
    throw e
  }
}

const norm = (s = '') => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

let leaguesPromise
/** Every soccer league in TheSportsDB's full list, fetched once per run. */
function allLeagues() {
  leaguesPromise ??= get('all_leagues.php')
    .then((d) => (d.leagues ?? []).filter((l) => l.strSport === 'Soccer'))
    .catch(() => [])
  return leaguesPromise
}

const labels = (l) => [l.strLeague, ...(l.strLeagueAlternate ?? '').split(',')].map(norm).filter(Boolean)
const named = (l, wanted) => l && (!l.strSport || l.strSport === 'Soccer') && labels(l).some((x) => wanted.includes(x))

/**
 * Finds the league: our id guess if its name checks out, then a search of the
 * country's leagues, then the full list. The error says what was seen, so a
 * name that needs adding shows up in the build report.
 */
export async function findLeague(cfg) {
  const wanted = cfg.tsdb.map(norm)
  const seen = []
  if (cfg.tsdbId) {
    const l = (await get(`lookupleague.php?id=${cfg.tsdbId}`).catch(() => ({}))).leagues?.[0]
    if (named(l, wanted)) return l
    if (l?.strLeague) seen.push(`id ${cfg.tsdbId} is "${l.strLeague}"`)
  }
  if (cfg.tsdbCountry) {
    const d = await get(`search_all_leagues.php?c=${encodeURIComponent(cfg.tsdbCountry)}&s=Soccer`).catch(() => ({}))
    const list = d.countries ?? d.countrys ?? d.leagues ?? []
    const hit = list.find((l) => named(l, wanted))
    if (hit) return hit
    if (list.length) seen.push(`${cfg.tsdbCountry} has ${list.slice(0, 6).map((l) => `"${l.strLeague}"`).join(', ')}`)
  }
  const all = await allLeagues()
  const hit = all.find((l) => named(l, wanted))
  if (hit) return hit
  seen.push(`full list has ${all.length} soccer leagues`)
  throw new Error(`no league named ${cfg.tsdb.join(' / ')} (${seen.join('; ')})`)
}

const FINISHED = /^(match finished|ft|aet|pen|ap|awarded|aw)$/i
function status(e) {
  const s = (e.strStatus ?? '').trim()
  const scored = e.intHomeScore !== null && e.intHomeScore !== '' && e.intHomeScore !== undefined
  if (/^(aet|after extra time)$/i.test(s)) return 'after_extra_time'
  if (/^(pen|ap|after penalties)$/i.test(s)) return 'penalties'
  if (FINISHED.test(s)) return 'finished'
  if (/^(ht|half time)$/i.test(s)) return 'half_time'
  if (/^(1h|2h|et|bt|p|live|in progress)$/i.test(s)) return 'live'
  if (/^(pst|postponed)$/i.test(s)) return 'postponed'
  if (/^(abd|abandoned)$/i.test(s)) return 'abandoned'
  if (/^(canc|cancelled)$/i.test(s)) return 'cancelled'
  if (/^(susp|suspended|int)$/i.test(s)) return 'suspended'
  // No status but a score and a kick-off in the past: the match was played.
  if (scored && Date.now() - kickoffOf(e).getTime() > 3 * 3600000) return 'finished'
  return 'scheduled'
}

function kickoffOf(e) {
  if (e.strTimestamp) return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(e.strTimestamp) ? e.strTimestamp : `${e.strTimestamp}Z`)
  return new Date(`${e.dateEvent}T${(e.strTime || '12:00:00').slice(0, 8)}Z`)
}

const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v))

function toMatch(e, cfg, teams) {
  const st = status(e)
  const h = num(e.intHomeScore)
  const a = num(e.intAwayScore)
  const played = h !== null && a !== null && st !== 'scheduled'
  return {
    id: `${cfg.slug}-tsdb${e.idEvent}`,
    competitionId: cfg.slug,
    stageId: `${cfg.slug}-main`,
    round: e.intRound && e.intRound !== '0' ? `Round ${e.intRound}` : (e.strStage ?? 'Match'),
    homeId: teams.tsdb(e.idHomeTeam, e.strHomeTeam, cfg.country, cfg.national),
    awayId: teams.tsdb(e.idAwayTeam, e.strAwayTeam, cfg.country, cfg.national),
    kickoff: kickoffOf(e).toISOString(),
    venue: e.strVenue || undefined,
    venueTimeZone: cfg.tz,
    status: st,
    score: played ? { home: h, away: a } : undefined,
  }
}

function toRow(r, cfg, teams) {
  return {
    teamId: teams.tsdb(r.idTeam, r.strTeam, cfg.country),
    position: Number(r.intRank),
    played: Number(r.intPlayed),
    won: Number(r.intWin),
    drawn: Number(r.intDraw),
    lost: Number(r.intLoss),
    goalsFor: Number(r.intGoalsFor),
    goalsAgainst: Number(r.intGoalsAgainst),
    points: Number(r.intPoints),
    form: (r.strForm ?? '').toUpperCase().split('').filter((x) => 'WDL'.includes(x)).slice(-5),
  }
}

/**
 * TheSportsDB's "current season" can lag behind (still 2025-2026 in October
 * 2026). A season whose last year ended more than two months ago is treated
 * as over, so its old fixtures and table are not fetched.
 */
export function seasonOver(season, now = Date.now()) {
  const years = (season.match(/\d{4}/g) ?? []).map(Number)
  if (!years.length) return false
  const last = Math.max(...years)
  const end = years.length > 1 ? Date.UTC(last, 5, 30) : Date.UTC(last, 11, 31)
  return now > end + 60 * 86400000
}

export async function competition(cfg, teams, now = Date.now()) {
  const league = await findLeague(cfg)
  const id = league.idLeague
  const info = league.strCurrentSeason ? league : ((await get(`lookupleague.php?id=${id}`)).leagues?.[0] ?? {})
  const listed = info.strCurrentSeason || ''
  const season = seasonOver(listed, now) ? '' : listed

  // One at a time, to stay inside the rate limit.
  const paths = [
    ...(season ? [`eventsseason.php?id=${id}&s=${encodeURIComponent(season)}`] : []),
    `eventspastleague.php?id=${id}`,
    `eventsnextleague.php?id=${id}`,
  ]
  const lists = []
  for (const path of paths) lists.push(await get(path).catch(() => ({})))
  // The free key's season list stops after the first few rounds, so also ask
  // for the whole latest round and the one after it.
  const past = lists.flatMap((l) => l.events ?? []).filter((e) => e && status(e) !== 'scheduled')
  const latest = Math.max(0, ...past.map((e) => Number(e.intRound) || 0))
  if (season && !cfg.cup && latest > 0) {
    for (const r of [latest, latest + 1]) lists.push(await get(`eventsround.php?id=${id}&r=${r}&s=${encodeURIComponent(season)}`).catch(() => ({})))
  }
  const byId = new Map()
  for (const e of lists.flatMap((l) => l.events ?? [])) if (e?.idEvent) byId.set(e.idEvent, e)
  const matches = [...byId.values()].map((e) => toMatch(e, cfg, teams)).sort((x, y) => x.kickoff.localeCompare(y.kickoff))

  const stages = []
  if (season && !cfg.cup) {
    const rows = ((await get(`lookuptable.php?l=${id}&s=${encodeURIComponent(season)}`).catch(() => ({}))).table ?? []).map((r) => toRow(r, cfg, teams))
    const teamCount = new Set(matches.flatMap((m) => [m.homeId, m.awayId])).size
    // A short table (the free key can cut it off) would mislead, so leave it out.
    if (rows.length >= 8 && rows.length >= teamCount - 1) {
      stages.push({ id: `${cfg.slug}-main`, name: 'League', format: 'league', groups: [{ id: 'table', name: 'Table', table: rows.sort((a, b) => a.position - b.position) }] })
    }
  }
  if (!matches.length && !stages.length) throw new Error('no matches or table returned')

  const played = matches.filter((m) => m.score).map((m) => m.kickoff).sort()
  const last = played.at(-1)?.slice(0, 10)
  return {
    id: cfg.slug,
    slug: cfg.slug,
    name: cfg.name,
    shortName: cfg.shortName,
    section: cfg.section,
    confederation: cfg.confederation,
    country: cfg.country,
    season: season.replace('/', '-') || String(new Date(now).getUTCFullYear()),
    status: competitionStatus(matches),
    connected: true,
    about: stages.length ? undefined : 'Fixtures and results only: the free source does not give a complete table for this competition.',
    stamp: {
      source: 'TheSportsDB (free)',
      fetchedAt: new Date(now).toISOString(),
      freshness: 'delayed',
      note: `${isPremium ? '' : 'Free key: recent rounds only. '}Community-kept, so it can be incomplete.${last ? ` Latest result we have: ${last}.` : ''}`,
    },
    matches,
    stages,
  }
}
