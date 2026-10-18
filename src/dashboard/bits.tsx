import type { ReactNode } from 'react'
import type { DataStamp, Match, Team } from '../data/types'
import { initials, team as getTeam } from '../data/source'
import { kickoffLocal, venueTime } from './time'

const flagUrls = import.meta.glob('../assets/flags/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

export function flagUrl(code?: string) {
  if (!code) return undefined
  return flagUrls[`../assets/flags/${code}.svg`]
}

export function Flag({ code, label }: { code?: string; label?: string }) {
  const url = flagUrl(code)
  if (!url) return null
  return <img className="flag" src={url} alt={label ?? ''} width={20} height={15} loading="lazy" />
}

/** Neutral initials badge; licensed crests are not used. */
export function TeamBadge({ team, size = 22 }: { team: Team; size?: number }) {
  if (team.kind === 'national' && flagUrl(team.country)) {
    return <img className="team-flag" src={flagUrl(team.country)} alt="" width={size} height={Math.round(size * 0.75)} />
  }
  return (
    <span className="badge" style={{ width: size, height: size, ['--badge' as string]: team.colour }} aria-hidden="true">
      {initials(team.name).slice(0, 3)}
    </span>
  )
}

export function TeamName({ id, short = false }: { id: string; short?: boolean }) {
  const t = getTeam(id)
  return (
    <span className="team">
      <TeamBadge team={t} />
      <span className="team-name">{short ? t.shortName : t.name}</span>
    </span>
  )
}


const freshnessLabel = { demo: 'Demo data', live: 'Live', delayed: 'Slightly delayed', stale: 'Behind', unavailable: 'Unavailable' }

/** Where a competition's data comes from and how fresh it is. */
export function SourceStamp({ stamp }: { stamp: DataStamp }) {
  return (
    <>
      <span className={`stamp stamp-${stamp.freshness}`} title={stamp.note}>
        {freshnessLabel[stamp.freshness]}
      </span>
      <span className="stamp-source">
        {stamp.source}
        {stamp.note ? `. ${stamp.note}` : ''}
      </span>
    </>
  )
}

const statusText: Record<Match['status'], string> = {
  scheduled: '',
  live: 'Live',
  half_time: 'HT',
  finished: 'FT',
  after_extra_time: 'AET',
  penalties: 'Pens',
  postponed: 'Postponed',
  cancelled: 'Cancelled',
  suspended: 'Suspended',
  abandoned: 'Abandoned',
  awarded: 'Awarded',
}

export function StatusBadge({ match }: { match: Match }) {
  if (match.status === 'scheduled') {
    return (
      <time className="ko" dateTime={match.kickoff} title={venueTime(match)}>
        {kickoffLocal(match.kickoff, 'time')}
      </time>
    )
  }
  const live = match.status === 'live' || match.status === 'half_time'
  return (
    <span className={`status status-${match.status}`}>
      {live && <span className="pulse" aria-hidden="true" />}
      {match.status === 'live' ? `${match.minute ?? ''}′` : statusText[match.status]}
      {live && <span className="sr-only"> live</span>}
    </span>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div>
        <p className="empty-title">{title}</p>
        {children && <div className="empty-body">{children}</div>}
      </div>
    </div>
  )
}
