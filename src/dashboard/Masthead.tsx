import type { ReactNode } from 'react'
import type { Section } from '../data/types'
import { IconMotion, IconReplay, IconTheme, IconTour } from './icons'

export type ThemePref = 'auto' | 'light' | 'dark'

const sections: { id: Section; label: string; sub: string }[] = [
  { id: 'nations', label: 'Nations', sub: 'National teams' },
  { id: 'clubs', label: 'Clubs', sub: 'Domestic leagues' },
  { id: 'intercontinental', label: 'Intercontinental', sub: 'Club competitions' },
]

const today = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())

/** The thin dateline above the navigation, with the display controls. */
export function Dateline(props: {
  theme: ThemePref
  setTheme: (t: ThemePref) => void
  motion: boolean
  setMotion: (v: boolean) => void
  onReplayIntro: () => void
  onWalkthrough: () => void
}) {
  const { theme, setTheme, motion, setMotion, onReplayIntro, onWalkthrough } = props
  const next: Record<ThemePref, ThemePref> = { auto: 'light', light: 'dark', dark: 'auto' }
  const label = { auto: 'Auto', light: 'Light', dark: 'Dark' }[theme]
  return (
    <div className="dateline">
      <div className="dateline-inner">
        <p className="dateline-date">
          <time>{today}</time>
          <span className="dateline-proto">Free, non-commercial. Scores and tables from free sources, with the date of each update.</span>
        </p>
        <div className="dateline-tools">
          <button className="tool" onClick={() => setTheme(next[theme])} aria-label={`Colour theme: ${label}. Change`}>
            <IconTheme /> <span>{label}</span>
          </button>
          <button className="tool" onClick={() => setMotion(!motion)} aria-pressed={!motion}>
            <IconMotion /> <span>Motion {motion ? 'on' : 'off'}</span>
          </button>
          <button className="tool" onClick={onReplayIntro}>
            <IconReplay /> <span>Replay intro</span>
          </button>
          <button className="tool walk-btn" onClick={onWalkthrough}>
            <IconTour /> <span>Website walkthrough</span>
          </button>
        </div>
      </div>
    </div>
  )
}

/** Brand, the three sections and For you, the News switch and the assistant. */
export function TopNav({ section, setSection, forYou, openForYou, news, setNews, children }: {
  section: Section
  setSection: (s: Section) => void
  forYou: boolean
  openForYou: () => void
  news: boolean
  setNews: (v: boolean) => void
  children?: ReactNode
}) {
  return (
    <header className="topnav">
      <div className="topnav-inner">
        <a className="wordmark" href="#top" aria-label="United World Football, back to top">
          United World Football<span className="dot">.</span>
        </a>
        <nav className="sections" aria-label="Sections">
          {sections.map((s) => (
            <button key={s.id} className="section-tab" aria-pressed={!forYou && section === s.id} onClick={() => setSection(s.id)}>
              <span className="section-tab-label">{s.label}</span>
              <span className="section-tab-sub">{s.sub}</span>
            </button>
          ))}
          <button className="section-tab" aria-pressed={forYou} onClick={openForYou}>
            <span className="section-tab-label">For you</span>
            <span className="section-tab-sub">Your clubs and countries</span>
          </button>
        </nav>
        <div className="topnav-end">
          <button className="news-switch" role="switch" aria-checked={news} onClick={() => setNews(!news)}>
            <span className="news-switch-label">News</span>
            <span className="track" aria-hidden="true"><span className="thumb" /></span>
            <span className="news-state">{news ? 'On' : 'Off'}</span>
          </button>
          {children}
        </div>
      </div>
    </header>
  )
}
