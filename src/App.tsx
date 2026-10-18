import { useCallback, useEffect, useMemo, useState } from 'react'
import { source } from './data/source'
import { competitionsFor, defaultCompetition, entryCountry, entryRegion, newsFor, regionLabel, regionsFor, type Region } from './data/places'
import type { Section } from './data/types'
import { CompetitionView, type Tab } from './dashboard/CompetitionView'
import { Dropdown } from './dashboard/Dropdown'
import { FeatureBanner } from './dashboard/FeatureBanner'
import { Hero } from './dashboard/Hero'
import { Dateline, TopNav, type ThemePref } from './dashboard/Masthead'
import { NewsColumn } from './dashboard/NewsColumn'
import { ScoreStrip } from './dashboard/ScoreStrip'
import { Sidebar } from './dashboard/Sidebar'
import type { GlobeFocus } from './globe/FootballEarth'
import { confInfo, countryByKey, type Country } from './globe/geo'
import { Intro } from './intro/Intro'
import { Chat } from './assistant/Chat'
import { Walkthrough } from './walkthrough/Walkthrough'
import { hasSeenIntro, markIntroSeen, useMedia, usePref } from './prefs'
import { kickoffLocal } from './dashboard/time'

const sectionTitle: Record<Section, string> = { nations: 'Nations', clubs: 'Clubs', intercontinental: 'Intercontinental' }

