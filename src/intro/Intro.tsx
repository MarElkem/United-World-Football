import { useCallback, useEffect, useRef, useState } from 'react'
import Globe from '../globe/Globe'
import './intro.css'

// "Football" in six languages, written in the red marker.
const notes = [
  { word: 'Football', lang: 'en', code: 'EN' },
  { word: 'كرة القدم', lang: 'ar', code: 'AR' },
  { word: 'Football', lang: 'fr', code: 'FR' },
  { word: 'Fútbol', lang: 'es', code: 'ES' },
  { word: 'サッカー', lang: 'ja', code: 'JA' },
  { word: 'Fußball', lang: 'de', code: 'DE' },
]

/**
 * Opening sequence: the football Earth, the wordmark, the slogan in the
 * supplied EA Sports face and "football" in six languages, then a hand-off to the
 * dashboard. Full length on a first visit, short afterwards, and a still
 * frame when motion is reduced.
 */
export function Intro({ mode, onDone }: { mode: 'full' | 'short' | 'still'; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)
  const done = useRef(false)
  const skipRef = useRef<HTMLButtonElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const finish = useCallback(() => {
    if (done.current) return
    done.current = true
    // Measure where the header logo sits so the globe can fly into it.
    const root = rootRef.current
    const from = root?.querySelector('.intro-globe')?.getBoundingClientRect()
    const to = document.querySelector('.hero-globe')?.getBoundingClientRect()
    if (root && from && to && to.width > 0) {
      root.style.setProperty('--fly-x', `${to.left + to.width / 2 - (from.left + from.width / 2)}px`)
      root.style.setProperty('--fly-y', `${to.top + to.height / 2 - (from.top + from.height / 2)}px`)
      root.style.setProperty('--fly-s', `${to.width / from.width}`)
    }
    setLeaving(true)
    window.setTimeout(onDone, mode === 'still' ? 250 : mode === 'full' ? 1000 : 750)
  }, [mode, onDone])

  useEffect(() => {
    const hold = mode === 'full' ? 7000 : mode === 'short' ? 2600 : 1800
    const t = window.setTimeout(finish, hold)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') finish()
    }
    window.addEventListener('keydown', onKey)
    skipRef.current?.focus({ preventScroll: true })
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('keydown', onKey)
    }
  }, [mode, finish])

  return (
    <div ref={rootRef} className={`intro intro-${mode} ${leaving ? 'leaving' : ''}`} role="dialog" aria-modal="true" aria-label="United World Football introduction">
      <div className="intro-stage">
        <h1 className="intro-word">
          <span className="w w1">United</span>
          <span className="w w2">World</span>
          <span className="w w3">
            Football<span className="dot">.</span>
          </span>
        </h1>

        <p className="intro-slogan">
          <span className="slogan-text">Everything, Everywhere Football</span>
        </p>

        <ul className="intro-notes" aria-hidden="true">
          {notes.map((n, i) => (
            <li key={n.lang} style={{ ['--i' as string]: i }}>
              <span lang={n.lang} dir={n.lang === 'ar' ? 'rtl' : undefined} className="note-word">{n.word}</span>
              <span className="note-lang">{n.code}</span>
            </li>
          ))}
        </ul>

        <div className="intro-globe">
          <Globe spin={mode !== 'still'} className="intro-globe-canvas" />
          <span className="intro-shadow" aria-hidden="true" />
        </div>
      </div>

      <button ref={skipRef} className="skip" onClick={finish}>
        Skip intro
      </button>
    </div>
  )
}
