// The assistant's built-in answers: no AI and no server, just lookups in the
// site's own data. It handles the common questions (who is top, who is going
// through, when is the next match, what was the score) and says plainly when
// it cannot help, so the chat works for free even with no AI connected.

import { source, team } from '../data/source'
import type { Competition, Match, Zone } from '../data/types'
import { kickoffLocal } from '../dashboard/time'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const has = (q: string, ...words: string[]) => words.some((w) => new RegExp(`\\b${w}`).test(q))

const ALIASES: Record<string, string[]> = {
  'premier-league': ['premier league', 'epl', 'the prem'],
  championship: ['championship', 'efl'],
  'la-liga': ['la liga', 'laliga', 'spanish league'],
  bundesliga: ['bundesliga'],
  'serie-a': ['serie a', 'italian league'],
  'ligue-1': ['ligue 1', 'french league'],
  eredivisie: ['eredivisie', 'dutch league'],
  'primeira-liga': ['primeira liga', 'liga portugal', 'portuguese league'],
  'brasileirao-serie-a': ['brasileirao', 'brazilian league', 'serie a brazil'],
  'world-cup-2026': ['world cup'],
  'champions-league': ['champions league', 'ucl'],
  'copa-libertadores': ['libertadores'],
}

const DONE = new Set(['finished', 'after_extra_time', 'penalties', 'awarded'])
const name = (id?: string) => team(id).name

function scoreLine(m: Match) {
  const s = m.score ? `${m.score.home}–${m.score.away}` : 'v'
  const extra = m.penalties ? ` (${m.penalties.home}–${m.penalties.away} on penalties)` : m.extraTime ? ' after extra time' : ''
  return `${name(m.homeId)} ${s} ${name(m.awayId)}${extra}`
}

const resultLine = (m: Match) => `${scoreLine(m)}, ${kickoffLocal(m.kickoff, 'day')}`
const fixtureLine = (m: Match) => `${name(m.homeId)} v ${name(m.awayId)}, ${kickoffLocal(m.kickoff)}`

function caveat(c: Competition) {
  return c.stamp.freshness === 'stale' && c.stamp.note ? ` (${c.stamp.note.split('.')[0]}.)` : ''
}

function findCompetitions(q: string, openSlug?: string) {
  const comps = source.competitions()
  const named = comps.filter((c) => {
    const words = [norm(c.name), norm(c.shortName), ...(ALIASES[c.slug] ?? [])]
    return words.some((w) => q.includes(w))
  })
  if (named.length) return named
  const open = comps.find((c) => c.slug === openSlug)
  return open && /\b(this|here|it|they|table|top|lead)\b/.test(q) ? [open] : []
}

function findTeam(q: string) {
  let best: { id: string; len: number } | null = null
  for (const c of source.competitions()) {
    for (const id of new Set(c.matches.flatMap((m) => [m.homeId, m.awayId]))) {
      const t = team(id)
      for (const n of [t.name, t.shortName]) {
        const k = norm(n)
        if (k.length > 3 && new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(q) && (!best || k.length > best.len)) {
          best = { id, len: k.length }
        }
      }
    }
  }
  return best?.id
}

const teamMatches = (id: string) =>
  source
    .competitions()
    .flatMap((c) => c.matches.filter((m) => m.homeId === id || m.awayId === id).map((m) => ({ m, c })))
    .sort((a, b) => a.m.kickoff.localeCompare(b.m.kickoff))

const mainTable = (c: Competition) => c.stages.find((s) => s.groups?.length === 1)

function zoneAnswer(c: Competition, zones: Zone[], none: string) {
  const out: string[] = []
  for (const s of c.stages) {
    const labels = new Map((s.zones ?? []).map((z) => [z.zone, z.label]))
    for (const z of zones) {
      if (!labels.has(z)) continue
      const rows = (s.groups ?? []).flatMap((g) => g.table.filter((r) => r.zone === z).map((r) => ({ g, r })))
      if (!rows.length) continue
      const list = rows.map(({ g, r }) => `${name(r.teamId)}${(s.groups?.length ?? 0) > 1 ? ` (${g.name})` : ` (${ordinal(r.position)}, ${r.points} pts)`}`)
      out.push(`${labels.get(z)}: ${list.join(', ')}.`)
    }
  }
  if (!out.length) return none
  const left = upcoming(c).length
  return `${c.name}, as things stand: ${out.join(' ')}${left && c.status !== 'completed' ? ` ${left} matches still to play.` : ''}${caveat(c)}`
}

const upcoming = (c: Competition) => c.matches.filter((m) => m.status === 'scheduled' && new Date(m.kickoff).getTime() > Date.now())
const results = (c: Competition) => c.matches.filter((m) => DONE.has(m.status)).sort((a, b) => a.kickoff.localeCompare(b.kickoff))

