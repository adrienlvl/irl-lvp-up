const test = require('node:test');
const assert = require('node:assert');
const { EXERCISE_PATTERN, POSES, EXERCISE_ART, exerciseIcon, exercisePicture } = require('../lib/exercise-icons.js');
const { exercises, programs } = require('../lib/exercises-data.js');

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

test('programmes : chaque exercice cité existe dans la bibliothèque, days ↔ workouts alignés', () => {
  const names = new Set(exercises.map(e => e.name));
  for (const [key, p] of Object.entries(programs)) {
    assert.equal(p.days.length, p.workouts.length, `${key} : ${p.days.length} jours vs ${p.workouts.length} séances`);
    for (const w of p.workouts) {
      assert.ok(Array.isArray(w.exercises) && w.exercises.length, `${key} > ${w.title} : séance vide`);
      for (const ex of w.exercises) assert.ok(names.has(ex.name), `${key} > ${w.title} : « ${ex.name} » introuvable dans la bibliothèque`);
    }
  }
});

test('chaque exercice rend quelque chose : vraie photo si dispo, sinon figure SVG', () => {
  for (const ex of exercises) {
    const p = exercisePicture(ex.name);
    const ok = /exercise-art sheet-[1-6] art-p[0-5]/.test(p) || /ex-figure/.test(p);
    assert.ok(ok, `« ${ex.name} » ne rend ni photo ni figure`);
  }
  // les 6 exercices barre/traction sont sur la planche 6 (vraie photo)
  ['Tractions', 'Tractions supination', 'Tractions négatives', 'Suspension barre', 'Relevés de genoux suspendu', 'Rowing australien'].forEach(n => {
    assert.match(EXERCISE_ART[n], /^6 p[0-5]$/, n + ' → planche 6');
    assert.match(exercisePicture(n), /exercise-art sheet-6 art-p[0-5]/, n + ' rend une vraie photo');
  });
  // un exercice sans photo retombe sur la figure SVG (repli) — ex. les nouveaux plyo
  assert.match(exercisePicture('Squat sauté'), /ex-figure/);
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
