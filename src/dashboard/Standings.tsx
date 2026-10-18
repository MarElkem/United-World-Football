import type { Group, Stage, Zone } from '../data/types'
import { team } from '../data/source'
import { TeamBadge } from './bits'

const zoneClass: Record<Zone, string> = {
  qualify: 'z-qualify',
  playoff: 'z-playoff',
  continental: 'z-continental',
  relegate: 'z-relegate',
  relegation_playoff: 'z-relegate',
}

export function StandingsTable({ group, compact = false, caption }: { group: Group; compact?: boolean; caption?: string }) {
  return (
    <div className="table-wrap" role="region" aria-label={caption ?? group.name} tabIndex={0}>
      <table className={`standings ${compact ? 'compact' : ''}`}>
        {caption && <caption>{caption}</caption>}
        <thead>
          <tr>
            <th scope="col" className="pos"><abbr title="Position">#</abbr></th>
            <th scope="col" className="club">Team</th>
            <th scope="col"><abbr title="Played">P</abbr></th>
            {!compact && (
              <>
                <th scope="col"><abbr title="Won">W</abbr></th>
                <th scope="col"><abbr title="Drawn">D</abbr></th>
                <th scope="col"><abbr title="Lost">L</abbr></th>
                <th scope="col" className="hide-sm"><abbr title="Goals for">GF</abbr></th>
                <th scope="col" className="hide-sm"><abbr title="Goals against">GA</abbr></th>
              </>
            )}
            <th scope="col"><abbr title="Goal difference">GD</abbr></th>
            <th scope="col" className="pts"><abbr title="Points">Pts</abbr></th>
            {!compact && <th scope="col" className="form hide-md">Form</th>}
          </tr>
        </thead>
        <tbody>
          {group.table.map((r) => {
            const t = team(r.teamId)
            const gd = r.goalsFor - r.goalsAgainst
            return (
              <tr key={r.teamId} className={r.zone ? zoneClass[r.zone] : ''}>
                <td className="pos">{r.position}</td>
                <th scope="row" className="club">
                  <span className="team">
                    <TeamBadge team={t} />
                    <span className="team-name">{compact ? t.shortName : t.name}</span>
                  </span>
                </th>
                <td>{r.played}</td>
                {!compact && (
                  <>
                    <td>{r.won}</td>
                    <td>{r.drawn}</td>
                    <td>{r.lost}</td>
                    <td className="hide-sm">{r.goalsFor}</td>
                    <td className="hide-sm">{r.goalsAgainst}</td>
                  </>
                )}
                <td>{gd > 0 ? `+${gd}` : gd}</td>
                <td className="pts">{r.points}</td>
                {!compact && (
                  <td className="form hide-md">
                    <span className="form-row" aria-label={`Last ${r.form.length}: ${r.form.join(' ')}`}>
                      {r.form.map((f, i) => (
                        <span key={i} className={`f f-${f}`} aria-hidden="true">{f}</span>
                      ))}
                    </span>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function ZoneKey({ stage }: { stage: Stage }) {
  if (!stage.zones?.length) return null
  return (
    <ul className="zone-key" aria-label="Table key">
      {stage.zones.map((z) => (
        <li key={z.zone} className={zoneClass[z.zone]}>
          <span className="zone-swatch" aria-hidden="true" />
          {z.label}
        </li>
      ))}
    </ul>
  )
}
