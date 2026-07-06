const test = require('node:test');
const assert = require('node:assert');
const { FOODS, searchFoods } = require('../lib/foods-data.js');

test('FOODS (CIQUAL) : base conséquente, champs cohérents', () => {
  assert.ok(FOODS.length >= 1500, 'extrait CIQUAL substantiel');
  for (const f of FOODS.slice(0, 200)) {
    assert.equal(typeof f.n, 'string');
    assert.ok(f.n.length > 0);
    assert.equal(typeof f.kcal, 'number');
    assert.ok(typeof f.cat === 'string' && f.cat.length === 1);
    if (f.p != null) assert.ok(f.p >= 0);
    if (f.c != null) assert.ok(f.c >= 0);
    if (f.f != null) assert.ok(f.f >= 0);
  }
});

test('searchFoods : classement — aliments simples avant plats composés', () => {
  const poulet = searchFoods('poulet', 5);
  assert.ok(poulet.length >= 1);
  assert.match(poulet[0].n, /^Poulet/i, 'le 1er résultat commence par Poulet');
  const riz = searchFoods('riz', 5);
  assert.ok(riz.some(x => /^Riz/i.test(x.n)));
});

test('searchFoods : insensible casse/accents/ligature œ', () => {
  assert.ok(searchFoods('POULET').length >= 1);
  assert.ok(searchFoods('epinard').some(x => /épinard/i.test(x.n)));
  assert.ok(searchFoods('oeuf').some(x => /œuf|oeuf/i.test(x.n)));
});

test('searchFoods : multi-mots (tous les termes) + limite + vide', () => {
  assert.equal(searchFoods('', 8).length, 8);
  const r = searchFoods('poulet cru', 10);
  assert.ok(r.every(x => /poulet/i.test(x.n) && /cru/i.test(x.n)));
  assert.ok(searchFoods('zzzznope').length === 0);
});
