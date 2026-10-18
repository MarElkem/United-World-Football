// The assistant's brief: per-competition text the data pipeline writes to
// data/digest.json. The assistant may only answer from it, so whatever the
// site does not hold, the assistant cannot claim. The chat server picks
// blocks the same way (worker/src/index.js), to keep the prompt small.

export interface Digest {
  generatedAt: string
  overview: string
  news: string
  competitions: Record<string, { name: string; shortName: string; teams: string[]; text: string }>
}

let digestPromise: Promise<Digest | null> | undefined

export function loadDigest(): Promise<Digest | null> {
  digestPromise ??= fetch('data/digest.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? (r.json() as Promise<Digest>) : null))
    .catch(() => null)
  return digestPromise
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Competition blocks a question is about: named outright, by a team, or what the fan has open. */
export function pickBlocks(d: Digest, question: string, openSlug?: string, max = 3): string[] {
  const q = norm(question)
  const scored = Object.entries(d.competitions).map(([slug, c]) => {
    let score = 0
    if (q.includes(norm(c.name)) || q.includes(norm(c.shortName))) score += 10
    for (const t of c.teams) if (t.length > 3 && q.includes(norm(t))) score += 3
    if (slug === openSlug) score += 2
    return { slug, score }
  })
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((s) => s.slug)
}

export function briefFrom(d: Digest, question: string, openSlug?: string) {
  const blocks = pickBlocks(d, question, openSlug).map((s) => d.competitions[s].text)
  const wantsNews = /news|headline|transfer|injur|manager|sack|sign/i.test(question)
  return [d.overview, ...blocks, wantsNews || !blocks.length ? d.news : ''].filter(Boolean).join('\n\n')
}