export default function App() {
  const systemReduced = useMedia('(prefers-reduced-motion: reduce)')
  const [motionPref, setMotionPref] = usePref<boolean | null>('motion', null)
  const motion = motionPref ?? !systemReduced
  const [theme, setTheme] = usePref<ThemePref>('theme', 'auto')
  const [news, setNews] = usePref('news', true)
  const [section, setSection] = usePref<Section>('section', 'nations')
  const [sideCollapsed, setSideCollapsed] = usePref('sidebar-collapsed', false)
  const [intro, setIntro] = useState<'full' | 'short' | 'still' | null>(() => (!motion ? 'still' : hasSeenIntro() ? 'short' : 'full'))

  const [region, setRegion] = useState<Region>(null)
  const [countryKey, setCountryKey] = useState<string | null>(null)
  const [slug, setSlug] = useState<string>(() => defaultCompetition(section, null)?.slug ?? '')
  const [tab, setTab] = useState<Tab | null>(null)
  const [focus, setFocus] = useState<GlobeFocus>()
  const [tour, setTour] = useState(false)

  const country = countryByKey(countryKey)
  const look = useCallback((lon: number, lat: number) => setFocus({ lon, lat, nonce: Math.random() }), [])

  useEffect(() => {
    const el = document.documentElement
    if (theme === 'auto') delete el.dataset.theme
    else el.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    document.body.classList.toggle('lock', !!intro)
  }, [intro])

  const catalog = useMemo(() => source.catalog(), [])
  const entry = catalog.find((e) => e.slug === slug && e.section === section)
  const comp = entry ? source.competition(entry.slug) : undefined
  const withData = useMemo(() => new Set(source.competitions().map((c) => c.slug)), [])

  // Keep the chosen competition valid for the section.
  useEffect(() => {
    if (!entry) {
      setSlug(defaultCompetition(section, region, countryKey)?.slug ?? '')
      setTab(null)
    }
  }, [entry, section, region, countryKey])

  useEffect(() => {
    document.title = entry ? `${entry.label} · United World Football` : 'United World Football'
  }, [entry])

  const pickCountry = (c: Country | undefined) => {
    if (!c) {
      setCountryKey(null)
      return
    }
    setCountryKey(c.key)
    setRegion(c.conf)
    if (c.conf) {
      const d = defaultCompetition(section, c.conf, c.a2)
      if (d) {
        setSlug(d.slug)
        setTab(null)
      }
    }
    look(c.centre[0], c.centre[1])
  }

  const pickRegion = (r: Region) => {
    setRegion(r)
    setCountryKey(null)
    const d = defaultCompetition(section, r)
    if (d) {
      setSlug(d.slug)
      setTab(null)
    }
    if (r && r !== 'FIFA') look(...confInfo[r].centre)
  }

  const pickCompetition = (s: string, scroll = false) => {
    const e = catalog.find((x) => x.slug === s)
    setSlug(s)
    setTab(null)
    if (scroll) requestAnimationFrame(() => document.getElementById('matches')?.scrollIntoView({ behavior: motion ? 'smooth' : 'auto', block: 'start' }))
    if (!e) return
    const r = entryRegion(e)
    const c = countryByKey(entryCountry(e))
    if (c) {
      setCountryKey(c.key)
      setRegion(c.conf)
      look(c.centre[0], c.centre[1])
    } else if (r !== region) {
      setRegion(r)
      setCountryKey(null)
      if (r && r !== 'FIFA') look(...confInfo[r].centre)
    }
  }

  const changeSection = (s: Section) => {
    setSection(s)
    const d = defaultCompetition(s, region, countryKey)
    setSlug(d?.slug ?? '')
    setTab(null)
  }

  const articles = useMemo(() => source.news(), [])
  const placeNews = newsFor(articles, section, region, countryKey)
  const placeComps = competitionsFor(section, region, countryKey)
  const placeName = country ? country.name : region ? regionLabel(region) : 'All continents'

  const regionOptions = regionsFor(section).map((r) => ({ value: r, label: regionLabel(r) }))
  const compOptions = competitionsFor(section, region).map((e) => ({
    value: e.slug,
    label: e.label,
    group: section === 'clubs' ? e.groupLabel : undefined,
    hint: withData.has(e.slug) ? 'data' : 'not connected',
  }))
  const suggestions = catalog.filter((e) => e.section === section && withData.has(e.slug))

  const looking = [
    `the ${sectionTitle[section]} section`,
    country ? `country ${country.name}` : region ? `continent ${regionLabel(region)}` : 'the whole world',
    entry ? `competition ${entry.label} (slug ${entry.slug})${withData.has(entry.slug) ? '' : ', which has no data yet'}` : 'no competition open',
  ].join('; ')
  const chatSuggestions = [
    ...(entry && withData.has(entry.slug) ? [`Who is top of the ${entry.label}?`] : []),
    'Who is top of the Bundesliga?',
    'Who is going down in LaLiga?',
    'Latest football news',
  ].slice(0, 4)

  const endIntro = useCallback(() => {
    markIntroSeen()
    setIntro(null)
  }, [])

  return (
    <div id="top" className={`app section-${section} ${news ? 'news-on' : 'news-off'} ${motion ? '' : 'still'}`}>
      <a className="skip-link" href="#matches">Skip to tables and fixtures</a>
      <Dateline
        theme={theme}
        setTheme={setTheme}
        motion={motion}
        setMotion={(v) => setMotionPref(v)}
        onReplayIntro={() => {
          setTour(false)
          setIntro(motion ? 'full' : 'still')
        }}
        onWalkthrough={() => setTour(true)}
      />
      <TopNav section={section} setSection={changeSection} news={news} setNews={setNews}>
        <Chat looking={looking} openSlug={entry?.slug} suggestions={chatSuggestions} />
      </TopNav>

      <main className="main">
        <Hero
          section={section}
          motion={motion}
          globeOn={!intro}
          region={region}
          regions={regionsFor(section)}
          country={country}
          focus={focus}
          onPickCountry={pickCountry}
          onPickRegion={pickRegion}
          competitions={placeComps}
          withData={withData}
          activeSlug={slug}
          onPickCompetition={(s) => pickCompetition(s, true)}
        />

        <ScoreStrip section={section} onPick={(s) => pickCompetition(s, true)} />

        <div className={`board ${sideCollapsed ? 'side-collapsed' : ''}`}>
          <Sidebar
            entries={competitionsFor(section, null)}
            region={region}
            activeSlug={slug}
            withData={withData}
            onPick={(s) => pickCompetition(s)}
            collapsed={sideCollapsed}
            setCollapsed={setSideCollapsed}
          />

          <section id="matches" className="matches" aria-label="Tables and fixtures" tabIndex={-1}>
            <div className="pickers">
              <Dropdown id="pick-region" label="Continent" value={region} options={regionOptions} onChange={pickRegion} />
              <Dropdown id="pick-comp" label={section === 'clubs' ? 'League' : 'Competition'} value={slug} options={compOptions} onChange={(s) => pickCompetition(s)} />
            </div>
            {entry ? (
              <CompetitionView key={entry.slug} entry={entry} comp={comp} tab={tab} onTab={setTab} suggestions={suggestions} />
            ) : (
              <p className="muted">Choose a competition.</p>
            )}
          </section>

          {news && <NewsColumn section={section} placeName={placeName} placeNews={placeNews} />}
        </div>

        <FeatureBanner section={section} onOpen={(s) => pickCompetition(s, true)} />
      </main>

      <footer className="foot">
        <div className="foot-inner">
          <p className="foot-mark">
            United World Football<span className="dot">.</span>
          </p>
          <p className="foot-slogan">Everything, Everywhere Football</p>
          <div className="foot-cols">
            <div>
              <h2 className="foot-label">Sections</h2>
              <ul>
                {(['nations', 'clubs', 'intercontinental'] as Section[]).map((s) => (
                  <li key={s}>
                    <button className="foot-link" onClick={() => { changeSection(s); window.scrollTo({ top: 0, behavior: motion ? 'smooth' : 'auto' }) }}>
                      {sectionTitle[s]}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="foot-label">About the data</h2>
              <p>
                Scores, tables and fixtures come from free sources: openfootball (public domain) and, where connected, football-data.org. Headlines link to their
                publishers. Each competition shows where its data comes from and how up to date it is.{' '}
                {source.generatedAt() && <>Data last refreshed {kickoffLocal(source.generatedAt()!)}.</>}
              </p>
            </div>
            <div>
              <h2 className="foot-label">Credits</h2>
              <p>Map data: Natural Earth (public domain). Flags: flag-icons (MIT). Type: EA Sports (supplied), Source Serif 4 and IBM Plex Sans Condensed (SIL Open Font Licence). Club crests are not shown. Not affiliated with any league or club.</p>
            </div>
          </div>
        </div>
      </footer>

      {tour && !intro && <Walkthrough motion={motion} onClose={() => setTour(false)} />}
      {intro && <Intro key={intro} mode={intro} onDone={endIntro} />}
    </div>
  )
}
