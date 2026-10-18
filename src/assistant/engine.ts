// Where the assistant's answers come from, cheapest and most reliable first:
//
// 1. Our chat server, when the site is built with VITE_ASK_URL: a Cloudflare
//    Worker on the free Workers AI plan (worker/). The model only sees the
//    site's own data, and no key ever reaches the browser.
// 2. Inside the Claude app preview: the viewer's own Claude (`sample`).
// 3. Always available: built-in lookups in the site's data (local.ts), so the
//    chat still answers the common questions for free with no AI at all.
//
// Every answer also offers a web search link for anything beyond our data.

import { briefFrom, loadDigest } from './digest'
import { answerLocally, FALLBACK } from './local'

export interface Turn {
  role: 'user' | 'assistant'
  content: string
}

export interface AskError {
  code: string
  text?: string
}

type Sample = (
  input: Turn[],
  opts: { onText?: (u: { text: string }) => void; signal?: AbortSignal; modelTier?: 'quick' | 'default'; cache?: boolean },
) => Promise<{ text: string; truncated: boolean }>

interface ClaudeRuntime {
  use(name: 'sample'): Promise<Sample | null>
}

const ASK_URL = (import.meta.env.VITE_ASK_URL as string | undefined)?.trim() || ''

let samplePromise: Promise<Sample | null> | undefined
function claudeSample(): Promise<Sample | null> {
  if (!samplePromise) {
    const rt = (window as unknown as { claude?: ClaudeRuntime }).claude
    samplePromise = rt?.use ? rt.use('sample').catch(() => null) : Promise.resolve(null)
  }
  return samplePromise
}

export const RULES = `You are the assistant on United World Football, a football website. Fans ask you about competitions, tables, fixtures, results, who is qualifying, and football news.

Rules:
1. Answer ONLY from the SITE DATA below. Never invent or guess scores, fixtures, dates, standings, transfers, injuries or news. If the data does not cover the question, say plainly that the site does not have that, and suggest searching the web.
2. Each competition says where its data comes from and how up to date it is. If results stop at a date, say so when it matters.
3. You may explain how football works in general (rules, formats, what a play-off or aggregate is) without the data, but nothing about real current events beyond the data.
4. "This", "here" or "they" usually means what the fan is looking at; see WHAT THE FAN IS LOOKING AT.
5. For "who is qualifying" questions, use table positions and the zone labels in square brackets.
6. Keep answers short: two to six sentences or a short list. Plain text only, no tables, no headings, no markdown symbols.
7. Reply in the language the fan writes in.`

export interface Answer {
  text: string
  via: 'server' | 'claude' | 'site'
}

export function webSearchUrl(question: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(`${question} football`)}`
}

async function viaServer(history: Turn[], looking: string, openSlug: string | undefined, signal: AbortSignal) {
  const res = await fetch(ASK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: history.slice(-8), looking, openSlug }),
    signal,
  })
  if (!res.ok) throw { code: res.status === 429 ? 'rate_limited' : 'server' } satisfies AskError
  const { text } = (await res.json()) as { text?: string }
  if (!text) throw { code: 'server' } satisfies AskError
  return text
}

async function viaClaude(sample: Sample, history: Turn[], looking: string, openSlug: string | undefined, onText: (t: string) => void, signal: AbortSignal) {
  const digest = await loadDigest()
  if (!digest) throw { code: 'no_data' } satisfies AskError
  const question = history[history.length - 1].content
  const brief = `${RULES}\n\nWHAT THE FAN IS LOOKING AT: ${looking}\n\nSITE DATA:\n${briefFrom(digest, question, openSlug)}`
  const recent = history.slice(-10)
  while (recent.length && recent[0].role !== 'user') recent.shift()
  const { text } = await sample([{ role: 'user', content: brief }, ...recent], {
    modelTier: 'quick',
    cache: false,
    signal,
    onText: ({ text }) => onText(text),
  })
  return text
}

/**
 * Ask a question. `history` holds earlier turns (oldest first) and ends with
 * the fan's new message. `looking` describes the page's current selection.
 */
export async function ask(
  history: Turn[],
  looking: string,
  openSlug: string | undefined,
  onText: (text: string) => void,
  signal: AbortSignal,
): Promise<Answer> {
  const question = history[history.length - 1].content
  const local = answerLocally(question, openSlug)
  try {
    if (ASK_URL) return { text: await viaServer(history, looking, openSlug, signal), via: 'server' }
    const sample = await claudeSample()
    if (sample) return { text: await viaClaude(sample, history, looking, openSlug, onText, signal), via: 'claude' }
  } catch (e) {
    if ((e as AskError).code === 'cancelled' || signal.aborted) throw { code: 'cancelled' } satisfies AskError
    // Fall through to the built-in answers below.
  }
  return { text: local ?? FALLBACK, via: 'site' }
}
