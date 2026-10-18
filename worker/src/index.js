// United World Football chat server (Cloudflare Worker, free plan).
//
// POST { messages: [{ role, content }], looking?: string, openSlug?: string }
//   -> { text }
// The model only sees the site's own data (data/digest.json from SITE_URL),
// trimmed to the competitions the question is about. No API key is needed:
// Workers AI is bound to the worker, and nothing secret reaches the browser.
// When the free daily allowance runs out, it answers 429 and the site falls
// back to its built-in answers.

const RULES = `You are the assistant on United World Football, a football website. Fans ask about competitions, tables, fixtures, results, who is qualifying, and football news.

Rules:
1. Answer ONLY from the SITE DATA below. Never invent or guess scores, fixtures, dates, standings, transfers, injuries or news. If the data does not cover the question, say plainly that the site does not have that, and suggest searching the web.
2. Each competition says where its data comes from and how up to date it is. If results stop at a date, say so when it matters.
3. You may explain how football works in general (rules, formats, what a play-off or aggregate is), but nothing about real current events beyond the data.
4. "This", "here" or "they" usually means what the fan is looking at; see WHAT THE FAN IS LOOKING AT.
5. For "who is qualifying" questions, use table positions and the zone labels in square brackets.
6. Keep answers short: two to six sentences or a short list. Plain text only, no tables, no headings, no markdown.
7. Reply in the language the fan writes in.`

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Same selection as the site (src/assistant/digest.ts).
function briefFrom(d, question, openSlug) {
  const q = norm(question)
  const picked = Object.entries(d.competitions)
    .map(([slug, c]) => {
      let score = 0
      if (q.includes(norm(c.name)) || q.includes(norm(c.shortName))) score += 10
      for (const t of c.teams) if (t.length > 3 && q.includes(norm(t))) score += 3
      if (slug === openSlug) score += 2
      return { slug, score }
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((s) => d.competitions[s.slug].text)
  const wantsNews = /news|headline|transfer|injur|manager|sack|sign/i.test(question)
  return [d.overview, ...picked, wantsNews || !picked.length ? d.news : ''].filter(Boolean).join('\n\n')
}

async function digest(env, ctx) {
  const url = new URL('data/digest.json', env.SITE_URL).toString()
  const cache = caches.default
  const hit = await cache.match(url)
  if (hit) return hit.json()
  const res = await fetch(url, { cf: { cacheTtl: 600 } })
  if (!res.ok) throw new Error(`digest ${res.status}`)
  const copy = new Response(res.body, res)
  copy.headers.set('Cache-Control', 'max-age=600')
  ctx.waitUntil(cache.put(url, copy.clone()))
  return copy.json()
}

const json = (body, status, cors) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors } })

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') ?? ''
    const allowed = !env.ALLOWED_ORIGIN || origin === env.ALLOWED_ORIGIN
    const cors = {
      'Access-Control-Allow-Origin': allowed ? origin || '*' : 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    }
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405, cors)
    if (!allowed) return json({ error: 'origin not allowed' }, 403, cors)

    let body
    try {
      body = await request.json()
    } catch {
      return json({ error: 'bad json' }, 400, cors)
    }
    const messages = (Array.isArray(body.messages) ? body.messages : [])
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 600) }))
    const question = messages.at(-1)
    if (!question || question.role !== 'user') return json({ error: 'no question' }, 400, cors)

    try {
      const d = await digest(env, ctx)
      const system = `${RULES}\n\nWHAT THE FAN IS LOOKING AT: ${String(body.looking ?? '').slice(0, 300)}\n\nSITE DATA:\n${briefFrom(d, question.content, body.openSlug)}`
      const out = await env.AI.run(env.MODEL || '@cf/meta/llama-3.2-3b-instruct', {
        messages: [{ role: 'system', content: system }, ...messages],
        max_tokens: 400,
        temperature: 0.2,
      })
      const text = (out?.response ?? '').trim()
      return text ? json({ text }, 200, cors) : json({ error: 'empty answer' }, 502, cors)
    } catch (e) {
      // Over the free daily allowance, or the model is busy: let the site fall back.
      const msg = String(e?.message ?? e)
      return json({ error: msg.slice(0, 200) }, /limit|quota|429|capacity/i.test(msg) ? 429 : 502, cors)
    }
  },
}
