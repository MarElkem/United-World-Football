// Links places on the globe (confederations and countries) to the competitions
// and news the interface can show for them.

import { CONFS, confInfo, countryByKey, type Conf } from '../globe/geo'
import type { CatalogEntry } from './catalog'
import { team } from './source'
import type { NewsArticle, Section } from './types'
import { source } from './source'

/** A continent filter: a confederation, FIFA (worldwide) or everything. */
export type Region = Conf | 'FIFA' | null

export const regionLabel = (r: Region) => (r === null ? 'All continents' : r === 'FIFA' ? 'Worldwide' : confInfo[r].label)

/** Sidebar flag codes for club countries, mapped from map country codes. */
const clubFlagFor: Record<string, string> = { gb: 'gb-eng', ca: 'us' }
const mapCodeForFlag = (flag?: string) => (flag === 'gb-eng' || flag === 'gb-sct' ? 'gb' : flag)

export function entryRegion(e: CatalogEntry): Region {
  const n = e.groupNote
  if (n === 'FIFA') return 'FIFA'
  return (CONFS as string[]).includes(n ?? '') ? (n as Conf) : null
}

export function entryCountry(e: CatalogEntry) {
  return e.section === 'clubs' ? mapCodeForFlag(e.flag) : undefined
}

export function regionsFor(section: Section): Region[] {
  const used = new Set(source.catalog().filter((e) => e.section === section).map(entryRegion))
  return [null, ...CONFS.filter((c) => used.has(c)), ...(used.has('FIFA') ? (['FIFA'] as Region[]) : [])]
}

export function competitionsFor(section: Section, region: Region, country?: string | null): CatalogEntry[] {
  let list = source.catalog().filter((e) => e.section === section)
  if (region) list = list.filter((e) => entryRegion(e) === region)
  if (country && section === 'clubs') {
    const flag = clubFlagFor[country] ?? country
    const here = list.filter((e) => e.flag === flag)
    if (here.length) return [...here, ...list.filter((e) => e.flag !== flag)]
  }
  return list
}

const hasData = (slug: string) => !!source.competition(slug)

export function defaultCompetition(section: Section, region: Region, country?: string | null) {
  const list = competitionsFor(section, region, country)
  if (country && section === 'clubs') {
    const flag = clubFlagFor[country] ?? country
    const home = list.find((e) => e.flag === flag)
    if (home) return home
  }
  return list.find((e) => hasData(e.slug)) ?? list[0]
}

function articleCountries(a: NewsArticle) {
  const out = new Set<string>()
  for (const t of a.tags) {
    if (t.kind === 'country') out.add(t.id)
    if (t.kind === 'team') {
      const c = mapCodeForFlag(team(t.id).country)
      if (c) out.add(c)
    }
  }
  return out
}

function articleRegions(a: NewsArticle) {
  const out = new Set<Region>()
  for (const t of a.tags) {
    if (t.kind === 'confederation') out.add(t.id.toUpperCase() === 'CONCACAF' ? 'Concacaf' : (t.id.toUpperCase() as Region))
    if (t.kind === 'competition') {
      const e = source.catalog().find((x) => x.slug === t.id)
      if (e) out.add(entryRegion(e))
    }
  }
  for (const c of articleCountries(a)) {
    const conf = countryByKey(c)?.conf
    if (conf) out.add(conf)
  }
  return out
}

export interface PlaceNews {
  items: NewsArticle[]
  /** Set when nothing matched the country and we widened to its continent. */
  widenedTo?: string
}

export function newsFor(articles: NewsArticle[], section: Section, region: Region, country?: string | null): PlaceNews {
  const inSection = articles.filter((a) => a.sections.includes(section))
  const sorted = (l: NewsArticle[]) => [...l].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  if (country) {
    const here = inSection.filter((a) => articleCountries(a).has(country))
    if (here.length || !region) return { items: sorted(here) }
    return { items: sorted(inSection.filter((a) => articleRegions(a).has(region))), widenedTo: regionLabel(region) }
  }
  if (region) return { items: sorted(inSection.filter((a) => articleRegions(a).has(region))) }
  return { items: sorted(inSection) }
}
