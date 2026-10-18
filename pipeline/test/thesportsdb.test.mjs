// Checks the TheSportsDB mapping against the v1 response shapes. Placeholder
// values for the test only, never shipped.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Teams } from '../lib/teams.mjs'

process.env.TSDB_INTERVAL_MS = '0'
const { competition } = await import('../sources/thesportsdb.mjs')

const ev = (id, home, away, hs, as, status, ts, round = '1') => ({
  idEvent: String(id), idHomeTeam: home[0], strHomeTeam: home[1], idAwayTeam: away[0], strAwayTeam: away[1],
  intHomeScore: hs, intAwayScore: as, strStatus: status, strTimestamp: ts, dateEvent: ts.slice(0, 10), intRound: round, strVenue: 'Ground',
})
const A = ['1', 'Alpha FC'], B = ['2', 'Beta'], C = ['3', 'Gamma']
const row = (rank, t, pts) => ({ intRank: String(rank), idTeam: t[0], strTeam: t[1], intPlayed: '1', intWin: '1', intDraw: '0', intLoss: '0', intGoalsFor: '2', intGoalsAgainst: '0', intPoints: String(pts), strForm: 'W' })

function mock(tableRows) {
  globalThis.fetch = async (url) => {
    const u = String(url)
    const body = u.includes('all_leagues')
      ? { leagues: [{ idLeague: '99', strLeague: 'Test League', strSport: 'Soccer', strLeagueAlternate: 'Testliga, TL' }, { idLeague: '5', strLeague: 'Test League', strSport: 'Basketball' }] }
      : u.includes('lookupleague') ? { leagues: [{ idLeague: '99', strCurrentSeason: '2026-2027' }] }
      : u.includes('eventsseason') ? { events: [ev(10, A, B, '2', '0', 'Match Finished', '2026-09-01T18:00:00')] }
      : u.includes('eventspastleague') ? { events: [ev(10, A, B, '2', '0', 'Match Finished', '2026-09-01T18:00:00'), ev(11, B, C, '1', '1', 'FT', '2026-09-08T18:00:00')] }
      : u.includes('eventsnextleague') ? { events: [ev(12, C, A, null, null, 'Not Started', '2099-01-01T18:00:00', '3')] }
      : u.includes('lookuptable') ? { table: tableRows } : {}
    return { ok: true, json: async () => body }
  }
}
const cfg = { slug: 'tl', name: 'Test League', shortName: 'TL', section: 'clubs', confederation: 'CAF', country: 'eg', tz: 'Africa/Cairo', tsdb: ['Testliga'] }

test('finds the league by an alternate name and merges event lists', async () => {
  mock([])
  const c = await competition(cfg, new Teams())
  assert.equal(c.season, '2026-2027')
  assert.equal(c.matches.length, 3)
  assert.deepEqual(c.matches[0].score, { home: 2, away: 0 })
  assert.equal(c.matches[0].kickoff, '2026-09-01T18:00:00.000Z')
  assert.equal(c.matches[2].status, 'scheduled')
  assert.equal(c.matches[2].score, undefined)
  assert.equal(c.matches[0].homeId, 'tsdb-1')
  // Too short a table is left out rather than shown incomplete.
  assert.equal(c.stages.length, 0)
  assert.match(c.about, /Fixtures and results only/)
})

test('keeps a full table', async () => {
  mock(Array.from({ length: 10 }, (_, i) => row(i + 1, [String(100 + i), `Club ${i}`], 30 - i)))
  const c = await competition(cfg, new Teams())
  assert.equal(c.stages[0].groups[0].table.length, 10)
  assert.equal(c.stages[0].groups[0].table[0].points, 30)
})

test('a league it cannot find is an error, not empty data', async () => {
  mock([])
  await assert.rejects(competition({ ...cfg, tsdb: ['Nowhere League'] }, new Teams()), /no league named/)
})
