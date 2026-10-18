// Checks the football-data.org mapping against the v4 response shape from its
// documentation. The values are placeholders for the test, never shipped.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Teams } from '../lib/teams.mjs'

process.env.FD_INTERVAL_MS = '0'
const { competition } = await import('../sources/footballdata.mjs')

const team = (id, name) => ({ id, name, shortName: name, tla: name.slice(0, 3).toUpperCase(), crest: '' })
const score = (winner, duration, ft, ht, extra = {}) => ({ winner, duration, fullTime: ft, halfTime: ht, ...extra })

const MATCHES = {
  filters: { season: '2026' },
  matches: [
    { id: 1, utcDate: '2026-09-16T19:00:00Z', status: 'FINISHED', matchday: 1, stage: 'LEAGUE_STAGE', group: null,
      homeTeam: team(10, 'Alpha FC'), awayTeam: team(11, 'Beta'), score: score('HOME_TEAM', 'REGULAR', { home: 2, away: 1 }, { home: 1, away: 0 }) },
    { id: 2, utcDate: '2027-03-10T20:00:00Z', status: 'FINISHED', matchday: null, stage: 'LAST_16', group: null,
      homeTeam: team(10, 'Alpha FC'), awayTeam: team(12, 'Gamma'),
      score: score('AWAY_TEAM', 'PENALTY_SHOOTOUT', { home: 5, away: 6 }, { home: 0, away: 0 },
        { regularTime: { home: 1, away: 1 }, extraTime: { home: 0, away: 0 }, penalties: { home: 4, away: 5 } }) },
    { id: 3, utcDate: '2027-04-07T19:00:00Z', status: 'TIMED', matchday: null, stage: 'QUARTER_FINALS', group: null,
      homeTeam: team(12, 'Gamma'), awayTeam: team(11, 'Beta'), score: score(null, 'REGULAR', { home: null, away: null }, { home: null, away: null }) },
  ],
}
const STANDINGS = {
  season: { startDate: '2026-09-01', endDate: '2027-05-30' },
  standings: [
    { stage: 'LEAGUE_STAGE', type: 'TOTAL', group: null, table: [
      { position: 1, team: team(10, 'Alpha FC'), playedGames: 1, form: 'W', won: 1, draw: 0, lost: 0, points: 3, goalsFor: 2, goalsAgainst: 1, goalDifference: 1 },
      { position: 2, team: team(11, 'Beta'), playedGames: 1, form: 'L', won: 0, draw: 0, lost: 1, points: 0, goalsFor: 1, goalsAgainst: 2, goalDifference: -1 },
    ] },
    { stage: 'LEAGUE_STAGE', type: 'HOME', group: null, table: [] },
  ],
}

test('maps matches, a league phase table and knockout ties', async () => {
  globalThis.fetch = async (url) => ({ ok: true, json: async () => (String(url).endsWith('/standings') ? STANDINGS : MATCHES) })
  const cfg = { slug: 'cl', name: 'Cup', shortName: 'Cup', section: 'intercontinental', confederation: 'UEFA', tz: 'Europe/Paris', footballData: 'CL', zones: { qualify: [1, 1] } }
  const c = await competition(cfg, new Teams(), 'token')
  assert.equal(c.season, '2026-27')
  assert.equal(c.stages[0].format, 'league_phase')
  assert.equal(c.stages[0].groups[0].table[0].zone, 'qualify')
  assert.equal(c.stages[0].groups[0].table.length, 2)
  const pens = c.matches.find((m) => m.id === 'cl-fd2')
  assert.deepEqual(pens.score, { home: 1, away: 1 })
  assert.deepEqual(pens.penalties, { home: 4, away: 5 })
  assert.equal(pens.status, 'penalties')
  assert.equal(pens.round, 'Round of 16')
  const ko = c.stages.find((s) => s.format === 'knockout')
  assert.deepEqual(ko.rounds.map((r) => r.name), ['Round of 16', 'Quarter-finals'])
  assert.equal(ko.rounds[0].ties[0].winnerId, 'fd-12')
  const next = c.matches.find((m) => m.id === 'cl-fd3')
  assert.equal(next.status, 'scheduled')
  assert.equal(next.score, undefined)
  assert.equal(c.stamp.source, 'football-data.org')
})
