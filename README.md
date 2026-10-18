# United World Football

Everything, Everywhere Football. A free, non-commercial football site: national teams,
club leagues and intercontinental competitions around a rotating football Earth, with
tables, fixtures, results, brackets, headlines and a free "Ask" chat.

The site is static (Vite + React + three.js) and is published on GitHub Pages. A data
pipeline runs on GitHub Actions every 30 minutes, fetches free sources, writes JSON
files and redeploys. There is no server to pay for and no key in the browser.

## Data sources

| Source | What | Key | Status |
| --- | --- | --- | --- |
| [openfootball](https://github.com/openfootball) (public domain) | Premier League, Championship, LaLiga, Bundesliga, Serie A, Ligue 1, Eredivisie, Primeira Liga, Brasileirão, World Cup 2026 | none | Verified. Volunteer-kept, so results can be a few weeks behind; each competition shows its last result date. |
| [football-data.org](https://www.football-data.org) free plan | The same leagues, fresher, plus Champions League and Libertadores | free, `FOOTBALL_DATA_TOKEN` secret | Used when the secret is set. Each run's report (`data/status.json`) says if it worked. |
| [TheSportsDB](https://www.thesportsdb.com) free API | Leagues and cups nobody else covers for free: MLS, Liga MX, Saudi Pro League, J1, K League, A-League, Argentina, Egypt, South Africa, Morocco, Nigeria, second divisions, FA Cup, Europa and Conference League, Sudamericana, CAF and AFC club cups, Nations League, friendlies | public test key (or `THESPORTSDB_KEY` secret) | Community-kept; a table is only shown when it looks complete, otherwise fixtures and results only. |
| Official RSS feeds: BBC Sport (and its Africa page), The Guardian, Sky Sports, Marca, Kicker, RMC Sport, ge (Globo) | Headlines with links back to the publisher, in their own language | none | Fetched each run; a feed that fails is skipped and reported. |

Rules the pipeline follows: never invent scores, fixtures, tables or news; a competition
with no working source shows "no data source connected yet"; every competition carries
its source and how fresh it is. League tables are worked out from results (points, goal
difference, goals scored) and say that official tiebreakers can differ.

## Run it locally

Needs Node 22.18 or newer.

    npm install
    npm run data       # fetch sources into public/data (add FOOTBALL_DATA_TOKEN=... to use football-data.org)
    npm run dev        # http://localhost:5173
    npm test           # pipeline tests
    npm run build      # static site in dist/

## Launch (free)

1. Push this folder to a public GitHub repository, branch `main`.
2. In the repository: Settings > Pages > Build and deployment > Source: **GitHub Actions**.
3. The "Build and deploy" workflow runs on the push and then every 30 minutes. The site
   appears at `https://<your-name>.github.io/<repo>/`.
4. Optional, for fresher scores and the Champions League and Libertadores: register at
   https://www.football-data.org/client/register (free), then add the key under
   Settings > Secrets and variables > Actions > New repository secret, named
   `FOOTBALL_DATA_TOKEN`.

GitHub pauses scheduled workflows in a repository with no activity for 60 days; any
commit, or running the workflow by hand from the Actions tab, starts them again.

## The Ask chat (free)

It answers in three ways, cheapest first, and every answer has a "Search the web for
this" link to Google for anything beyond the site's data:

1. **Built-in answers** (`src/assistant/local.ts`): lookups in the site's own data for
   the common questions (who is top, who is going down or through, next match, latest
   result, who won, headlines). No AI, no server, always free.
2. **Free AI** (optional, `worker/`): a Cloudflare Worker on the Workers AI free plan
   (10,000 neurons a day; with the small default model and short briefs that should
   cover hundreds of questions a day, more or less depending on the model). It reads `data/digest.json` from the site and only answers from it.
   To turn it on:
   - Create a free Cloudflare account, then in `worker/wrangler.toml` set `SITE_URL` and
     `ALLOWED_ORIGIN` to your Pages address.
   - Deploy: `cd worker && npx wrangler deploy` (or add `CLOUDFLARE_API_TOKEN` and
     `CLOUDFLARE_ACCOUNT_ID` secrets and the "Deploy chat server" workflow does it).
   - Add the worker's URL as a repository variable named `ASK_URL`
     (Settings > Secrets and variables > Actions > Variables). The next build uses it.
   If the free allowance runs out for the day, the chat falls back to the built-in answers.
3. Inside the Claude app preview only, it uses the viewer's own Claude.

## Where things are

- `pipeline/` the data pipeline. `run.mjs` runs every source and writes `public/data/`:
  `site.json` (everything the site loads), `competitions/<slug>.json`, `news.json`,
  `digest.json` (the chat's briefs) and `status.json` (what worked on this run).
  `config.mjs` lists competitions and feeds; `sources/` holds one adapter per source;
  `lib/` computes tables and knockout ties.
- `src/data/source.ts` loads `data/site.json` once at start-up; every component reads
  football data through it. `src/data/catalog.ts` is the sidebar's list of competitions.
- `src/globe/` the football Earth (panels, Natural Earth continents, ink shader, poster
  fallback). `src/intro/` the opening sequence.
- `src/dashboard/` the masthead, hero, score strip, sidebar, competition views (tables,
  groups, bracket, fixtures, results), news column and feature banner.
- `src/assistant/` the Ask chat. `src/walkthrough/` the website walkthrough.
- `worker/` the optional free chat server. `.github/workflows/` build, deploy and refresh.

## Notes

- Type: EA Sports (supplied, used non-commercially) for headlines, limited with
  `unicode-range` because it only draws letters, digits, `!` and `.`; Source Serif 4 and
  IBM Plex Sans Condensed (SIL Open Font Licence) for reading and numbers.
- Club crests are not used (trademarks); clubs get initials badges, nations get flags
  (flag-icons, MIT). Map data: Natural Earth (public domain).
- Not affiliated with any league, club or federation.
