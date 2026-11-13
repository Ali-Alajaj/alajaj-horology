// Core web-vital style measurements with Playwright: node scripts/perf.mjs [url] [width] [height]
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:4173/';
const w = parseInt(process.argv[3] ?? '1440', 10);
const h = parseInt(process.argv[4] ?? '900', 10);
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
await page.addInitScript(() => {
  window.__m = { lcp: 0, lcpEl: '', cls: 0, tbt: 0, long: 0 };
  new PerformanceObserver((l) => l.getEntries().forEach((e) => {
    window.__m.lcp = e.startTime;
    window.__m.lcpEl = (e.element?.tagName ?? '?') + '.' + (e.element?.className ?? '');
  })).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((l) => l.getEntries().forEach((e) => !e.hadRecentInput && (window.__m.cls += e.value))).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((l) =>
    l.getEntries().forEach((e) => {
      window.__m.long++;
      window.__m.tbt += Math.max(0, e.duration - 50);
    }),
  ).observe({ type: 'longtask', buffered: true });
});
const t0 = Date.now();
await page.goto(url, { waitUntil: 'load' });
const load = Date.now() - t0;
await page.waitForTimeout(7000);
const fps = async (label, scroll) => {
  const r = await page.evaluate(
    (doScroll) =>
      new Promise((res) => {
        const times = [];
        let last = performance.now();
        const start = last;
        const max = document.documentElement.scrollHeight - innerHeight;
        const tick = (now) => {
          times.push(now - last);
          last = now;
          if (doScroll) window.scrollTo(0, Math.min(max, ((now - start) / 6000) * 6500));
          if (now - start < 6000) requestAnimationFrame(tick);
          else {
            times.shift();
            times.sort((a, b) => a - b);
            res({ avg: 1000 / (times.reduce((a, b) => a + b, 0) / times.length), p95ms: times[Math.floor(times.length * 0.95)] });
          }
        };
        requestAnimationFrame(tick);
      }),
    scroll,
  );
  console.log(`${label}: ${r.avg.toFixed(1)} fps avg, 95th percentile frame ${r.p95ms.toFixed(1)} ms`);
};
const fcp = await page.evaluate(() => performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0);
const m = await page.evaluate(() => window.__m);
const size = await page.evaluate(() => performance.getEntriesByType('resource').reduce((n, r) => n + (r.transferSize || 0), 0));
console.log(`viewport ${w}x${h}`);
console.log(`load event ${load} ms · FCP ${fcp.toFixed(0)} ms · LCP ${m.lcp.toFixed(0)} ms (${m.lcpEl}) · CLS ${m.cls.toFixed(3)} · long tasks ${m.long} (blocking ${m.tbt.toFixed(0)} ms) · transfer ${(size / 1024).toFixed(0)} kB`);
await fps('hero idle', false);
await fps('scrolling the 3D stage', true);
await browser.close();
