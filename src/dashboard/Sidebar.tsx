import { useEffect, useState } from 'react'
import type { CatalogEntry } from '../data/catalog'
import { entryRegion, regionLabel, type Region } from '../data/places'
import { Flag } from './bits'
import { IconChevron, IconPanel } from './icons'

/** The competition index for the current section, grouped by continent. */
export function Sidebar({ entries, region, activeSlug, withData, onPick, collapsed, setCollapsed }: {
  entries: CatalogEntry[]
  region: Region
  activeSlug?: string
  withData: Set<string>
  onPick: (slug: string) => void
  collapsed: boolean
  setCollapsed: (v: boolean) => void
}) {
  const groups: { region: Region; items: CatalogEntry[] }[] = []
  for (const e of entries) {
    const r = entryRegion(e)
    let g = groups.find((x) => x.region === r)
    if (!g) groups.push((g = { region: r, items: [] }))
    g.items.push(e)
  }
  const active = entries.find((e) => e.slug === activeSlug)
  const activeKey = active ? String(entryRegion(active)) : ''
  const regionKey = String(region)
  const [open, setOpen] = useState<Set<string>>(() => new Set())

  // Open the group that holds the chosen region or competition.
  useEffect(() => {
    setOpen((prev) => (prev.has(regionKey) && (!activeKey || prev.has(activeKey)) ? prev : new Set([...prev, regionKey, ...(activeKey ? [activeKey] : [])])))
  }, [regionKey, activeKey])

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <aside className={`sidebar ${collapsed ? 'is-collapsed' : ''}`} aria-label="Competitions">
      <div className="sidebar-head">
        <h2 className="sidebar-title">Competitions</h2>
        <button className="icon-btn" onClick={() => setCollapsed(!collapsed)} aria-expanded={!collapsed} aria-label={collapsed ? 'Show the competition list' : 'Hide the competition list'}>
          <IconPanel />
        </button>
      </div>
      {!collapsed && (
        <div className="sidebar-body">
          {groups.map((g) => {
            const key = String(g.region)
            const isOpen = open.has(key)
            return (
              <section key={key} className="side-group">
                <button className="side-group-head" aria-expanded={isOpen} onClick={() => toggle(key)}>
                  <span>{g.region === null ? 'Other' : regionLabel(g.region)}</span>
                  <span className="side-count">{g.items.length}</span>
                  <IconChevron className="side-chev" />
                </button>
                {isOpen && (
                  <ul className="side-list">
                    {g.items.map((e) => (
                      <li key={e.slug}>
                        <button className="side-item" aria-current={e.slug === activeSlug ? 'true' : undefined} onClick={() => onPick(e.slug)}>
                          {e.flag ? <Flag code={e.flag} /> : <span className="flag-gap" aria-hidden="true" />}
                          <span className="side-name">{e.label}</span>
                          <span className={`side-state ${withData.has(e.slug) ? 'has-data' : ''}`} title={withData.has(e.slug) ? 'Has data' : 'Not connected yet'}>
                            {withData.has(e.slug) ? 'Data' : '—'}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      )}
    </aside>
  )
}
