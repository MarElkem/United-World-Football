import { useState } from 'react'
import type { PlaceNews } from '../data/places'
import { source } from '../data/source'
import type { NewsArticle, NewsType, Section } from '../data/types'
import { relativeTime } from './time'

const typeLabels: Record<NewsType, string> = {
  transfer: 'Transfers',
  match_report: 'Match report',
  tournament: 'Tournament',
  national_team: 'National team',
  club: 'Club',
  injury: 'Injury',
  manager: 'Manager',
}

type Filter = 'all' | NewsType
const filtersFor: Record<Section, Filter[]> = {
  nations: ['all', 'national_team', 'tournament', 'manager'],
  clubs: ['all', 'transfer', 'match_report', 'club', 'injury'],
  intercontinental: ['all', 'tournament', 'match_report'],
}

function Byline({ a }: { a: NewsArticle }) {
  return (
    <p className="story-meta">
      <span className="story-source">{a.source}</span>
      <time dateTime={a.publishedAt}>{relativeTime(a.publishedAt)}</time>
      {a.demo && <span className="story-demo">Demo</span>}
    </p>
  )
}

const link = (a: NewsArticle) => ({ href: a.url, target: '_blank', rel: 'noopener noreferrer' })

/**
 * News for the section and place. The newest story leads with a larger
 * headline and its standfirst; the rest run as a compact list.
 */
export function NewsColumn({ section, placeName, placeNews }: { section: Section; placeName: string; placeNews: PlaceNews }) {
  const [filter, setFilter] = useState<Filter>('all')
  const filters = filtersFor[section]
  const active = filters.includes(filter) ? filter : 'all'
  const stories = placeNews.items.filter((a) => active === 'all' || a.type === active)
  const [lead, ...rest] = stories

  return (
    <aside className="newscol" aria-labelledby="news-title">
      <header className="newscol-head">
        <h2 id="news-title" className="newscol-title">
          News<span className="dot">.</span>
        </h2>
        <p className="newscol-place">{placeNews.widenedTo ? `From ${placeNews.widenedTo}` : placeName}</p>
      </header>
      {placeNews.widenedTo && <p className="newscol-note">No stories about this country yet, so here is the rest of {placeNews.widenedTo}.</p>}
      <div className="text-tabs" role="group" aria-label="Filter news">
        {filters.map((f) => (
          <button key={f} className="text-tab" aria-pressed={active === f} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : typeLabels[f]}
          </button>
        ))}
      </div>

      {lead ? (
        <>
          <article className="lead-story">
            <p className="story-kicker">{typeLabels[lead.type]}</p>
            <h3 className="lead-title" lang={lead.lang}>
              <a {...link(lead)}>{lead.title}</a>
            </h3>
            <p className="lead-standfirst" lang={lead.lang}>{lead.summary}</p>
            <Byline a={lead} />
          </article>
          {rest.length > 0 && (
            <ol className="story-list">
              {rest.slice(0, 7).map((a) => (
                <li key={a.id} className="story">
                  <p className="story-kicker">{typeLabels[a.type]}</p>
                  <h3 className="story-title" lang={a.lang}>
                    <a {...link(a)}>{a.title}</a>
                  </h3>
                  <Byline a={a} />
                </li>
              ))}
            </ol>
          )}
        </>
      ) : (
        <p className="muted">{source.news().length ? 'No stories match.' : 'No headlines on this update. The news feeds are checked every time the data refreshes.'}</p>
      )}
      <p className="newscol-foot">Headlines and links from the publishers&apos; public RSS feeds. Stories open on their sites.</p>
    </aside>
  )
}
