import type { Competition, Stage, Tie } from '../data/types'
import { team } from '../data/source'
import { TeamBadge } from './bits'
import { kickoffLocal } from './time'

function TieCard({ tie, comp }: { tie: Tie; comp: Competition }) {
  const legs = tie.legs.map((id) => comp.matches.find((m) => m.id === id)!).filter(Boolean)
  const sides = [tie.homeId ?? '', tie.awayId ?? '']
  const legScore = (teamId: string) =>
    legs.map((m) => {
      if (!m.score) return null
      return m.homeId === teamId ? m.score.home : m.score.away
    })
  const pens = legs.find((m) => m.penalties)
  const decided = !!tie.winnerId
  const next = legs.find((m) => !m.score)

  return (
    <article className={`tie ${decided ? 'tie-done' : ''}`} aria-label={`${team(sides[0]).name} against ${team(sides[1]).name}`}>
      {sides.map((id, si) => {
        const t = team(id)
        const scores = legScore(id)
        const agg = tie.aggregate ? (id === tie.homeId ? tie.aggregate.home : tie.aggregate.away) : undefined
        const pen = pens?.penalties ? (pens.homeId === id ? pens.penalties.home : pens.penalties.away) : undefined
        return (
          <div key={si} className={`tie-side ${tie.winnerId === id ? 'winner' : decided ? 'loser' : ''}`}>
            <span className="team">
              {id ? <TeamBadge team={t} size={18} /> : <span className="badge badge-tbd" aria-hidden="true">?</span>}
              <span className="team-name">{t.name}</span>
            </span>
            <span className="tie-scores">
              {scores.map((s, i) => (
                <span key={i} className="leg" title={`Leg ${i + 1}`}>{s ?? '·'}</span>
              ))}
              {agg !== undefined && legs.length > 1 && <span className="agg" title="Aggregate">{agg}</span>}
              {pen !== undefined && <span className="pens" title="Penalties">({pen})</span>}
            </span>
          </div>
        )
      })}
      <footer className="tie-foot">
        {tie.decidedBy === 'penalties' && decided && <span>On penalties</span>}
        {tie.decidedBy === 'aggregate' && decided && <span>On aggregate</span>}
        {!decided && next && <time dateTime={next.kickoff}>Next: {kickoffLocal(next.kickoff)}</time>}
      </footer>
    </article>
  )
}

export function Bracket({ stage, comp }: { stage: Stage; comp: Competition }) {
  if (!stage.rounds) return null
  return (
    <div className="bracket-scroll" role="region" aria-label="Knockout bracket" tabIndex={0}>
      <ol className="bracket">
        {stage.rounds.map((r) => (
          <li key={r.name} className="bracket-round">
            <h3 className="round-title">{r.name}</h3>
            <div className="round-ties">
              {r.ties.map((t) => (
                <TieCard key={t.id} tie={t} comp={comp} />
              ))}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
