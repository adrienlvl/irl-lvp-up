const test = require('node:test');
const assert = require('node:assert');
const { EXERCISE_PATTERN, POSES, EXERCISE_ART, exerciseIcon, exercisePicture } = require('../lib/exercise-icons.js');
const { exercises } = require('../lib/exercises-data.js');

test('chaque exercice de la bibliothèque est mappé à un pattern connu', () => {
  const patterns = new Set(Object.keys(POSES));
  for (const ex of exercises) {
    const p = EXERCISE_PATTERN[ex.name];
    assert.ok(p, `pattern manquant pour « ${ex.name} »`);
    assert.ok(patterns.has(p), `pattern inconnu « ${p} » pour « ${ex.name} »`);
  }
});

test('chaque pattern a deux positions (a/b) — le mouvement est illustrable', () => {
  for (const [name, P] of Object.entries(POSES)) {
    assert.ok(typeof P.a === 'string' && P.a.length > 0, name + ' pose A');
    assert.ok(typeof P.b === 'string' && P.b.length > 0, name + ' pose B');
  }
});

test('les 37 exercices ont une vraie photo (EXERCISE_ART) ; exercisePicture renvoie le sprite', () => {
  for (const ex of exercises) {
    assert.ok(EXERCISE_ART[ex.name], `photo manquante pour « ${ex.name} »`);
  }
  // les 6 exercices barre/traction sont sur la planche 6
  ['Tractions', 'Tractions supination', 'Tractions négatives', 'Suspension barre', 'Relevés de genoux suspendu', 'Rowing australien'].forEach(n => {
    assert.match(EXERCISE_ART[n], /^6 p[0-5]$/, n + ' → planche 6');
    assert.match(exercisePicture(n), /exercise-art sheet-6 art-p[0-5]/, n + ' rend une vraie photo');
  });
  // un exercice sans photo retomberait sur la figure SVG (repli)
  assert.match(exercisePicture('Exercice sans photo'), /ex-figure/);
});

test('exerciseIcon : SVG valide ; animé = va-et-vient ; statique = deux positions', () => {
  const s = exerciseIcon('Tractions');
  assert.match(s, /^<svg[\s\S]*<\/svg>$/, 'un SVG complet');
  assert.match(s, /viewBox="0 0 80 76"/);
  assert.ok(!s.includes('<animate'), 'statique par défaut (cartes/vignettes)');
  const anim = exerciseIcon('Tractions', true);
  assert.ok(anim.includes('<animate'), 'animé pour les grandes vues');
  // patterns distincts → illustrations distinctes
  assert.notEqual(exerciseIcon('Goblet squat kettlebell'), exerciseIcon('Tractions'));
  // nom inconnu → repli propre (pas de crash), SVG quand même
  assert.match(exerciseIcon('Exercice inexistant'), /<svg/);
});
