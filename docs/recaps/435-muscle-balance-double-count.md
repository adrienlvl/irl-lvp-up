# 435 — Équilibre poussée/tirage : un exercice dos+épaules ne compte plus des deux côtés (2.0.68)

## Le manque (bug prouvé — §4.4 correctness / §4.2 robustesse, domaine Force / Athlète)

Rupture volontaire avec la série récente (#429→#433 « date impossible », #434 a11y) : un vrai bug de
**double comptage** dans le module Force, issu d'un audit ciblé de domaines peu touchés.

`muscleBalance` (`logic.js:2427`) additionne, sur une fenêtre (défaut 28 j), les séries de
**poussée** (pecs+épaules) contre celles de **tirage** (dos), et en déduit un ratio + une zone
(`balanced`/`push-heavy`/`pull-heavy`/`no-push`/`no-pull`). Le comptage se faisait par **deux `if`
indépendants** :

```js
const zones = exerciseZones(ex.name);
if (zones.includes('chest') || zones.includes('shoulders')) push += sets;  // (a)
if (zones.includes('back')) pull += sets;                                  // (b)
```

Un exercice dont les zones contiennent **à la fois** une zone de poussée (`shoulders`) **et** de
tirage (`back`) ajoutait la **totalité** de ses séries **des deux côtés**. Or `EXERCISE_ZONES`
(`logic.js:2356`) contient exactement deux tels exercices :

- `'Suspension barre': ['back', 'shoulders']` (dead hang — isométrie dos/grip)
- `'Marche fermier kettlebell': ['back', 'abs', 'shoulders']` (farmer's walk — port lourd)

Preuve (exécutée sur le vrai code, figée en test) :

```
muscleBalance([{ date:'2026-07-08', exercises:[{ name:'Suspension barre', sets:4 }] }], '2026-07-10')
  AVANT → { push:4, pull:4, ratio:1, zone:'balanced' }   ← « push/pull équilibré, continue »
  APRÈS → { push:0, pull:4, ratio:0, zone:'no-push' }
```

Une séance de pur gainage dos/épaules ressortait donc **« équilibre poussée/tirage parfait »** (et
`pushPullAdvice` renvoyait « continue comme ça ») alors qu'il n'y avait eu **ni pressing ni rowing**.
Les mêmes 4 séries, comptées 8 fois au total, gonflaient aussi le seuil `minSets` de `pushPullAdvice`
(`logic.js:2459`) — un conseil pouvait s'afficher plus tôt qu'il ne le devait.

Réel dès qu'Adrien loggue l'un de ces exercices (tous deux dans la bibliothèque). Le test existant
(`logic.test.js:3762`) n'utilisait que `Pompes classiques` (poussée seule) et `Tractions` (tirage
seul) : le chemin à double zone n'était **jamais** exercé.

## Le geste (chaque série comptée une fois, zone principale arbitre)

Le correctif ne réinvente **aucune** classification : il applique la convention **déjà documentée**
au-dessus de `EXERCISE_ZONES` (`logic.js:2345`) — « zone principale en premier ». Un exercice à la
fois poussée ET tirage compte ses séries **une seule fois**, du côté de sa **première** zone taguée.
Pour `Suspension barre` et `Marche fermier`, cette zone principale est `back` → tirage.

```js
const isPush = zones.includes('chest') || zones.includes('shoulders');
const isPull = zones.includes('back');
if (isPush && isPull) { if (zones[0] === 'back') pull += sets; else push += sets; }
else if (isPush) push += sets;
else if (isPull) pull += sets;
```

**Zéro régression** sur les exercices non ambigus : `Pompes classiques` (chest → poussée),
`Tractions` (back → tirage) etc. suivent exactement le même chemin qu'avant. Aucun exercice de la
bibliothèque n'a `shoulders` en zone principale **avec** `back` présent, donc l'arbitrage retombe
toujours du bon côté (audit des 47 exercices).

## Tests & vérif

- Bloc `muscleBalance` étendu (`logic.test.js`) : `Suspension barre` seul → `no-push` (push 0, pull 4,
  ratio 0) ; `Marche fermier` seul → `no-push` ; **mélange réel** suspension barre (tirage) + pompes
  (poussée) → chacun compté une fois → `balanced`. Le cas nominal poussée/tirage préexistant est
  inchangé (filet de non-régression).
- Check smoke `muscleBalance` étendu **et promu bloquant** (nouvelle ligne `errors.push`) : vérifie
  qu'un `Suspension barre` seul donne `push:0/pull:4/zone:'no-push'`.
- `cd src && xvfb-run -a npm run verify` → **441 tests + smoke 100 % verts** (`muscleBalance:true`,
  `whatsNew` en 2.0.68, `SMOKE OK`).

## Portée & sûreté

- Bump **2.0.67 → 2.0.68** : effet utilisateur réel (ratio et conseil poussée/tirage justes)
  → entrée CHANGELOG (🏋️) + 2 assertions `CHANGELOG[0].v` (logic.test.js + smoke `whatsNew`).
- Une fonction pure (3 lignes de logique), assertions ajoutées à un `test()` existant (compte
  inchangé, 441), un check smoke promu bloquant. Aucune feature retirée, aucune Release, zéro
  dépendance, aucune donnée perso, posture sécurité inchangée. Le module Alternance (sacré) n'est
  pas touché.

## Variété (§4)

Rompt la série dates/a11y pour une **correctness prouvée** dans le domaine **Force / Athlète**,
jusqu'ici hors des boucles récentes. Le correctif s'appuie sur une convention **déjà écrite** dans le
code (zone principale = première), ce qui le sort de la zone « jugement débattable » écartée en #433
(`lastExerciseSession`) : il n'y a pas de choix de classification à inventer, seulement un double
comptage à supprimer. Boucle #435.
