import { useEffect, useId, useRef, useState } from 'react'
import { IconChevron } from './icons'

export interface Option<T> {
  value: T
  label: string
  hint?: string
  group?: string
}

/**
 * A listbox dropdown drawn in the site's own type (native selects fall back to
 * the system font when open). Arrow keys, Home/End, Enter and Escape work.
 */
export function Dropdown<T>({ label, value, options, onChange, id }: {
  label: string
  value: T
  options: Option<T>[]
  onChange: (v: T) => void
  id: string
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const btn = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const uid = useId()
  const current = options.find((o) => o.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    const i = Math.max(0, options.findIndex((o) => o.value === value))
    setActive(i)
    requestAnimationFrame(() => {
      list.current?.focus()
      list.current?.querySelector(`[data-i="${i}"]`)?.scrollIntoView({ block: 'nearest' })
    })
    const close = (e: PointerEvent) => {
      if (!(e.target as Element).closest(`[data-dd="${uid}"]`)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open, options, value, uid])

  const choose = (i: number) => {
    const o = options[i]
    if (o) onChange(o.value)
    setOpen(false)
    btn.current?.focus()
  }

  const onKey = (e: React.KeyboardEvent) => {
    const last = options.length - 1
    const move = (i: number) => {
      e.preventDefault()
      setActive(i)
      list.current?.querySelector(`[data-i="${i}"]`)?.scrollIntoView({ block: 'nearest' })
    }
    if (e.key === 'ArrowDown') move(Math.min(last, active + 1))
    else if (e.key === 'ArrowUp') move(Math.max(0, active - 1))
    else if (e.key === 'Home') move(0)
    else if (e.key === 'End') move(last)
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      choose(active)
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setOpen(false)
      if (e.key === 'Escape') btn.current?.focus()
    }
  }

  let lastGroup: string | undefined
  return (
    <div className={`dd ${open ? 'open' : ''}`} data-dd={uid}>
      <span className="dd-label" id={`${id}-label`}>{label}</span>
      <button
        ref={btn}
        id={id}
        type="button"
        className="dd-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}`}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            setOpen(true)
          }
        }}
      >
        <span className="dd-value">{current?.label}</span>
        <IconChevron className="dd-chev" />
      </button>
      {open && (
        <ul
          ref={list}
          className="dd-list"
          role="listbox"
          tabIndex={-1}
          aria-labelledby={`${id}-label`}
          aria-activedescendant={`${id}-opt-${active}`}
          onKeyDown={onKey}
        >
          {options.map((o, i) => {
            const head = o.group && o.group !== lastGroup ? o.group : null
            lastGroup = o.group
            return (
              <li key={i} role="presentation">
                {head && <span className="dd-group" aria-hidden="true">{head}</span>}
                <div
                  id={`${id}-opt-${i}`}
                  data-i={i}
                  role="option"
                  aria-selected={o.value === value}
                  className={`dd-opt ${i === active ? 'active' : ''}`}
                  onPointerEnter={() => setActive(i)}
                  onClick={() => choose(i)}
                >
                  <span>{o.label}</span>
                  {o.hint && <span className="dd-hint">{o.hint}</span>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
