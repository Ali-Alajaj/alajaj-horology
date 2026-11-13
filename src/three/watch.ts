import * as THREE from 'three';
import { extrude, flutedBezel, knurled, polarDisc, revolve, roundedRect, Facets, type Pt } from './geo';
import { buildMovement } from './movement';
import {
  SUBDIAL,
  batonHours,
  dialPrintTexture,
  strapTextures,
  streakTexture,
  sunburstTexture,
} from './textures';

export type CaseFinish = 'steel' | 'rose' | 'pvd';
export type DialColor = 'green' | 'blue' | 'ivory' | 'black';
export type StrapType = 'leather' | 'bracelet' | 'rubber';
export type Numerals = 'batons' | 'arabic';

export interface WatchConfig {
  caseFinish: CaseFinish;
  dial: DialColor;
  strap: StrapType;
  numerals: Numerals;
}

export const DEFAULT_CONFIG: WatchConfig = {
  caseFinish: 'steel',
  dial: 'green',
  strap: 'leather',
  numerals: 'batons',
};

export type LayerName =
  | 'crystal'
  | 'bezel'
  | 'hands'
  | 'dial'
  | 'caseMid'
  | 'bridges'
  | 'gears'
  | 'plate'
  | 'rotor'
  | 'caseBack';

/** Axis offset of every layer when fully exploded (world units, +Z = dial side). */
export const EXPLODE: Record<LayerName, number> = {
  crystal: 6.7,
  bezel: 5.3,
  hands: 3.95,
  dial: 3.35,
  caseMid: 1.3,
  bridges: -1.0,
  gears: -2.6,
  plate: -4.0,
  rotor: -5.4,
  caseBack: -6.8,
};

/** Resting axis position and radius of each layer, for hotspot anchors. */
export const LAYER_INFO: Record<LayerName, { z: number; r: number }> = {
  crystal: { z: 0.6, r: 1.63 },
  bezel: { z: 0.5, r: 1.98 },
  hands: { z: 0.36, r: 1.4 },
  dial: { z: 0.3, r: 1.61 },
  caseMid: { z: 0, r: 2.03 },
  bridges: { z: 0.17, r: 1.6 },
  gears: { z: 0.05, r: 1.2 },
  plate: { z: -0.08, r: 1.66 },
  rotor: { z: -0.3, r: 1.62 },
  caseBack: { z: -0.46, r: 1.84 },
};

const FINISH: Record<CaseFinish, { color: number; pol: number; bru: number; accent: number }> = {
  steel: { color: 0xd4d7da, pol: 0.055, bru: 0.36, accent: 0xdfbb74 },
  rose: { color: 0xeab092, pol: 0.065, bru: 0.34, accent: 0xeab092 },
  pvd: { color: 0x25262a, pol: 0.15, bru: 0.4, accent: 0xdfbb74 },
};

export const DIALS: Record<
  DialColor,
  { color: number; ink: string; accent: string; sub: string; leather: string; thread: string }
> = {
  green: { color: 0x0f4d38, ink: '#f3ede0', accent: '#e0c283', sub: 'rgba(0,0,0,0.2)', leather: '#24140b', thread: '#c9b48a' },
  blue: { color: 0x14336a, ink: '#f3ede0', accent: '#e0c283', sub: 'rgba(0,0,0,0.2)', leather: '#1a1f2b', thread: '#8f98ad' },
  ivory: { color: 0xe9dfc8, ink: '#1b241f', accent: '#77592c', sub: 'rgba(110,86,40,0.2)', leather: '#6e4223', thread: '#e2cfa6' },
  black: { color: 0x1c1d20, ink: '#f3ede0', accent: '#e0c283', sub: 'rgba(0,0,0,0.3)', leather: '#151515', thread: '#6f6f6f' },
};

