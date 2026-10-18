// The one place the interface asks for football data. At start-up it loads
// data/site.json, which the data pipeline (pipeline/run.mjs) builds from free
// sources. Nothing here invents data: a competition with no source is absent.

import type { Competition, Match, NewsArticle, Section, Team } from './types'
import { catalogEntries, type CatalogEntry } from './catalog'

export interface SourceReport {
  source: string
  competition: string
  ok: boolean
  detail: string
}

export interface SiteData {
  generatedAt: string
  teams: Record<string, Team>
  competitions: Competition[]
  /** Catalogue slugs whose data shows the tournament has ended or not begun. */
  ended?: string[]
  news: NewsArticle[]
  sources: SourceReport[]
}

let data: SiteData | null = null
let loadError: string | null = null

/** Loads the site data once; the app renders after this settles. */
export async function loadData(url = 'data/site.json') {
  try {
    const res = await fetch(url, { cache: 'no-cache' })
    if (!res.ok) throw new Error(`${res.status}`)
    data = (await res.json()) as SiteData
  } catch (e) {
    loadError = String((e as Error).message ?? e)
  }
}

const UNKNOWN: Team = { id: '', name: 'To be decided', shortName: 'TBD', kind: 'club', country: '', colour: '#6b6b63' }

export interface FootballSource {
  competitions(): Competition[]
  competition(slug: string): Competition | undefined
  catalog(): CatalogEntry[]
  news(): NewsArticle[]
  team(id?: string): Team
  matchesOn(section: Section, day: Date): Match[]
  generatedAt(): string | null
  reports(): SourceReport[]
  error(): string | null
}

export const source: FootballSource = {
  competitions: () => data?.competitions ?? [],
  competition: (slug) => data?.competitions.find((c) => c.slug === slug),
  catalog: () => catalogEntries().filter((e) => !data?.ended?.includes(e.slug)),
  news: () => data?.news ?? [],
  team: (id) => (id && data?.teams[id]) || { ...UNKNOWN, id: id ?? '' },
  generatedAt: () => data?.generatedAt ?? null,
  reports: () => data?.sources ?? [],
  error: () => loadError,
  matchesOn(section, day) {
    const start = new Date(day)
    start.setHours(0, 0, 0, 0)
    const end = start.getTime() + 86400000
    return source
      .competitions()
      .filter((c) => c.section === section)
      .flatMap((c) => c.matches)
      .filter((m) => {
        const t = new Date(m.kickoff).getTime()
        return t >= start.getTime() && t < end
      })
      .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
  },
}

export const team = (id?: string) => source.team(id)

export function initials(name: string) {
  const words = name.replace(/[^\p{L}\s]/gu, '').split(/\s+/).filter(Boolean)
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase()
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}
