// Turns the Vite build's index.html into an artifact page body (the host adds
// the doctype, html, head and body wrapper itself).
import { readFileSync, writeFileSync } from 'node:fs'

const html = readFileSync('dist/index.html', 'utf8')
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1]
const keep = head
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => /^<(title|meta name="(description|theme-color)"|link rel="icon"|link rel="stylesheet"|script type="module"|link rel="modulepreload")/.test(l))
writeFileSync('dist/page.html', [...keep, '<div id="root"></div>', ''].join('\n'))
console.log(keep.length, 'head lines kept')