export interface WatchHandle {
  group: THREE.Group;
  layers: Record<LayerName, THREE.Group>;
  config: WatchConfig;
  setConfig(cfg: WatchConfig): void;
  setTime(date: Date): void;
  /** run the mechanism; `t` seconds */
  tick(t: number): void;
  /** 0 = assembled, 1 = fully exploded */
  setExplode(e: number, scale?: number): void;
  setFade(target: 'face' | 'strap', opacity: number): void;
  dispose(): void;
}

const LAYER_NAMES = Object.keys(EXPLODE) as LayerName[];
const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** shape (x, y) → world (y, z); extrusion depth → world x */
const SIDE_BASIS = new THREE.Matrix4().makeBasis(
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(1, 0, 0),
);

function dauphine(len: number, w: number, tail: number, h: number): THREE.BufferGeometry {
  const f = new Facets();
  const yw = len * 0.16;
  const T = new THREE.Vector3(0, -tail, 0);
  const L = new THREE.Vector3(-w, yw, 0);
  const R = new THREE.Vector3(w, yw, 0);
  const P = new THREE.Vector3(0, len, 0);
  const A = new THREE.Vector3(0, yw, h);
  const A2 = new THREE.Vector3(0, -tail * 0.5, h * 0.6);
  const right = new THREE.Vector3(0.3, 0, 1);
  const left = new THREE.Vector3(-0.3, 0, 1);
  f.tri(A, R, P, right);
  f.tri(A, P, L, left);
  f.tri(A2, R, A, right);
  f.tri(A2, A, L, left);
  f.tri(T, R, A2, right);
  f.tri(T, A2, L, left);
  return f.build();
}

function handOutline(len: number, w: number, tail: number): THREE.ShapeGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, -tail);
  s.lineTo(w, len * 0.16);
  s.lineTo(0, len);
  s.lineTo(-w, len * 0.16);
  s.closePath();
  return new THREE.ShapeGeometry(s);
}

const STRAP = { y0: 1.9, z0: -0.14, radius: 3.3, length: 5.0 };

function strapPoint(s: number) {
  const phi = s / STRAP.radius;
  return {
    phi,
    y: STRAP.y0 + STRAP.radius * Math.sin(phi),
    z: STRAP.z0 - STRAP.radius * (1 - Math.cos(phi)),
    ny: Math.sin(phi),
    nz: Math.cos(phi),
  };
}

