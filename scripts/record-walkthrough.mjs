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
const steps = []
// Each step is reported, and a step that fails is skipped rather than ending
// the recording.
async function step(name, fn) {
  try {
    await fn()
    steps.push(`ok ${name}`)
  } catch (e) {
    steps.push(`FAILED ${name}: ${String(e.message).split('\n')[0]}`)
  }
}
process.on('uncaughtException', (e) => {
  console.log(`::error title=Recording::${String(e.stack).replace(/\n/g, '%0A')}`)
  process.exit(1)
})
async function moveTo(locator, click = true) {
  const box = await locator.boundingBox({ timeout: 5000 })
  if (!box) throw new Error('not on screen')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 18 })
  if (click) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

// The short opening, as a returning visitor sees it.
await context.addInitScript(() => localStorage.setItem('uwf:introSeen', 'true'))
await page.goto(SITE, { waitUntil: 'load', timeout: 60000 })
await step('page', () => page.waitForSelector('.hero-globe', { timeout: 30000 }))
await pause(5000)

// The site's own walkthrough, step by step with Next.
await step('open walkthrough', async () => {
  await moveTo(page.locator('.walk-btn'))
  await page.waitForSelector('.tour-next', { timeout: 10000 })
})
for (let n = 0; n < 20; n++) {
  const next = page.locator('.tour-next')
  if (!(await next.count())) break
  await pause(Number(process.env.STEP_MS ?? 4500))
  const label = (await next.textContent())?.trim()
  await step(`step ${n + 1} ${label}`, () => moveTo(next))
  if (label === 'Finish') break
}
await pause(2500)
console.log(`::notice title=Recording steps::${steps.join('%0A')}`)

await context.close()
await browser.close()

const video = readdirSync(`${OUT}/raw`).find((f) => f.endsWith('.webm'))
renameSync(`${OUT}/raw/${video}`, `${OUT}/walkthrough.webm`)
const ff = (...a) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...a], { stdio: 'inherit' })
// The recording runs on a GPU-less machine, so the page stalls in places;
// mpdecimate drops most of the repeated frames and setpts closes the gaps.
const tighten = 'fps=15,mpdecimate=max=1:hi=768:lo=320:frac=0.5,setpts=N/15/TB'
ff('-ss', '0.8', '-i', `${OUT}/walkthrough.webm`, '-vf', `${tighten},scale=1280:-2`, '-r', '15', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', `${OUT}/walkthrough.mp4`)
ff('-ss', '0.8', '-i', `${OUT}/walkthrough.webm`, '-vf', `${tighten},fps=12,scale=900:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=160:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`, `${OUT}/walkthrough.gif`)
console.log(readdirSync(OUT))
