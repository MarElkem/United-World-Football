// One registry of teams for the whole run, so a club or nation has the same
// id in every competition that comes from the same source.

import countries from 'i18n-iso-countries'
import { cleanClubName, colourFor, shortNameFor, slugify } from './util.mjs'

// Names i18n-iso-countries does not resolve, and the home nations, which
// play as separate teams and have their own flags.
const NATION_CODES = {
  england: 'gb-eng',
  scotland: 'gb-sct',
  wales: 'gb-wls',
  'northern ireland': 'gb-nir',
  'bosnia & herzegovina': 'ba',
  'bosnia and herzegovina': 'ba',
  'dr congo': 'cd',
  'congo dr': 'cd',
  'korea republic': 'kr',
  'south korea': 'kr',
  'korea dpr': 'kp',
  'ir iran': 'ir',
  usa: 'us',
  'united states': 'us',
  'czech republic': 'cz',
  czechia: 'cz',
  turkiye: 'tr',
  türkiye: 'tr',
  "cote d'ivoire": 'ci',
  "côte d'ivoire": 'ci',
  'ivory coast': 'ci',
  'cape verde': 'cv',
  'cabo verde': 'cv',
  curacao: 'cw',
  curaçao: 'cw',
  kosovo: 'xk',
}

export function nationCode(name) {
  const key = name.toLowerCase()
  if (NATION_CODES[key]) return NATION_CODES[key]
  const a2 = countries.getAlpha2Code(name, 'en')
  return a2 ? a2.toLowerCase() : ''
}

export class Teams {
  constructor() {
    this.byId = new Map()
    this.nameOf = (id) => this.byId.get(id)?.name ?? id
  }

  add(id, team) {
    if (!this.byId.has(id)) this.byId.set(id, { id, ...team })
    return id
  }

  /** A club named by openfootball, flagged with its league's country. */
  club(rawName, country) {
    const name = cleanClubName(rawName)
    const id = `${country}-${slugify(name)}`
    return this.add(id, { name, shortName: shortNameFor(name), kind: 'club', country, colour: colourFor(id) })
  }

  nation(name) {
    const id = `n-${slugify(name)}`
    return this.add(id, { name, shortName: shortNameFor(name), kind: 'national', country: nationCode(name), colour: colourFor(id) })
  }

  /** A team from football-data.org, keyed by its numeric id. */
  fd(team, { kind = 'club', country = '' } = {}) {
    if (!team?.id) return ''
    const id = `fd-${team.id}`
    const name = cleanClubName(team.shortName || team.name || `Team ${team.id}`)
    return this.add(id, {
      name,
      shortName: team.tla && name.length > 15 ? team.tla : shortNameFor(name),
      kind,
      country: kind === 'national' ? nationCode(team.name ?? '') : country,
      colour: colourFor(id),
    })
  }

  /** Only the teams the given competitions refer to. */
  usedBy(competitions) {
    const used = new Set(competitions.flatMap((c) => c.matches.flatMap((m) => [m.homeId, m.awayId])))
    return Object.fromEntries([...this.byId].filter(([id]) => used.has(id)))
  }
}
