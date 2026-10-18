import { useEffect, useLayoutEffect, useRef, useState } from 'react'

interface Step {
  target: string
  title: string
  body: string
}

const STEPS: Step[] = [
  { target: '.sections', title: 'Pick a section', body: 'Nations is national teams, Clubs is domestic leagues, and Intercontinental is club competitions between continents. Everything on the page follows the section you pick.' },
  { target: '.hero-globe', title: 'Turn the Earth', body: 'Drag the ball to turn the world. Tap any country to light it up; the banner, tables and news all follow.' },
  { target: '.hero-regions', title: 'Jump to a continent', body: 'Turn the globe to a continent and fade out the rest of the world. Whole world clears it.' },
  { target: '.hero-comps', title: 'Competitions here', body: 'The competitions for the place you picked. Choose one to open its table below.' },
  { target: '.strip', title: 'Latest scores', body: 'The newest results and next kick-offs across the section. Select one to open that competition.' },
  { target: '.sidebar', title: 'Every competition', body: 'The full list for this section, grouped by continent. Open or close each group, or hide the whole list to give the tables more room.' },
  { target: '.pickers', title: 'Or choose from the lists', body: 'Pick a continent, then a league or competition. The globe follows what you choose.' },
  { target: '.comp-tabs', title: 'Tables, fixtures and results', body: 'Switch between the table or bracket, the upcoming fixtures and the latest results. Kick-off times show in your own time zone.' },
  { target: '.newscol', title: 'News for this place', body: 'Stories for the section and the place you picked, newest first. Filter them by type.' },
  { target: '.news-switch', title: 'News on or off', body: 'Switch the news off and the tables take the full width.' },
  { target: '.ask-btn', title: 'Ask a question', body: 'Ask things like who is qualifying or when the next match is. Answers come only from the data on this site.' },
  { target: '.dateline-tools', title: 'Make it yours', body: 'Change light or dark mode, turn motion off, replay the intro, or come back to this walkthrough any time.' },
]

const visible = (el: Element | null): el is HTMLElement => {
  if (!el) return false
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'
}

/** A step-by-step tour that spotlights each part of the page in turn. */
export function Walkthrough({ onClose, motion }: { onClose: () => void; motion: boolean }) {
  const steps = useRef(STEPS.filter((s) => visible(document.querySelector(s.target)))).current
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const [cardPos, setCardPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const step = steps[i]
  const last = i === steps.length - 1

  // Bring the step's target into view, then follow it every frame (smooth
  // scrolling, resizing and layout shifts all move it).
  useEffect(() => {
    const el = step && document.querySelector(step.target)
    if (!el) return
    el.scrollIntoView({ block: 'center', behavior: motion ? 'smooth' : 'auto' })
    let raf = 0
    let prev = ''
    const tick = () => {
      const r = visible(el) ? el.getBoundingClientRect() : null
      const key = r ? `${r.top}|${r.left}|${r.width}|${r.height}` : 'none'
      if (key !== prev) {
        prev = key
        setRect(r)
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [step, motion])

  // Place the card below the spotlight, or above it, or over it when neither fits.
  useLayoutEffect(() => {
    const card = cardRef.current
    if (!card) return
    const w = card.offsetWidth
    const h = card.offsetHeight
    const vw = window.innerWidth
    const vh = window.innerHeight
    const gap = 14
    if (!rect) {
      setCardPos({ top: (vh - h) / 2, left: (vw - w) / 2 })
      return
    }
    const clampTop = (t: number) => Math.min(vh - h - 12, Math.max(12, t))
    const clampLeft = (l: number) => Math.min(vw - w - 12, Math.max(12, l))
    const centreTop = clampTop(rect.top + rect.height / 2 - h / 2)
    if (rect.bottom + gap + h <= vh - 12) setCardPos({ top: rect.bottom + gap, left: clampLeft(rect.left + rect.width / 2 - w / 2) })
    else if (rect.top - gap - h >= 12) setCardPos({ top: rect.top - h - gap, left: clampLeft(rect.left + rect.width / 2 - w / 2) })
    else if (rect.right + gap + w <= vw - 12) setCardPos({ top: centreTop, left: rect.right + gap })
    else if (rect.left - gap - w >= 12) setCardPos({ top: centreTop, left: rect.left - w - gap })
    else setCardPos({ top: clampTop(rect.bottom - h - 12), left: clampLeft(rect.left + rect.width / 2 - w / 2) })
  }, [rect, i])

  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true })
  }, [i])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setI((n) => Math.min(steps.length - 1, n + 1))
      if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, steps.length])

  if (!step) return null
  const pad = 8
  return (
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-body">
      <div className="tour-catch" onClick={(e) => e.stopPropagation()} />
      {rect && (
        <div
          className="tour-spot"
          style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }}
          aria-hidden="true"
        />
      )}
      <div ref={cardRef} className="tour-card" style={{ top: cardPos.top, left: cardPos.left }}>
        <p className="tour-count">
          Step {i + 1} of {steps.length}
        </p>
        <h2 id="tour-title" className="tour-title">
          {step.title}
          <span className="dot">.</span>
        </h2>
        <p id="tour-body" className="tour-body">{step.body}</p>
        <div className="tour-actions">
          <button className="tour-exit" onClick={onClose}>Exit walkthrough</button>
          <span className="tour-nav">
            {i > 0 && (
              <button className="tour-back" onClick={() => setI(i - 1)}>Back</button>
            )}
            <button ref={nextRef} className="tour-next" onClick={() => (last ? onClose() : setI(i + 1))}>
              {last ? 'Finish' : 'Next'}
            </button>
          </span>
        </div>
      </div>
    </div>
  )
}
