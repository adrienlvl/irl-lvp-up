'use strict';
// Vérifie les fondations PWA : manifest valide, icônes présentes, service worker dont
// le précache pointe sur des fichiers réels, et branchement dans index.html / app.js.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const dir = path.join(__dirname, '..');

test('PWA : manifest valide + champs requis + icônes présentes', () => {
  const m = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.webmanifest'), 'utf8'));
  assert.ok(m.name && m.short_name, 'name / short_name');
  assert.equal(m.display, 'standalone', 'display standalone');
  assert.ok(m.start_url, 'start_url');
  assert.ok(m.theme_color && m.background_color, 'theme/background color');
  assert.ok(Array.isArray(m.icons) && m.icons.length >= 1, 'au moins une icône');
  m.icons.forEach(ic => {
    assert.equal(ic.type, 'image/png', 'icône PNG');
    assert.ok(fs.existsSync(path.join(dir, ic.src)), 'fichier icône présent : ' + ic.src);
  });
  // raccourcis d'app (menu long-press sur l'icône installée)
  assert.ok(Array.isArray(m.shortcuts) && m.shortcuts.length >= 3, 'shortcuts définis');
  m.shortcuts.forEach(sc => { assert.ok(sc.name && /\?go=/.test(sc.url), 'shortcut nom + url ?go='); });
  // bouton d'installation + capture beforeinstallprompt
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  assert.ok(/id="installBtn"/.test(html), 'bouton installer présent');
  const appjs = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');
  assert.ok(/beforeinstallprompt/.test(appjs), 'capture beforeinstallprompt');
  assert.ok(/URLSearchParams\(location\.search\)/.test(appjs), 'traitement du paramètre ?go des raccourcis');
});
test('PWA : bannières hors-ligne + mise à jour + détection SW update', () => {
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  assert.ok(/id="offlineBanner"/.test(html) && /id="pwaUpdateBanner"/.test(html), 'bannières présentes');
  const appjs = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');
  assert.ok(/updatefound/.test(appjs), 'détection de mise à jour du SW');
  assert.ok(/addEventListener\('offline'/.test(appjs) && /navigator\.onLine/.test(appjs), 'indicateur hors-ligne');
});
test('PWA : aide d’installation iOS (détection + bannière)', () => {
  const L = require('../lib/logic.js');
  const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
  assert.equal(L.isIosInstallable(ua, false), true, 'iPhone non installé → true');
  assert.equal(L.isIosInstallable(ua, true), false, 'déjà en app → false');
  assert.equal(L.isIosInstallable('Mozilla/5.0 (Windows NT 10.0)', false), false, 'desktop → false');
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  assert.ok(/id="iosInstallHint"/.test(html), 'bannière iOS présente');
});

test('PWA : le service worker précache des fichiers qui existent vraiment', () => {
  const sw = fs.readFileSync(path.join(dir, 'service-worker.js'), 'utf8');
  const block = /const SHELL = \[([\s\S]*?)\];/.exec(sw);
  assert.ok(block, 'tableau SHELL présent');
  const entries = (block[1].match(/'([^']+)'/g) || []).map(s => s.slice(1, -1));
  assert.ok(entries.length >= 10, 'précache non vide');
  entries.forEach(e => {
    const rel = e === './' ? 'index.html' : e;
    assert.ok(fs.existsSync(path.join(dir, rel)), 'précache existe : ' + e);
  });
  assert.ok(entries.includes('app.js') && (entries.includes('./') || entries.includes('index.html')));
  // cache versionné + gestion des requêtes
  assert.ok(/const CACHE = 'irl-lvp-up-v\d+'/.test(sw), 'nom de cache versionné');
  assert.ok(/addEventListener\('fetch'/.test(sw) && /addEventListener\('activate'/.test(sw), 'handlers fetch + activate');
  assert.ok(/isAsset/.test(sw), 'distinction code vs image (network-first / cache-first)');
});

test('PWA : workflow de déploiement + doc présents et cohérents', () => {
  const repo = path.join(dir, '..');
  const wf = path.join(repo, '.github', 'workflows', 'pages.yml');
  assert.ok(fs.existsSync(wf), 'workflow GitHub Pages présent');
  const y = fs.readFileSync(wf, 'utf8');
  assert.ok(/upload-pages-artifact/.test(y) && /deploy-pages/.test(y), 'étapes Pages');
  assert.ok(/src\/index\.html/.test(y) && /src\/\*\.css/.test(y) && /src\/lib\/\*\.js/.test(y), 'copie les assets web');
  assert.ok(fs.existsSync(path.join(repo, 'docs', 'DEPLOIEMENT-WEB.md')), 'doc de déploiement présente');
});
test('PWA : aucun chemin absolu qui casserait un hébergement en sous-chemin', () => {
  for (const f of ['index.html', 'app.js']) {
    const txt = fs.readFileSync(path.join(dir, f), 'utf8');
    assert.ok(!/(href|src)="\//.test(txt), `pas de href/src absolu dans ${f}`);
    assert.ok(!/register\('\//.test(txt), `enregistrement SW relatif dans ${f}`);
  }
});
test('PWA : index.html lie le manifest et app.js enregistre le SW', () => {
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  assert.ok(/rel="manifest"/.test(html), 'lien manifest dans le <head>');
  assert.ok(/apple-touch-icon/.test(html), 'icône iOS');
  const appjs = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');
  assert.ok(/serviceWorker[\s\S]{0,40}register\('service-worker\.js'\)/.test(appjs), 'enregistrement SW');
  assert.ok(/https\?:/.test(appjs), 'enregistrement gardé au protocole http(s)');
});
