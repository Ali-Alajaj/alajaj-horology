// End-to-end check of the interactive flows. Usage: node scripts/flows.mjs [width] [height]
import { chromium } from 'playwright';
import fs from 'node:fs';

const w = parseInt(process.argv[2] ?? '1440', 10);
const h = parseInt(process.argv[3] ?? '900', 10);
const base = process.env.URL ?? 'http://localhost:5173/';
const tag = `shots/flow-${w}`;
fs.mkdirSync('shots', { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 768, isMobile: w < 768 });
const page = await ctx.newPage();
const problems = [];
page.on('console', (m) => m.type() === 'error' && problems.push('console: ' + m.text()));
page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
page.on('response', (r) => r.status() >= 400 && problems.push(`http ${r.status()} ${r.url()}`));

const to = async (sel, offset = 0) => {
  await page.evaluate(
    ([s, o]) => {
      const el = document.querySelector(s);
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + o);
    },
    [sel, offset],
  );
  await page.waitForTimeout(1500);
};
const go = async (path, wait = 2500) => {
  await page.evaluate((p) => (window.location.hash = p), path);
  await page.waitForTimeout(wait);
};
const step = async (name, fn) => {
  try {
    await fn();
    console.log('ok   ' + name);
  } catch (e) {
    console.log('FAIL ' + name + ': ' + e.message.split('\n')[0]);
    problems.push('step ' + name);
  }
};

await page.goto(base);
await page.waitForTimeout(6500);

await step('header navigation reaches every page', async () => {
  for (const [path, sel] of [
    ['/about', '#complication'],
    ['/boutique', '#boutique'],
    ['/shop', '#collection'],
  ]) {
    await go(path, 1800);
    if (!(await page.locator(sel).count())) throw new Error('missing ' + sel + ' on ' + path);
    const y = await page.evaluate(() => window.scrollY);
    if (y > 5) throw new Error(path + ' did not start at the top');
  }
});

await step('collection: specifications open on click, quick view shows a 3D watch', async () => {
  await page.waitForTimeout(3000);
  const toggle = page.locator('.mcard__toggle').first();
  await toggle.scrollIntoViewIfNeeded();
  await toggle.click();
  await page.waitForTimeout(900);
  if ((await page.locator('.mcard__sheet.is-open').count()) !== 1) throw new Error('specs did not open');
  await page.screenshot({ path: `${tag}-shop.png` });
  // the sheet closes by itself when the page is scrolled on
  await page.evaluate(() => window.scrollBy(0, 1400));
  await page.waitForTimeout(900);
  if (await page.locator('.mcard__sheet.is-open').count()) throw new Error('specs did not close on scroll');
  await page.evaluate(() => window.scrollBy(0, -1400));
  await page.waitForTimeout(600);
  await page.locator('.mcard__visual').first().click();
  await page.waitForTimeout(3500);
  if (!(await page.locator('.qv canvas').count())) throw new Error('no canvas in quick view');
  await page.screenshot({ path: `${tag}-quickview.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(900);
  if (await page.locator('.modal.is-open').count()) throw new Error('modal still open');
});

await step('configure: rose gold, blue dial, Arabic numerals, bracelet', async () => {
  await to('#configurator', w < 1024 ? 480 : 0);
  await page.waitForTimeout(2500);
  await page.locator('.card-opt', { hasText: 'ذهب وردي' }).click();
  await page.locator('.dot-opt[title="أزرق ليلي"]').click();
  await page.locator('.seg__item', { hasText: 'أرقام مشرقية' }).click();
  await page.locator('.card-opt', { hasText: 'سلسلة فولاذية' }).click();
  await page.waitForTimeout(2200);
  const price = await page.locator('.cfg__price-value').innerText();
  if (!price.includes('90,000')) throw new Error('price was ' + price);
  if (w < 1024) await to('#configurator', 0);
  await page.screenshot({ path: `${tag}-config.png` });
});

await step('add configured watch to cart', async () => {
  if (w < 1024) await to('.cfg__buy', -300);
  await page.locator('.cfg__buy .btn--gold').click();
  await page.waitForTimeout(700);
  const count = await page.locator('.cart-btn__count').innerText();
  if (count.trim() !== '1') throw new Error('count ' + count);
  const box = await page.locator('.toast').first().boundingBox();
  if (!box || box.y > 200 || Math.abs(box.x + box.width / 2 - w / 2) > 12) throw new Error('message is not top centre');
  await page.screenshot({ path: `${tag}-added.png` });
});

await step('cart drawer shows item, VAT and total', async () => {
  await page.locator('.cart-btn').click();
  await page.waitForTimeout(1300);
  const text = await page.locator('.drawer').innerText();
  if (!text.includes('13,500') || !text.includes('103,500')) throw new Error('totals missing');
  await page.screenshot({ path: `${tag}-cart.png` });
});

await step('checkout page completes and empties the cart', async () => {
  await page.locator('.drawer__foot .btn--gold').click();
  await page.waitForTimeout(2000);
  if (!(await page.locator('.co-grid').count())) throw new Error('checkout page not shown');
  await page.locator('.co-form + .co-summary .btn--gold, .co-summary .btn--gold').first().click();
  await page.waitForTimeout(500);
  if ((await page.locator('.co-form .error').count()) < 2) throw new Error('validation did not show');
  await page.locator('#co-name').fill('ضيف تجريبي');
  await page.locator('#co-city').selectOption({ index: 1 });
  await page.locator('.co-method', { hasText: 'توصيل' }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${tag}-checkout.png` });
  await page.locator('.co-summary .btn--gold').click();
  await page.waitForTimeout(350);
  if (!(await page.locator('.co-summary .spinner').count())) throw new Error('no sending state');
  await page.waitForTimeout(1500);
  const done = await page.locator('.co-done').innerText();
  if (!done.includes('AJ-')) throw new Error('no order number');
  await page.screenshot({ path: `${tag}-checkout-done.png` });
  const count = await page.locator('.cart-btn__count').innerText();
  if (count.trim() !== '0') throw new Error('cart not empty');
});

