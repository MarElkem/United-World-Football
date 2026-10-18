// Headlines from public RSS feeds. We keep only the headline, a short summary
// and the link back to the publisher; the full story stays on their site.

import { fetchText } from '../lib/util.mjs'

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
function decode(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => {
      if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1)))
      return ENTITIES[e.toLowerCase()] ?? m
    })
}

const strip = (s) => decode(decode(s).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()

function tag(xml, name) {
  const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i').exec(xml)
  return m ? m[1] : ''
}

/** Parses RSS 2.0 items (and Atom entries) into plain objects. */
export function parseFeed(xml) {
  const items = [...xml.matchAll(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi)].map((m) => m[0])
  return items
    .map((it) => {
      const atomLink = /<link[^>]*href="([^"]+)"/i.exec(it)?.[1]
      return {
        title: strip(tag(it, 'title')),
        url: decode(tag(it, 'link')).trim() || atomLink || '',
        summary: strip(tag(it, 'description') || tag(it, 'summary')).slice(0, 280),
        publishedAt: tag(it, 'pubDate') || tag(it, 'published') || tag(it, 'updated') || tag(it, 'dc:date'),
      }
    })
    .filter((x) => x.title && /^https?:\/\//.test(x.url))
}

const has = (text, words, flags = 'i') => words.some((w) => new RegExp(`(^|[^\\p{L}])${w}($|[^\\p{L}])`, flags + 'u').test(text))
// Names are matched with their capitals, so the club Nice is not "nice".
const names = (text, word) => has(text, [escape(word)], '')

const COMPETITION_WORDS = [
  ['premier-league', ['Premier League']],
  ['championship', ['Championship']],
  ['la-liga', ['La Liga', 'LaLiga']],
  ['bundesliga', ['Bundesliga']],
  ['serie-a', ['Serie A']],
  ['ligue-1', ['Ligue 1']],
  ['eredivisie', ['Eredivisie']],
  ['primeira-liga', ['Primeira Liga']],
  ['brasileirao-serie-a', ['Brasileirão', 'Brasileirao']],
  ['champions-league', ['Champions League']],
  ['europa-league', ['Europa League']],
  ['conference-league', ['Conference League']],
  ['copa-libertadores', ['Libertadores']],
  ['mls', ['MLS']],
  ['saudi-pro-league', ['Saudi Pro League']],
]

/**
 * Turns feed items into site articles, tagging competitions, teams and
 * countries by the names they mention. Nothing here is rewritten.
 */
export function toArticles(feedName, items, { teams = [], nations = [], catalogue = [] } = {}, feed = {}) {
  const sectionOf = Object.fromEntries(catalogue.map((e) => [e.slug, e.section]))
  return items.map((it) => {
    const text = `${it.title} ${it.summary}`
    const tags = [...(feed.tags ?? [])]
    for (const [slug, words] of COMPETITION_WORDS) if (has(text, words)) tags.push({ kind: 'competition', id: slug, label: words[0] })
    for (const t of teams) if (t.name.length > 3 && names(text, t.name)) tags.push({ kind: 'team', id: t.id, label: t.name })
    for (const n of nations) if (names(text, n.name)) tags.push({ kind: 'country', id: n.code, label: n.name })

    const sections = new Set()
    for (const t of tags) if (t.kind === 'competition' && sectionOf[t.id]) sections.add(sectionOf[t.id])
    if (has(text, ['World Cup', 'international', 'national team', 'qualifier', 'qualifiers', 'Nations League', 'friendly', 'Afcon', 'Copa América', 'Euro 2028'])) sections.add('nations')
    if (tags.some((t) => t.kind === 'team')) sections.add('clubs')
    if (!sections.size) sections.add('clubs')

    const type = has(text, ['transfer', 'signs', 'signing', 'joins', 'loan', 'bid', 'fee'])
      ? 'transfer'
      : has(text, ['injury', 'injured', 'ruled out', 'hamstring', 'knee'])
        ? 'injury'
        : has(text, ['manager', 'head coach', 'sacked', 'appointed', 'appoints'])
          ? 'manager'
          : /\b\d+-\d+\b| v | vs /.test(it.title)
            ? 'match_report'
            : sections.has('nations')
              ? 'national_team'
              : 'club'

    const date = new Date(it.publishedAt)
    return {
      id: `${feedName}-${hash(it.url)}`,
      title: it.title,
      summary: it.summary,
      url: it.url,
      source: feedName,
      publishedAt: isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString(),
      type,
      sections: [...sections],
      tags: dedupe(tags),
      lang: feed.lang,
      demo: false,
    }
  })
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const dedupe = (tags) => [...new Map(tags.map((t) => [`${t.kind}:${t.id}`, t])).values()]
function hash(s) {
  let h = 0
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h.toString(36)
}

const PER_FEED = 25

/** Fetches every feed; a feed that fails is reported, not fatal. */
export async function fetchNews(feeds, context) {
  const report = []
  const all = []
  for (const f of feeds) {
    try {
      const xml = await fetchText(f.url, { headers: { 'User-Agent': 'UnitedWorldFootball/1.0 (non-commercial; RSS reader)', Accept: 'application/rss+xml, application/xml, text/xml' } })
      const items = parseFeed(xml).slice(0, PER_FEED)
      all.push(...toArticles(f.name, items, context, f))
      // An empty result says what came back instead, so a moved feed is easy to fix.
      const detail = items.length ? `${items.length} headlines` : `0 headlines; response began: ${xml.slice(0, 120).replace(/\s+/g, ' ')}`
      report.push({ source: f.name, ok: items.length > 0, detail })
    } catch (e) {
      report.push({ source: f.name, ok: false, detail: String(e.message ?? e) })
    }
  }
  // Same story from two outlets: keep the first, note the other.
  const seen = new Map()
  for (const a of all.sort((x, y) => y.publishedAt.localeCompare(x.publishedAt))) {
    const key = a.title.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '').split(' ').slice(0, 7).join(' ')
    const prev = seen.get(key)
    if (prev) prev.alsoReportedBy = [...new Set([...(prev.alsoReportedBy ?? []), a.source])]
    else seen.set(key, a)
  }
  return { articles: [...seen.values()].slice(0, 200), report }
}
