import { useState } from 'react'
import type { Match } from '../data/types'
import { StatusBadge, TeamName } from './bits'
import { dayKey, kickoffLocal, venueTime } from './time'

function ScoreCell({ m }: { m: Match }) {
  if (!m.score) return <span className="score score-none" aria-label="no score">–</span>
  return (
    <span className="score" aria-label={`${m.score.home} to ${m.score.away}`}>
      {m.score.home}<span className="dash">–</span>{m.score.away}
    </span>
  )
}

export function MatchRow({ m, showComp }: { m: Match; showComp?: string }) {
  const extra: string[] = []
  if (m.halfTime && m.status === 'finished') extra.push(`HT ${m.halfTime.home}–${m.halfTime.away}`)
  if (m.aggregate) extra.push(`Agg ${m.aggregate.home}–${m.aggregate.away}`)
  if (m.penalties) extra.push(`Pens ${m.penalties.home}–${m.penalties.away}`)
  if (m.status === 'postponed') extra.push('New date to be confirmed')
  if (m.status === 'abandoned') extra.push('Score at abandonment')
  return (
    <li className={`match match-${m.status}`}>
      <div className="match-meta">
        <StatusBadge match={m} />
        {showComp && <span className="match-comp">{showComp}</span>}
      </div>
      <div className="match-teams">
        <span className="home"><TeamName id={m.homeId} /></span>
        <ScoreCell m={m} />
        <span className="away"><TeamName id={m.awayId} /></span>
      </div>
      <div className="match-extra">
        <span className="round">{m.round}</span>
        {extra.map((e) => (
          <span key={e} className="extra-chip">{e}</span>
        ))}
      </div>
    </li>
  )
}

/** Matches grouped by local day, with the venue's official time on hover. */
export function MatchList({ matches, emptyTitle, reverse = false, compLabel, pageDays = 4 }: { matches: Match[]; emptyTitle: string; reverse?: boolean; compLabel?: (m: Match) => string; pageDays?: number }) {
  const [shown, setShown] = useState(pageDays)
  if (!matches.length) return <p className="muted">{emptyTitle}</p>
  const sorted = [...matches].sort((a, b) => (reverse ? b.kickoff.localeCompare(a.kickoff) : a.kickoff.localeCompare(b.kickoff)))
  const days: { key: string; label: string; items: Match[] }[] = []
  for (const m of sorted) {
    const key = dayKey(m.kickoff)
    let d = days.find((x) => x.key === key)
    if (!d) {
      d = { key, label: kickoffLocal(m.kickoff, 'day'), items: [] }
      days.push(d)
    }
    d.items.push(m)
  }
  return (
    <div className="match-days">
      {days.slice(0, shown).map((d) => (
        <section key={d.key} className="match-day" aria-label={d.label}>
          <h3 className="day-label" title={d.items[0] ? venueTime(d.items[0]) : undefined}>{d.label}</h3>
          <ul className="match-list">
            {d.items.map((m) => (
              <MatchRow key={m.id} m={m} showComp={compLabel?.(m)} />
            ))}
          </ul>
        </section>
      ))}
      {days.length > shown && (
        <button className="more" onClick={() => setShown(shown + pageDays)}>
          {reverse ? 'Show earlier results' : 'Show later fixtures'}
        </button>
      )}
    </div>
  )
}
