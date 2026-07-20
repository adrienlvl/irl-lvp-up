# 594 — Graphique du poids « Prévu vs Réel » enfin lisible (2.0.210)

> Demande d'Adrien : « améliore franchement le graphique du poids, le poids réel est illisible. »
> Chantier coach/athlète 3/3 (loop 2 de la session).

## Le problème (confirmé en navigateur)

`coachForecastSvg` (Coach Poids) calculait l'échelle Y sur la **concaténation plan + réel**. Le plan
couvre **tout le trajet vers la cible** (souvent 5-10 kg) alors que le réel varie de **quelques
centaines de grammes** → la courbe réelle était **comprimée sur ~10-15 % de la hauteur**, quasi plate
= illisible. S'ajoutaient : aucun repère kg, aucun marqueur « aujourd'hui », et `preserveAspectRatio="none"`
qui étirait les points en ellipses. Vérifié à l'écran avant de coder.

## Ce qui change

- **`weightForecastModel(planned, actual, opts)`** (logique pure, testée) : géométrie lisible.
  L'échelle Y se **cale sur le RÉEL** dès qu'il y a ≥ 2 pesées (sinon sur le plan) → le réel remplit la
  hauteur (mesuré : amplitude verticale **6 → 38 sur 100**). Renvoie des **graduations kg**, `todayX`
  (début du plan, sépare passé réel / futur prévu), les points projetés en espace 0-100, et
  `targetInView`.
- **Rendu refondu** : le plan qui vise une cible lointaine **sort du cadre** (conteneur `overflow:hidden`),
  laissant le réel occuper l'espace. **Axe kg + repère « auj. » + dernière pesée** rendus en **overlay
  HTML positionné en %** (donc pas de texte SVG déformé par `preserveAspectRatio="none"`). Lignes en
  `vector-effect:non-scaling-stroke`, points réels en HTML (plus d'ellipses).
- **Theme-aware** : vérifié lisible en thème **sombre** et **clair**.

Les classes `cw-plan-line` / `cw-actual-line` sont conservées (check smoke). Le texte « Prévu vs Réel »,
la légende, le mi-parcours et le rythme réel sous le graphe sont inchangés.

## Vérifs

- **543 tests** + smoke verts. Test node `weightForecastModel` (Y priorise le réel, amplitude > 25/100,
  graduations kg croissantes dans les bornes, `todayX`, repli sur le plan sans réel, robustesse). Check
  smoke `coachForecast` étendu (`.cw-chart`/`.cw-grid`/`.cw-yl` présents, amplitude réelle > 15).
- **Navigateur** : cible lointaine (perte 81→76) → courbe réelle qui remplit la hauteur, axe kg
  (81,5/80,5/79,5), trait « auj. », chip « 79,9 kg », plan vert filant vers la cible. Sombre **et** clair.

## Reste du chantier coach/athlète

- Distance de course adaptée à l'objectif (aucun générateur n'attribue de km — `state.goals.distance`
  existe mais n'est jamais réinjecté).
- Suppression/annulation d'une séance dans l'agenda + replanification intelligente (chantier 2).
- Les 2 autres générateurs de semaine (`generateAutomaticWeek` glissant, `scheduleObjectiveProgram`).
- Le graphe de suivi `#weightChart` (page Poids) mérite le même soin (axe, non-distorsion) — plus tard.

## Fichiers

- `src/lib/logic.js` — `weightForecastModel` + CHANGELOG 2.0.210.
- `src/app.js` — `coachForecastSvg` refondu (SVG + overlay HTML).
- `src/athlete.css` — `.cw-chart`/`.cw-grid`/`.cw-today`/`.cw-target`/`.cw-yaxis`/`.cw-yl`/`.cw-dot`/`.cw-last`/`.cw-tdl`.
- `src/test/logic.test.js`, `src/test/renderer-smoke.cjs` — test + check étendu.

Domaine : mesures
