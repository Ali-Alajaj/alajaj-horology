// Playwright screenshot helper.
//   node scripts/shots.mjs --url http://localhost:5173/ --out shots/home --w 1440 --h 900 --scrolls 0,0.5,1
// --scrolls: fractions of the maximum scroll (default 0). --sel "#id" scrolls that element to the top instead.
// --offsets: extra pixel offsets applied after --sel (e.g. 0,900,1800). --full takes one full-page capture.
// Prints console errors and failed requests; exits 1 if there were any.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .map((a, i, arr) => (a.startsWith('--') ? [a.slice(2), arr[i + 1]?.startsWith('--') || arr[i + 1] === undefined ? 'true' : arr[i + 1]] : null))
    .filter(Boolean),
);
const url = args.url ?? 'http://localhost:5173/';
const out = args.out ?? 'shots/shot';
const w = parseInt(args.w ?? '1440', 10);
const h = parseInt(args.h ?? '900', 10);
const wait = parseInt(args.wait ?? '1200', 10);
const first = parseInt(args.first ?? '5200', 10);
const scrolls = (args.scrolls ?? '0').split(',').map(Number);
const offsets = args.offsets ? args.offsets.split(',').map(Number) : null;

fs.mkdirSync(path.dirname(out), { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
});
const ctx = await browser.newContext({
  viewport: { width: w, height: h },
  deviceScaleFactor: 1,
  reducedMotion: args.reduced ? 'reduce' : 'no-preference',
  hasTouch: w < 768,
  isMobile: w < 768,
  locale: 'ar-SA',
});
const page = await ctx.newPage();
const problems = [];
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(`console.error: ${m.text()}`);
  if (args.verbose && m.type() !== 'error') console.log(`[${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
page.on('requestfailed', (r) => problems.push(`requestfailed: ${r.url()} ${r.failure()?.errorText ?? ''}`));
page.on('response', (r) => {
  if (r.status() >= 400) problems.push(`http ${r.status()}: ${r.url()}`);
});

await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(first);

if (args.eval) await page.evaluate(args.eval);

if (args.full) {
  await page.screenshot({ path: `${out}-full.png`, fullPage: true });
} else if (args.sel) {
  const top = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    return el ? el.getBoundingClientRect().top + window.scrollY : 0;
  }, args.sel);
  const list = offsets ?? [0];
  for (let i = 0; i < list.length; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), top + list[i]);
    await page.waitForTimeout(wait);
    await page.screenshot({ path: `${out}-${i}.png` });
  }
} else {
  for (let i = 0; i < scrolls.length; i++) {
    await page.evaluate((f) => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, max * f);
    }, scrolls[i]);
    await page.waitForTimeout(wait);
    await page.screenshot({ path: `${out}-${i}.png` });
  }
}

const info = await page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
  height: document.documentElement.scrollHeight,
  gl: (() => {
    try {
      const c = document.createElement('canvas');
      const g = c.getContext('webgl2');
      const e = g.getExtension('WEBGL_debug_renderer_info');
      return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'webgl2';
    } catch {
      return 'none';
    }
  })(),
}));
console.log(JSON.stringify(info));
if (args.probe) {
  // elements that stick out of the viewport horizontally and are not clipped by an ancestor
  const wide = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const out = [];
    const clipped = (el) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const s = getComputedStyle(p);
        if (/(hidden|clip|auto|scroll)/.test(s.overflowX) || s.position === 'fixed') return true;
      }
      return false;
    };
    for (const el of document.querySelectorAll('body *')) {
      const s = getComputedStyle(el);
      if (s.position === 'fixed') continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      if ((r.left < -1 || r.right > vw + 1) && !clipped(el)) {
        out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ').join('.')} [${Math.round(r.left)}, ${Math.round(r.right)}]`);
        if (out.length > 14) break;
      }
    }
    return out;
  });
  console.log('OVERFLOW:\n' + wide.join('\n'));
}
if (problems.length) {
  console.log('PROBLEMS:\n' + [...new Set(problems)].join('\n'));
} else {
  console.log('no console errors');
}
await browser.close();
process.exit(problems.length ? 1 : 0);
