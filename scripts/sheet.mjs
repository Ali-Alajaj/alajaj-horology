// Contact sheet: node scripts/sheet.mjs out.png cols img1 img2 ...
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const [out, cols, ...imgs] = process.argv.slice(2);
const cells = imgs
  .map((f) => {
    const b64 = fs.readFileSync(f).toString('base64');
    return `<figure><img src="data:image/png;base64,${b64}"><figcaption>${path.basename(f)}</figcaption></figure>`;
  })
  .join('');
const html = `<body style="margin:0;background:#222;display:grid;grid-template-columns:repeat(${cols},1fr);gap:6px;padding:6px">
<style>figure{margin:0;position:relative}img{width:100%;display:block}figcaption{position:absolute;top:4px;left:6px;color:#fff;font:12px monospace;background:#000a;padding:2px 5px}</style>${cells}</body>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1500, height: 800 } });
await p.setContent(html);
await p.screenshot({ path: out, fullPage: true });
await b.close();
