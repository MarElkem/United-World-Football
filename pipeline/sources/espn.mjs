// ESPN's public site feed (site.api.espn.com), the JSON its own scoreboards
// read. No key. It is unofficial and undocumented, so it can change without
// notice; kiki chose it on 2026-10-18 for the leagues the free keys cover
// thinly, with TheSportsDB kept as the fallback. Requests are paced and few.

import { competitionStatus } from '../lib/football.mjs'
import { fetchJson, sleep } from '../lib/util.mjs'

export const SOURCE = 'ESPN'
const SITE = 'https://site.api.espn.com/apis/site/v2/sports/soccer'
const STANDINGS = 'https://site.api.espn.com/apis/v2/sports/soccer'

let lastCall = 0
async function get(url) {
  const wait = lastCall + Number(process.env.ESPN_INTERVAL_MS ?? 400) - Date.now()
  if (wait > 0) await sleep(wait)
  lastCall = Date.now()
  return fetchJson(url)
}

const ymd = (t) => new Date(t).toISOString().slice(0, 10).replace(/-/g, '')
const num = (v) => (v === undefined || v === null || v === '' ? null : Number(typeof v === 'object' ? (v.value ?? v.displayValue) : v))

const STATUS = {
  STATUS_SCHEDULED: 'scheduled',
  STATUS_HALFTIME: 'half_time',
  STATUS_FULL_TIME: 'finished',
  STATUS_FINAL: 'finished',
  STATUS_FINAL_AET: 'after_extra_time',
  STATUS_FINAL_PEN: 'penalties',
  STATUS_POSTPONED: 'postponed',
  STATUS_CANCELED: 'cancelled',
  STATUS_ABANDONED: 'abandoned',
  STATUS_SUSPENDED: 'suspended',
  STATUS_DELAYED: 'scheduled',
  STATUS_FORFEIT: 'awarded',
}

export function status(type = {}) {
  if (STATUS[type.name]) return STATUS[type.name]
  if (type.state === 'in') return 'live'
  if (type.state === 'post' || type.completed) return 'finished'
  return 'scheduled'
}

function teamId(teams, t, cfg) {
  if (!t?.id) return ''
  return teams.espn(t.id, t.displayName ?? t.name, t.shortDisplayName, cfg.country ?? '', !!cfg.national)
}

export function toMatch(ev, cfg, teams) {
  const comp = ev.competitions?.[0] ?? {}
  const sides = comp.competitors ?? []
  const home = sides.find((s) => s.homeAway === 'home') ?? sides[0]
  const away = sides.find((s) => s.homeAway === 'away') ?? sides[1]
  const type = (comp.status ?? ev.status)?.type ?? {}
  const st = status(type)
  const h = num(home?.score)
  const a = num(away?.score)
  const scored = type.state !== 'pre' && h !== null && a !== null && st !== 'scheduled'
  const ph = num(home?.shootoutScore)
  const pa = num(away?.shootoutScore)
  const minute = parseInt((comp.status ?? ev.status)?.displayClock ?? '', 10)
  const note = comp.notes?.[0]?.headline
  return {
    id: `${cfg.slug}-espn${ev.id}`,
    competitionId: cfg.slug,
    stageId: `${cfg.slug}-main`,
    round: ev.week?.number ? `Matchday ${ev.week.number}` : note || comp.type?.text || 'Match',
    homeId: teamId(teams, home?.team, cfg),
    awayId: teamId(teams, away?.team, cfg),
    kickoff: new Date(ev.date ?? comp.date).toISOString(),
    venue: comp.venue?.fullName || undefined,
    venueTimeZone: cfg.tz,
    status: st,
    ...(st === 'live' && minute ? { minute } : {}),
    score: scored ? { home: h, away: a } : undefined,
    ...(scored && ph !== null && pa !== null ? { penalties: { home: ph, away: pa } } : {}),
  }
}

const stat = (entry, ...names) => {
  for (const s of entry.stats ?? []) if (names.includes(s.name) || names.includes(s.abbreviation) || names.includes(s.type)) return Number(s.value ?? 0)
  return null
}

export function toTable(entries, cfg, teams) {
  const rows = entries
    .filter((e) => e.team?.id)
    .map((e) => {
      const gf = stat(e, 'pointsFor', 'F') ?? 0
      const ga = stat(e, 'pointsAgainst', 'A') ?? 0
      return {
        teamId: teamId(teams, e.team, cfg),
        position: stat(e, 'rank', 'R') ?? 0,
        played: stat(e, 'gamesPlayed', 'GP') ?? 0,
        won: stat(e, 'wins', 'W') ?? 0,
        drawn: stat(e, 'ties', 'D') ?? 0,
        lost: stat(e, 'losses', 'L') ?? 0,
        goalsFor: gf,
        goalsAgainst: ga,
        points: stat(e, 'points', 'P') ?? 0,
        form: [],
      }
    })
  // ESPN's own order is the table order; fill missing ranks from it.
  const ranked = rows.every((r) => r.position > 0)
    ? rows.sort((a, b) => a.position - b.position)
    : rows.sort((a, b) => b.points - a.points || b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor)
  ranked.forEach((r, i) => (r.position ||= i + 1))
  return ranked
}

