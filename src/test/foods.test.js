const test = require('node:test');
const assert = require('node:assert');
const { FOODS, searchFoods } = require('../lib/foods-data.js');

test('FOODS : base non vide, champs macros présents', () => {
  assert.ok(FOODS.length >= 40);
  for (const f of FOODS) {
    assert.equal(typeof f.n, 'string');
    assert.ok(f.kcal >= 0 && typeof f.kcal === 'number');
    assert.ok(f.p >= 0 && f.c >= 0 && f.f >= 0);
  }
});

test('searchFoods : insensible casse/accents, ligature œ', () => {
  assert.deepEqual(searchFoods('POULET').map(x => x.n), ['Blanc de poulet']);
  assert.ok(searchFoods('cereale').some(x => /céréales/i.test(x.n)));
  assert.ok(searchFoods('epinard').some(x => x.n === 'Épinards'));
  assert.ok(searchFoods('oeuf').length >= 1, 'oeuf trouve œuf');
});

test('searchFoods : requête vide → liste (limite), limite respectée', () => {
  assert.equal(searchFoods('', 5).length, 5);
  assert.ok(searchFoods('xyzzy').length === 0);
});
