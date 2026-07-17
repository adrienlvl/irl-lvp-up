# 440 — Records perso : compter les séances au format legacy `w.exercise` (2.0.73)

**Boucle #440 · build 2.0.73 · domaine Athlète / Musculation · correctness + robustesse (§4.4/§4.2)**

## Le manque (vérifié avant de coder)

`personalRecords` (`logic.js:4105`) calcule le meilleur poids / meilleures reps par exercice à
partir de `state.workouts`. Elle alimente les toasts « 🎉 Nouveau record » à l'enregistrement
d'une séance (`newRecords` sur snapshots avant/après, `app.js:641`), le bilan de séance guidée
(`showGuidedRecap`, `app.js:364`) et les records battus en direct (`liveSetRecord`, `app.js:684`).

Sa garde d'entrée `if (!w || !Array.isArray(w.exercises)) return;` **ignorait la forme legacy
mono-exercice** `w.exercise` (séance dont l'exercice est noté directement sur l'objet séance, sans
tableau `exercises`). Or **toutes ses sœurs** gèrent ce repli : `bestE1rmByExercise`
(`logic.js:4004`), `workoutsTable` (`logic.js:4430`), `sessionSummary`… via le motif
`Array.isArray(w.exercises) && w.exercises.length ? w.exercises : (w.exercise ? [{...}] : [])`.
C'était la seule asymétrique — piste #3 de la mémoire `backlog-leads-distinct-days-legacy`, même
famille que #425 (repli legacy `w.exercise`).

Les séances créées aujourd'hui écrivent TOUJOURS `exercises:[...]` (`app.js:641`) ; un format
mono-exercice ne peut donc venir que d'un **import / restauration de sauvegarde / données legacy** —
exactement la porte des bugs précédents.

**Conséquence** : un record all-time posé dans une vieille séance mono-exercice était **volé** (jamais
vu par `personalRecords`). Le snapshot « avant » sous-évaluait alors le record, et une charge
**inférieure** au vrai record pouvait déclencher à tort un « 🎉 Nouveau record ».

## Le correctif

Aligner `personalRecords` sur ses sœurs : calculer `exos` avec le repli legacy avant la boucle,
au lieu de sortir tôt.

```js
if (!w) return;
const exos = Array.isArray(w.exercises) && w.exercises.length
  ? w.exercises
  : (w.exercise ? [{ name: w.exercise, load: w.load, reps: w.reps }] : []);
exos.forEach(ex => { ... });
```

Rétro-compatible : une séance moderne (`exercises` non vide) suit exactement le même chemin qu'avant.

## Tests

- **logic.test.js** : test `personalRecords` étendu — 3 séances (2 legacy `w.exercise` à 80/85 kg +
  1 moderne à 82 kg). Sans le fix, la charge tomberait à 82 (seule la moderne compterait) ; avec le
  fix, `load === 85` (legacy comptée), `reps === 6`, `date === '2026-05-15'` (la date suit la dernière
  amélioration — ici les reps).

Pas de changement de rendu → pas de nouveau check smoke (le check `records`/`newRecordToast`
existants restent verts).

`cd src && xvfb-run -a npm run verify` → **442 tests + smoke 100 % vert**.

## Suite

Piste #3 de la mémoire `backlog-leads-distinct-days-legacy` **faite**. Reste la piste #4 :
`progressionSuggestion` (`logic.js:6069`) — même garde legacy `w.exercise` manquante, jumeau côté
« cible du jour ».
