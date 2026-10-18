import { useState } from 'react'
import type { CatalogEntry } from '../data/catalog'
import { regionLabel, type Region } from '../data/places'
import type { Section } from '../data/types'
import Globe from '../globe/Globe'
import type { GlobeFocus } from '../globe/FootballEarth'
import { confIndex, confInfo, type Conf, type Country } from '../globe/geo'
import { Flag } from './bits'
import { IconArrow } from './icons'

const sectionLine: Record<Section, string> = {
  nations: 'Nations. National teams',
  clubs: 'Clubs. Domestic leagues',
  intercontinental: 'Intercontinental. Club competitions',
}

/**
 * The full-width banner: the football Earth as the brand's centrepiece and
 * the way in. Tap a country or a continent and the whole page follows.
 */
export function Hero(props: {
  section: Section
  motion: boolean
  globeOn: boolean
  region: Region
  regions: Region[]
  country?: Country
  focus?: GlobeFocus
  onPickCountry: (c: Country | undefined) => void
  onPickRegion: (r: Region) => void
  competitions: CatalogEntry[]
  withData: Set<string>
  activeSlug?: string
  onPickCompetition: (slug: string) => void
}) {
  const { section, motion, globeOn, region, regions, country, focus, onPickCountry, onPickRegion, competitions, withData, activeSlug, onPickCompetition } = props
  const [hover, setHover] = useState<{ c?: Country; x: number; y: number }>({ x: 0, y: 0 })
  const conf = (region && region !== 'FIFA' ? region : null) as Conf | null

  const title = country ? country.name : region === null ? 'The world' : regionLabel(region)
  const ready = competitions.filter((e) => withData.has(e.slug)).length
  const standfirst = country
    ? country.conf
      ? `${country.name} plays in ${country.conf}, the ${confInfo[country.conf].label} confederation. ${competitions.length} competitions here; ${ready} with data so far.`
      : `${country.name} has no team in a football confederation, so there is nothing to show here.`
    : region === null
      ? 'Turn the ball and tap a country, or choose a continent, and the tables, fixtures and news below follow you.'
      : `${competitions.length} competitions listed for ${regionLabel(region)}; ${ready} with data so far. Tap a country to narrow it down.`

  return (
    <section className="hero" aria-label="Explore by place">
      <div className="hero-inner">
        <div className="hero-copy">
          <p className="hero-kicker">{sectionLine[section]}</p>
          <h1 className="hero-title" id="place-title">
            {country?.a2 && <Flag code={country.a2} />}
            <span>
              {title}
              <span className="dot">.</span>
            </span>
          </h1>
          <p className="hero-standfirst">{standfirst}</p>

          <div className="hero-cols">
            <nav className="hero-regions" aria-label="Continents">
              <h2 className="hero-label">Continents</h2>
              <ul>
                {regions.map((r) => (
                  <li key={r ?? 'all'}>
                    <button className="hero-link" aria-pressed={region === r && !country} onClick={() => onPickRegion(r)}>
                      {r === null ? 'Whole world' : regionLabel(r)}
                      {r && <span className="hero-link-note">{r}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
            {competitions.length > 0 && (
              <nav className="hero-comps" aria-label="Competitions here">
                <h2 className="hero-label">Competitions</h2>
                <ul>
                  {competitions.slice(0, 7).map((e) => (
                    <li key={e.slug}>
                      <button className="hero-link" aria-pressed={e.slug === activeSlug} onClick={() => onPickCompetition(e.slug)}>
                        {e.label}
                        <span className="hero-link-note">{withData.has(e.slug) ? 'Data' : 'Not connected'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <a className="hero-jump" href="#matches">
                  Tables and fixtures <IconArrow />
                </a>
              </nav>
            )}
          </div>
        </div>

        <div className="hero-globe-wrap">
          <div className="hero-globe">
            {globeOn && (
              <Globe
                className="hero-globe-canvas"
                spin={motion}
                interactive
                hoverIndex={hover.c?.index ?? 0}
                selectedIndex={country?.index ?? 0}
                confIndex={country ? 0 : confIndex(conf)}
                focus={focus}
                onHover={(c, x, y) => setHover({ c, x, y })}
                onPick={onPickCountry}
                label="Interactive globe. Drag to turn it, tap a country to see its football. The continent list does the same."
              />
            )}
          </div>
          <p className="hero-hint">Drag to turn the ball. Tap a country.</p>
          {hover.c && (
            <div className="globe-tip" style={{ left: hover.x, top: hover.y }} aria-hidden="true">
              {hover.c.a2 && <Flag code={hover.c.a2} />}
              <span>{hover.c.name}</span>
              {hover.c.conf && <span className="tip-conf">{hover.c.conf}</span>}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