// The feed answers a plain scoreboard (today's matches) and single dates, so
// read the league's calendar of match days from the plain scoreboard and ask
// for each match day in the window.
async function scoreboard(code, from, to) {
  const url = `${SITE}/${code}/scoreboard`
  let today
  try {
    today = await get(url)
  } catch (e) {
    throw new Error(`${code}: ${String(e.message).split(' for ')[0]}${await codesLike(code)}`)
  }
  const cal = today.leagues?.[0]?.calendar ?? []
  const days = [...new Set(cal.flatMap((d) => (typeof d === 'string' ? [d] : (d.entries ?? []).map((x) => x.startDate)))
    .map((d) => Date.parse(d)).filter((t) => t >= from - 86400000 && t <= to).map(ymd))]
  const events = new Map((today.events ?? []).map((e) => [e.id, e]))
  let ok = 0
  let failed = ''
  for (const d of days) {
    try {
      for (const e of (await get(`${url}?dates=${d}`)).events ?? []) events.set(e.id, e)
      ok++
    } catch (e) {
      failed ||= String(e.message).split(' for ')[0]
    }
  }
  const via = `${ok}/${days.length} match days${failed ? `, ${failed}` : ''}`
  return { via, dated: ok > 0, board: { ...today, events: [...events.values()] } }
}

// When ESPN does not know a code, list the codes it has for that country.
async function codesLike(code) {
  try {
    const d = await get('https://sports.core.api.espn.com/v2/sports/soccer/leagues?limit=1000')
    const prefix = code.split('.')[0]
    const slugs = (d.items ?? []).map((i) => /leagues\/([^?/]+)/.exec(i.$ref ?? '')?.[1]).filter((x) => x?.startsWith(prefix))
    return ` (ESPN has ${slugs.length ? slugs.join(', ') : `no ${prefix}.* league`} of ${d.items?.length ?? 0})`
  } catch {
    return ''
  }
}

export async function competition(cfg, teams, now = Date.now()) {
  const back = Number(process.env.ESPN_DAYS_BACK ?? 28)
  const ahead = Number(process.env.ESPN_DAYS_AHEAD ?? 28)
  const { via, dated, board } = await scoreboard(cfg.espn, now - back * 86400000, now + ahead * 86400000)
  const matches = (board.events ?? [])
    .map((e) => toMatch(e, cfg, teams))
    .filter((m) => m.homeId && m.awayId)
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))

  const stages = []
  const table = await get(`${STANDINGS}/${cfg.espn}/standings`).catch(() => ({}))
  const parts = (table.children?.length ? table.children : [table]).filter((p) => p.standings?.entries?.length)
  const groups = parts
    .map((p, i) => ({ id: p.abbreviation || p.id || `g${i + 1}`, name: p.name || 'Table', table: toTable(p.standings.entries, cfg, teams) }))
    .filter((g) => g.table.length >= 4)
  if (groups.length) {
    const format = groups.length > 1 ? 'groups' : cfg.cup ? 'league_phase' : 'league'
    stages.push({ id: `${cfg.slug}-main`, name: groups.length > 1 ? 'Groups' : cfg.cup ? 'League phase' : 'League', format, groups: groups.length === 1 ? [{ ...groups[0], id: 'table', name: 'Table' }] : groups })
  }
  if (!matches.length && !stages.length) throw new Error(`no matches or table for ${cfg.espn}`)
  // Today's scoreboard alone would make a running league look finished.
  if (!dated) throw new Error(`${cfg.espn}: only today's matches (${via})`)

  const season = board.leagues?.[0]?.season
  const played = matches.filter((m) => m.score).map((m) => m.kickoff).sort()
  return {
    id: cfg.slug,
    slug: cfg.slug,
    name: cfg.name,
    shortName: cfg.shortName,
    section: cfg.section,
    confederation: cfg.confederation,
    country: cfg.country,
    season: season?.displayName?.replace('/', '-') || String(season?.year ?? new Date(now).getUTCFullYear()),
    status: competitionStatus(matches),
    connected: true,
    stamp: {
      source: 'ESPN',
      fetchedAt: new Date(now).toISOString(),
      freshness: 'delayed',
      note: `Matches from the last ${Math.round(back / 7)} weeks and next ${Math.round(ahead / 7)}.${played.length ? ` Latest result: ${played.at(-1).slice(0, 10)}.` : ''}`,
    },
    matches,
    stages,
    via: `${via}${stages.length ? ', table' : ''}`,
  }
}
