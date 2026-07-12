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

test('CSS : accolades équilibrées par fichier', () => {
  const offenders = [];
  for (const f of cssFiles) {
    const clean = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const open = (clean.match(/\{/g) || []).length, close = (clean.match(/\}/g) || []).length;
    if (open !== close) offenders.push(`${f} (${open} vs ${close})`);
  }
  assert.deepEqual(offenders, [], 'accolades déséquilibrées');
});
