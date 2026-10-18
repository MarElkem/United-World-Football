// The sidebar catalogue. Competitions the data pipeline fills show real data;
// the rest are listed so the navigation is realistic, and open an honest
// "no source connected yet" state.

import type { CompetitionStatus, NavNode, Section } from './types'

type Entry = [label: string, slug: string, status: CompetitionStatus]

const c = (prefix: string, entries: Entry[]): NavNode[] =>
  entries.map(([label, slug, status]) => ({ id: `${prefix}-${slug}`, label, href: `#/c/${slug}`, status }))

export const confederations = [
  { id: 'caf', label: 'Africa', note: 'CAF' },
  { id: 'afc', label: 'Asia', note: 'AFC' },
  { id: 'uefa', label: 'Europe', note: 'UEFA' },
  { id: 'concacaf', label: 'North & Central America, Caribbean', note: 'Concacaf' },
  { id: 'conmebol', label: 'South America', note: 'CONMEBOL' },
  { id: 'ofc', label: 'Oceania', note: 'OFC' },
]

const nations: NavNode[] = [
  {
    id: 'n-fifa', label: 'World', note: 'FIFA',
    children: c('n', [
      ['FIFA World Cup 2026', 'world-cup-2026', 'completed'],
      ['FIFA World Cup 2030', 'world-cup-2030', 'upcoming'],
      ['International friendlies', 'friendlies', 'active'],
    ]),
  },
  {
    id: 'n-caf', label: 'Africa', note: 'CAF',
    children: c('n', [
      ['AFCON Qualifiers', 'afcon-qualifiers', 'qualifying'],
      ['Africa Cup of Nations', 'afcon', 'upcoming'],
      ['African Nations Championship (CHAN)', 'chan', 'upcoming'],
      ['World Cup Qualifiers – Africa', 'wcq-caf', 'upcoming'],
    ]),
  },
  {
    id: 'n-afc', label: 'Asia', note: 'AFC',
    children: c('n', [
      ['AFC Asian Cup', 'asian-cup', 'upcoming'],
      ['World Cup Qualifiers – Asia', 'wcq-afc', 'upcoming'],
      ['AFF Championship', 'aff-championship', 'upcoming'],
    ]),
  },
  {
    id: 'n-uefa', label: 'Europe', note: 'UEFA',
    children: c('n', [
      ['UEFA European Championship 2028', 'euro-2028', 'upcoming'],
      ['UEFA Nations League', 'nations-league', 'active'],
      ['European Qualifiers', 'euro-qualifiers', 'upcoming'],
    ]),
  },
  {
    id: 'n-concacaf', label: 'North & Central America, Caribbean', note: 'Concacaf',
    children: c('n', [
      ['Concacaf Gold Cup', 'gold-cup', 'upcoming'],
      ['Concacaf Nations League', 'concacaf-nations-league', 'active'],
    ]),
  },
  {
    id: 'n-conmebol', label: 'South America', note: 'CONMEBOL',
    children: c('n', [
      ['World Cup Qualifiers – South America', 'south-american-qualifiers', 'qualifying'],
      ['Copa América', 'copa-america', 'upcoming'],
    ]),
  },
  {
    id: 'n-ofc', label: 'Oceania', note: 'OFC',
    children: c('n', [
      ['OFC Nations Cup', 'ofc-nations-cup', 'upcoming'],
      ['World Cup Qualifiers – Oceania', 'wcq-ofc', 'upcoming'],
    ]),
  },
]

const country = (id: string, label: string, flag: string, leagues: Entry[]): NavNode => ({
  id: `cl-${id}`,
  label,
  flag,
  children: c(`cl-${id}`, leagues),
})

