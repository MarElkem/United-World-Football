import { useEffect, useRef, useState } from 'react'
import { IconAsk, IconClose } from '../dashboard/icons'
import { ask, webSearchUrl, type AskError, type Turn } from './engine'

const copyFor = (code: string) => (code === 'rate_limited' ? 'Too many questions at once. Wait a moment and ask again.' : 'Something went wrong getting an answer. Try again.')

// Markdown symbols would show literally (and the site font has no glyphs for most).
const clean = (t: string) => t.replace(/\*\*|__|^#+\s/gm, '').replace(/^\s*[-*]\s/gm, '• ')

/** The football assistant: the Ask button at the top right opens a chat panel. */
export function Chat({ looking, openSlug, suggestions }: { looking: string; openSlug?: string; suggestions: string[] }) {
  const [open, setOpen] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState('')
  const [live, setLive] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ctl = useRef<AbortController | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [turns, live, error])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const send = async (text: string) => {
    const q = text.trim()
    if (!q || busy) return
    const history: Turn[] = [...turns, { role: 'user', content: q }]
    setTurns(history)
    setDraft('')
    setError(null)
    setBusy(true)
    setLive('')
    const c = new AbortController()
    ctl.current = c
    try {
      const answer = await ask(history, looking, openSlug, (t) => setLive(t), c.signal)
      setTurns([...history, { role: 'assistant', content: answer.text }])
    } catch (err) {
      const e = err as AskError
      if (e.text) setTurns([...history, { role: 'assistant', content: e.text }])
      if (e.code !== 'cancelled') setError(copyFor(e.code))
    } finally {
      setLive(null)
      setBusy(false)
      ctl.current = null
    }
  }

  return (
    <>
      <button
        className="ask-btn"
        aria-expanded={open}
        aria-controls="chat-panel"
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close the football assistant' : 'Ask the football assistant'}
      >
        <IconAsk />
        <span>Ask</span>
      </button>

      {open && (
        <section id="chat-panel" className="chat-panel" role="dialog" aria-label="Football assistant">
          <header className="chat-head">
            <div>
              <h2 className="chat-title">
                Ask United<span className="dot">.</span>
              </h2>
              <p className="chat-sub">Free. Answers come only from this site&apos;s data; for anything else there&apos;s a web search link.</p>
            </div>
            <button className="chat-close" onClick={() => setOpen(false)} aria-label="Close">
              <IconClose />
            </button>
          </header>

          <div className="chat-log" ref={listRef} aria-live="polite">
            {turns.length === 0 && (
              <div className="chat-empty">
                <p>Ask about tables, fixtures, results or who is qualifying.</p>
                <div className="chat-suggest">
                  {suggestions.map((s) => (
                    <button key={s} className="suggest" onClick={() => send(s)} disabled={busy}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {turns.map((t, i) =>
              t.role === 'assistant' ? (
                <div key={i} className="msg msg-assistant">
                  <p>{clean(t.content)}</p>
                  {turns[i - 1] && (
                    <a className="msg-search" href={webSearchUrl(turns[i - 1].content)} target="_blank" rel="noopener noreferrer">
                      Search the web for this
                    </a>
                  )}
                </div>
              ) : (
                <p key={i} className="msg msg-user">{t.content}</p>
              ),
            )}
            {live !== null && <p className="msg msg-assistant">{live ? clean(live) : <span className="thinking">Thinking</span>}</p>}
            {error && <p className="chat-error">{error}</p>}
          </div>

          <form
            className="chat-form"
            onSubmit={(e) => {
              e.preventDefault()
              send(draft)
            }}
          >
            <label className="sr-only" htmlFor="chat-input">Your question</label>
            <textarea
              id="chat-input"
              ref={inputRef}
              rows={1}
              value={draft}
              placeholder="Who is qualifying from Group A?"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send(draft)
                }
              }}
            />
            {busy ? (
              <button type="button" className="chat-send" onClick={() => ctl.current?.abort()}>Stop</button>
            ) : (
              <button type="submit" className="chat-send" disabled={!draft.trim()}>Send</button>
            )}
          </form>
        </section>
      )}
    </>
  )
}
