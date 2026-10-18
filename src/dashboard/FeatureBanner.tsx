import { source } from '../data/source'
import { team } from '../data/source'
import type { Competition, Section } from '../data/types'
import { kickoffLocal } from './time'

const flagship: Record<Section, string[]> = {
  nations: ['nations-league', 'friendlies'],
  clubs: ['premier-league', 'la-liga'],
  intercontinental: ['champions-league', 'copa-libertadores'],
}

function facts(c: Competition) {
  const out: { label: string; value: string }[] = []
  const stage = c.stages[0]
  const now = Date.now()
  if (stage.groups?.length) {
    const g = stage.groups[0]
    const top = g.table[0]
    if (top) out.push({ label: stage.groups.length > 1 ? `Leads ${g.name}` : 'Top of the table', value: `${team(top.teamId).name}, ${top.points} pts` })
  }
  if (stage.rounds?.length) {
    const live = [...stage.rounds].reverse().find((r) => r.ties.some((t) => !t.winnerId && t.homeId))
    if (live) out.push({ label: 'Current round', value: `${live.name}, ${live.ties.filter((t) => !t.winnerId).length} ties open` })
  }
  const done = c.matches.filter((m) => m.score && m.status !== 'scheduled').sort((a, b) => b.kickoff.localeCompare(a.kickoff))[0]
  if (done?.score) out.push({ label: 'Latest result', value: `${team(done.homeId).shortName} ${done.score.home}–${done.score.away} ${team(done.awayId).shortName}` })
  const next = c.matches.filter((m) => m.status === 'scheduled' && new Date(m.kickoff).getTime() > now).sort((a, b) => a.kickoff.localeCompare(b.kickoff))[0]
  if (next) out.push({ label: 'Next match', value: `${team(next.homeId).shortName} v ${team(next.awayId).shortName}, ${kickoffLocal(next.kickoff)}` })
  return out
}

/**
 * The section's flagship competition, given a full-width band of its own.
 * Every figure comes from the competition's data.
 */
export function FeatureBanner({ section, onOpen }: { section: Section; onOpen: (slug: string) => void }) {
  const c = flagship[section].map((s) => source.competition(s)).find(Boolean)
  if (!c) return null
  return (
    <section className="feature" aria-labelledby="feature-title">
      <div className="feature-inner">
        <p className="feature-kicker">In focus. {c.confederation}</p>
        <h2 id="feature-title" className="feature-title">
          {c.name}
          <span className="dot">.</span>
        </h2>
        <dl className="feature-facts">
          {facts(c).map((f) => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
        <div className="feature-foot">
          <button className="btn btn-on-band" onClick={() => onOpen(c.slug)}>
            Open {c.shortName}
          </button>
          <span className="feature-note">{c.stamp.source}</span>
        </div>
      </div>
    </section>
  )
}
