// usage: node tools/render.mjs [--workers 4] [--from 0] [--to 1200] [--fps 24]
// Renders frames with N parallel Chromium pages into out/frames/f00000.jpg
import { createRequire } from 'node:module'; const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright');
import fs from 'node:fs'; import { serve } from './serve.mjs';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? +process.argv[i + 1] : d; };
const WORKERS = arg('workers', 4), FPS = arg('fps', 60), FROM = arg('from', 0), TO = arg('to', 50 * FPS), Q = arg('q', 0.96);
const outdir = 'out/frames'; fs.mkdirSync(outdir, { recursive: true });
const { server, url } = await serve();
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
let next = FROM, done = 0; const t0 = Date.now();
async function worker(id) {
  const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  pg.on('pageerror', e => console.log('[pageerror]', e.message));
  await pg.goto(url + 'web/index.html'); await pg.waitForFunction(() => window.__ready || window.__error, null, { timeout: 120000 });
  const err = await pg.evaluate(() => window.__error); if (err) throw new Error(err);
  while (true) {
    const f = next++; if (f >= TO) break;
    const data = await pg.evaluate(({ t, q }) => { window.__renderFrame(t); return document.getElementById('c').toDataURL('image/jpeg', q); }, { t: f / FPS, q: Q });
    fs.writeFileSync(`${outdir}/f${String(f).padStart(5, '0')}.jpg`, Buffer.from(data.split(',')[1], 'base64'));
    if (++done % 40 === 0) { const el = (Date.now() - t0) / 1000; console.log(`${done}/${TO - FROM} frames  ${el.toFixed(0)}s  eta ${(el / done * (TO - FROM - done)).toFixed(0)}s`); }
  }
}
await Promise.all(Array.from({ length: WORKERS }, (_, i) => worker(i)));
await b.close(); server.close(); console.log('done', ((Date.now() - t0) / 1000).toFixed(0) + 's');
