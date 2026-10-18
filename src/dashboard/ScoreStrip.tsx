import { source } from '../data/source'
import { team } from '../data/source'
import type { Match, Section } from '../data/types'
import { kickoffLocal } from './time'

const LIVE = ['live', 'half_time']
const DONE = ['finished', 'after_extra_time', 'penalties', 'awarded']

/** A band of the section's latest results and next kick-offs, across competitions. */
export function ScoreStrip({ section, onPick }: { section: Section; onPick: (slug: string) => void }) {
  const now = Date.now()
  const comps = source.competitions().filter((c) => c.section === section)
  const rows: { m: Match; slug: string; comp: string }[] = []
  for (const c of comps) {
    const sorted = [...c.matches].sort((a, b) => a.kickoff.localeCompare(b.kickoff))
    const live = sorted.filter((m) => LIVE.includes(m.status))
    const done = sorted.filter((m) => DONE.includes(m.status)).slice(-2)
    const next = sorted.filter((m) => m.status === 'scheduled' && new Date(m.kickoff).getTime() > now).slice(0, 1)
    for (const m of [...live, ...done, ...next]) rows.push({ m, slug: c.slug, comp: c.shortName })
  }
  rows.sort((a, b) => {
    const rank = (m: Match) => (LIVE.includes(m.status) ? 0 : DONE.includes(m.status) ? 1 : 2)
    return rank(a.m) - rank(b.m) || (rank(a.m) === 1 ? b.m.kickoff.localeCompare(a.m.kickoff) : a.m.kickoff.localeCompare(b.m.kickoff))
  })
  if (!rows.length) return null

  return (
    <section className="strip" aria-label="Latest results and next matches">
      <div className="strip-inner">
        <h2 className="strip-label">
          Scores<span className="strip-label-sub">Latest</span>
        </h2>
        <ol className="strip-list">
          {rows.slice(0, 12).map(({ m, slug, comp }) => {
            const live = LIVE.includes(m.status)
            const done = DONE.includes(m.status)
            const home = team(m.homeId)
            const away = team(m.awayId)
            return (
              <li key={m.id}>
                <button className={`strip-item ${live ? 'is-live' : ''}`} onClick={() => onPick(slug)} aria-label={`${comp}: ${home.name} ${m.score ? `${m.score.home} ${away.name} ${m.score.away}` : `against ${away.name}`}. Open ${comp}.`}>
                  <span className="strip-meta">
                    <span>{comp}</span>
                    <span className={live ? 'strip-live' : ''}>
                      {live ? (m.status === 'half_time' ? 'HT' : `${m.minute ?? ''}′`) : done ? (m.status === 'penalties' ? 'Pens' : m.status === 'after_extra_time' ? 'AET' : 'FT') : kickoffLocal(m.kickoff, 'short')}
                    </span>
                  </span>
                  <span className="strip-row">
                    <span className="strip-team">{home.shortName}</span>
                    <span className="strip-score">{m.score ? m.score.home : ''}</span>
                  </span>
                  <span className="strip-row">
                    <span className="strip-team">{away.shortName}</span>
                    <span className="strip-score">{m.score ? m.score.away : ''}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
