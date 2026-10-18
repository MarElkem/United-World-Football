// Country shapes (Natural Earth via world-atlas, public domain) with the
// confederation each country plays in. Used for picking and highlighting.

import { geoBounds, geoCentroid, geoContains } from 'd3-geo'
import { feature, mesh } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import type { Feature, Geometry, MultiLineString } from 'geojson'
import countries110 from 'world-atlas/countries-110m.json'
import meta from '../data/countries.json'

export type Conf = 'CAF' | 'AFC' | 'UEFA' | 'Concacaf' | 'CONMEBOL' | 'OFC'

export const CONFS: Conf[] = ['CAF', 'AFC', 'UEFA', 'Concacaf', 'CONMEBOL', 'OFC']

export const confInfo: Record<Conf, { label: string; centre: [number, number] }> = {
  CAF: { label: 'Africa', centre: [18, 4] },
  AFC: { label: 'Asia', centre: [92, 28] },
  UEFA: { label: 'Europe', centre: [18, 50] },
  Concacaf: { label: 'North & Central America', centre: [-92, 28] },
  CONMEBOL: { label: 'South America', centre: [-60, -18] },
  OFC: { label: 'Oceania', centre: [162, -22] },
}

export interface Country {
  index: number // 1-based, as stored in the id texture
  key: string
  a2: string | null
  name: string
  conf: Conf | null
  centre: [number, number]
  feature: Feature<Geometry>
  bbox: [[number, number], [number, number]]
}

type Meta = { id: string; a2: string | null; name: string; conf: Conf | null }

const topo = countries110 as unknown as Topology<{ countries: GeometryCollection }>
const collection = feature(topo, topo.objects.countries)

export const countries: Country[] = collection.features.map((f, i) => {
  const m = (meta as Meta[])[i]
  return {
    index: i + 1,
    key: m.a2 ?? m.id,
    a2: m.a2,
    name: m.name,
    conf: m.conf,
    centre: geoCentroid(f) as [number, number],
    feature: f as Feature<Geometry>,
    bbox: geoBounds(f) as [[number, number], [number, number]],
  }
})

/** Internal borders only, for the thin ink lines between countries. */
export const borders: MultiLineString = mesh(topo, topo.objects.countries, (a, b) => a !== b)

export function countryByKey(key?: string | null) {
  return key ? countries.find((c) => c.key === key) : undefined
}

export function countryAt(lon: number, lat: number): Country | undefined {
  for (const c of countries) {
    const [[w, s], [e, n]] = c.bbox
    if (lat < s - 0.5 || lat > n + 0.5) continue
    const inLon = w <= e ? lon >= w - 0.5 && lon <= e + 0.5 : lon >= w - 0.5 || lon <= e + 0.5
    if (!inLon) continue
    if (geoContains(c.feature, [lon, lat])) return c
  }
  return undefined
}

export const confIndex = (c: Conf | null | undefined) => (c ? CONFS.indexOf(c) + 1 : 0)
