// Tables and knockout ties computed from match results.

const DONE = new Set(['finished', 'after_extra_time', 'penalties', 'awarded'])

/**
 * League table from finished matches: 3 points a win, ordered by points,
 * goal difference, goals scored, then name. Official tiebreakers can differ
 * (head-to-head and so on), which the site says next to the table.
 */
export function computeTable(teamIds, matches, nameOf = (id) => id) {
  const rows = new Map(teamIds.map((id) => [id, { teamId: id, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0, results: [] }]))
  const played = matches.filter((m) => DONE.has(m.status) && m.score).sort((a, b) => a.kickoff.localeCompare(b.kickoff))
  for (const m of played) {
    // A league table counts the score after 90 minutes (no extra time in leagues).
    const h = rows.get(m.homeId)
    const a = rows.get(m.awayId)
    if (!h || !a) continue
    const hs = m.score.home
    const as = m.score.away
    record(h, hs, as)
    record(a, as, hs)
  }
  return [...rows.values()]
    .sort(
      (x, y) =>
        y.points - x.points ||
        y.goalsFor - y.goalsAgainst - (x.goalsFor - x.goalsAgainst) ||
        y.goalsFor - x.goalsFor ||
        nameOf(x.teamId).localeCompare(nameOf(y.teamId)),
    )
    .map(({ results, ...r }, i) => ({ ...r, position: i + 1, form: results.slice(-5) }))
}

function record(row, scored, conceded) {
  row.played++
  row.goalsFor += scored
  row.goalsAgainst += conceded
  if (scored > conceded) {
    row.won++
    row.points += 3
    row.results.push('W')
  } else if (scored < conceded) {
    row.lost++
    row.results.push('L')
  } else {
    row.drawn++
    row.points++
    row.results.push('D')
  }
}

/** Applies zone rules like { qualify: [1, 4], relegate: [-3, -1] } (negative counts from the bottom). */
export function applyZones(table, rules = {}) {
  const n = table.length
  const at = (p) => (p < 0 ? n + p + 1 : p)
  return table.map((r) => {
    for (const [zone, [from, to]] of Object.entries(rules)) {
      if (r.position >= at(from) && r.position <= at(to)) return { ...r, zone }
    }
    return r
  })
}

/**
 * Groups knockout matches into ties (one or two legs) for each round, in the
 * order the rounds are given. A tie's winner is only set from real results.
 */
export function buildRounds(roundNames, matches) {
  return roundNames
    .map((name) => {
      const ms = matches.filter((m) => m.round === name).sort((a, b) => a.kickoff.localeCompare(b.kickoff))
      const byPair = new Map()
      for (const m of ms) {
        const key = [m.homeId, m.awayId].sort().join('|')
        if (!byPair.has(key)) byPair.set(key, [])
        byPair.get(key).push(m)
      }
      const ties = [...byPair.values()].map((legs, i) => tieFrom(`${slugRound(name)}-${i + 1}`, name, legs))
      return { name, ties }
    })
    .filter((r) => r.ties.length)
}

const slugRound = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')

function tieFrom(id, round, legs) {
  const first = legs[0]
  const homeId = first.homeId
  const awayId = first.awayId
  const tie = { id, round, homeId, awayId, legs: legs.map((m) => m.id) }
  const allDone = legs.every((m) => DONE.has(m.status) && m.score)
  if (!allDone) return tie
  const goals = (teamId) => legs.reduce((s, m) => s + (m.homeId === teamId ? m.score.home : m.score.away), 0)
  const agg = { home: goals(homeId), away: goals(awayId) }
  if (legs.length > 1) tie.aggregate = agg
  const last = legs[legs.length - 1]
  if (last.penalties) {
    const p = last.penalties
    const lastHomeWon = p.home > p.away
    tie.winnerId = lastHomeWon ? last.homeId : last.awayId
    tie.decidedBy = 'penalties'
  } else if (agg.home !== agg.away) {
    tie.winnerId = agg.home > agg.away ? homeId : awayId
    tie.decidedBy = legs.length > 1 ? 'aggregate' : last.extraTime ? 'extra_time' : 'single_match'
  } else if (last.winnerId) {
    // The source told us who went through (away goals, a replay, an award).
    tie.winnerId = last.winnerId
  }
  return tie
}

export function competitionStatus(matches) {
  if (!matches.length) return 'upcoming'
  const done = matches.filter((m) => DONE.has(m.status)).length
  if (done === 0) return 'upcoming'
  const open = matches.filter((m) => !DONE.has(m.status) && !['cancelled', 'abandoned'].includes(m.status))
  return open.length ? 'active' : 'completed'
}

export { DONE }
