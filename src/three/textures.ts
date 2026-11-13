import * as THREE from 'three';
import { hijriParts } from '../lib/calendar';
import { moonPhase } from '../lib/calendar';

/** Small deterministic PRNG so every texture is identical between runs. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return [c, ctx] as const;
}

function finish(tex: THREE.CanvasTexture, color: boolean, repeat = true) {
  tex.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Fine parallel streaks. `along: 'u'` draws lines that run along u (brushing
 * around a lathe, circular graining on a polar disc); `along: 'v'` draws lines
 * that run along v (radial sunburst on a polar disc).
 */
export function streakTexture(
  along: 'u' | 'v',
  seed = 1,
  lo = 150,
  hi = 255,
  size = 512,
): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(size, size);
  const r = rng(seed);
  const mid = Math.round((lo + hi) / 2);
  ctx.fillStyle = `rgb(${mid},${mid},${mid})`;
  ctx.fillRect(0, 0, size, size);
  const lines = size * 5;
  for (let i = 0; i < lines; i++) {
    const g = Math.round(lo + r() * (hi - lo));
    ctx.fillStyle = `rgba(${g},${g},${g},${0.25 + r() * 0.5})`;
    const p = Math.floor(r() * size);
    const start = r() * size;
    const len = size * (0.25 + r() * 0.75);
    const th = r() < 0.85 ? 1 : 2;
    if (along === 'u') {
      ctx.fillRect(start, p, len, th);
      ctx.fillRect(start - size, p, len, th);
    } else {
      ctx.fillRect(p, start, th, len);
      ctx.fillRect(p, start - size, th, len);
    }
  }
  return finish(new THREE.CanvasTexture(c), false);
}

/** Sunburst strip for a polar-UV disc: fine radial lines plus a soft two-lobe sheen. */
export function sunburstTexture(seed = 7): THREE.CanvasTexture {
  const w = 2048;
  const h = 8;
  const [c, ctx] = makeCanvas(w, h);
  const r = rng(seed);
  for (let x = 0; x < w; x++) {
    const a = (x / w) * Math.PI * 2;
    const lobe = 0.5 + 0.5 * Math.cos(2 * (a - 0.9));
    const fine = r();
    const g = Math.round(255 * (0.62 + 0.26 * lobe + 0.12 * fine));
    ctx.fillStyle = `rgb(${g},${g},${g})`;
    ctx.fillRect(x, 0, 1, h);
  }
  // make the seam tile
  const grd = ctx.createLinearGradient(w - 24, 0, w, 0);
  const first = ctx.getImageData(0, 0, 1, 1).data[0];
  grd.addColorStop(0, `rgba(${first},${first},${first},0)`);
  grd.addColorStop(1, `rgba(${first},${first},${first},1)`);
  ctx.fillStyle = grd;
  ctx.fillRect(w - 24, 0, 24, h);
  const tex = finish(new THREE.CanvasTexture(c), true);
  return tex;
}

