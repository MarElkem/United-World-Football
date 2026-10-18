import type { Match } from '../data/types'

const fmt = {
  time: new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }),
  day: new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' }),
  short: new Intl.DateTimeFormat(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' }),
  full: new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
}

export function kickoffLocal(iso: string, kind: keyof typeof fmt = 'full') {
  return fmt[kind].format(new Date(iso))
}

/** Official scheduling information, kept alongside the viewer's local time. */
export function venueTime(m: Match) {
  try {
    const t = new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: m.venueTimeZone,
      timeZoneName: 'short',
    }).format(new Date(m.kickoff))
    return `Local venue time: ${t}`
  } catch {
    return ''
  }
}

export function dayKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export function relativeTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 60000
  if (diff < 1) return 'just now'
  if (diff < 60) return `${Math.round(diff)} min ago`
  if (diff < 60 * 24) return `${Math.round(diff / 60)} h ago`
  return kickoffLocal(iso, 'day')
}

export const localZoneName = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'your time zone'
  }
})()
