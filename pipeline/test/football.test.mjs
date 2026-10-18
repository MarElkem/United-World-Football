import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyZones, buildRounds, competitionStatus, computeTable } from '../lib/football.mjs'
import { toUtcIso } from '../lib/util.mjs'

const m = (id, homeId, awayId, home, away, extra = {}) => ({
  id, homeId, awayId, round: 'R', kickoff: `2026-08-${String(id).padStart(2, '0')}T15:00:00Z`,
  status: home === null ? 'scheduled' : 'finished', score: home === null ? undefined : { home, away }, ...extra,
})

test('table orders by points, goal difference, goals scored', () => {
  const t = computeTable(['a', 'b', 'c'], [m(1, 'a', 'b', 2, 0), m(2, 'b', 'c', 3, 0), m(3, 'c', 'a', 1, 1), m(4, 'a', 'c', null, null)])
  assert.deepEqual(t.map((r) => r.teamId), ['a', 'b', 'c'])
  assert.equal(t[0].points, 4)
  assert.equal(t[1].points, 3)
  assert.deepEqual(t[0].form, ['W', 'D'])
  assert.equal(t[2].played, 2)
})

test('zones count from the bottom with negative numbers', () => {
  const t = applyZones([1, 2, 3, 4, 5].map((p) => ({ position: p })), { qualify: [1, 1], relegate: [-2, -1] })
  assert.deepEqual(t.map((r) => r.zone), ['qualify', undefined, undefined, 'relegate', 'relegate'])
})

test('ties: two legs on aggregate, single match on penalties, undecided stays open', () => {
  const ms = [
    { ...m(1, 'a', 'b', 1, 0), round: 'QF' },
    { ...m(2, 'b', 'a', 1, 1), round: 'QF' },
    { ...m(3, 'c', 'd', 1, 1), round: 'QF', status: 'penalties', penalties: { home: 3, away: 4 } },
    { ...m(4, 'e', 'f', null, null), round: 'SF' },
  ]
  const [qf, sf] = buildRounds(['QF', 'SF'], ms)
  assert.equal(qf.ties[0].winnerId, 'a')
  assert.equal(qf.ties[0].decidedBy, 'aggregate')
  assert.deepEqual(qf.ties[0].aggregate, { home: 2, away: 1 })
  assert.equal(qf.ties[1].winnerId, 'd')
  assert.equal(qf.ties[1].decidedBy, 'penalties')
  assert.equal(sf.ties[0].winnerId, undefined)
})

test('competition status', () => {
  assert.equal(competitionStatus([m(1, 'a', 'b', null, null)]), 'upcoming')
  assert.equal(competitionStatus([m(1, 'a', 'b', 1, 0), m(2, 'b', 'a', null, null)]), 'active')
  assert.equal(competitionStatus([m(1, 'a', 'b', 1, 0)]), 'completed')
})

test('local kick-off times become UTC, across summer time', () => {
  assert.equal(toUtcIso('2026-08-15', '20:00', 'Europe/London'), '2026-08-15T19:00:00.000Z')
  assert.equal(toUtcIso('2026-12-15', '20:00', 'Europe/London'), '2026-12-15T20:00:00.000Z')
  assert.equal(toUtcIso('2026-06-11', '13:00 UTC-6', 'America/New_York'), '2026-06-11T19:00:00.000Z')
  assert.equal(toUtcIso('2026-10-04', '16:00', 'America/Sao_Paulo'), '2026-10-04T19:00:00.000Z')
})
