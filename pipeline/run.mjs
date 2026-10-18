// Builds the site's data: fetches every connected source, normalises it and
// writes JSON to public/data, which the site reads at start-up and the chat
// server reads for its briefs. Run with `npm run data`.
//
// Sources, in order of preference for each competition:
//   1. football-data.org (free key in FOOTBALL_DATA_TOKEN; fresher, more cups)
//   2. openfootball (public domain, no key; can run a few weeks behind)
// A competition with no working source is left out, and the site shows it as
// "not connected" instead of guessing.

import { catalogEntries } from '../src/data/catalog.ts'
import { cups, leagues, newsFeeds } from './config.mjs'
import { buildDigest } from './digest.mjs'
import { Teams } from './lib/teams.mjs'
import { writeJson } from './lib/util.mjs'
import * as fd from './sources/footballdata.mjs'
import { fetchNews } from './sources/news.mjs'
import * as of from './sources/openfootball.mjs'

const OUT = new URL('../public/data/', import.meta.url).pathname
const token = process.env.FOOTBALL_DATA_TOKEN?.trim()
const now = Date.now()
const teams = new Teams()
const report = []
const competitions = []

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

for (const cfg of [...leagues, ...cups]) {
  let c = null
  if (token && cfg.footballData) c = await attempt(fd.SOURCE, cfg.slug, () => fd.competition(cfg, teams, token, now))
  if (!c && cfg.openfootball) c = await attempt(of.SOURCE, cfg.slug, () => of.league(cfg, teams, now))
  if (!c && cfg.openfootballWorldCup) c = await attempt(of.SOURCE, cfg.slug, () => of.worldCup(cfg, teams, now))
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
if (!ok) {
  console.error('No source worked, so the site would have no data. Failing the build.')
  process.exit(1)
}
