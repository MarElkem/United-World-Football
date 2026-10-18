// Face planes of a truncated icosahedron (the classic football), used by the
// globe shader to decide which panel a point on the sphere belongs to.
//
// A point p on the unit sphere lies under face i when dot(p, n_i) / d_i is
// largest, where n_i is the face normal and d_i the face's distance from the
// centre. The 12 pentagons sit over the icosahedron's vertices and the 20
// hexagons over its face centres.

import * as THREE from 'three'

const PHI = (1 + Math.sqrt(5)) / 2

function icosahedronVertices(): THREE.Vector3[] {
  const v: THREE.Vector3[] = []
  for (const a of [-1, 1]) {
    for (const b of [-PHI, PHI]) {
      v.push(new THREE.Vector3(0, a, b))
      v.push(new THREE.Vector3(a, b, 0))
      v.push(new THREE.Vector3(b, 0, a))
    }
  }
  return v
}

export interface BallFaces {
  /** xyz = unit normal, w = 1 / plane distance. First 12 are pentagons. */
  faces: THREE.Vector4[]
}

export function buildBallFaces(): BallFaces {
  const ico = icosahedronVertices()
  const edgeLen = 2
  const eps = 1e-6

  const edges: [number, number][] = []
  for (let i = 0; i < ico.length; i++)
    for (let j = i + 1; j < ico.length; j++)
      if (Math.abs(ico[i].distanceTo(ico[j]) - edgeLen) < eps) edges.push([i, j])

  const tris: [number, number, number][] = []
  const adj = (i: number, j: number) => Math.abs(ico[i].distanceTo(ico[j]) - edgeLen) < eps
  for (let i = 0; i < 12; i++)
    for (let j = i + 1; j < 12; j++)
      for (let k = j + 1; k < 12; k++)
        if (adj(i, j) && adj(j, k) && adj(i, k)) tris.push([i, j, k])

  // Truncating every edge at one third gives the football's 60 vertices.
  const verts: THREE.Vector3[] = []
  for (const [i, j] of edges) {
    const a = ico[i], b = ico[j]
    verts.push(a.clone().lerp(b, 1 / 3))
    verts.push(a.clone().lerp(b, 2 / 3))
  }

  const normals: THREE.Vector3[] = [
    ...ico.map((v) => v.clone().normalize()),
    ...tris.map(([i, j, k]) => ico[i].clone().add(ico[j]).add(ico[k]).normalize()),
  ]

  const faces = normals.map((n) => {
    let d = -Infinity
    for (const v of verts) d = Math.max(d, v.dot(n))
    return new THREE.Vector4(n.x, n.y, n.z, 1 / d)
  })

  return { faces }
}
