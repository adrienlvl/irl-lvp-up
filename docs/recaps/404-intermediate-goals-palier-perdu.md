# 404 — Paliers de course : le premier palier n'est plus écrasé (2.0.44)

## Le manque (bug pur prouvé — §4.1/§4.2)

`intermediateGoals` (`src/lib/logic.js:1526`) propose des **paliers intermédiaires** vers l'objectif
de course (10 km, semi, marathon…), distances **croissantes** réparties sur le temps disponible
(commentaire l. 1524-1525). Pour placer le palier `i` sur l'échelle des `rungs`, elle calculait :

```js
// avant
const idx = Math.min(rungs.length - 1, Math.max(0, Math.round((i + 0.5) / count * rungs.length)));
```

Le `Math.round` centre le palier **un cran trop haut** : `round((i+0.5)/count*L)` arrondit le centre
du segment vers l'index supérieur. Dès que `count` est proche de `rungs.length` (peu de paliers, peu
de rungs), deux paliers consécutifs tombent sur le **même index** → le dédoublonnage final
(l. 1546, `m.distanceKm !== out[i-1].distanceKm`) en supprime un, et le **premier palier est perdu**.

Cas concret et prouvable — un marathon (42 km) préparé sur ~38 semaines :

```js
intermediateGoals({ type: 'marathon', distanceKm: 42, date: '2027-04-01' }, new Date('2026-07-06T12:00:00'))
// rungs = [10 km, semi] (km < 42×0.75 = 31,5) ; count = 2
// i=0 → round(0.5/2*2) = round(0.5) = 1 → rungs[1] = semi
// i=1 → round(1.5/2*2) = round(1.5) = 2 → clampé à 1 → semi
// avant → [semi] seul (1 palier, le 10 km est perdu au dédoublonnage)
// attendu → [10 km, semi] (2 paliers croissants)
```

Impact réel utilisateur : `intermediateGoals` alimente le rendu des **paliers de course**
(`app.js:456`, bloc `#raceGoalMilestones`, « PALIERS VERS L'OBJECTIF »). Un marathonien préparant sa
course sur ~8 mois ne voyait qu'un seul palier (le semi) au lieu de la progression complète
10 km → semi. Le correctif `estimatedOneRmSeries` de #402 était de la force ; ici c'est le domaine
course/objectifs, non touché récemment.

## Le geste (centrer le palier avec `Math.floor`)

`src/lib/logic.js` — le centre d'un segment se prend avec `Math.floor`, pas `Math.round` :

```js
const idx = Math.min(rungs.length - 1, Math.max(0, Math.floor((i + 0.5) / count * rungs.length)));
```

`floor((i+0.5)/count*L)` mappe correctement chaque palier `i ∈ [0, count-1]` sur un index distinct et
croissant de l'échelle. Aucune régression sur les entrées franches : le test existant (ultra 170 km /
2 ans, `count=3`, `rungs.length=6`) tombe pile sur des entiers (`1,3,5`) où `round` et `floor` sont
identiques → paliers `[21, 50, 100]` inchangés. Le `clamp` `Math.min/Math.max` reste en garde-fou.

## Test

`src/test/logic.test.js` — bloc `intermediateGoals` existant : +1 cas marathon (`42 km`, `2027-04-01`,
`now = 2026-07-06`), **prouvé fautif avant** le correctif (donnait 1 palier `[semi]` au lieu de
`[10 km, semi]`). Les assertions existantes (ultra, objectifs proches/petits) restent vertes. Ajout
dans un `test()` existant → compteur inchangé à **431 tests** (+ smoke).

## Pourquoi pas de check smoke

Correctif de **logique pure** ; `app.js` (rendu de `#raceGoalMilestones`) n'est pas touché — le
contrat est verrouillé au niveau des tests unitaires (comme #401 → #403).

## Vérif & version

`cd src && xvfb-run -a npm run verify` → **431 tests + smoke 100 % verts** (`whatsNew` vert en 2.0.44,
`SMOKE OK`). Build **2.0.44** : effet utilisateur réel (un palier de course réapparaît) → entrée
CHANGELOG (🏃) + 2 assertions `CHANGELOG[0].v` (logic.test.js + smoke `whatsNew`). Logique pure,
aucun rendu modifié, zéro régression. Backlog autonome **§4.1/§4.2 (bug pur prouvé)** — variation de
domaine (objectifs de course) après une série force/santé/récup (#401 → #403). Aucune Release, zéro
dépendance, aucune donnée perso, aucune feature retirée. Boucle #404.
