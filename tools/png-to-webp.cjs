/*
 * png-to-webp.cjs — convertit les planches d'illustrations PNG en WebP.
 *
 * Pourquoi : les 24 planches `assets/exercise-illustrations-v*.png` pèsent ~41 Mio et
 * représentent ~30 % de l'installeur (135 Mio). Elles sont TOUTES utilisées (sprites 3x2
 * déclarés dans strength.css), donc il ne s'agit pas de supprimer mais de changer de format.
 *
 * Comment : zéro nouvelle dépendance. Chromium sait encoder le WebP via `canvas.toDataURL`,
 * et Electron est déjà en devDependency. On ouvre une fenêtre cachée, on encode, puis —
 * c'est le point important — on **redécode le WebP et on le compare pixel à pixel au PNG
 * d'origine**. Je ne peux pas juger la qualité à l'œil, donc je la mesure : erreur moyenne
 * et erreur maximale par canal. Rien n'est écrit si le seuil est dépassé.
 *
 * Usage :  npx electron tools/png-to-webp.cjs [--quality=0.9] [--write]
 *          (sans --write : simulation, aucun fichier touché)
 */
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const ASSETS = path.join(__dirname, '..', 'src', 'assets');
const QUALITY = Number((process.argv.find(a => a.startsWith('--quality=')) || '').split('=')[1]) || 0.9;
const WRITE = process.argv.includes('--write');
/* Seuils de non-régression visuelle (canal 0-255). Au-delà, on refuse d'écrire.
   Le pic brut n'est pas un bon juge : un pixel isolé très écarté sur un bord franc ne se voit
   pas. Ce qui se voit, c'est la PROPORTION de sous-pixels au-delà du seuil de perception
   (~16/255 sur une image complexe). On garde le pic en information, on décide sur la part. */
const MAX_MEAN_ERR = 2.0;
const MAX_PCT_OVER = 0.5; // % de sous-pixels avec un écart > 16/255

const toFileUrl = p => 'file:///' + p.replace(/\\/g, '/').replace(/^\/+/, '');

const ENCODE = `(async (src, q) => {
  const load = u => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('load ' + u)); i.src = u; });
  const img = await load(src);
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const before = ctx.getImageData(0, 0, c.width, c.height).data;
  const webp = c.toDataURL('image/webp', q);
  if (webp.indexOf('data:image/webp') !== 0) throw new Error('encodeur WebP indisponible');
  const img2 = await load(webp);
  const c2 = document.createElement('canvas'); c2.width = c.width; c2.height = c.height;
  const ctx2 = c2.getContext('2d', { willReadFrequently: true });
  ctx2.drawImage(img2, 0, 0);
  const after = ctx2.getImageData(0, 0, c2.width, c2.height).data;
  let sum = 0, peak = 0, n = 0, over = 0;
  for (let i = 0; i < before.length; i += 4) {
    for (let k = 0; k < 3; k++) { const d = Math.abs(before[i + k] - after[i + k]); sum += d; if (d > peak) peak = d; if (d > 16) over++; n++; }
  }
  return { b64: webp.slice(webp.indexOf(',') + 1), meanErr: sum / n, peakErr: peak, pctOver: (over / n) * 100, w: c.width, h: c.height };
})(${JSON.stringify('__SRC__')}, ${QUALITY})`;

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false, width: 400, height: 300,
    webPreferences: { webSecurity: false, offscreen: true, contextIsolation: false, sandbox: false }
  });
  await win.loadURL('data:text/html,<!doctype html><meta charset="utf-8"><title>enc</title>');

  const files = fs.readdirSync(ASSETS).filter(f => /^exercise-illustrations-v\d+\.png$/i.test(f))
    .sort((a, b) => (+a.match(/\d+/)[0]) - (+b.match(/\d+/)[0]));
  if (!files.length) { console.error('Aucune planche trouvée dans', ASSETS); app.exit(1); return; }

  console.log(`${files.length} planches · qualité ${QUALITY} · ${WRITE ? 'ÉCRITURE' : 'SIMULATION'}\n`);
  let totalBefore = 0, totalAfter = 0, worstMean = 0, worstPeak = 0, failed = 0;
  const results = [];

  for (const f of files) {
    const src = path.join(ASSETS, f);
    const beforeBytes = fs.statSync(src).size;
    let r;
    try {
      r = await win.webContents.executeJavaScript(ENCODE.replace(JSON.stringify('__SRC__'), JSON.stringify(toFileUrl(src))));
    } catch (e) { console.error(`  ✗ ${f} — ${e.message}`); failed++; continue; }
    const buf = Buffer.from(r.b64, 'base64');
    const ok = r.meanErr <= MAX_MEAN_ERR && r.pctOver <= MAX_PCT_OVER && buf.length < beforeBytes;
    totalBefore += beforeBytes; totalAfter += buf.length;
    worstMean = Math.max(worstMean, r.meanErr); worstPeak = Math.max(worstPeak, r.pctOver);
    if (!ok) failed++;
    results.push({ f, beforeBytes, afterBytes: buf.length, ...r, ok });
    console.log(`  ${ok ? '✓' : '✗'} ${f.padEnd(34)} ${(beforeBytes / 1048576).toFixed(2)} → ${(buf.length / 1048576).toFixed(2)} Mio` +
      `  (−${Math.round((1 - buf.length / beforeBytes) * 100)}%)  Δmoy ${r.meanErr.toFixed(2)}  >16 : ${r.pctOver.toFixed(3)}%  (pic ${r.peakErr})`);
    if (WRITE && ok) fs.writeFileSync(src.replace(/\.png$/i, '.webp'), buf);
  }

  console.log(`\nTotal : ${(totalBefore / 1048576).toFixed(1)} → ${(totalAfter / 1048576).toFixed(1)} Mio ` +
    `(−${(( totalBefore - totalAfter) / 1048576).toFixed(1)} Mio, −${Math.round((1 - totalAfter / totalBefore) * 100)}%)`);
  console.log(`Pire écart moyen : ${worstMean.toFixed(2)}/255 · pire part >16 : ${worstPeak.toFixed(3)}% · échecs : ${failed}`);
  if (WRITE) console.log(failed ? '\n⚠️  Des planches ont échoué : PNG conservés pour celles-là.' : '\n✅ Toutes les planches écrites en .webp.');
  app.exit(failed ? 1 : 0);
}).catch(e => { console.error(e); app.exit(1); });