function competitionAnswer(c: Competition, q: string): string {
  const table = mainTable(c)?.groups?.[0]?.table
  if (has(q, 'won', 'winner', 'champion', 'win the')) {
    const final = c.stages.flatMap((s) => s.rounds ?? []).find((r) => r.name === 'Final')?.ties[0]
    if (final?.winnerId) return `${name(final.winnerId)} won the ${c.name}, beating ${name(final.winnerId === final.homeId ? final.awayId : final.homeId)} in the final.`
    if (c.status === 'completed' && table?.[0]) return `${name(table[0].teamId)} finished top of the ${c.name}.`
    return `The ${c.name} is not finished yet.${table?.[0] ? ` ${name(table[0].teamId)} lead on ${table[0].points} points.` : ''}${caveat(c)}`
  }
  if (has(q, 'qualif', 'through', 'promot', 'advanc', 'going to')) return zoneAnswer(c, ['qualify', 'playoff', 'continental'], `The site does not mark qualification places for the ${c.name}.`)
  if (has(q, 'relegat', 'bottom', 'going down', 'drop')) return zoneAnswer(c, ['relegate', 'relegation_playoff'], `The site does not mark relegation places for the ${c.name}.`)
  if (has(q, 'next', 'fixture', 'when', 'upcoming', 'schedule')) {
    const next = upcoming(c).sort((a, b) => a.kickoff.localeCompare(b.kickoff)).slice(0, 3)
    return next.length ? `Next in the ${c.name}: ${next.map(fixtureLine).join('; ')}.` : `There are no upcoming ${c.name} fixtures in the site's data.${caveat(c)}`
  }
  if (has(q, 'result', 'score', 'last', 'latest', 'yesterday')) {
    const last = results(c).slice(-3).reverse()
    return last.length ? `Latest ${c.name} results: ${last.map(resultLine).join('; ')}.${caveat(c)}` : `No ${c.name} results yet.`
  }
  if (table?.length && has(q, 'table', 'standing', 'top', 'lead', 'first', 'position')) {
    const top = table.slice(0, has(q, 'table', 'standing') ? 5 : 1)
    if (top.length === 1) return `${name(top[0].teamId)} are top of the ${c.name} with ${top[0].points} points from ${top[0].played} games.${caveat(c)}`
    return `${c.name} top five: ${top.map((r) => `${r.position}. ${name(r.teamId)} ${r.points} pts`).join(', ')}.${caveat(c)}`
  }
  const bits = [
    table?.[0] ? `${name(table[0].teamId)} lead on ${table[0].points} points` : '',
    results(c).at(-1) ? `the latest result was ${resultLine(results(c).at(-1)!)}` : '',
  ].filter(Boolean)
  return `${c.name}: ${bits.join(', and ') || c.status}.${caveat(c)}`
}

function teamAnswer(id: string, q: string): string {
  const all = teamMatches(id)
  const t = team(id)
  const past = all.filter(({ m }) => DONE.has(m.status))
  const next = all.find(({ m }) => m.status === 'scheduled' && new Date(m.kickoff).getTime() > Date.now())
  if (has(q, 'next', 'when', 'play', 'fixture')) {
    return next ? `${t.name}’s next match: ${fixtureLine(next.m)} (${next.c.shortName}).` : `The site has no upcoming match for ${t.name}.${past.at(-1) ? caveat(past.at(-1)!.c) : ''}`
  }
  const last = past.at(-1)
  const pos = source
    .competitions()
    .map((c) => ({ c, r: mainTable(c)?.groups?.[0]?.table.find((r) => r.teamId === id) }))
    .find((x) => x.r)
  const bits = [
    last ? `Their latest result: ${resultLine(last.m)} (${last.c.shortName}).` : '',
    pos?.r && !has(q, 'result', 'score', 'last') ? `They are ${ordinal(pos.r.position)} in the ${pos.c.name} with ${pos.r.points} points.` : '',
    next && !has(q, 'result', 'score', 'last') ? `Next: ${fixtureLine(next.m)}.` : '',
  ].filter(Boolean)
  return bits.length ? `${t.name}. ${bits.join(' ')}${last ? caveat(last.c) : ''}` : `The site has no matches for ${t.name} yet.`
}

const ordinal = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] ?? 'th'}`

function newsAnswer(q: string) {
  const id = findTeam(q)
  const items = source
    .news()
    .filter((a) => !id || a.tags.some((t) => t.id === id))
    .slice(0, 3)
  if (!items.length) return id ? `No headlines about ${name(id)} on the site right now.` : 'No headlines on the site right now.'
  return `Latest headlines: ${items.map((a) => `"${a.title}" (${a.source})`).join('; ')}.`
}

export const FALLBACK =
  'I can answer from this site’s tables, results, fixtures and headlines, for example “Who is top of the Premier League?” or “When do Arsenal play next?”. For anything else, try the web search below.'

/** An answer from the site's data, or null when the question is outside it. */
export function answerLocally(question: string, openSlug?: string): string | null {
  const q = norm(question)
  if (has(q, 'news', 'headline', 'transfer', 'injur', 'sack')) return newsAnswer(q)
  const comps = findCompetitions(q, openSlug)
  const teamId = findTeam(q)
  // A country's name alone ("the capital of France") is not a football question.
  const footbally = has(q, 'play', 'match', 'game', 'result', 'score', 'next', 'last', 'doing', 'won', 'win', 'lost', 'beat', 'draw', 'fixture', 'table', 'group', 'cup', 'team', 'goal', 'position', 'standing')
  const teamOk = teamId && (team(teamId).kind === 'club' || footbally)
  if (teamOk && !(comps.length && has(q, 'table', 'top', 'lead', 'qualif', 'relegat', 'won', 'winner'))) return teamAnswer(teamId!, q)
  if (comps.length) return comps.map((c) => competitionAnswer(c, q)).join('\n\n')
  const listed = source.catalog().find((e) => q.includes(norm(e.label)))
  if (listed) return `The site lists the ${listed.label} but has no data source connected for it yet, so I can't answer that one.`
  return null
}
