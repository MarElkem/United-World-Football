// Builds the site's data: fetches every connected source, normalises it and
// writes JSON to public/data, which the site reads at start-up and the chat
// server reads for its briefs. Run with `npm run data`.
//
// Sources, in order of preference for each competition:
//   1. football-data.org (free key in FOOTBALL_DATA_TOKEN; fresher, more cups)
//   2. openfootball (public domain, no key; can run a few weeks behind)
//   3. TheSportsDB (free test key; community-kept) for everything else
// A competition with no working source is left out, and the site shows it as
// "not connected" instead of guessing.

import { catalogEntries } from '../src/data/catalog.ts'
import { cups, extras, leagues, newsFeeds } from './config.mjs'
import { buildDigest } from './digest.mjs'
import { Teams } from './lib/teams.mjs'
import { readFile } from 'node:fs/promises'
import { writeJson } from './lib/util.mjs'
import * as fd from './sources/footballdata.mjs'
import { fetchNews } from './sources/news.mjs'
import * as of from './sources/openfootball.mjs'
import * as tsdb from './sources/thesportsdb.mjs'

const OUT = new URL('../public/data/', import.meta.url).pathname
const token = process.env.FOOTBALL_DATA_TOKEN?.trim()
const now = Date.now()
const teams = new Teams()
const report = []
const competitions = []
const tsdbQueue = []

async function attempt(source, slug, fn) {
  try {
    const c = await fn()
    const played = c.matches.filter((m) => m.score).length
    report.push({ source, competition: slug, ok: true, detail: `${c.matches.length} matches, ${played} with scores` })
    return c
  } catch (e) {
    report.push({ source, competition: slug, ok: false, detail: String(e.message ?? e).slice(0, 200) })
    return null
  }
}

for (const cfg of [...leagues, ...cups, ...extras]) {
  let c = null
  if (token && cfg.footballData) c = await attempt(fd.SOURCE, cfg.slug, () => fd.competition(cfg, teams, token, now))
  if (!c && cfg.openfootball) c = await attempt(of.SOURCE, cfg.slug, () => of.league(cfg, teams, now))
  if (!c && cfg.openfootballWorldCup) c = await attempt(of.SOURCE, cfg.slug, () => of.worldCup(cfg, teams, now))
  if (!c && cfg.tsdb) {
    tsdbQueue.push(cfg)
    continue
  }
  if (c) competitions.push(c)
}

// TheSportsDB's free key is rate-limited, so each run refreshes only the
// competitions with the oldest copies and serves the rest from a cache that
// GitHub Actions keeps between runs (.cache/, see the workflow).
const CACHE = new URL('../.cache/tsdb/', import.meta.url).pathname
const readCache = (slug) => readFile(`${CACHE}${slug}.json`, 'utf8').then(JSON.parse).catch(() => null)
const queue = await Promise.all(tsdbQueue.map(async (cfg) => ({ cfg, hit: await readCache(cfg.slug) })))
queue.sort((a, b) => (a.hit?.fetchedAt ?? '').localeCompare(b.hit?.fetchedAt ?? ''))
let budget = Number(process.env.TSDB_BUDGET ?? 8)
for (const { cfg, hit } of queue) {
  let c = null
  if (budget > 0 && !tsdb.isLimited()) {
    budget--
    c = await attempt(tsdb.SOURCE, cfg.slug, () => tsdb.competition(cfg, teams, now))
    if (c) await writeJson(`${CACHE}${cfg.slug}.json`, { fetchedAt: new Date(now).toISOString(), competition: c, teams: teams.usedBy([c]) })
  }
  if (!c && hit && now - new Date(hit.fetchedAt).getTime() < 2 * 86400000) {
    for (const [id, t] of Object.entries(hit.teams)) teams.add(id, t)
    c = hit.competition
    report.push({ source: `${tsdb.SOURCE} (saved copy)`, competition: cfg.slug, ok: true, detail: `fetched ${hit.fetchedAt.slice(0, 16)}` })
  }
  if (c) competitions.push(c)
}
if (!token) report.push({ source: fd.SOURCE, competition: '*', ok: false, detail: 'No FOOTBALL_DATA_TOKEN set, so this source was skipped.' })

const usedTeams = teams.usedBy(competitions)
const catalogue = catalogEntries().map(({ slug, label, section }) => ({ slug, label, section }))
const nations = Object.values(usedTeams)
  .filter((t) => t.kind === 'national' && t.country)
  .map((t) => ({ name: t.name, code: t.country.startsWith('gb-') ? 'gb' : t.country }))
  // A first name as often as a country.
  .filter((n) => !['Jordan', 'Georgia'].includes(n.name))
const { articles, report: newsReport } = await fetchNews(newsFeeds, {
  teams: Object.values(usedTeams).filter((t) => t.kind === 'club'),
  nations,
  catalogue,
})
report.push(...newsReport.map((r) => ({ ...r, competition: 'news' })))

const site = {
  generatedAt: new Date(now).toISOString(),
  teams: usedTeams,
  competitions,
  news: articles,
  sources: report,
}

await writeJson(`${OUT}site.json`, site)
for (const c of competitions) await writeJson(`${OUT}competitions/${c.slug}.json`, c)
await writeJson(`${OUT}news.json`, articles)
await writeJson(`${OUT}status.json`, { generatedAt: site.generatedAt, sources: report })
await writeJson(`${OUT}digest.json`, buildDigest({ competitions, teams: usedTeams, news: articles, catalogue, now }))

const ok = report.filter((r) => r.ok).length
console.log(`Wrote ${competitions.length} competitions, ${Object.keys(usedTeams).length} teams, ${articles.length} headlines to public/data.`)
for (const r of report) console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.source.padEnd(20)} ${r.competition.padEnd(22)} ${r.detail}`)
// On GitHub Actions, show the report on the run page as well as in the log.
if (process.env.GITHUB_ACTIONS) {
  const line = (r) => `${r.ok ? 'ok' : 'FAILED'}: ${r.source} ${r.competition === '*' ? '' : r.competition} (${r.detail.slice(0, 160)})`
  // Annotations are cut off when long, so a few lines each.
  for (let i = 0; i < report.length; i += 10) console.log(`::notice title=Data sources ${i / 10 + 1}::${report.slice(i, i + 10).map(line).join('%0A')}`)
}
if (!ok) {
  console.error('No source worked, so the site would have no data. Failing the build.')
  process.exit(1)
}
