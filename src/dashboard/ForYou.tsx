import { useId, useMemo, useRef, useState } from 'react'
import { countryName, followedMatches, followedNews, followKey, followOptions, leaguesIn, searchOptions, type Follow, type FollowOption } from '../data/follows'
import { team } from '../data/source'
import type { NewsArticle } from '../data/types'
import { Flag, TeamBadge } from './bits'
import { MatchList } from './Matches'
import { relativeTime } from './time'

const label = (f: Follow) => (f.kind === 'team' ? team(f.id).name : countryName(f.code))

function OptionBadge({ o }: { o: FollowOption }) {
  return o.team ? <TeamBadge team={o.team} size={20} /> : <Flag code={o.flag} />
}

/** A type-ahead box: type a club or a country, pick it with a click or Enter. */
function FollowSearch({ options, followed, onAdd }: { options: FollowOption[]; followed: Set<string>; onAdd: (f: Follow) => void }) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const uid = useId()
  const hits = useMemo(() => searchOptions(options, q, followed), [options, q, followed])
  const show = open && q.trim().length > 0

  const pick = (o?: FollowOption) => {
    if (!o) return
    onAdd(o.follow)
    setQ('')
    setActive(0)
    input.current?.focus()
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(hits.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      pick(hits[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="fy-search" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <label className="dd-label" htmlFor={`${uid}-in`}>Follow a club or country</label>
      <input
        ref={input}
        id={`${uid}-in`}
        className="fy-input"
        type="text"
        role="combobox"
        aria-expanded={show}
        aria-controls={`${uid}-list`}
        aria-autocomplete="list"
        aria-activedescendant={show && hits[active] ? `${uid}-${active}` : undefined}
        placeholder="Start typing: Arsenal, Brazil, Al Ahly…"
        autoComplete="off"
        spellCheck={false}
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
      />
      {show && (
        <ul className="fy-list" id={`${uid}-list`} role="listbox" aria-label="Matches">
          {hits.length ? (
            hits.map((o, i) => (
              <li
                key={o.key}
                id={`${uid}-${i}`}
                role="option"
                aria-selected={i === active}
                className="fy-opt"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => pick(o)}
                onPointerEnter={() => setActive(i)}
              >
                <span className="fy-opt-name">
                  <OptionBadge o={o} />
                  {o.label}
                </span>
                <span className="dd-hint">{o.hint}</span>
              </li>
            ))
          ) : (
            <li className="fy-none" role="presentation">No club or country by that name in the site&apos;s data.</li>
          )}
        </ul>
      )}
    </div>
  )
}

function Story({ a, why }: { a: NewsArticle; why: string }) {
  return (
    <li className="story">
      <p className="story-kicker">{why}</p>
      <h3 className="story-title" lang={a.lang}>
        <a href={a.url} target="_blank" rel="noopener noreferrer">{a.title}</a>
      </h3>
      <p className="story-meta">
        <span className="story-source">{a.source}</span>
        <time dateTime={a.publishedAt}>{relativeTime(a.publishedAt)}</time>
      </p>
    </li>
  )
}

const STARTERS = ['Arsenal', 'Real Madrid', 'Bayern', 'Flamengo', 'Brazil', 'Morocco', 'Japan']

/**
 * The viewer's own page: the clubs and countries they follow, with only
 * their fixtures, results and headlines.
 */
export function ForYou({ follows, setFollows, onOpenCompetition }: { follows: Follow[]; setFollows: (f: Follow[]) => void; onOpenCompetition: (slug: string) => void }) {
  const options = useMemo(() => followOptions(), [])
  const followed = useMemo(() => new Set(follows.map(followKey)), [follows])
  const { upcoming, results, compOf } = useMemo(() => followedMatches(follows), [follows])
  const news = useMemo(() => followedNews(follows), [follows])
  const add = (f: Follow) => !followed.has(followKey(f)) && setFollows([...follows, f])
  const remove = (f: Follow) => setFollows(follows.filter((x) => followKey(x) !== followKey(f)))
  const starters = STARTERS.map((n) => options.find((o) => o.label === n || o.team?.shortName === n)).filter((o): o is FollowOption => !!o && !followed.has(o.key))
  const countryFollows = follows.filter((f): f is Extract<Follow, { kind: 'country' }> => f.kind === 'country')

  return (
    <div className="foryou">
      <header className="fy-head">
        <div>
          <h1 className="comp-title">
            For you<span className="dot">.</span>
          </h1>
          <p className="comp-about">Pick the clubs and countries you care about. You get only their fixtures, results and news. Your picks stay in this browser.</p>
        </div>
        <FollowSearch options={options} followed={followed} onAdd={add} />
      </header>

      {follows.length > 0 && (
        <ul className="fy-chips" aria-label="You follow">
          {follows.map((f) => (
            <li key={followKey(f)} className="fy-chip">
              {f.kind === 'team' ? <TeamBadge team={team(f.id)} size={18} /> : <Flag code={f.code} />}
              <span>{label(f)}</span>
              <button className="fy-chip-x" onClick={() => remove(f)} aria-label={`Stop following ${label(f)}`}>×</button>
            </li>
          ))}
        </ul>
      )}

      {starters.length > 0 && (
        <div className="fy-starters">
          <span className="dd-label">{follows.length ? 'More to follow' : 'Try'}</span>
          {starters.map((o) => (
            <button key={o.key} className="fy-starter" onClick={() => add(o.follow)}>
              <OptionBadge o={o} /> {o.label}
            </button>
          ))}
        </div>
      )}

      {follows.length === 0 ? (
        <div className="empty">
          <p className="empty-title">Nothing followed yet</p>
          <div className="empty-body">
            <p>Type a club or a country above. A club brings its matches in every competition we have data for. A country brings its national team and news about its football.</p>
          </div>
        </div>
      ) : (
        <div className="fy-grid">
          <section className="fy-col" aria-labelledby="fy-fixtures">
            <h2 id="fy-fixtures" className="group-title">Fixtures</h2>
            <MatchList matches={upcoming} emptyTitle="No upcoming matches for your picks in the site's data." compLabel={(m) => compOf.get(m.id) ?? ''} pageDays={5} />
            <h2 className="group-title fy-gap">Results</h2>
            <MatchList matches={results} reverse emptyTitle="No results for your picks yet." compLabel={(m) => compOf.get(m.id) ?? ''} pageDays={3} />
            {countryFollows.map((f) => {
              const leagues = leaguesIn(f.code)
              return leagues.length ? (
                <p key={f.code} className="fy-leagues">
                  Leagues in {countryName(f.code)}:{' '}
                  {leagues.map((e, i) => (
                    <span key={e.slug}>
                      {i > 0 && ', '}
                      <button className="fy-link" onClick={() => onOpenCompetition(e.slug)}>{e.label}</button>
                    </span>
                  ))}
                </p>
              ) : null
            })}
          </section>
          <section className="fy-col fy-news" aria-labelledby="fy-news">
            <h2 id="fy-news" className="newscol-title">
              News<span className="dot">.</span>
            </h2>
            {news.length ? (
              <ol className="story-list">
                {news.slice(0, 30).map(({ a, f }) => (
                  <Story key={a.id} a={a} why={label(f)} />
                ))}
              </ol>
            ) : (
              <p className="muted">No headlines about your picks on this update. The feeds are checked every 30 minutes.</p>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