const clubs: NavNode[] = [
  {
    id: 'cl-europe', label: 'Europe', note: 'UEFA',
    children: [
      country('eng', 'England', 'gb-eng', [['Premier League', 'premier-league', 'active'], ['Championship', 'championship', 'active'], ['FA Cup', 'fa-cup', 'active']]),
      country('esp', 'Spain', 'es', [['LaLiga', 'la-liga', 'active'], ['LaLiga 2', 'la-liga-2', 'active']]),
      country('ger', 'Germany', 'de', [['Bundesliga', 'bundesliga', 'active'], ['2. Bundesliga', 'bundesliga-2', 'active']]),
      country('ita', 'Italy', 'it', [['Serie A', 'serie-a', 'active']]),
      country('fra', 'France', 'fr', [['Ligue 1', 'ligue-1', 'active'], ['Ligue 2', 'ligue-2', 'active']]),
      country('ned', 'Netherlands', 'nl', [['Eredivisie', 'eredivisie', 'active']]),
      country('por', 'Portugal', 'pt', [['Primeira Liga', 'primeira-liga', 'active']]),
    ],
  },
  {
    id: 'cl-africa', label: 'Africa', note: 'CAF',
    children: [
      country('egy', 'Egypt', 'eg', [['Egyptian Premier League', 'egypt-premier-league', 'active']]),
      country('rsa', 'South Africa', 'za', [['Premiership', 'south-africa-premiership', 'active']]),
      country('mar', 'Morocco', 'ma', [['Botola Pro', 'botola-pro', 'active']]),
      country('nga', 'Nigeria', 'ng', [['NPFL', 'npfl', 'active']]),
    ],
  },
  {
    id: 'cl-asia', label: 'Asia', note: 'AFC',
    children: [
      country('jpn', 'Japan', 'jp', [['J1 League', 'j1-league', 'active']]),
      country('ksa', 'Saudi Arabia', 'sa', [['Saudi Pro League', 'saudi-pro-league', 'active']]),
      country('kor', 'South Korea', 'kr', [['K League 1', 'k-league-1', 'active']]),
    ],
  },
  {
    id: 'cl-namerica', label: 'North & Central America', note: 'Concacaf',
    children: [
      country('usa', 'USA & Canada', 'us', [['Major League Soccer', 'mls', 'active']]),
      country('mex', 'Mexico', 'mx', [['Liga MX', 'liga-mx', 'active']]),
    ],
  },
  {
    id: 'cl-samerica', label: 'South America', note: 'CONMEBOL',
    children: [
      country('bra', 'Brazil', 'br', [['Brasileirão Série A', 'brasileirao-serie-a', 'active']]),
      country('arg', 'Argentina', 'ar', [['Liga Profesional', 'liga-profesional', 'active']]),
    ],
  },
  {
    id: 'cl-oceania', label: 'Oceania', note: 'OFC',
    children: [
      country('aus', 'Australia', 'au', [['A-League Men', 'a-league', 'active']]),
      country('nzl', 'New Zealand', 'nz', [['National League', 'nz-national-league', 'active']]),
    ],
  },
]

const intercontinental: NavNode[] = [
  {
    id: 'i-uefa', label: 'Europe', note: 'UEFA',
    children: c('i', [
      ['Champions League', 'champions-league', 'active'],
      ['Europa League', 'europa-league', 'active'],
      ['Conference League', 'conference-league', 'active'],
    ]),
  },
  {
    id: 'i-conmebol', label: 'South America', note: 'CONMEBOL',
    children: c('i', [
      ['Libertadores', 'copa-libertadores', 'active'],
      ['Sudamericana', 'copa-sudamericana', 'active'],
    ]),
  },
  {
    id: 'i-caf', label: 'Africa', note: 'CAF',
    children: c('i', [
      ['CAF Champions League', 'caf-champions-league', 'active'],
      ['CAF Confederation Cup', 'caf-confederation-cup', 'active'],
    ]),
  },
  {
    id: 'i-afc', label: 'Asia', note: 'AFC',
    children: c('i', [
      ['AFC Champions League Elite', 'afc-champions-league-elite', 'active'],
      ['AFC Champions League Two', 'afc-champions-league-two', 'active'],
    ]),
  },
  {
    id: 'i-concacaf', label: 'North & Central America', note: 'Concacaf',
    children: c('i', [['Concacaf Champions Cup', 'concacaf-champions-cup', 'upcoming']]),
  },
  {
    id: 'i-ofc', label: 'Oceania', note: 'OFC',
    children: c('i', [['OFC Champions League', 'ofc-champions-league', 'upcoming']]),
  },
  {
    id: 'i-fifa', label: 'World', note: 'FIFA',
    children: c('i', [
      ['FIFA Club World Cup', 'club-world-cup', 'upcoming'],
      ['FIFA Intercontinental Cup', 'intercontinental-cup', 'upcoming'],
    ]),
  },
]

export const navTree: Record<Section, NavNode[]> = { nations, clubs, intercontinental }

export interface CatalogEntry {
  slug: string
  label: string
  section: Section
  status: CompetitionStatus
  groupLabel: string
  groupNote?: string
  flag?: string
}

export function catalogEntries(): CatalogEntry[] {
  const out: CatalogEntry[] = []
  for (const section of Object.keys(navTree) as Section[]) {
    const walk = (nodes: NavNode[], parent?: NavNode, top?: NavNode) => {
      for (const n of nodes) {
        if (n.href) {
          out.push({
            slug: n.href.replace('#/c/', ''),
            label: n.label,
            section,
            status: n.status ?? 'active',
            groupLabel: parent?.label ?? '',
            groupNote: top?.note,
            flag: parent?.flag,
          })
        }
        if (n.children) walk(n.children, n, top ?? n)
      }
    }
    walk(navTree[section])
  }
  return out
}
