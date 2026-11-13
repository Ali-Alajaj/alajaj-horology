import * as THREE from 'three';

export type Pt = [number, number]; // [radius, z]

/**
 * Revolves profile runs around the Z axis. Each run is smooth inside and
 * sharp against the next run, so bevels stay crisp while curves stay polished.
 * Runs must be traversed counter-clockwise in the (r, z) plane for outward normals.
 */
export function revolve(runs: Pt[][], segments = 128, uRepeat = 1): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  let base = 0;
  for (const run of runs) {
    const n = run.length;
    const sn: Pt[] = [];
    const len: number[] = [0];
    for (let i = 0; i < n - 1; i++) {
      const dr = run[i + 1][0] - run[i][0];
      const dz = run[i + 1][1] - run[i][1];
      const l = Math.hypot(dr, dz) || 1;
      sn.push([dz / l, -dr / l]);
      len.push(len[i] + l);
    }
    const total = len[n - 1] || 1;
    for (let i = 0; i < n; i++) {
      const a = sn[Math.max(0, i - 1)];
      const b = sn[Math.min(n - 2, i)];
      let nr = a[0] + b[0];
      let nz = a[1] + b[1];
      const l = Math.hypot(nr, nz) || 1;
      nr /= l;
      nz /= l;
      for (let j = 0; j <= segments; j++) {
        const th = (j / segments) * Math.PI * 2;
        const c = Math.cos(th);
        const s = Math.sin(th);
        pos.push(run[i][0] * c, run[i][0] * s, run[i][1]);
        nor.push(nr * c, nr * s, nz);
        uv.push((j / segments) * uRepeat, len[i] / total);
      }
    }
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < segments; j++) {
        const a = base + i * (segments + 1) + j;
        const b = a + (segments + 1);
        const c = a + 1;
        const d = b + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    base += n * (segments + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** Points along a circular arc in the (r, z) plane, for fillets and domes. */
export function arcPts(cr: number, cz: number, rad: number, a0: number, a1: number, n: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push([cr + Math.cos(a) * rad, cz + Math.sin(a) * rad]);
  }
  return out;
}

/** Flat-shaded triangle soup with automatic outward orientation. */
export class Facets {
  private pos: number[] = [];
  private nor: number[] = [];
  private a = new THREE.Vector3();
  private b = new THREE.Vector3();
  private n = new THREE.Vector3();

  tri(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, ref: THREE.Vector3) {
    this.a.subVectors(p1, p0);
    this.b.subVectors(p2, p0);
    this.n.crossVectors(this.a, this.b).normalize();
    let q1 = p1;
    let q2 = p2;
    if (this.n.dot(ref) < 0) {
      this.n.negate();
      q1 = p2;
      q2 = p1;
    }
    this.pos.push(p0.x, p0.y, p0.z, q1.x, q1.y, q1.z, q2.x, q2.y, q2.z);
    for (let i = 0; i < 3; i++) this.nor.push(this.n.x, this.n.y, this.n.z);
  }

  quad(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, ref: THREE.Vector3) {
    this.tri(p0, p1, p2, ref);
    this.tri(p0, p2, p3, ref);
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    return g;
  }
}

const cyl = (r: number, a: number, z: number) => new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, z);

/** Fluted bezel: radial V-ridges that sparkle as the light moves. */
export function flutedBezel(
  flutes: number,
  rIn: number,
  zIn: number,
  rPeak: number,
  zPeak: number,
  rValley: number,
  zValley: number,
  rBase: number,
  zBase: number,
): THREE.BufferGeometry {
  const f = new Facets();
  const step = (Math.PI * 2) / flutes;
  const ref = new THREE.Vector3();
  for (let k = 0; k < flutes; k++) {
    const a0 = k * step;
    const a1 = (k + 0.5) * step;
    const a2 = (k + 1) * step;
    const i0 = cyl(rIn, a0, zIn);
    const iv = cyl(rIn, a1, zIn);
    const i1 = cyl(rIn, a2, zIn);
    const p0 = cyl(rPeak, a0, zPeak);
    const v = cyl(rValley, a1, zValley);
    const p1 = cyl(rPeak, a2, zPeak);
    const b0 = cyl(rBase, a0, zBase);
    const bv = cyl(rBase, a1, zBase);
    const b1 = cyl(rBase, a2, zBase);
    ref.set(Math.cos(a1) * 0.2, Math.sin(a1) * 0.2, 1);
    f.quad(i0, p0, v, iv, ref);
    f.quad(iv, v, p1, i1, ref);
    ref.set(Math.cos(a1), Math.sin(a1), 0.15);
    f.quad(p0, b0, bv, v, ref);
    f.quad(v, bv, b1, p1, ref);
  }
  return f.build();
}

