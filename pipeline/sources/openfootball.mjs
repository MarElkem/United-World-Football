// openfootball: public-domain fixtures and results kept on GitHub by
// volunteers (https://github.com/openfootball). No key needed. It can run a
// few weeks behind, so every competition from here carries its last result
// date in the stamp.

import { europeanSeason } from '../config.mjs'
import { applyZones, buildRounds, competitionStatus, computeTable } from '../lib/football.mjs'
import { fetchJson, toUtcIso } from '../lib/util.mjs'

const RAW = 'https://raw.githubusercontent.com/openfootball'
export const SOURCE = 'openfootball'

function pair(a) {
  return a ? { home: a[0], away: a[1] } : undefined
}

function toMatch(raw, i, slug, stageId, homeId, awayId, tz, venueTz) {
  const s = raw.score ?? {}
  const ft = pair(s.ft)
  const et = pair(s.et)
  const pens = pair(s.p)
  const score = et ?? ft
  return {
    id: `${slug}-${i + 1}`,
    competitionId: slug,
    stageId,
    groupId: raw.group ? raw.group.replace(/^Group\s+/, '') : undefined,
    round: raw.round,
    homeId,
    awayId,
    kickoff: toUtcIso(raw.date, raw.time, tz),
    venue: raw.ground,
    venueTimeZone: venueTz ?? tz,
    status: !score ? 'scheduled' : pens ? 'penalties' : et ? 'after_extra_time' : 'finished',
    score,
    halfTime: pair(s.ht),
    extraTime: et,
    penalties: pens,
  }
}

function stampFor(matches, now) {
  const played = matches.filter((m) => m.score).map((m) => m.kickoff).sort()
  const last = played[played.length - 1]
  const open = matches.some((m) => !m.score)
  const ageDays = last ? (now - new Date(last).getTime()) / 86400000 : Infinity
  const lastDay = last ? new Date(last).toISOString().slice(0, 10) : null
  return {
    source: 'openfootball (public domain)',
    fetchedAt: new Date(now).toISOString(),
    freshness: !open ? 'delayed' : ageDays > 8 ? 'stale' : 'delayed',
    note: lastDay ? `Results up to ${lastDay}. Volunteer-kept, so it can run behind.` : 'No results yet.',
  }
}

const TABLE_NOTE = 'Table worked out from the results: points, then goal difference, then goals scored. Official tiebreakers can differ.'

export async function league(cfg, teams, now = Date.now()) {
  const season = cfg.calendarYear ? String(new Date(now).getUTCFullYear()) : europeanSeason(new Date(now))
  const data = await fetchJson(`${RAW}/football.json/master/${season}/${cfg.openfootball}.json`)
  const stageId = `${cfg.slug}-league`
  const matches = data.matches.map((m, i) =>
    toMatch(m, i, cfg.slug, stageId, teams.club(m.team1, cfg.country), teams.club(m.team2, cfg.country), cfg.tz),
  )
  const ids = [...new Set(matches.flatMap((m) => [m.homeId, m.awayId]))]
  const table = applyZones(computeTable(ids, matches, teams.nameOf), cfg.zones)
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
    about: TABLE_NOTE,
    stamp: stampFor(matches, now),
    matches,
    stages: [
      {
        id: stageId,
        name: 'League',
        format: 'league',
        zones: zoneLegend(cfg.zones, cfg.zoneLabels),
        groups: [{ id: 'table', name: 'Table', table }],
      },
    ],
  }
}

export function zoneLegend(rules, labels) {
  return rules ? Object.keys(rules).map((zone) => ({ zone, label: labels?.[zone] ?? zone })) : undefined
}

const VENUE_ZONES = [
  ['Mexico City', 'America/Mexico_City'],
  ['Guadalajara', 'America/Mexico_City'],
  ['Monterrey', 'America/Monterrey'],
  ['Toronto', 'America/Toronto'],
  ['Vancouver', 'America/Vancouver'],
  ['Seattle', 'America/Los_Angeles'],
  ['San Francisco', 'America/Los_Angeles'],
  ['Los Angeles', 'America/Los_Angeles'],
  ['Houston', 'America/Chicago'],
  ['Dallas', 'America/Chicago'],
  ['Kansas City', 'America/Chicago'],
]
const venueZone = (ground = '') => VENUE_ZONES.find(([k]) => ground.includes(k))?.[1] ?? 'America/New_York'

export async function worldCup(cfg, teams, now = Date.now()) {
  const data = await fetchJson(`${RAW}/worldcup.json/master/${cfg.openfootballWorldCup}/worldcup.json`)
  const groupStage = `${cfg.slug}-groups`
  const koStage = `${cfg.slug}-knockout`
  const matches = data.matches.map((m, i) =>
    toMatch(m, i, cfg.slug, m.group ? groupStage : koStage, teams.nation(m.team1), teams.nation(m.team2), cfg.tz, venueZone(m.ground)),
  )
  const groupMatches = matches.filter((m) => m.stageId === groupStage)
  const koMatches = matches.filter((m) => m.stageId === koStage)
  const koRounds = [...new Set(koMatches.map((m) => m.round))]
  const through = new Set(koMatches.filter((m) => m.round === koRounds[0]).flatMap((m) => [m.homeId, m.awayId]))

  const groupIds = [...new Set(groupMatches.map((m) => m.groupId))].sort()
  const groups = groupIds.map((g) => {
    const ms = groupMatches.filter((m) => m.groupId === g)
    const ids = [...new Set(ms.flatMap((m) => [m.homeId, m.awayId]))]
    const table = computeTable(ids, ms, teams.nameOf).map((r) => (through.has(r.teamId) ? { ...r, zone: 'qualify' } : r))
    return { id: g, name: `Group ${g}`, table }
  })

  const stages = []
  if (groups.length) {
    stages.push({
      id: groupStage,
      name: 'Group stage',
      format: 'groups',
      groups,
      zones: through.size ? [{ zone: 'qualify', label: `Reached the ${koRounds[0].toLowerCase()}` }] : undefined,
    })
  }
  if (koRounds.length) stages.push({ id: koStage, name: 'Knockout stage', format: 'knockout', rounds: buildRounds(koRounds, koMatches) })

  const final = koMatches.find((m) => m.round === 'Final')
  const winner = final?.score ? stages.at(-1).rounds.find((r) => r.name === 'Final')?.ties[0]?.winnerId : undefined
  return {
    id: cfg.slug,
    slug: cfg.slug,
    name: cfg.name,
    shortName: cfg.shortName,
    section: cfg.section,
    confederation: cfg.confederation,
    season: cfg.openfootballWorldCup,
    status: competitionStatus(matches),
    connected: true,
    about: [
      `${groups.length} groups of four; the top two and the best third-placed teams went through.`,
      winner ? `Won by ${teams.nameOf(winner)}.` : '',
      'Group tables worked out from the results.',
    ]
      .filter(Boolean)
      .join(' '),
    stamp: stampFor(matches, now),
    matches,
    stages,
  }
}