function strapGeometry(detail: number): THREE.BufferGeometry {
  const NS = Math.round(56 * detail);
  const NC = 28;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= NS; i++) {
    const t = i / NS;
    const s = t * STRAP.length;
    const p = strapPoint(s);
    const taper = smooth(clamp01(t * 1.5));
    const w = 1.94 - 0.3 * taper;
    const th = 0.3 - 0.13 * taper;
    for (let j = 0; j <= NC; j++) {
      const a = (j / NC) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const cx = (w / 2) * Math.sign(ca) * Math.pow(Math.abs(ca), 0.22);
      const pad = sa > 0 ? 1 + 0.12 * Math.cos((cx / w) * Math.PI) : 1;
      const cn = (th / 2) * Math.sign(sa) * Math.pow(Math.abs(sa), 0.6) * pad;
      pos.push(cx, p.y + p.ny * cn, p.z + p.nz * cn);
      uv.push(cx / w + 0.5, s / 1.7);
    }
  }
  for (let i = 0; i < NS; i++) {
    for (let j = 0; j < NC; j++) {
      const a = i * (NC + 1) + j;
      const b = a + NC + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  // rounded end cap
  const end = strapPoint(STRAP.length);
  const centre = pos.length / 3;
  pos.push(0, end.y + Math.cos(end.phi) * 0.06, end.z - Math.sin(end.phi) * 0.06);
  uv.push(0.5, STRAP.length / 1.7);
  const last = NS * (NC + 1);
  for (let j = 0; j < NC; j++) idx.push(last + j, centre, last + j + 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function createWatch(initial: WatchConfig, opts: { detail?: number; printSize?: number } = {}): WatchHandle {
  const detail = opts.detail ?? 1;
  const printSize = opts.printSize ?? 2048;
  const seg = Math.round(160 * detail);
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const texs: THREE.Texture[] = [];
  const G = <T extends THREE.BufferGeometry>(g: T) => (geos.push(g), g);
  const M = <T extends THREE.Material>(m: T) => (mats.push(m), m);
  const T = <X extends THREE.Texture>(t: X) => (texs.push(t), t);

  const group = new THREE.Group();
  const layers = {} as Record<LayerName, THREE.Group>;
  for (const n of LAYER_NAMES) {
    layers[n] = new THREE.Group();
    layers[n].name = n;
    group.add(layers[n]);
  }

  // ---------------- materials ----------------
  const brushTex = T(streakTexture('u', 4, 150, 255, 512));
  brushTex.repeat.set(3, 1);
  const polished = M(new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 0.06, envMapIntensity: 1.35 }));
  const brushed = M(
    new THREE.MeshPhysicalMaterial({
      metalness: 1,
      roughness: 0.36,
      roughnessMap: brushTex,
      anisotropy: 0.55,
      anisotropyRotation: Math.PI / 2,
      envMapIntensity: 1.2,
    }),
  );
  const accent = M(new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 0.1, envMapIntensity: 1.5 }));
  const sunburst = T(sunburstTexture());
  const dialMat = M(
    new THREE.MeshPhysicalMaterial({
      metalness: 0.7,
      roughness: 0.55,
      map: sunburst,
      anisotropy: 0.55,
      clearcoat: 0.2,
      clearcoatRoughness: 0.25,
      envMapIntensity: 0.34,
    }),
  );
  const printMat = M(
    new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false }),
  );
  const shadowMat = M(
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }),
  );
  const glass = M(
    new THREE.MeshPhysicalMaterial({
      color: 0x000000,
      metalness: 0,
      roughness: 0,
      ior: 1.76,
      specularIntensity: 1,
      envMapIntensity: 1.5,
      transparent: true,
      // reflections only: add colour, never touch the canvas alpha (the stage canvas is transparent)
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.ZeroFactor,
      blendDstAlpha: THREE.OneFactor,
      depthWrite: false,
    }),
  );
  const glassEdge = M(
    new THREE.MeshPhysicalMaterial({
      color: 0x9fc4bb,
      metalness: 0,
      roughness: 0.08,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      envMapIntensity: 1.6,
    }),
  );
  const strapMat = M(
    new THREE.MeshPhysicalMaterial({
      metalness: 0,
      roughness: 0.72,
      bumpScale: 2.2,
      envMapIntensity: 0.42,
      sheen: 0.22,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color(0xc9a86a),
    }),
  );
  const linkPolished = M(polished.clone());
  const linkBrushed = M(brushed.clone());

  // ---------------- case middle ----------------
  {
    const band: Pt[] = [
      [2.0, -0.3],
      [2.022, -0.17],
      [2.03, -0.04],
      [2.022, 0.1],
      [2.0, 0.22],
    ];
    const brushedGeo = G(
      revolve(
        [
          [
            [1.7, -0.42],
            [1.87, -0.42],
          ],
          band,
          [
            [1.9, 0.34],
            [1.7, 0.34],
          ],
          [
            [1.7, 0.34],
            [1.7, -0.42],
          ],
        ],
        seg,
        3,
      ),
    );
    const polishedGeo = G(
      revolve(
        [
          [
            [1.87, -0.42],
            [2.0, -0.3],
          ],
          [
            [2.0, 0.22],
            [1.9, 0.34],
          ],
        ],
        seg,
      ),
    );
    layers.caseMid.add(new THREE.Mesh(brushedGeo, brushed), new THREE.Mesh(polishedGeo, polished));

    // lugs
    const lugShape = new THREE.Shape();
    lugShape.moveTo(1.3, 0.27);
    lugShape.lineTo(1.72, 0.27);
    lugShape.quadraticCurveTo(2.2, 0.25, 2.4, -0.15);
    lugShape.lineTo(2.42, -0.35);
    lugShape.quadraticCurveTo(2.1, -0.42, 1.3, -0.41);
    lugShape.closePath();
    const makeLug = (sign: number) => {
      const g = G(extrude(lugShape, 0.36, 0.03, 18, 3));
      g.translate(0, 0, -0.18);
      g.applyMatrix4(SIDE_BASIS);
      // taper the outer flank towards the tip, keep the strap side straight
      const p = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const t = smooth(clamp01((p.getY(i) - 1.55) / 0.87));
        const inner = -sign * 0.21;
        p.setX(i, inner + (p.getX(i) - inner) * (1 - 0.34 * t));
      }
      return g;
    };
    const lugGeos = { '-1': makeLug(-1), '1': makeLug(1) };
    const barGeo = G(new THREE.CylinderGeometry(0.045, 0.045, 2.1, 12).rotateZ(Math.PI / 2));
    for (const rot of [0, Math.PI]) {
      const side = new THREE.Group();
      side.rotation.z = rot;
      for (const sign of [-1, 1] as const) {
        const lug = new THREE.Mesh(lugGeos[sign], [polished, brushed]);
        lug.position.x = sign * 1.22;
        side.add(lug);
      }
      const bar = new THREE.Mesh(barGeo, polished);
      bar.position.set(0, 2.2, -0.16);
      side.add(bar);
      layers.caseMid.add(side);
    }

    // crown
    const crown = new THREE.Group();
    crown.position.set(1.98, 0, -0.04);
    crown.rotation.y = Math.PI / 2;
    crown.add(
      new THREE.Mesh(
        G(
          revolve(
            [
              [
                [0.16, 0],
                [0.16, 0.16],
              ],
            ],
            32,
          ),
        ),
        polished,
      ),
      new THREE.Mesh(G(knurled(30, 0.275, 0.243, 0.13, 0.39)), polished),
      new THREE.Mesh(
        G(
          revolve(
            [
              [
                [0.262, 0.39],
                [0.22, 0.418],
                [0.12, 0.43],
                [0, 0.433],
              ],
              [
                [0, 0.13],
                [0.262, 0.13],
              ],
            ],
            40,
          ),
        ),
        polished,
      ),
    );
    layers.caseMid.add(crown);
  }

  // ---------------- bezel ----------------
  {
    layers.bezel.add(
      new THREE.Mesh(G(flutedBezel(detail < 1 ? 84 : 120, 1.79, 0.585, 1.995, 0.5, 1.97, 0.474, 1.985, 0.4)), polished),
      new THREE.Mesh(
        G(
          revolve(
            [
              [
                [1.985, 0.34],
                [1.985, 0.4],
              ],
              [
                [1.79, 0.585],
                [1.72, 0.607],
                [1.66, 0.612],
                [1.635, 0.6],
              ],
              [
                [1.635, 0.6],
                [1.61, 0.31],
              ],
              [
                [1.61, 0.34],
                [1.985, 0.34],
              ],
            ],
            seg,
          ),
        ),
        polished,
      ),
    );
  }

  // ---------------- crystal ----------------
  {
    const rs = 11.13;
    const dome: Pt[] = [];
    const n = 20;
    for (let i = 0; i <= n; i++) {
      const r = 1.64 * (1 - i / n);
      dome.push([r, 0.575 + Math.sqrt(rs * rs - r * r) - (rs - 0.12)]);
    }
    const top = new THREE.Mesh(G(revolve([dome], seg)), glass);
    top.renderOrder = 10;
    const edge = new THREE.Mesh(
      G(
        revolve(
          [
            [
              [1.64, 0.47],
              [1.64, 0.575],
            ],
          ],
          seg,
        ),
      ),
      glassEdge,
    );
    edge.renderOrder = 9;
    layers.crystal.add(top, edge);
  }

  // ---------------- dial ----------------
  const printMesh = new THREE.Mesh(G(new THREE.CircleGeometry(1.61, 96)), printMat);
  printMesh.position.z = 0.3015;
  printMesh.renderOrder = 1;
  const indexGeo = G(extrude(roundedRect(0.36, 0.085, 0.012), 0.028, 0.015, 4, 1));
  const indices = new THREE.InstancedMesh(indexGeo, accent, 13);
  indices.frustumCulled = false;
  {
    const base = new THREE.Mesh(G(polarDisc(0, 1.61, seg, 4)), dialMat);
    base.position.z = 0.3;
    const back = new THREE.Mesh(G(new THREE.CircleGeometry(1.61, 64).rotateX(Math.PI)), brushed);
    back.position.z = 0.285;
    const ring = new THREE.Mesh(G(new THREE.TorusGeometry(SUBDIAL.r, 0.017, 10, 72)), accent);
    ring.position.set(SUBDIAL.x, SUBDIAL.y, 0.306);
    layers.dial.add(base, back, printMesh, indices, ring);
  }

  // ---------------- hands ----------------
  const hourHand = new THREE.Group();
  const minuteHand = new THREE.Group();
  const secondHand = new THREE.Group();
  const shadows = new THREE.Group();
  const hourShadow = new THREE.Mesh(G(handOutline(0.92, 0.1, 0.2)), shadowMat);
  const minuteShadow = new THREE.Mesh(G(handOutline(1.36, 0.072, 0.24)), shadowMat);
  {
    hourHand.add(new THREE.Mesh(G(dauphine(0.92, 0.1, 0.2, 0.032)), accent));
    hourHand.position.z = 0.336;
    minuteHand.add(new THREE.Mesh(G(dauphine(1.36, 0.072, 0.24, 0.028)), accent));
    minuteHand.position.z = 0.366;
    const needle = new THREE.Mesh(G(new THREE.BoxGeometry(0.014, 1.78, 0.008).translate(0, 0.55, 0)), accent);
    const weight = new THREE.Mesh(G(new THREE.CylinderGeometry(0.05, 0.05, 0.008, 20).rotateX(Math.PI / 2)), accent);
    weight.position.y = -0.27;
    secondHand.add(needle, weight);
    secondHand.position.z = 0.4;
    const cap = new THREE.Mesh(
      G(
        revolve(
          [
            [
              [0.075, 0.33],
              [0.075, 0.405],
            ],
            [
              [0.075, 0.405],
              [0.05, 0.42],
              [0, 0.424],
            ],
          ],
          28,
        ),
      ),
      accent,
    );
    hourShadow.renderOrder = 2;
    minuteShadow.renderOrder = 2;
    shadows.add(hourShadow, minuteShadow);
    shadows.position.set(0.03, -0.04, 0.3035);
    layers.hands.add(hourHand, minuteHand, secondHand, cap, shadows);
  }

  // ---------------- case back ----------------
  {
    layers.caseBack.add(
      new THREE.Mesh(
        G(
          revolve(
            [
              [
                [1.25, -0.52],
                [1.74, -0.52],
              ],
              [
                [1.84, -0.45],
                [1.84, -0.4],
              ],
              [
                [1.84, -0.4],
                [1.25, -0.4],
              ],
              [
                [1.25, -0.4],
                [1.25, -0.52],
              ],
            ],
            seg,
            3,
          ),
        ),
        brushed,
      ),
      new THREE.Mesh(
        G(
          revolve(
            [
              [
                [1.74, -0.52],
                [1.84, -0.45],
              ],
            ],
            seg,
          ),
        ),
        polished,
      ),
    );
    const window = new THREE.Mesh(G(new THREE.CircleGeometry(1.25, 64)), glass);
    window.position.z = -0.41;
    window.renderOrder = 8;
    const windowBack = new THREE.Mesh(G(new THREE.CircleGeometry(1.25, 64).rotateX(Math.PI)), glass);
    windowBack.position.z = -0.5;
    windowBack.renderOrder = 8;
    layers.caseBack.add(window, windowBack);
  }

  // ---------------- movement ----------------
  const movement = buildMovement(detail);
  layers.bridges.add(movement.bridges);
  layers.gears.add(movement.gears);
  layers.plate.add(movement.plate);
  layers.rotor.add(movement.rotor);
  // centre arbor carrying the hands
  {
    const post = new THREE.Mesh(G(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 12).rotateX(Math.PI / 2)), polished);
    post.position.z = 0.2;
    layers.gears.add(post);
  }

  // ---------------- straps ----------------
  const strapRoot = new THREE.Group();
  layers.caseMid.add(strapRoot);
  const softStrap = new THREE.Group();
  const bracelet = new THREE.Group();
  strapRoot.add(softStrap, bracelet);
  {
    const sg = G(strapGeometry(detail));
    for (const rot of [0, Math.PI]) {
      const m = new THREE.Mesh(sg, strapMat);
      m.rotation.z = rot;
      softStrap.add(m);
    }
    // bracelet links
    const pitch = 0.43;
    const rows = 12;
    const outerGeo = G(extrude(roundedRect(0.41, 0.2, 0.085), 0.46, 0.02, 6, 2));
    outerGeo.translate(0, 0, -0.23);
    outerGeo.applyMatrix4(SIDE_BASIS);
    const centreGeo = G(extrude(roundedRect(0.41, 0.215, 0.09), 0.86, 0.02, 6, 2));
    centreGeo.translate(0, 0, -0.43);
    centreGeo.applyMatrix4(SIDE_BASIS);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const sc = new THREE.Vector3();
    const xAxis = new THREE.Vector3(1, 0, 0);
    for (const rot of [0, Math.PI]) {
      const side = new THREE.Group();
      side.rotation.z = rot;
      const outer = new THREE.InstancedMesh(outerGeo, [linkPolished, linkBrushed], rows * 2);
      const centre = new THREE.InstancedMesh(centreGeo, [linkPolished, linkPolished], rows);
      outer.frustumCulled = false;
      centre.frustumCulled = false;
      for (let k = 0; k < rows; k++) {
        const taper = 1 - 0.1 * smooth(clamp01(k / 8));
        const a = strapPoint(0.3 + k * pitch);
        q.setFromAxisAngle(xAxis, -a.phi);
        sc.set(taper, 1, 1);
        for (let s = 0; s < 2; s++) {
          p.set((s ? 0.715 : -0.715) * taper, a.y, a.z);
          m4.compose(p, q, sc);
          outer.setMatrixAt(k * 2 + s, m4);
        }
        const c = strapPoint(0.3 + (k - 0.5) * pitch);
        q.setFromAxisAngle(xAxis, -c.phi);
        p.set(0, c.y, c.z);
        m4.compose(p, q, sc);
        centre.setMatrixAt(k, m4);
      }
      side.add(outer, centre);
      bracelet.add(side);
    }
  }

  // ---------------- config ----------------
  let config: WatchConfig = { ...initial };
  let printTex: THREE.CanvasTexture | null = null;
  let strapTex: { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } | null = null;
  let strapKey = '';
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const zAxis = new THREE.Vector3(0, 0, 1);

  const applyConfig = (cfg: WatchConfig) => {
    config = { ...cfg };
    const fin = FINISH[cfg.caseFinish];
    const dial = DIALS[cfg.dial];
    polished.color.setHex(fin.color);
    polished.roughness = fin.pol;
    brushed.color.setHex(fin.color);
    brushed.roughness = fin.bru;
    linkPolished.color.setHex(fin.color);
    linkPolished.roughness = fin.pol;
    linkBrushed.color.setHex(fin.color);
    linkBrushed.roughness = fin.bru;
    accent.color.setHex(fin.accent);
    dialMat.color.setHex(dial.color);
    dialMat.metalness = cfg.dial === 'ivory' ? 0.4 : 0.7;

    // dial print
    printTex?.dispose();
    printTex = dialPrintTexture({
      size: printSize,
      radius: 1.61,
      ink: dial.ink,
      accent: dial.accent,
      numerals: cfg.numerals,
      subdialTone: dial.sub,
    });
    printMat.map = printTex;
    printMat.needsUpdate = true;

    // applied indices
    let count = 0;
    for (const hour of batonHours(cfg.numerals)) {
      const a = Math.PI / 2 - (hour / 12) * Math.PI * 2;
      q.setFromAxisAngle(zAxis, a);
      const offsets = hour === 12 ? [-0.055, 0.055] : [0];
      for (const off of offsets) {
        m4.makeRotationFromQuaternion(q);
        m4.setPosition(
          Math.cos(a) * 1.27 - Math.sin(a) * off,
          Math.sin(a) * 1.27 + Math.cos(a) * off,
          0.316,
        );
        indices.setMatrixAt(count++, m4);
      }
    }
    indices.count = count;
    indices.instanceMatrix.needsUpdate = true;

    // strap
    softStrap.visible = cfg.strap !== 'bracelet';
    bracelet.visible = cfg.strap === 'bracelet';
    if (cfg.strap !== 'bracelet') {
      const base = cfg.strap === 'leather' ? dial.leather : cfg.dial === 'green' ? '#14241d' : '#161719';
      const key = `${cfg.strap}-${base}`;
      if (key !== strapKey) {
        strapKey = key;
        strapTex?.map.dispose();
        strapTex?.bump.dispose();
        strapTex = strapTextures(cfg.strap, base, dial.thread);
        strapMat.map = strapTex.map;
        strapMat.bumpMap = strapTex.bump;
        strapMat.roughness = cfg.strap === 'leather' ? 0.7 : 0.88;
        strapMat.bumpScale = cfg.strap === 'leather' ? 2.2 : 3;
        strapMat.needsUpdate = true;
      }
    }
  };
  applyConfig(initial);

  const faceMats: { m: THREE.Material; base: number }[] = [dialMat, printMat, accent, shadowMat].map((m) => ({
    m,
    base: m.opacity,
  }));
  const strapMats: { m: THREE.Material; base: number }[] = [strapMat, linkPolished, linkBrushed].map((m) => ({
    m,
    base: m.opacity,
  }));
  let lastE = -1;

  return {
    group,
    layers,
    get config() {
      return config;
    },
    setConfig: applyConfig,
    setTime(date: Date) {
      const ms = date.getMilliseconds();
      const s = date.getSeconds() + ms / 1000;
      const m = date.getMinutes() + s / 60;
      const h = (date.getHours() % 12) + m / 60;
      hourHand.rotation.z = -(h / 12) * Math.PI * 2;
      minuteHand.rotation.z = -(m / 60) * Math.PI * 2;
      // 8 beats per second, like a 4 Hz escapement
      secondHand.rotation.z = -(Math.floor(s * 8) / 8 / 60) * Math.PI * 2;
      hourShadow.rotation.z = hourHand.rotation.z;
      minuteShadow.rotation.z = minuteHand.rotation.z;
    },
    tick(t: number) {
      movement.update(t);
    },
    setExplode(e: number, scale = 1) {
      if (e === lastE) return;
      lastE = e;
      const max = 6.8;
      for (const n of LAYER_NAMES) {
        const off = EXPLODE[n];
        // outer layers leave first, inner layers follow
        const delay = (1 - Math.abs(off) / max) * 0.45;
        const local = smooth(clamp01((e - delay * 0.6) / (1 - delay * 0.6)));
        layers[n].position.z = off * scale * local;
      }
      shadows.visible = e < 0.002;
    },
    setFade(target, opacity) {
      const list = target === 'face' ? faceMats : strapMats;
      const o = clamp01(opacity);
      for (const { m, base } of list) {
        m.opacity = base * o;
        if (m !== printMat && m !== shadowMat) m.transparent = o < 0.999;
      }
      if (target === 'face') {
        layers.dial.visible = o > 0.01;
        layers.hands.visible = o > 0.01;
      } else {
        strapRoot.visible = o > 0.01;
      }
    },
    dispose() {
      movement.dispose();
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      texs.forEach((x) => x.dispose());
      printTex?.dispose();
      strapTex?.map.dispose();
      strapTex?.bump.dispose();
      indices.dispose();
    },
  };
}