/** Circular graining (perlage) for the main plate. */
export function perlageTexture(seed = 3): THREE.CanvasTexture {
  const size = 512;
  const [c, ctx] = makeCanvas(size, size);
  ctx.fillStyle = '#9a9da0';
  ctx.fillRect(0, 0, size, size);
  const r = rng(seed);
  const step = size / 6;
  const rad = step * 0.72;
  for (let row = -1; row <= 6; row++) {
    for (let col = -1; col <= 6; col++) {
      const cx = col * step + (row % 2 ? step / 2 : 0) + step / 2;
      const cy = row * step * 0.9 + step / 2;
      const rot = r() * Math.PI * 2;
      const g = ctx.createConicGradient(rot, cx, cy);
      g.addColorStop(0, '#e9ebee');
      g.addColorStop(0.2, '#8d9093');
      g.addColorStop(0.5, '#dfe2e5');
      g.addColorStop(0.72, '#84878a');
      g.addColorStop(1, '#e9ebee');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,42,44,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  return finish(new THREE.CanvasTexture(c), true);
}

/** Côtes de Genève: a colour map and a matching height map (one tile = one unit). */
export function genevaTextures(): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const size = 256;
  const stripes = 3;
  const [c, ctx] = makeCanvas(size, size);
  const [b, btx] = makeCanvas(size, size);
  const r = rng(11);
  for (let x = 0; x < size; x++) {
    const t = ((x / size) * stripes) % 1;
    const wave = Math.sin(t * Math.PI);
    const g = Math.round(255 * (0.5 + 0.5 * Math.pow(t, 0.8)));
    ctx.fillStyle = `rgb(${g},${g},${g})`;
    ctx.fillRect(x, 0, 1, size);
    const hgt = Math.round(255 * wave);
    btx.fillStyle = `rgb(${hgt},${hgt},${hgt})`;
    btx.fillRect(x, 0, 1, size);
  }
  // fine grain along the stripes
  for (let x = 0; x < size; x++) {
    const g = Math.round(110 + r() * 145);
    ctx.fillStyle = `rgba(${g},${g},${g},0.22)`;
    ctx.fillRect(x, 0, 1, size);
  }
  return {
    map: finish(new THREE.CanvasTexture(c), true),
    bump: finish(new THREE.CanvasTexture(b), false),
  };
}

export type StrapKind = 'leather' | 'rubber';

/** Strap colour + height maps. u runs across the strap, v along it. */
export function strapTextures(
  kind: StrapKind,
  base: string,
  thread: string,
): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const w = 256;
  const h = 512;
  const [c, ctx] = makeCanvas(w, h);
  const [b, btx] = makeCanvas(w, h);
  const r = rng(kind === 'leather' ? 21 : 22);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  btx.fillStyle = '#808080';
  btx.fillRect(0, 0, w, h);
  if (kind === 'leather') {
    for (let i = 0; i < 9000; i++) {
      const x = r() * w;
      const y = r() * h;
      const s = 1 + r() * 2.4;
      const dark = r() < 0.5;
      ctx.fillStyle = dark ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.035)';
      ctx.fillRect(x, y, s, s);
      const g = Math.round(90 + r() * 80);
      btx.fillStyle = `rgba(${g},${g},${g},0.55)`;
      btx.beginPath();
      btx.arc(x, y, s, 0, Math.PI * 2);
      btx.fill();
    }
    // edge crease + stitching on both sides
    for (const ux of [0.085, 0.915]) {
      const x = ux * w;
      btx.fillStyle = 'rgba(40,40,40,0.9)';
      btx.fillRect(x - 3, 0, 6, h);
      const dash = 20;
      for (let y = 4; y < h; y += dash) {
        ctx.fillStyle = thread;
        ctx.beginPath();
        ctx.roundRect(x - 1.6, y, 3.2, dash * 0.62, 1.6);
        ctx.fill();
        btx.fillStyle = 'rgb(235,235,235)';
        btx.beginPath();
        btx.roundRect(x - 1.8, y, 3.6, dash * 0.62, 1.8);
        btx.fill();
      }
    }
  } else {
    // rubber: a recessed centre channel with fine ribs
    btx.fillStyle = 'rgb(88,88,88)';
    btx.fillRect(w * 0.22, 0, w * 0.56, h);
    for (let y = 0; y < h; y += 16) {
      btx.fillStyle = 'rgb(150,150,150)';
      btx.fillRect(w * 0.22, y, w * 0.56, 7);
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fillRect(w * 0.22, y, w * 0.56, 7);
    }
  }
  return {
    map: finish(new THREE.CanvasTexture(c), true),
    bump: finish(new THREE.CanvasTexture(b), false),
  };
}

export interface DialPrintOptions {
  size: number;
  /** world radius of the dial disc the canvas maps onto */
  radius: number;
  ink: string;
  accent: string;
  numerals: 'batons' | 'arabic';
  subdialTone: string;
  date?: Date;
}

/** Positions (in clock hours) that carry an applied baton index. */
export function batonHours(numerals: 'batons' | 'arabic'): number[] {
  const all = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12];
  return numerals === 'arabic' ? all.filter((h) => h !== 3 && h !== 9 && h !== 12) : all;
}

export const SUBDIAL = { x: 0, y: -0.8, r: 0.47 };

