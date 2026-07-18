# 441 — Cible du jour : compter les séances au format legacy `w.exercise` (2.0.74)

**Boucle #441 · build 2.0.74 · domaine Athlète / Musculation · correctness + robustesse (§4.4/§4.2)**

## Le manque (vérifié avant de coder)

`progressionSuggestion` (`logic.js:6076`) calcule la « cible du jour » (double progression) d'un
exercice à partir de `state.workouts`. Elle alimente :
- la ligne `.prog-next` de la fiche exercice (`app.js:305`),
- le « 🎯 Cible du jour : X reps × Y kg » de la séance guidée (`app.js:337`, `#guidedTarget`),
- le bloc historique du détail exercice (`app.js:663`, via `progressionText`).

Sa garde d'entrée `if (!w || !Array.isArray(w.exercises) || …) return;` **ignorait la forme legacy
mono-exercice** `w.exercise` (séance dont l'exercice est noté directement sur l'objet séance, sans
tableau `exercises`). Or **sa voisine immédiate** `estimatedOneRmSeries` (`logic.js:6117`) applique
le repli legacy, tout comme `bestE1rmByExercise`, `workoutsTable`, `personalRecords` (corrigée en
#440)… `progressionSuggestion` était le dernier jumeau asymétrique — piste #4 (la **dernière**) de
la mémoire `backlog-leads-distinct-days-legacy`, même famille que #425 / #440.

Les séances créées aujourd'hui écrivent TOUJOURS `exercises:[…]` (`app.js:641`) ; un format
mono-exercice ne peut donc venir que d'un **import / restauration de sauvegarde / données legacy**.

**Conséquence** : si l'historique d'un exercice ne contenait QUE des séances legacy, l'app affichait
l'historique (les sœurs le gèrent) mais `progressionSuggestion` renvoyait `null` → aucune « cible du
jour » (ligne vide en séance guidée et fiche exercice), alors que les données existaient.

## Le correctif

Aligner `progressionSuggestion` sur ses sœurs : sortir tôt uniquement sur date invalide, puis
calculer `exos` avec le repli legacy avant la boucle.

```js
if (!w || !/^\d{4}-\d{2}-\d{2}$/.test(String(w.date || ''))) return;
const exos = Array.isArray(w.exercises) && w.exercises.length ? w.exercises
  : (w.exercise ? [{ name: w.exercise, load: w.load, reps: w.reps }] : []);
exos.forEach(ex => { … });
```

Rétro-compatible : une séance moderne (`exercises` non vide) suit exactement le même chemin qu'avant.
L'objet legacy n'a pas de `setLogs` → la branche « meilleure série » ne se déclenche pas, `load`/
`reps` de l'objet sont utilisés tels quels.

## Tests

- **logic.test.js** : test `progressionSuggestion` étendu — 2 séances legacy `w.exercise`
  (Tractions 80 kg × 8 puis × 12 → au plafond) : sans le fix, `null` ; avec, `action==='weight'`,
  `nextLoad===82.5`, `date==='2026-06-08'`. + mix legacy + moderne (la date la plus récente reste la
  référence).
- **renderer-smoke.cjs** : check `progression` étendu au cas legacy **et promu bloquant**
  (`if (!checks.progression) errors.push(…)`).

`cd src && xvfb-run -a npm run verify` → **442 tests + smoke 100 % vert**.

## Suite

Piste #4 **faite** → **la famille « repli legacy `w.exercise` » / « jours distincts » de la mémoire
`backlog-leads-distinct-days-legacy` est close** (pistes 1→4 toutes traitées, #438→#441). Prochain
run : ré-auditer d'autres fonctions pures de `logic.js` pour un nouveau lot de pistes.
