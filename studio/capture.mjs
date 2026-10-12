// =====================================================================
//  LE TOURNAGE : on avance le temps image par image et on "photographie" chaque image
//  node capture.mjs <episode> <dossier> [fps=24] [première image] [dernière image]
//  Reprend là où il s'était arrêté (les images déjà faites sont gardées).
// =====================================================================
import { chromium } from 'playwright';
import fs from 'fs';

const [ep, OUT, fpsArg, aArg, bArg] = process.argv.slice(2);
const FPS = Number(fpsArg || 24);
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', (e) => console.log('ERREUR PAGE :', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('console :', m.text()); });
await page.goto(`http://localhost:8124/index.html?ep=${ep}`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 300000 });
const cdp = await page.context().newCDPSession(page);
// une image « à vide » : la toute première image après le chargement sort parfois incomplète
await page.evaluate(async () => { await window.renderAt(0); await window.renderAt(0.01); });
await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 50, optimizeForSpeed: true });

// la "partition" (moments clés) est exportée pour la bande-son
const info = await page.evaluate(() => ({ T: window.T, events: window.getEvents() }));
fs.writeFileSync(`${OUT}/events.json`, JSON.stringify(info, null, 1));

const N = Math.round(info.T.duration * FPS);
const first = Number(aArg || 0), last = Math.min(N - 1, bArg === undefined ? N - 1 : Number(bArg));
const t0 = Date.now(); let done = 0;
for (let i = first; i <= last; i++) {
  const f = `${OUT}/f${String(i).padStart(5, '0')}.jpg`;
  if (fs.existsSync(f)) continue;
  await page.evaluate((t) => window.renderAt(t), i / FPS);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 93, optimizeForSpeed: true });
  fs.writeFileSync(f, Buffer.from(data, 'base64'));
  done++;
  if (done % 48 === 0) {
    const s = (Date.now() - t0) / 1000, per = s / done, left = (last - i) * per;
    console.log(`${i + 1}/${N} images — ${per.toFixed(2)} s/image — reste ~${Math.round(left / 60)} min`);
  }
}
console.log('FIN', ep, `${N} images à ${FPS} i/s`);
await browser.close();
