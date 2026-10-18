import { useEffect, useState } from 'react'

// Per-viewer conveniences only. Storage can be unavailable (private windows,
// previews), so every access is guarded and the defaults always work.
function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(`uwf:${key}`)
    return v === null ? fallback : (JSON.parse(v) as T)
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(`uwf:${key}`, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

export function usePref<T>(key: string, fallback: T) {
  const [v, setV] = useState<T>(() => read(key, fallback))
  useEffect(() => write(key, v), [key, v])
  return [v, setV] as const
}

export function hasSeenIntro() {
  return read('introSeen', false)
}
export function markIntroSeen() {
  write('introSeen', true)
}

export function useMedia(query: string) {
  const [m, setM] = useState(() => (typeof matchMedia === 'function' ? matchMedia(query).matches : false))
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const mq = matchMedia(query)
    const on = () => setM(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return m
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}
