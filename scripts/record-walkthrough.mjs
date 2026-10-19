// Records a short walkthrough of the live site for sharing (GIF and MP4).
// Run by .github/workflows/walkthrough.yml; needs playwright and ffmpeg.
import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, renameSync } from 'node:fs'

const SITE = process.env.SITE_URL ?? 'https://marelkem.github.io/United-World-Football/'
const OUT = 'walkthrough'
mkdirSync(`${OUT}/raw`, { recursive: true })

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const context = await browser.newContext({ viewport: { width: 1280, height: 760 }, recordVideo: { dir: `${OUT}/raw`, size: { width: 1280, height: 760 } } })
// A visible pointer, since recordings leave the real one out.
await context.addInitScript(() => {
  addEventListener('DOMContentLoaded', () => {
    const dot = document.createElement('div')
    dot.style.cssText = 'position:fixed;z-index:99999;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:#d1281ccc;border:2px solid #fff;box-shadow:0 1px 6px #0006;pointer-events:none;left:-40px;top:-40px;transition:transform .1s'
    document.body.appendChild(dot)
    addEventListener('mousemove', (e) => { dot.style.left = `${e.clientX}px`; dot.style.top = `${e.clientY}px` }, true)
    addEventListener('mousedown', () => (dot.style.transform = 'scale(.7)'), true)
    addEventListener('mouseup', () => (dot.style.transform = ''), true)
  })
})
const page = await context.newPage()
const pause = (ms) => page.waitForTimeout(ms)
async function moveTo(locator, click = true) {
  const box = await locator.boundingBox()
  if (!box) return
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 18 })
  if (click) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

await page.goto(SITE, { waitUntil: 'networkidle' })
// The opening sequence, then the page.
await page.waitForSelector('.hero-globe', { timeout: 30000 })
await pause(9500)

// Turn the football Earth.
const globe = page.locator('.hero-globe')
const g = await globe.boundingBox()
if (g) {
  await page.mouse.move(g.x + g.width * 0.7, g.y + g.height * 0.5, { steps: 10 })
  await page.mouse.down()
  await page.mouse.move(g.x + g.width * 0.3, g.y + g.height * 0.45, { steps: 40 })
  await page.mouse.up()
  await pause(800)
}
// Jump to Africa, then open Clubs.
await moveTo(page.locator('.hero-regions .hero-link', { hasText: 'Africa' }).first())
await pause(1800)
await moveTo(page.locator('.section-tab', { hasText: 'Clubs' }))
await pause(1500)
await moveTo(page.locator('.hero-comps .hero-link').first())
await pause(1200)
await page.locator('#matches').scrollIntoViewIfNeeded()
await page.evaluate(() => document.getElementById('matches')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
await pause(2600)
await page.mouse.wheel(0, 500)
await pause(1600)

// Ask the assistant.
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
await pause(1000)
await moveTo(page.locator('.ask-btn'))
await pause(600)
await page.locator('#chat-input').click()
await page.keyboard.type('Who is top of the Bundesliga?', { delay: 70 })
await page.keyboard.press('Enter')
await pause(2800)
await moveTo(page.locator('.chat-close'))
await pause(500)

// For you: follow a club and a country.
await moveTo(page.locator('.section-tab', { hasText: 'For you' }))
await pause(1000)
await page.locator('.fy-input').click()
await page.keyboard.type('Arsenal', { delay: 110 })
await pause(700)
await page.keyboard.press('Enter')
await pause(600)
await page.keyboard.type('Moro', { delay: 120 })
await pause(700)
await page.keyboard.press('Enter')
await pause(1500)
await page.mouse.wheel(0, 450)
await pause(2200)

// Dark mode.
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
await pause(800)
const theme = page.locator('.dateline-tools .tool').first()
await moveTo(theme)
await pause(400)
await moveTo(theme)
await pause(2200)

await context.close()
await browser.close()

const video = readdirSync(`${OUT}/raw`).find((f) => f.endsWith('.webm'))
renameSync(`${OUT}/raw/${video}`, `${OUT}/walkthrough.webm`)
const ff = (...a) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...a], { stdio: 'inherit' })
ff('-ss', '0.8', '-i', `${OUT}/walkthrough.webm`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', `${OUT}/walkthrough.mp4`)
ff('-ss', '0.8', '-i', `${OUT}/walkthrough.webm`, '-vf', 'fps=12,scale=900:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=160:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle', `${OUT}/walkthrough.gif`)
console.log(readdirSync(OUT))
