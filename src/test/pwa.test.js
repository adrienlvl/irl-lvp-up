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

test('PWA : index.html lie le manifest et app.js enregistre le SW', () => {
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  assert.ok(/rel="manifest"/.test(html), 'lien manifest dans le <head>');
  assert.ok(/apple-touch-icon/.test(html), 'icône iOS');
  const appjs = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');
  assert.ok(/serviceWorker[\s\S]{0,40}register\('service-worker\.js'\)/.test(appjs), 'enregistrement SW');
  assert.ok(/https\?:/.test(appjs), 'enregistrement gardé au protocole http(s)');
});
