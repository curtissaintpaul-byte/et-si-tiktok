// Images de contrôle : node still.mjs <episode> <dossier> t1 t2 t3 …  → une image par instant + une planche
import { chromium } from 'playwright';
import fs from 'fs';
import { execSync } from 'child_process';

const [ep, OUT, ...ts] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', (e) => console.log('ERREUR PAGE :', e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.text().startsWith('[dbg]')) console.log('console :', m.text()); });
await page.goto(`http://localhost:8124/index.html?ep=${ep}`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 300000 });
const cdp = await page.context().newCDPSession(page);
// une image « à vide » : la toute première image après le chargement sort parfois incomplète
await page.evaluate(async () => { await window.renderAt(0); await window.renderAt(0.01); });
await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 50, optimizeForSpeed: true });
// la « partition » (pour tester la bande-son sans tout tourner)
fs.writeFileSync(`${OUT}/events.json`, JSON.stringify(await page.evaluate(() => ({ T: window.T, events: window.getEvents() })), null, 1));
const files = [];
for (const s of ts) {
  const t = Number(s);
  await page.evaluate((tt) => window.renderAt(tt), t);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 90, optimizeForSpeed: true });
  const f = `${OUT}/t${t.toFixed(2).padStart(6, '0')}.jpg`;
  fs.writeFileSync(f, Buffer.from(data, 'base64')); files.push(f);
}
await browser.close();
// planche contact (vignettes côte à côte, 6 par rangée)
execSync(`python3 planche.py ${OUT}/planche.jpg ${files.length <= 4 ? 400 : 300} ${files.join(' ')}`);
console.log('ok', files.length, 'images →', `${OUT}/planche.jpg`);