await step('boutique appointment saves locally', async () => {
  await go('/boutique');
  await to('#boutique', w < 1024 ? 480 : 0);
  await page.locator('#apt-city').selectOption({ label: 'الرياض' });
  await page.locator('.cal__day:not([disabled])').nth(2).click();
  await page.locator('.time', { hasText: '18:00' }).click();
  await page.locator('#apt-name').fill('ضيف تجريبي');
  await page.locator('.apt__form button[type=submit]').click();
  await page.waitForTimeout(1200);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('alajaj-store-v1')).state.appointments.length);
  if (stored !== 1) throw new Error('appointments stored: ' + stored);
  if (!(await page.locator('.modal.is-open .apt-pop').count())) throw new Error('no confirmation popup');
  await page.screenshot({ path: `${tag}-appointment-popup.png` });
  await page.locator('.apt-pop .btn').click();
  await page.waitForTimeout(2600);
  const y = await page.evaluate(() => window.scrollY);
  if (y > 5) throw new Error('did not return to the top, scrollY=' + y);
  await page.screenshot({ path: `${tag}-appointment.png` });
});

await step('home: FAQ accordion toggles', async () => {
  await go('/', 4500);
  await to('#faq', w < 1024 ? 300 : 0);
  await page.locator('.acc button').nth(2).click();
  await page.waitForTimeout(900);
  const open = await page.locator('.acc.is-open').count();
  if (open !== 1) throw new Error('open panels: ' + open);
});

await step('newsletter mock subscribe', async () => {
  await to('.foot', 0);
  await page.locator('#news-email').fill('guest@domain.example');
  await page.locator('.foot__form .btn').click();
  await page.waitForTimeout(700);
  if (!(await page.locator('.foot__ok').count())) throw new Error('no confirmation');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${tag}-footer.png` });
});

await step('404 for an unknown route and an unknown path', async () => {
  await go('/no-such-page', 1200);
  if (!(await page.locator('.nf').count())) throw new Error('hash 404 not shown');
  await page.goto(base + 'no-such-page');
  await page.waitForTimeout(1500);
  if (!(await page.locator('.nf').count())) throw new Error('path 404 not shown');
  await page.screenshot({ path: `${tag}-404.png` });
});

console.log(problems.length ? 'PROBLEMS:\n' + [...new Set(problems)].join('\n') : 'no console errors');
await browser.close();
process.exit(problems.length ? 1 : 0);
