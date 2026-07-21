# #643 — Objectif de course : la bascule en affûtage suit la distance, pas un seuil fixe de 2 sem (2.0.252)

**Domaine choisi — rotation §4 bis.** 5 derniers recaps (par mtime) : `sommeil` (#642), `focus` (#641),
`athlete` (#640), `nutrition` (#639), `coach` (#638). Interdits (2 derniers) : `sommeil`, `focus`.
**`athlete`** pris (1× sur 5, absent des 2 derniers) — pleinement aligné avec la priorité de nuit
(coaching : running/trail) et angle **NEUF** : piste #3 déjà cadrée dans la mémoire
[[athlete-coaching-open-leads]] (`racePhase` seuil fixe vs `taperDaysFor`), distincte des #633/#637/#640
déjà clos.

## Défaut prouvé (contradiction inter-surfaces, cas nominal)

`racePhase(weeksLeft)` (`logic.js:1700`) bascule en phase **Affûtage** (« arrive frais, réduis le volume
~40-50 % ») dès `weeksLeft <= 2` — un seuil **FIXE de 2 semaines**, quelle que soit la distance. Or
`taperPlan` **et** `downhillPrep` calent, eux, l'affûtage sur `taperDaysFor(km)` (source unique depuis
#633) : **7 j** pour ≤ 12 km, 11 j ≤ 30 km, 14 j ≤ 45 km, **18 j** au-delà. Deux surfaces du dashboard
qui se contredisent dans leur cas nominal :

- **Course courte (10 km), J-10** : `raceGoalStatus` → `weeksLeft = round(10/7) = 1` → phase **Affûtage**
  (« allège, arrive frais ») ; mais `taperPlan(10, 10) = null` (fenêtre réelle = 7 j) → le « Programme de
  la semaine » n'affiche **aucun** bandeau d'affûtage. La carte crie « affûte » 3 jours trop tôt.
- **Ultra (160 km), J-18** : `taperPlan(18, 160)` **actif** (fenêtre = 18 j) → bandeau affûtage dans le
  programme ; mais `raceGoalStatus` → `weeksLeft = round(18/7) = 3` → phase **Spécifique** (« sorties
  longues progressives »). La carte dit « entraîne-toi à fond » alors que l'affûtage a déjà commencé.

Racine : l'arrondi **hebdomadaire** de `racePhase` perd la précision au jour près ; la décision d'affûtage
appartient donc là où vivent `daysLeft` **et** `km`, c.-à-d. dans `raceGoalStatus`.

## Correctif (curation §3, zéro champ ajouté)

`raceGoalStatus` (`logic.js:2058`) recale la phase dans la **seule** zone spécifique↔affûtage, et
uniquement pour une course **à venir** (`daysLeft >= 0`), en pilotant par la source unique
`taperDaysFor(km)` :

```js
let phase = racePhase(weeksLeft);
...
if (daysLeft != null && daysLeft >= 0 && (phase.key === 'taper' || phase.key === 'specific')) {
  phase = daysLeft <= taperDaysFor(km) ? racePhase(1) /* affûtage */ : racePhase(4) /* spécifique */;
}
```

- `racePhase` reste **inchangée** (modèle hebdo grossier, tous ses tests passent) — on ne touche qu'au
  seuil de bascule, au bon endroit.
- Effet **bonus** : `longRunMin` (dérivé de `phase.longMul`) devient cohérent lui aussi (un 10 km à J-10
  ne rabaisse plus la sortie longue à 40 %). Les cas hors zone (build/base/foundation/done) sont
  intouchés (une course en affûtage a toujours `daysLeft <= 18` → jamais `build`+).

`racePhase(4)` renvoie un objet `specific` **identique** à `racePhase(6/7/8)` (même label/focus/longMul)
→ aucun changement visible pour les « spécifique » légitimes ; seule la frontière d'affûtage se déplace.

## Contrôle §4 ter — rendu cumulé relu

Surfaces rendues (inchangées côté `app.js`) : `renderRaceGoal` (« Phase X : … »),
`renderTrainingCompanion` (« phase X »), et `generateAutomaticWeek` (`phase.key` → `buildWeekPlan`).

- 10 km à J-10 → **« Phase Spécifique : Sorties longues progressives… »** + programme sans bandeau
  d'affûtage → **concordent** (avant : « Affûtage » seul, contredit par le programme).
- Ultra 160 km à J-18 → **« Phase Affûtage : … arrive frais »** + bandeau `wp-taper` dans le programme →
  **concordent** (avant : « Spécifique » seul, contredit par le bandeau).

Une seule vérité sur les trois surfaces, plus de « arrive frais » prématuré (courtes) ni tardif (ultra).

## Vérif

- `raceGoalStatus` durci + **1 test** (`logic.test.js`) : 10 km J-10 = spécifique / J-6 = affûtage ;
  ultra 160 J-18 = affûtage / J-20 = spécifique — chaque assertion **croisée avec `taperPlan`** (même
  fenêtre) ; non-régression course à 2 ans = `foundation`. Tests `racePhase` et les 3 tests
  `raceGoalStatus` existants inchangés (course passée, marathon, fondation) : verts.
- `cd src && xvfb-run -a npm run verify` → **573 tests + smoke 100 % vert** (checks `raceGoal`,
  `weekProgramTaper`, `ultraDownhill` inclus). Render `app.js` byte-identique → pas de nouveau check
  smoke (le défaut est **entièrement** dans la fonction pure, couvert par node:test).
- Bump `2.0.251 → 2.0.252` + entrée CHANGELOG + 2 assertions `CHANGELOG[0].v`.

Sources : affûtage échelonné par distance (Bosquet 2007, méta ; Mujika & Padilla 2003), via `taperDaysFor`.

_Domaine : athlete._
