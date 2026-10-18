// Equirectangular textures for the globe, drawn from Natural Earth shapes.
//  land texture: red = land, green = coastline ink, blue = country borders
//  id texture:   red = country index (1-based), green = confederation index

import * as THREE from 'three'
import { geoEquirectangular, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import land110 from 'world-atlas/land-110m.json'
import { borders, confIndex, countries } from './geo'

function canvasPair(width: number) {
  const height = width / 2
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  const projection = geoEquirectangular()
    .scale(width / (2 * Math.PI))
    .translate([width / 2, height / 2])
  return { canvas, ctx, path: geoPath(projection, ctx), width, height }
}

function toTexture(canvas: HTMLCanvasElement, nearest: boolean) {
  const tex = new THREE.CanvasTexture(canvas)
  // No mipmaps: avoids a visible seam where longitude wraps at ±180°.
  tex.generateMipmaps = false
  tex.minFilter = nearest ? THREE.NearestFilter : THREE.LinearFilter
  tex.magFilter = nearest ? THREE.NearestFilter : THREE.LinearFilter
  tex.wrapS = THREE.RepeatWrapping
  tex.colorSpace = THREE.NoColorSpace
  tex.needsUpdate = true
  return tex
}

export function buildLandTexture(width = 2048): THREE.CanvasTexture {
  const { canvas, ctx, path, height } = canvasPair(width)
  const topo = land110 as unknown as Topology<{ land: GeometryCollection }>
  const land = feature(topo, topo.objects.land)

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, height)

  ctx.beginPath()
  path(land)
  ctx.fillStyle = 'rgb(255,0,0)'
  ctx.fill()

  ctx.globalCompositeOperation = 'lighter'
  ctx.beginPath()
  path(land)
  ctx.strokeStyle = 'rgb(0,255,0)'
  ctx.lineWidth = width / 900
  ctx.lineJoin = 'round'
  ctx.stroke()

  ctx.beginPath()
  path(borders)
  ctx.strokeStyle = 'rgb(0,0,255)'
  ctx.lineWidth = width / 1700
  ctx.stroke()

  return toTexture(canvas, false)
}

export function buildIdTexture(width = 2048): THREE.CanvasTexture {
  const { canvas, ctx, path, height } = canvasPair(width)
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, height)
  for (const c of countries) {
    ctx.beginPath()
    path(c.feature)
    ctx.fillStyle = `rgb(${c.index},${confIndex(c.conf)},0)`
    ctx.fill()
  }
  return toTexture(canvas, true)
}
