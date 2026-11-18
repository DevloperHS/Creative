// usage: node tools/stills.mjs <outdir> t1 t2 t3 ...   (renders full-quality stills)
import { createRequire } from 'node:module'; const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright'); import fs from 'node:fs'; import { serve } from './serve.mjs';
const [outdir, ...ts] = process.argv.slice(2); fs.mkdirSync(outdir, { recursive: true });
const { server, url } = await serve();
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
pg.on('console', m => { if (m.type() === 'error') console.log('[page]', m.text()); }); pg.on('pageerror', e => console.log('[pageerror]', e.message));
await pg.goto(url + 'web/index.html'); await pg.waitForFunction(() => window.__ready || window.__error, null, { timeout: 60000 });
const err = await pg.evaluate(() => window.__error); if (err) { console.log('INIT ERROR', err); process.exit(1); }
for (const t of ts) { const t0 = Date.now(); const e = await pg.evaluate((t) => { try { return window.__renderFrame(t) && null; } catch (e) { return String(e.stack); } }, +t); if (e) { console.log('ERR @', t, e); continue; }
  const el = await pg.$('#c'); await el.screenshot({ path: `${outdir}/t${String(t).replace('.', '_').padStart(5, '0')}.png` }); console.log('t=', t, Date.now() - t0, 'ms'); }
await b.close(); server.close();
