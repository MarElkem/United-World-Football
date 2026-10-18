// The "For you" page: the clubs and countries a viewer follows, and the
// matches and headlines that belong to them. Everything comes from the site's
// own data; follows are kept in the viewer's browser only.

import { countries } from '../globe/geo'
import { source, team } from './source'
import type { Match, NewsArticle, Team } from './types'

export type Follow = { kind: 'team'; id: string } | { kind: 'country'; code: string }

export interface FollowOption {
  key: string
  follow: Follow
  label: string
  /** "Club, Premier League" or "Country". */
  hint: string
  /** For the badge: the team, or a flag code. */
  team?: Team
  flag?: string
}

export const followKey = (f: Follow) => (f.kind === 'team' ? `team:${f.id}` : `country:${f.code}`)

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const mentions = (text: string, name: string) => name.length > 3 && new RegExp(`\\b${escape(norm(name))}\\b`).test(text)

// The home nations play as themselves, so they stand in for the United Kingdom.
const HOME_NATIONS = [
  { code: 'gb-eng', name: 'England' },
  { code: 'gb-sct', name: 'Scotland' },
  { code: 'gb-wls', name: 'Wales' },
  { code: 'gb-nir', name: 'Northern Ireland' },
]

const countryList = () => [
  ...countries.filter((c) => c.a2 && c.a2 !== 'gb').map((c) => ({ code: c.a2!, name: c.name })),
  ...HOME_NATIONS,
]

export const countryName = (code: string) => countryList().find((c) => c.code === code)?.name ?? code.toUpperCase()

/** Every club in the data, and every country, for the type-ahead. */
export function followOptions(): FollowOption[] {
  const leagueOf = new Map<string, string>()
  const teams = new Map<string, Team>()
  for (const c of source.competitions()) {
    for (const m of c.matches) {
      for (const id of [m.homeId, m.awayId]) {
        const t = team(id)
        if (!t.id || t.kind !== 'club') continue
        teams.set(id, t)
        // A club's home league names it better than a cup.
        if (!leagueOf.has(id) || c.section === 'clubs') leagueOf.set(id, c.shortName)
      }
    }
  }
  const clubs: FollowOption[] = [...teams.values()].map((t) => ({
    key: `team:${t.id}`,
    follow: { kind: 'team', id: t.id },
    label: t.name,
    hint: `Club, ${leagueOf.get(t.id)}`,
    team: t,
  }))
  const places: FollowOption[] = countryList().map((c) => ({
    key: `country:${c.code}`,
    follow: { kind: 'country', code: c.code },
    label: c.name,
    hint: 'Country',
    flag: c.code,
  }))
  return [...clubs, ...places].sort((a, b) => a.label.localeCompare(b.label))
}

/** Options that match what was typed: names that start with it first. */
export function searchOptions(options: FollowOption[], query: string, skip: Set<string>, limit = 8) {
  const q = norm(query.trim())
  if (!q) return []
  const scored: { o: FollowOption; s: number }[] = []
  for (const o of options) {
    if (skip.has(o.key)) continue
    const names = [o.label, o.team?.shortName ?? ''].map(norm)
    const s = names.some((n) => n.startsWith(q)) ? 0 : names.some((n) => n.split(/[\s-]+/).some((w) => w.startsWith(q))) ? 1 : names.some((n) => n.includes(q)) ? 2 : -1
    if (s >= 0) scored.push({ o, s })
  }
  return scored.sort((a, b) => a.s - b.s || a.o.label.length - b.o.label.length).slice(0, limit).map((x) => x.o)
}

/** The national teams in the data for a country code. */
const nationalTeams = (code: string) => {
  const ids = new Set<string>()
  for (const c of source.competitions())
    for (const m of c.matches)
      for (const id of [m.homeId, m.awayId]) {
        const t = team(id)
        if (t.kind === 'national' && t.country === code) ids.add(id)
      }
  return ids
}

/** Team ids whose matches a follow brings in. */
function teamIds(follows: Follow[]) {
  const ids = new Set<string>()
  for (const f of follows) {
    if (f.kind === 'team') ids.add(f.id)
    else for (const id of nationalTeams(f.code)) ids.add(id)
  }
  return ids
}

export function followedMatches(follows: Follow[]) {
  const ids = teamIds(follows)
  const all: { m: Match; comp: string }[] = []
  for (const c of source.competitions())
    for (const m of c.matches) if (ids.has(m.homeId) || ids.has(m.awayId)) all.push({ m, comp: c.shortName })
  const now = Date.now()
  const DONE = new Set(['finished', 'after_extra_time', 'penalties', 'awarded'])
  return {
    compOf: new Map(all.map(({ m, comp }) => [m.id, comp])),
    upcoming: all.map((x) => x.m).filter((m) => !DONE.has(m.status) && new Date(m.kickoff).getTime() > now - 3 * 3600000),
    results: all.map((x) => x.m).filter((m) => DONE.has(m.status)),
  }
}

/** Why an article belongs on the page: the first follow it is about. */
function matchFollow(a: NewsArticle, follows: Follow[]): Follow | undefined {
  const text = norm(`${a.title} ${a.summary}`)
  for (const f of follows) {
    if (f.kind === 'team') {
      const t = team(f.id)
      if (a.tags.some((x) => x.kind === 'team' && x.id === f.id) || mentions(text, t.name) || mentions(text, t.shortName)) return f
    } else {
      const about = a.tags.some((x) => (x.kind === 'country' && x.id === f.code) || (x.kind === 'team' && team(x.id).country === f.code))
      if (about || mentions(text, countryName(f.code))) return f
    }
  }
  return undefined
}

export function followedNews(follows: Follow[]) {
  return source
    .news()
    .map((a) => ({ a, f: matchFollow(a, follows) }))
    .filter((x): x is { a: NewsArticle; f: Follow } => !!x.f)
    .sort((x, y) => y.a.publishedAt.localeCompare(x.a.publishedAt))
}

/** The leagues in the sidebar for a followed country. */
export const leaguesIn = (code: string) => source.catalog().filter((e) => e.section === 'clubs' && e.flag === code)
