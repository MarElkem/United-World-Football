// football-data.org v4, free plan: 12 competitions, scores a little delayed,
// 10 requests a minute. Needs a free key in FOOTBALL_DATA_TOKEN, which only
// ever lives in the GitHub Actions secret store, never in the site.

import { applyZones, buildRounds, competitionStatus } from '../lib/football.mjs'
import { fetchJson, sleep } from '../lib/util.mjs'
import { zoneLegend } from './openfootball.mjs'

const API = 'https://api.football-data.org/v4'
export const SOURCE = 'football-data.org'

let lastCall = 0
async function get(path, token) {
  // Stay under 10 calls a minute.
  const wait = lastCall + Number(process.env.FD_INTERVAL_MS ?? 6500) - Date.now()
  if (wait > 0) await sleep(wait)
  lastCall = Date.now()
  return fetchJson(`${API}${path}`, { headers: { 'X-Auth-Token': token } })
}

const STATUS = {
  SCHEDULED: 'scheduled',
  TIMED: 'scheduled',
  IN_PLAY: 'live',
  PAUSED: 'half_time',
  FINISHED: 'finished',
  POSTPONED: 'postponed',
  SUSPENDED: 'suspended',
  CANCELLED: 'cancelled',
  AWARDED: 'awarded',
}

const ROUND_NAMES = {
  PLAYOFFS: 'Knockout play-offs',
  LAST_32: 'Round of 32',
  LAST_16: 'Round of 16',
  QUARTER_FINALS: 'Quarter-finals',
  SEMI_FINALS: 'Semi-finals',
  THIRD_PLACE: 'Third place',
  FINAL: 'Final',
}
const LEAGUE_STAGES = new Set(['REGULAR_SEASON', 'LEAGUE_STAGE', 'GROUP_STAGE'])

const pair = (s) => (s && s.home !== null && s.home !== undefined ? { home: s.home, away: s.away } : undefined)
const add = (a, b) => (a && b ? { home: a.home + b.home, away: a.away + b.away } : a)

function toMatch(raw, cfg, teams, country) {
  const sc = raw.score ?? {}
  const pens = sc.duration === 'PENALTY_SHOOTOUT' ? pair(sc.penalties) : undefined
  const et = sc.duration !== 'REGULAR' ? pair(sc.extraTime) : undefined
  // With a shoot-out, fullTime can include the penalties; rebuild it from its parts.
  const score = pens && pair(sc.regularTime) ? add(pair(sc.regularTime), et) : pair(sc.fullTime)
  const knockout = !LEAGUE_STAGES.has(raw.stage)
  const base = STATUS[raw.status] ?? 'scheduled'
  const status = base === 'finished' && pens ? 'penalties' : base === 'finished' && et ? 'after_extra_time' : base
  const kind = cfg.national ? 'national' : 'club'
  return {
    id: `${cfg.slug}-fd${raw.id}`,
    competitionId: cfg.slug,
    stageId: knockout ? `${cfg.slug}-knockout` : `${cfg.slug}-main`,
    groupId: raw.group ? raw.group.replace(/^GROUP_/, '') : undefined,
    round: knockout ? (ROUND_NAMES[raw.stage] ?? titleCase(raw.stage)) : raw.matchday ? `Matchday ${raw.matchday}` : titleCase(raw.stage),
    homeId: teams.fd(raw.homeTeam, { kind, country }),
    awayId: teams.fd(raw.awayTeam, { kind, country }),
    kickoff: raw.utcDate,
    venue: raw.venue ?? undefined,
    venueTimeZone: cfg.tz,
    status,
    score: base === 'scheduled' ? undefined : score,
    halfTime: pair(sc.halfTime),
    extraTime: et,
    penalties: pens,
    winnerId:
      sc.winner === 'HOME_TEAM' ? `fd-${raw.homeTeam?.id}` : sc.winner === 'AWAY_TEAM' ? `fd-${raw.awayTeam?.id}` : undefined,
  }
}

const titleCase = (s = '') => s.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

function toRow(r, teams, kind, country) {
  return {
    teamId: teams.fd(r.team, { kind, country }),
    position: r.position,
    played: r.playedGames,
    won: r.won,
    drawn: r.draw,
    lost: r.lost,
    goalsFor: r.goalsFor,
    goalsAgainst: r.goalsAgainst,
    points: r.points,
    form: (r.form ?? '').split(/[,\s]+/).filter((x) => ['W', 'D', 'L'].includes(x)).slice(-5),
  }
}

export async function competition(cfg, teams, token, now = Date.now()) {
  const country = cfg.country ?? ''
  const kind = cfg.national ? 'national' : 'club'
  const m = await get(`/competitions/${cfg.footballData}/matches`, token)
  const s = await get(`/competitions/${cfg.footballData}/standings`, token).catch(() => null)
  const matches = (m.matches ?? []).map((x) => toMatch(x, cfg, teams, country))
  const startYear = m.filters?.season ?? s?.season?.startDate?.slice(0, 4)
  const endYear = s?.season?.endDate?.slice(0, 4)
  const season = startYear && endYear && endYear !== String(startYear) ? `${startYear}-${String(endYear).slice(2)}` : String(startYear ?? '')

  const stages = []
  const totals = (s?.standings ?? []).filter((t) => t.type === 'TOTAL')
  if (totals.length) {
    const groups = totals.map((t, i) => {
      const id = t.group ? t.group.replace(/^GROUP_/, '') : totals.length > 1 ? String(i + 1) : 'table'
      const table = applyZones(
        t.table.map((r) => toRow(r, teams, kind, country)),
        cfg.zones,
      )
      return { id, name: t.group ? `Group ${id}` : 'Table', table }
    })
    const format = groups.length > 1 ? 'groups' : totals[0].stage === 'LEAGUE_STAGE' ? 'league_phase' : 'league'
    stages.push({ id: `${cfg.slug}-main`, name: format === 'league' ? 'League' : titleCase(totals[0].stage), format, groups, zones: zoneLegend(cfg.zones, cfg.zoneLabels) })
  }
  const ko = matches.filter((x) => x.stageId === `${cfg.slug}-knockout`)
  if (ko.length) {
    const order = Object.values(ROUND_NAMES)
    const names = [...new Set(ko.map((x) => x.round))].sort((a, b) => order.indexOf(a) - order.indexOf(b))
    stages.push({ id: `${cfg.slug}-knockout`, name: 'Knockout stage', format: 'knockout', rounds: buildRounds(names, ko) })
  }
  if (!stages.length) throw new Error(`no standings or knockout matches for ${cfg.footballData}`)

  return {
    id: cfg.slug,
    slug: cfg.slug,
    name: cfg.name,
    shortName: cfg.shortName,
    section: cfg.section,
    confederation: cfg.confederation,
    country: cfg.country,
    season,
    status: competitionStatus(matches),
    connected: true,
    stamp: {
      source: 'football-data.org',
      fetchedAt: new Date(now).toISOString(),
      freshness: 'delayed',
      note: 'Free plan: scores can be a few minutes behind.',
    },
    matches,
    stages,
  }
}
