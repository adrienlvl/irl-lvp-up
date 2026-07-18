# 451 — `blockWindowStats` : décompte des séries robuste aux séances saisies à la main (jumeau de #444)

_Boucle autonome VPS · 2026-07-18 · domaine Musculation/Périodisation · correctness/robustesse (§4.1/§4.2) · **sans bump** (champ non surfacé)._

## Le manque (réel, prouvé par test)

`blockWindowStats` (`logic.js:3828`) agrège une fenêtre de bloc :

```js
list.forEach(w => { tonnage += workoutTonnage(w) || 0; sets += completedSetCount(w && w.exercises) || 0; });
```

- `workoutTonnage(w)` gère **trois** formes de séance : setLogs validés, exercices `{load,reps,sets}`
  **sans** setLogs, et le legacy mono-exercice `w.exercise` (repli posé en #444).
- `completedSetCount(w.exercises)` ne compte QUE les `setLogs` cochés `completed`. Or une séance
  **saisie au formulaire manuel** (`#addWorkoutButton` → `app.js:641`) est stockée avec
  `exercises: [{name, load, reps, sets}]` **sans `setLogs`** (les setLogs ne naissent qu'en séance
  guidée), et une séance legacy n'a pas de tableau `exercises` du tout.

Conséquence : pour un bloc rempli à la main, `blockWindowStats` renvoyait `tonnage > 0` mais
**`sets: 0`** — exactement l'incohérence interne que #444 a corrigée côté tonnage, restée ouverte
côté séries. C'est un défaut du **contrat** de la fonction pure (et de `blockComparison` qui propage
`first.sets`/`last.sets`), prouvable par test.

## Le correctif

Nouveau helper `workoutSetCount(workout)` (`logic.js`, juste après `workoutTonnage`), **symétrique**
de `workoutTonnage` : même extraction d'exercices (tableau `exercises`, sinon repli legacy
`w.exercise`), séries **validées** quand il y a des setLogs (chemin **identique** à
`completedSetCount`, aucune régression), sinon le champ `sets` (borné `Math.max(0, round)`).
`blockWindowStats` l'utilise à la place de `completedSetCount(w.exercises)`. Helper exporté.

Rétro-compatible : les séances guidées (setLogs) donnent le même décompte qu'avant. Seul le cas
« pas de setLogs » (saisie manuelle / legacy) change, de 0 vers le nombre réel de séries.

## Portée / honnêteté

`blockWindowStats.sets` n'est **pas rendu** aujourd'hui (le rendu de `blockComparison` et de
`blocksByObjective` n'affiche que `sessions` + `tonnage`) → **aucun effet visible** pour Adrien,
donc **pas de bump de version** ni d'entrée CHANGELOG (§6). C'est une remise en cohérence interne
d'un contrat de fonction pure (famille #444), pas une nouvelle fonctionnalité.

## Vérif

- +1 test `workoutSetCount` (setLogs validés vs repli `sets` vs legacy `w.exercise` vs bornes hostiles).
- Assertions ajoutées au test `blockWindowStats` existant : bloc saisi à la main (1600 kg / 4 séries)
  + legacy (1200 kg / 3 séries) → `tonnage 2800`, `sets 7`.
- `cd src && xvfb-run -a npm run verify` : **447 tests + smoke** 100 % vert.

## Suites possibles

Familles bug pur du cœur (dédup-date, DST, seuils, legacy tonnage/sets) closes. Prochaines boucles :
couverture de tests ciblée, a11y (déjà solide), ou polish UX vérifiable au smoke. Voir la note mémoire
`backlog-leads-distinct-days-legacy`.
