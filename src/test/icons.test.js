const test = require('node:test');
const assert = require('node:assert');
const { EXERCISE_PATTERN, POSES, EXERCISE_ART, ANIMATED_SHEETS, buildAnimatedArt, exerciseIcon, exercisePicture } = require('../lib/exercise-icons.js');
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

test('chaque exercice a des notes de coaching complètes (fiche riche)', () => {
  for (const e of exercises) {
    for (const f of ['cue', 'explain', 'goal', 'avoid', 'family', 'kind']) {
      assert.ok(typeof e[f] === 'string' && e[f].trim().length > 0, `« ${e.name} » : champ « ${f} » manquant`);
    }
    assert.ok(e.sets > 0 && e.reps > 0, `« ${e.name} » : prescription (sets/reps) manquante`);
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
    const ok = /exercise-art sheet-[1-8] art-p[0-5]/.test(p) || /ex-figure/.test(p);
    assert.ok(ok, `« ${ex.name} » ne rend ni photo ni figure`);
  }
  // les 6 exercices barre/traction sont sur la planche 6 (vraie photo)
  ['Tractions', 'Tractions supination', 'Tractions négatives', 'Suspension barre', 'Relevés de genoux suspendu', 'Rowing australien'].forEach(n => {
    assert.match(EXERCISE_ART[n], /^6 p[0-5]$/, n + ' → planche 6');
    assert.match(exercisePicture(n), /exercise-art sheet-6 art-p[0-5]/, n + ' rend une vraie photo');
  });
  // planches 7 & 8 : les 10 exercices trail-hybride ont désormais une vraie photo
  assert.match(exercisePicture('Squat sauté'), /exercise-art sheet-7 art-p0/, 'Squat sauté → planche 7');
  assert.match(exercisePicture('Good morning kettlebell'), /exercise-art sheet-7 art-p5/, 'Good morning KB → planche 7');
  assert.match(exercisePicture('Nordic curl'), /exercise-art sheet-8 art-p0/, 'Nordic curl → planche 8');
  assert.match(exercisePicture('Planche touches d’épaule'), /exercise-art sheet-8 art-p3/, 'Planche touches d’épaule → planche 8');
  // désormais les 47 exercices ont une vraie photo : plus aucun ne retombe sur la figure SVG
  assert.ok(exercises.every(e => /sheet-[1-8] art-p[0-5]/.test(exercisePicture(e.name))), 'tous les exercices ont une photo');
  // un NOM inconnu retombe proprement sur la figure SVG (repli sûr)
  assert.match(exercisePicture('Exercice sans photo'), /ex-figure/);
});

test('animation début↔fin : moteur prêt, activé par planche « position B »', () => {
  // builder pur : 2 calques (position A + position B) sur la même case
  const m = buildAnimatedArt('6 p0', '', 'Tractions');
  assert.match(m, /exercise-art-anim/);
  assert.match(m, /sheet-6 art-p0 frame-a/);
  assert.match(m, /sheet-6b art-p0 frame-b/);
  // tant qu'une planche n'est pas déclarée animée : photo fixe (aucune régression)
  assert.ok(!/exercise-art-anim/.test(exercisePicture('Tractions', '', true)), 'pas d’animation sans planche B');
  // dès qu'une planche « position B » est livrée : l'exercice s'anime en vue détail
  ANIMATED_SHEETS.add(6);
  assert.match(exercisePicture('Tractions', '', true), /exercise-art-anim/, 'animé quand la planche B existe');
  assert.ok(!/exercise-art-anim/.test(exercisePicture('Tractions', '', false)), 'statique hors vue détail (animated=false)');
  ANIMATED_SHEETS.delete(6);
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
