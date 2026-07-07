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

test('searchFoods : les versions cuites remontent avant les crues', () => {
  const riz = searchFoods('riz', 6);
  const firstCooked = riz.findIndex(x => /\bcuite?s?\b/i.test(x.n));
  const firstRaw = riz.findIndex(x => /\bcrue?s?\b/i.test(x.n));
  assert.ok(firstCooked !== -1, 'au moins un riz cuit dans les premiers résultats');
  if (firstRaw !== -1) assert.ok(firstCooked < firstRaw, 'le cuit passe avant le cru');
  assert.ok(!/\bcrue?s?\b/i.test(searchFoods('poulet', 3)[0].n), 'poulet : 1er résultat non cru');
});

test('searchFoods : demander « cru » explicitement garde les crus en tête', () => {
  const r = searchFoods('riz cru', 5);
  assert.ok(r.length >= 1);
  assert.ok(r.every(x => /crue?s?/i.test(x.n)), 'tous les résultats sont crus');
});

test('searchFoods : multi-mots (tous les termes) + limite + vide', () => {
  assert.equal(searchFoods('', 8).length, 8);
  const r = searchFoods('poulet cru', 10);
  assert.ok(r.every(x => /poulet/i.test(x.n) && /cru/i.test(x.n)));
  assert.ok(searchFoods('zzzznope').length === 0);
});
