import type { CatalogEntry } from '../data/catalog'
import type { Competition } from '../data/types'
import { Bracket } from './Bracket'
import { EmptyState, Flag, SourceStamp } from './bits'
import { MatchList } from './Matches'
import { StandingsTable, ZoneKey } from './Standings'
import { localZoneName } from './time'

export type Tab = 'standings' | 'fixtures' | 'results' | 'bracket'

const statusLabel = { active: 'In progress', upcoming: 'Upcoming', qualifying: 'Qualifying', completed: 'Completed' }

function Header({ entry, comp }: { entry: CatalogEntry; comp?: Competition }) {
  return (
    <header className="comp-head">
      <p className="crumbs">
        {entry.groupNote && <span className="crumb-conf">{entry.groupNote}</span>}
        {entry.flag && <Flag code={entry.flag} />}
        <span>{entry.groupLabel}</span>
      </p>
      <h2 className="comp-title">
        {comp?.name ?? entry.label}
        <span className="dot">.</span>
      </h2>
      <p className="comp-meta">
        {comp ? (
          <>
            <span>{/season/i.test(comp.season) ? comp.season : `Season ${comp.season}`}</span>
            <span>{statusLabel[comp.status]}</span>
            <SourceStamp stamp={comp.stamp} />
          </>
        ) : (
          <span>No data yet</span>
        )}
      </p>
      {comp?.about && <p className="comp-about">{comp.about}</p>}
    </header>
  )
}

export function CompetitionView({ entry, comp, tab, onTab, suggestions }: {
  entry: CatalogEntry
  comp?: Competition
  tab: Tab | null
  onTab: (t: Tab) => void
  suggestions: { slug: string; label: string }[]
}) {
  if (!comp || !comp.connected) {
    return (
      <article className="comp">
        <Header entry={entry} />
        <EmptyState title="No data source connected yet">
          <p>
            {entry.label} is on our list, but no free source for it is connected yet, so we show nothing rather than guess.
          </p>
        </EmptyState>
        {suggestions.length > 0 && <p className="muted try">Data is ready for {suggestions.map((s) => s.label).join(', ')}.</p>}
      </article>
    )
  }

  const stage = comp.stages.find((s) => s.groups?.length)
  const koStage = comp.stages.find((s) => s.format === 'knockout' && s.rounds?.length)
  const tabs: { id: Tab; label: string }[] = [
    ...(stage ? [{ id: 'standings' as Tab, label: stage.format === 'groups' ? 'Groups' : 'Table' }] : []),
    ...(koStage ? [{ id: 'bracket' as Tab, label: 'Bracket' }] : []),
    { id: 'fixtures', label: 'Fixtures' },
    { id: 'results', label: 'Results' },
  ]
  const active: Tab = tab && tabs.some((t) => t.id === tab) ? tab : tabs[0].id

  const now = Date.now()
  const upcoming = comp.matches.filter(
    (m) =>
      ['scheduled', 'live', 'half_time', 'postponed', 'suspended'].includes(m.status) &&
      (new Date(m.kickoff).getTime() > now - 3 * 3600000 || m.status === 'postponed'),
  )
  const results = comp.matches.filter((m) => ['finished', 'after_extra_time', 'penalties', 'abandoned', 'cancelled', 'awarded'].includes(m.status))

  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]
    onTab(next.id)
    requestAnimationFrame(() => document.getElementById(`tab-${next.id}`)?.focus())
  }

  return (
    <article className="comp">
      <Header entry={entry} comp={comp} />
      <div className="tabs comp-tabs" role="tablist" aria-label="Competition views">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            role="tab"
            aria-selected={active === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={active === t.id ? 0 : -1}
            className="tab"
            onClick={() => onTab(t.id)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <section id={`panel-${active}`} role="tabpanel" aria-labelledby={`tab-${active}`} className="panel">
        {active === 'standings' && stage && (
          <>
            <div className={stage.groups && stage.groups.length > 1 ? 'group-grid' : ''}>
              {stage.groups?.map((g) => (
                <div key={g.id} className="group-block">
                  {stage.groups!.length > 1 && <h3 className="group-title">{g.name}</h3>}
                  <StandingsTable group={g} compact={stage.groups!.length > 1} />
                </div>
              ))}
            </div>
            <ZoneKey stage={stage} />
          </>
        )}
        {active === 'bracket' && koStage && <Bracket stage={koStage} comp={comp} />}
        {active === 'fixtures' && (
          <>
            <p className="tz-note">Times in {localZoneName}. Hover a date for the venue's local time.</p>
            <MatchList matches={upcoming} emptyTitle={comp.status === 'completed' ? 'This competition has finished.' : 'No upcoming fixtures in our data.'} />
          </>
        )}
        {active === 'results' && <MatchList matches={results} reverse emptyTitle="No results yet." />}
      </section>
    </article>
  )
}
