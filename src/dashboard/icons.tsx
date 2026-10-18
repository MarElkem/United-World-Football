// The one icon set used across the site: 20px grid, 1.75px strokes, square caps.
import type { SVGProps } from 'react'

const base = (p: SVGProps<SVGSVGElement>) => ({
  width: 20,
  height: 20,
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'square' as const,
  'aria-hidden': true,
  className: `icon ${p.className ?? ''}`,
})

export const IconChevron = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M5 8l5 5 5-5" /></svg>
)
export const IconClose = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M5 5l10 10M15 5L5 15" /></svg>
)
export const IconAsk = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 4h14v10H9l-4 3v-3H3z" /><path d="M7.5 8.2a2.5 2.5 0 1 1 3.3 2.4v.9" /><path d="M10.8 13h.01" /></svg>
)
export const IconTheme = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="10" cy="10" r="6.5" /><path d="M10 3.5v13" /><path d="M10 3.5a6.5 6.5 0 0 0 0 13z" fill="currentColor" stroke="none" /></svg>
)
export const IconMotion = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="10" cy="10" r="6.5" /><path d="M8.5 7.5v5M11.5 7.5v5" /></svg>
)
export const IconReplay = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4.5 10a5.5 5.5 0 1 0 1.6-3.9" /><path d="M4 3.5V7h3.5" /></svg>
)
export const IconTour = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="10" cy="10" r="6.5" /><path d="M12.6 7.4l-1.5 3.7-3.7 1.5 1.5-3.7z" /></svg>
)
export const IconPanel = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="3" y="4" width="14" height="12" /><path d="M8 4v12" /></svg>
)
export const IconArrow = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 10h11M11 6l4 4-4 4" /></svg>
)
