import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { buildBallFaces } from './ballGeometry'
import { buildIdTexture, buildLandTexture } from './landTexture'
import { countryAt, type Country } from './geo'
import { ballFragment, ballVertex, outlineFragment, outlineVertex } from './shaders'

const PAPER = '#F4F2EB'
const INK = '#0B0B0A'
const GREEN = '#4F8A26'
const GREEN_DEEP = '#2A4D14'
const RED = '#D1281C'

const DEG = Math.PI / 180
/** Where the globe faces when it first appears: Africa and Europe. */
const START: [number, number] = [10, 12]

export interface GlobeFocus {
  lon: number
  lat: number
  /** Changes whenever the same place is asked for again. */
  nonce: number
}

interface BallProps {
  spin: boolean
  speed: number
  detail: number
  interactive: boolean
  hoverIndex: number
  selectedIndex: number
  confIndex: number
  focus?: GlobeFocus
  onHover?: (c: Country | undefined, x: number, y: number) => void
  onPick?: (c: Country | undefined) => void
}

function lonLatOf(e: ThreeEvent<PointerEvent | MouseEvent>, mesh: THREE.Object3D) {
  const p = mesh.worldToLocal(e.point.clone()).normalize()
  return [Math.atan2(p.x, p.z) / DEG, Math.asin(THREE.MathUtils.clamp(p.y, -1, 1)) / DEG] as const
}

function Ball(props: BallProps) {
  const { spin, speed, detail, interactive, hoverIndex, selectedIndex, confIndex, focus, onHover, onPick } = props
  const group = useRef<THREE.Group>(null)
  const mesh = useRef<THREE.Mesh>(null)
  // x tilts the facing latitude towards the viewer; y is minus the facing longitude.
  const state = useRef({
    x: START[1] * DEG * 0.6,
    y: -START[0] * DEG,
    vx: 0,
    vy: 0,
    dragging: false,
    lastX: 0,
    lastY: 0,
    target: null as null | { x: number; y: number },
    idleUntil: 0,
    lastHover: 0,
  })

  const { ballMat, outlineMat } = useMemo(() => {
    const { faces } = buildBallFaces()
    const big = detail >= 64
    const ballMat = new THREE.ShaderMaterial({
      vertexShader: ballVertex,
      fragmentShader: ballFragment,
      uniforms: {
        uFaces: { value: faces },
        uLand: { value: buildLandTexture(big ? 2048 : 1024) },
        uIds: { value: buildIdTexture(big ? 2048 : 512) },
        uHover: { value: 0 },
        uSelected: { value: 0 },
        uConf: { value: 0 },
        uLight: { value: new THREE.Vector3(-0.55, 0.65, 0.75) },
        uPaper: { value: new THREE.Color(PAPER) },
        uInk: { value: new THREE.Color(INK) },
        uGreen: { value: new THREE.Color(GREEN) },
        uGreenDeep: { value: new THREE.Color(GREEN_DEEP) },
        uRed: { value: new THREE.Color(RED) },
        uPixel: { value: 1 },
      },
    })
    const outlineMat = new THREE.ShaderMaterial({
      vertexShader: outlineVertex,
      fragmentShader: outlineFragment,
      side: THREE.BackSide,
      uniforms: { uInk: { value: new THREE.Color(INK) }, uThickness: { value: 0.022 } },
    })
    return { ballMat, outlineMat }
  }, [detail])

  ballMat.uniforms.uHover.value = hoverIndex
  ballMat.uniforms.uSelected.value = selectedIndex
  ballMat.uniforms.uConf.value = confIndex

  // Turn to face a requested place, the short way round.
  useEffect(() => {
    if (!focus) return
    const s = state.current
    let ty = -focus.lon * DEG
    while (ty - s.y > Math.PI) ty -= 2 * Math.PI
    while (ty - s.y < -Math.PI) ty += 2 * Math.PI
    s.target = { x: THREE.MathUtils.clamp(focus.lat, -60, 60) * DEG * 0.85, y: ty }
    s.vx = s.vy = 0
  }, [focus])

  useFrame(({ gl, size }, dt) => {
    ballMat.uniforms.uPixel.value = Math.max(1, (gl.getPixelRatio() * Math.min(size.width, size.height)) / 420)
    const g = group.current
    if (!g) return
    const s = state.current
    const step = Math.min(dt, 0.05)
    if (s.target) {
      const k = 1 - Math.pow(0.0025, step)
      s.x += (s.target.x - s.x) * k
      s.y += (s.target.y - s.y) * k
      if (Math.abs(s.target.x - s.x) + Math.abs(s.target.y - s.y) < 0.002) s.target = null
      s.idleUntil = performance.now() + 6000
    } else if (!s.dragging) {
      s.y += s.vy
      s.x += s.vx
      s.vx *= 0.92
      s.vy *= 0.92
      if (spin && performance.now() > s.idleUntil && selectedIndex === 0) s.y += speed * step
    }
    s.x = THREE.MathUtils.clamp(s.x, -1.1, 1.1)
    g.rotation.set(s.x, s.y, 0)
  })

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    const s = state.current
    s.dragging = true
    s.target = null
    s.lastX = e.clientX
    s.lastY = e.clientY
    s.vx = s.vy = 0
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const s = state.current
    if (s.dragging) {
      s.vy = (e.clientX - s.lastX) * 0.006
      s.vx = (e.clientY - s.lastY) * 0.006
      s.y += s.vy
      s.x += s.vx
      s.lastX = e.clientX
      s.lastY = e.clientY
      s.idleUntil = performance.now() + 6000
      return
    }
    if (!interactive || !onHover || !mesh.current) return
    const now = performance.now()
    if (now - s.lastHover < 50) return
    s.lastHover = now
    const [lon, lat] = lonLatOf(e, mesh.current)
    onHover(countryAt(lon, lat), e.clientX, e.clientY)
  }
  const onUp = (e: ThreeEvent<PointerEvent>) => {
    state.current.dragging = false
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
  }
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (!interactive || !onPick || !mesh.current || e.delta > 6) return
    e.stopPropagation()
    const [lon, lat] = lonLatOf(e, mesh.current)
    onPick(countryAt(lon, lat))
    state.current.idleUntil = performance.now() + 8000
  }

  return (
    <group ref={group}>
      <mesh
        ref={mesh}
        material={ballMat}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={() => onHover?.(undefined, 0, 0)}
        onClick={onClick}
      >
        <sphereGeometry args={[1, detail, detail / 2]} />
      </mesh>
      <mesh material={outlineMat} raycast={() => null}>
        <sphereGeometry args={[1, 64, 32]} />
      </mesh>
    </group>
  )
}