function moonPath(ctx: CanvasRenderingContext2D, r: number, fraction: number) {
  const k = Math.cos(fraction * Math.PI * 2); // +1 new, -1 full
  ctx.save();
  if (fraction > 0.5) ctx.scale(-1, 1);
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
  ctx.ellipse(0, 0, Math.max(0.001, r * Math.abs(k)), r, 0, Math.PI / 2, -Math.PI / 2, k > 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Everything that is printed on the dial: minute track, wordmark, optional
 * Arabic-Indic numerals, the Hijri-date / moon-phase subdial and soft contact
 * shadows under the applied indices. Transparent background.
 */
export function drawDialPrint(canvas: HTMLCanvasElement, o: DialPrintOptions) {
  const { size } = o;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);
  const k = size / 2 / o.radius; // units → px
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.scale(k, -k); // +y up, units are world units
  const date = o.date ?? new Date();

  // soft shadows under applied indices
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 0.03 * k;
  ctx.shadowOffsetX = 0.012 * k;
  ctx.shadowOffsetY = 0.016 * k;
  for (const hour of batonHours(o.numerals)) {
    const a = Math.PI / 2 - (hour / 12) * Math.PI * 2;
    ctx.save();
    ctx.rotate(a);
    const wide = hour === 12 ? 0.19 : 0.085;
    ctx.fillRect(1.09, -wide / 2, 0.36, wide);
    ctx.restore();
  }
  ctx.restore();

  // minute track
  ctx.strokeStyle = o.ink;
  ctx.lineCap = 'butt';
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const five = i % 5 === 0;
    ctx.lineWidth = five ? 0.022 : 0.009;
    ctx.globalAlpha = five ? 0.95 : 0.7;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (five ? 1.49 : 1.515), Math.sin(a) * (five ? 1.49 : 1.515));
    ctx.lineTo(Math.cos(a) * 1.565, Math.sin(a) * 1.565);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 0.006;
  ctx.beginPath();
  ctx.arc(0, 0, 1.578, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // text is drawn in an un-flipped space
  const text = (fn: () => void) => {
    ctx.save();
    ctx.scale(1 / k, -1 / k); // back to pixels, y down
    fn();
    ctx.restore();
  };

  // wordmark
  text(() => {
    ctx.fillStyle = o.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.direction = 'rtl';
    ctx.font = `700 ${0.3 * k}px Amiri, serif`;
    ctx.fillText('العجاج', 0, -0.56 * k);
    ctx.direction = 'ltr';
    ctx.fillStyle = o.accent;
    ctx.font = `500 ${0.082 * k}px "Cormorant Garamond", serif`;
    try {
      (ctx as unknown as { letterSpacing: string }).letterSpacing = `${0.014 * k}px`;
    } catch {
      /* older engines: unspaced */
    }
    ctx.fillText('ALAJAJ HOROLOGY', 0.007 * k, -0.39 * k);
    try {
      (ctx as unknown as { letterSpacing: string }).letterSpacing = '0px';
    } catch {
      /* noop */
    }
  });

  // Arabic-Indic numerals option
  if (o.numerals === 'arabic') {
    text(() => {
      ctx.fillStyle = o.accent;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.direction = 'rtl';
      ctx.font = `700 ${0.4 * k}px Amiri, serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 0.02 * k;
      ctx.shadowOffsetY = 0.01 * k;
      ctx.fillText('١٢', 0, -1.2 * k);
      ctx.fillText('٣', 1.24 * k, 0.02 * k);
      ctx.fillText('٩', -1.24 * k, 0.02 * k);
    });
  }

  // ----- subdial: Hijri day ring + moon phase -----
  const hij = hijriParts(date);
  const phase = moonPhase(date);
  ctx.save();
  ctx.translate(SUBDIAL.x, SUBDIAL.y);
  const R = SUBDIAL.r;
  // recessed ground
  const rg = ctx.createRadialGradient(0, 0.05, R * 0.1, 0, 0, R);
  rg.addColorStop(0, o.subdialTone);
  rg.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fill();
  // azurage rings
  ctx.strokeStyle = o.ink;
  ctx.lineWidth = 0.004;
  for (let i = 1; i <= 14; i++) {
    ctx.globalAlpha = 0.1;
    ctx.beginPath();
    ctx.arc(0, 0, (R * i) / 15, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // 30 day marks
  for (let d = 1; d <= 30; d++) {
    const a = Math.PI / 2 - (d / 30) * Math.PI * 2;
    const major = d % 5 === 0;
    ctx.fillStyle = major ? o.accent : o.ink;
    ctx.globalAlpha = major ? 1 : 0.7;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * R * 0.86, Math.sin(a) * R * 0.86, major ? 0.013 : 0.007, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // pointer on today's Hijri day
  {
    const a = Math.PI / 2 - (hij.day / 30) * Math.PI * 2;
    ctx.save();
    ctx.rotate(a);
    ctx.fillStyle = o.accent;
    ctx.beginPath();
    ctx.moveTo(R * 0.8, 0);
    ctx.lineTo(R * 0.62, 0.028);
    ctx.lineTo(R * 0.62, -0.028);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // moon aperture
  const mr = R * 0.46;
  const sky = ctx.createLinearGradient(0, mr, 0, -mr);
  sky.addColorStop(0, '#0b1a33');
  sky.addColorStop(1, '#050b17');
  ctx.fillStyle = sky;
  ctx.beginPath();
  ctx.arc(0, 0, mr, 0, Math.PI * 2);
  ctx.fill();
  const sr = rng(5);
  ctx.fillStyle = '#e9dcc0';
  for (let i = 0; i < 16; i++) {
    const a = sr() * Math.PI * 2;
    const d = Math.sqrt(sr()) * mr * 0.92;
    ctx.globalAlpha = 0.35 + sr() * 0.5;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 0.004 + sr() * 0.004, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#d9c491';
  ctx.beginPath();
  ctx.arc(0, 0, mr * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#e6cd92';
  ctx.save();
  ctx.scale(1, -1);
  moonPath(ctx, mr * 0.62, phase.fraction);
  ctx.restore();
  ctx.strokeStyle = o.accent;
  ctx.lineWidth = 0.012;
  ctx.beginPath();
  ctx.arc(0, 0, mr, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

export function dialPrintTexture(o: DialPrintOptions): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  drawDialPrint(c, o);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  tex.needsUpdate = true;
  return tex;
}
