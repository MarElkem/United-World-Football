// TheSportsDB (https://www.thesportsdb.com), free v1 API with the public test
// key. Community-kept and patchy in places, so it only fills competitions no
// better source covers, and a table is only shown when it looks complete.
// League ids are looked up by name each run rather than hard-coded.

import { competitionStatus } from '../lib/football.mjs'
import { fetchJson, sleep } from '../lib/util.mjs'

const KEY = process.env.THESPORTSDB_KEY?.trim() || '123'
const API = `https://www.thesportsdb.com/api/v1/json/${KEY}`
export const SOURCE = 'TheSportsDB'

let lastCall = 0
async function get(path) {
  // The free key allows about 30 calls a minute.
  const wait = lastCall + Number(process.env.TSDB_INTERVAL_MS ?? 2100) - Date.now()
  if (wait > 0) await sleep(wait)
  lastCall = Date.now()
  return fetchJson(`${API}/${path}`)
}

const norm = (s = '') => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

let leaguesPromise
/** Every soccer league TheSportsDB knows, fetched once per run. */
function allLeagues() {
  leaguesPromise ??= get('all_leagues.php').then((d) => (d.leagues ?? []).filter((l) => l.strSport === 'Soccer'))
  return leaguesPromise
}

export async function findLeague(names) {
  const leagues = await allLeagues()
  const wanted = names.map(norm)
  const labels = (l) => [l.strLeague, ...(l.strLeagueAlternate ?? '').split(',')].map(norm).filter(Boolean)
  return leagues.find((l) => labels(l).some((x) => wanted.includes(x))) ?? null
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

export async function competition(cfg, teams, now = Date.now()) {
  const league = await findLeague(cfg.tsdb)
  if (!league) throw new Error(`no league named ${cfg.tsdb.join(' / ')}`)
  const id = league.idLeague
  const info = (await get(`lookupleague.php?id=${id}`)).leagues?.[0] ?? {}
  const season = info.strCurrentSeason || ''

  // One at a time, to stay inside the rate limit.
  const paths = [
    ...(season ? [`eventsseason.php?id=${id}&s=${encodeURIComponent(season)}`] : []),
    `eventspastleague.php?id=${id}`,
    `eventsnextleague.php?id=${id}`,
  ]
  const lists = []
  for (const path of paths) lists.push(await get(path).catch(() => ({})))
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
      note: `Community-kept, so it can be incomplete.${last ? ` Latest result we have: ${last}.` : ''}`,
    },
    matches,
    stages,
  }
}