export interface FootballEarthProps {
  spin?: boolean
  /** Radians per second. */
  speed?: number
  small?: boolean
  interactive?: boolean
  hoverIndex?: number
  selectedIndex?: number
  confIndex?: number
  focus?: GlobeFocus
  onHover?: (c: Country | undefined, x: number, y: number) => void
  onPick?: (c: Country | undefined) => void
  className?: string
  label?: string
}

export default function FootballEarth({
  spin = true,
  speed = 0.18,
  small = false,
  interactive = false,
  hoverIndex = 0,
  selectedIndex = 0,
  confIndex = 0,
  focus,
  onHover,
  onPick,
  className,
  label = 'A rotating Earth drawn as a black and white football',
}: FootballEarthProps) {
  return (
    <div className={className} role="img" aria-label={label}>
      <Canvas
        dpr={small ? [1, 2] : [1, 1.75]}
        camera={{ position: [0, 0, 4.1], fov: 30 }}
        gl={{ antialias: true, alpha: true, powerPreference: small ? 'low-power' : 'high-performance' }}
        style={{ touchAction: 'pan-y', cursor: interactive ? 'grab' : 'default' }}
        onPointerMissed={() => interactive && onPick?.(undefined)}
      >
        <Ball
          spin={spin}
          speed={speed}
          detail={small ? 48 : 128}
          interactive={interactive}
          hoverIndex={hoverIndex}
          selectedIndex={selectedIndex}
          confIndex={confIndex}
          focus={focus}
          onHover={onHover}
          onPick={onPick}
        />
      </Canvas>
    </div>
  )
}
