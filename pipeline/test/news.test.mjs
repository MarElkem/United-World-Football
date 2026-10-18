import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseFeed, toArticles } from '../sources/news.mjs'

// Shape-only fixture for the parser; not real headlines and never shipped.
const RSS = `<?xml version="1.0"?><rss><channel><title>Feed</title>
<item><title><![CDATA[Arsenal sign a midfielder on loan]]></title><link>https://example.com/a</link>
<description><![CDATA[<p>Club &amp; player agree terms.</p>]]></description><pubDate>Sat, 17 Oct 2026 10:00:00 GMT</pubDate></item>
<item><title>Nice v Lens: match report</title><link>https://example.com/b</link><description>A nice evening.</description><pubDate>Sat, 17 Oct 2026 12:00:00 GMT</pubDate></item>
<item><title>No link here</title></item>
</channel></rss>`

test('parses RSS items and drops ones without a link', () => {
  const items = parseFeed(RSS)
  assert.equal(items.length, 2)
  assert.equal(items[0].title, 'Arsenal sign a midfielder on loan')
  assert.equal(items[0].summary, 'Club & player agree terms.')
  assert.equal(items[1].url, 'https://example.com/b')
})

test('tags teams by their capitalised names and sorts out the type', () => {
  const teams = [
    { id: 'gb-eng-arsenal', name: 'Arsenal' },
    { id: 'fr-nice', name: 'Nice' },
    { id: 'fr-lens', name: 'Lens' },
  ]
  const [a, b] = toArticles('Test', parseFeed(RSS), { teams, catalogue: [] })
  assert.equal(a.type, 'transfer')
  assert.deepEqual(a.tags.map((t) => t.id), ['gb-eng-arsenal'])
  assert.equal(b.type, 'match_report')
  // "Nice" the club, once; the lower-case "nice evening" does not count again.
  assert.deepEqual(b.tags.map((t) => t.id).sort(), ['fr-lens', 'fr-nice'])
  assert.equal(a.publishedAt, '2026-10-17T10:00:00.000Z')
})