/** Knurled cylinder along +Z from z0 to z1 (crown grip). */
export function knurled(teeth: number, rOut: number, rIn: number, z0: number, z1: number): THREE.BufferGeometry {
  const f = new Facets();
  const step = (Math.PI * 2) / teeth;
  const ref = new THREE.Vector3();
  for (let k = 0; k < teeth; k++) {
    const a0 = k * step;
    const a1 = (k + 0.5) * step;
    const a2 = (k + 1) * step;
    ref.set(Math.cos(a1), Math.sin(a1), 0);
    f.quad(cyl(rOut, a0, z0), cyl(rIn, a1, z0), cyl(rIn, a1, z1), cyl(rOut, a0, z1), ref);
    f.quad(cyl(rIn, a1, z0), cyl(rOut, a2, z0), cyl(rOut, a2, z1), cyl(rIn, a1, z1), ref);
  }
  return f.build();
}

/** Flat disc / ring with polar UVs (u = angle, v = radius) facing +Z. */
export function polarDisc(rInner: number, rOuter: number, segments = 128, rings = 6): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const r = rInner + (rOuter - rInner) * t;
    for (let j = 0; j <= segments; j++) {
      const a = (j / segments) * Math.PI * 2;
      pos.push(Math.cos(a) * r, Math.sin(a) * r, 0);
      nor.push(0, 0, 1);
      uv.push(j / segments, t);
    }
  }
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * (segments + 1) + j;
      const b = a + segments + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** Annular sector outline (optionally used as a hole). */
export function sectorPath<T extends THREE.Path>(path: T, r0: number, r1: number, a0: number, a1: number): T {
  path.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0);
  path.lineTo(Math.cos(a0) * r1, Math.sin(a0) * r1);
  path.absarc(0, 0, r1, a0, a1, false);
  path.lineTo(Math.cos(a1) * r0, Math.sin(a1) * r0);
  path.absarc(0, 0, r0, a1, a0, true);
  path.closePath();
  return path;
}

export function circleHole(x: number, y: number, r: number): THREE.Path {
  const p = new THREE.Path();
  p.absarc(x, y, r, 0, Math.PI * 2, true);
  return p;
}

/** Gear wheel outline with trapezoid teeth and spoke cut-outs. */
export function gearShape(
  teeth: number,
  rTip: number,
  depth: number,
  spokes: number,
  hubR: number,
  rimW: number,
  pointed = false,
): THREE.Shape {
  const shape = new THREE.Shape();
  const rRoot = rTip - depth;
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts: [number, number][] = pointed
      ? [
          [rRoot, a],
          [rTip, a + step * 0.12],
          [rRoot, a + step * 0.7],
        ]
      : [
          [rRoot, a],
          [rRoot, a + step * 0.18],
          [rTip, a + step * 0.34],
          [rTip, a + step * 0.62],
          [rRoot, a + step * 0.78],
        ];
    for (let j = 0; j < pts.length; j++) {
      const [r, t] = pts[j];
      const x = Math.cos(t) * r;
      const y = Math.sin(t) * r;
      if (i === 0 && j === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
  }
  shape.closePath();
  if (spokes > 0) {
    const r0 = hubR;
    const r1 = rRoot - rimW;
    const sStep = (Math.PI * 2) / spokes;
    // spoke half-width in radians
    const gap = Math.min(sStep * 0.3, (0.03 + rTip * 0.05) / ((r0 + r1) / 2));
    for (let i = 0; i < spokes; i++) {
      const a0 = i * sStep + gap;
      const a1 = (i + 1) * sStep - gap;
      shape.holes.push(sectorPath(new THREE.Path(), r0, r1, a0, a1));
    }
  }
  return shape;
}

export function extrude(
  shape: THREE.Shape,
  depth: number,
  bevel = 0,
  curveSegments = 24,
  bevelSegments = 1,
): THREE.ExtrudeGeometry {
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments,
    curveSegments,
    steps: 1,
  });
}

export function roundedRect(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}
