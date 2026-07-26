'use strict';
// Garde-fou CSS : détecte les déclarations à parenthèses déséquilibrées (ex. le bug
// width:min(440px,calc(100% - 32px) corrigé en 1.9.109) et les accolades non fermées.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const dir = path.join(__dirname, '..');
const cssFiles = fs.readdirSync(dir).filter(f => f.endsWith('.css'));

test('CSS : au moins un fichier de style présent', () => {
  assert.ok(cssFiles.length > 0);
});

test('CSS : parenthèses équilibrées dans chaque déclaration', () => {
  const offenders = [];
  for (const f of cssFiles) {
    const clean = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const part of clean.split(/[{};]/)) {
      const idx = part.indexOf(':');
      if (idx < 0) continue;
      const prop = part.slice(0, idx);
      // ignore les at-règles et conditions media (le « ( » est côté propriété)
      if (prop.includes('(') || prop.trim().startsWith('@')) continue;
      const val = part.slice(idx + 1);
      const open = (val.match(/\(/g) || []).length, close = (val.match(/\)/g) || []).length;
      if (open !== close) offenders.push(`${f} → ${prop.trim()}:${val.trim().slice(0, 60)} (${open} vs ${close})`);
    }
  }
  assert.deepEqual(offenders, [], 'déclarations CSS à parenthèses déséquilibrées');
});

// Les 594 tests passaient avec une planche d'illustration manquante : rien ne vérifiait que les
// url() du CSS pointent un fichier qui existe. Trou découvert lors du passage PNG → WebP (2.0.302).
test('CSS : chaque url(...) locale pointe un fichier qui existe', () => {
  const missing = [];
  for (const f of cssFiles) {
    const clean = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const refs = clean.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g) || [];
    for (const ref of refs) {
      const raw = ref.replace(/^url\(\s*['"]?/, '').replace(/['"]?\s*\)$/, '').trim();
      // On ne juge que les chemins locaux : ni data:, ni http(s):, ni #fragment.
      if (!raw || /^(data:|https?:|\/\/|#)/i.test(raw)) continue;
      const target = path.join(dir, raw.split('?')[0].split('#')[0]);
      if (!fs.existsSync(target)) missing.push(`${f} → ${raw}`);
    }
  }
  assert.deepEqual(missing, [], 'url() CSS pointant un fichier absent');
});

test('CSS : accolades équilibrées par fichier', () => {
  const offenders = [];
  for (const f of cssFiles) {
    const clean = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const open = (clean.match(/\{/g) || []).length, close = (clean.match(/\}/g) || []).length;
    if (open !== close) offenders.push(`${f} (${open} vs ${close})`);
  }
  assert.deepEqual(offenders, [], 'accolades déséquilibrées');
});
