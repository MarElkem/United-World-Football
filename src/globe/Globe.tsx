import { lazy, Suspense, useState } from 'react'
import { webglAvailable } from '../prefs'
import posterUrl from '../assets/globe-poster.webp'
import type { FootballEarthProps } from './FootballEarth'

// three.js loads in its own chunk after the page shell has painted.
const FootballEarth = lazy(() => import('./FootballEarth'))

function Poster({ className }: { className?: string }) {
  return (
    <div className={className} role="img" aria-label="The Earth drawn as a black and white football">
      <img src={posterUrl} alt="" className="globe-poster" draggable={false} />
    </div>
  )
}

/** The football Earth, with a still image while loading or without WebGL. */
export default function Globe(props: FootballEarthProps) {
  const [canGl] = useState(webglAvailable)
  if (!canGl) return <Poster className={props.className} />
  return (
    <Suspense fallback={<Poster className={props.className} />}>
      <FootballEarth {...props} />
    </Suspense>
  )
}
