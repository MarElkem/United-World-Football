// Checks the ESPN mapping against the feed's response shapes. Placeholder
// values for the test only, never shipped.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Teams } from '../lib/teams.mjs'

process.env.ESPN_INTERVAL_MS = '0'
const { competition } = await import('../sources/espn.mjs')

const side = (homeAway, id, name, score, extra = {}) => ({ homeAway, score, team: { id, displayName: name, shortDisplayName: name }, ...extra })
const ev = (id, date, type, home, away, more = {}) => ({ id, date, week: { number: 3 }, competitions: [{ status: { type, displayClock: "67'" }, competitors: [home, away], venue: { fullName: 'Ground' }, ...more }] })
const FT = { name: 'STATUS_FULL_TIME', state: 'post', completed: true }
const PEN = { name: 'STATUS_FINAL_PEN', state: 'post', completed: true }
const PRE = { name: 'STATUS_SCHEDULED', state: 'pre' }
const LIVE = { name: 'STATUS_SECOND_HALF', state: 'in' }
const entry = (id, name, rank, pts) => ({ team: { id, displayName: name }, stats: [{ name: 'rank', value: rank }, { name: 'gamesPlayed', value: 2 }, { name: 'wins', value: 1 }, { name: 'ties', value: 0 }, { name: 'losses', value: 1 }, { name: 'pointsFor', value: 3 }, { name: 'pointsAgainst', value: 2 }, { name: 'points', value: pts }] })

globalThis.fetch = async (url) => {
  const u = String(url)
  const body = u.includes('/scoreboard')
    ? {
        leagues: [{ season: { year: 2027, displayName: '2026/2027' } }],
        events: [
          ev('1', '2026-10-10T17:00Z', FT, side('home', '10', 'Alpha SC', '2'), side('away', '11', 'Beta', '1')),
          ev('2', '2026-10-12T17:00Z', PEN, side('home', '11', 'Beta', '1', { shootoutScore: 4 }), side('away', '12', 'Gamma', '1', { shootoutScore: 3 })),
          ev('3', '2026-10-18T17:00Z', LIVE, side('home', '12', 'Gamma', '0'), side('away', '13', 'Delta', '1')),
          ev('4', '2099-01-01T17:00Z', PRE, side('home', '13', 'Delta', '0'), side('away', '10', 'Alpha SC', '0')),
        ],
      }
    : { children: [{ name: 'Test League', standings: { entries: [entry('11', 'Beta', 2, 3), entry('10', 'Alpha SC', 1, 4), entry('12', 'Gamma', 3, 1), entry('13', 'Delta', 4, 0)] } }] }
  return { ok: true, json: async () => body }
}

const cfg = { slug: 'tl', name: 'Test League', shortName: 'TL', section: 'clubs', confederation: 'CAF', country: 'eg', tz: 'Africa/Cairo', espn: 'egy.1' }

test('maps scores, penalties, live and scheduled matches, and the table', async () => {
  const c = await competition(cfg, new Teams(), Date.parse('2026-10-18T18:00:00Z'))
  assert.equal(c.season, '2026-2027')
  assert.equal(c.matches.length, 4)
  const [ft, pen, live, pre] = c.matches
  assert.deepEqual(ft.score, { home: 2, away: 1 })
  assert.equal(ft.status, 'finished')
  assert.equal(ft.round, 'Matchday 3')
  assert.deepEqual(pen.penalties, { home: 4, away: 3 })
  assert.equal(pen.status, 'penalties')
  assert.equal(live.status, 'live')
  assert.equal(live.minute, 67)
  assert.equal(pre.status, 'scheduled')
  assert.equal(pre.score, undefined)
  const table = c.stages[0].groups[0].table
  assert.equal(table[0].teamId, 'espn-10')
  assert.equal(table[0].points, 4)
  assert.equal(c.stages[0].format, 'league')
})
