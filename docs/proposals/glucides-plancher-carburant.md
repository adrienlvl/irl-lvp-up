# Proposition — Glucides : un plancher « carburant », pas un pur reliquat

_Boucle #645 (2026-07-21) · domaine `nutrition` · série coaching élite (science-first)._
_Écrite en réponse à la priorité de nuit « coaching à fond » (§4 bis.4 : quota de propositions
déclenché — 10 derniers recaps sans proposition). **Doc de design seulement — rien n'est codé.**_

## Problème (vérifié dans le code)

Les cibles macro de l'app calculent les glucides comme un **pur reliquat calorique**, sans aucun
plancher de carburant et sans conscience de la charge d'entraînement :

- `energyPlan` (`logic.js:5233-5235`) : `proteinG` et `fatG` sont fixés d'abord, puis
  `carbG = max(0, round((dailyTarget − proteinG*4 − fatG*9) / 4))`.
- `objectiveNutrition` (`logic.js:8369-8371`) : même schéma.
- Les protéines sont solidement fondées (2,4 g/kg en sèche, Longland 2016) ; les **lipides sont figés
  à 0,9 g/kg** par une ligne qui, en prime, est **du code mort** :
  `fatG = Math.max(round(weight*0.5), round(weight*0.9))` — pour tout poids positif `0.9w > 0.5w`,
  donc le `Math.max` renvoie **toujours** `round(0.9w)` (le « plancher 0,5 g/kg » du commentaire ne
  s'applique jamais).

**Conséquence chiffrée** (sortie réelle de `energyPlan`, profil masculin 178 cm / 28 ans en sèche) :

| Profil | Cible kcal | Protéines | Lipides | **Glucides** | **g/kg glucides** |
|---|---|---|---|---|---|
| 80 → 72 kg, actif modéré | 2067 | 192 g (2,4/kg) | 72 g (0,9/kg) | 163 g | **2,0 g/kg** |
| 70 → 65 kg, léger | 1845 | 168 g (2,4/kg) | 63 g (0,9/kg) | 152 g | **2,2 g/kg** |
| 95 → 80 kg, corpulent | 2241 | 228 g (2,4/kg) | 86 g (0,9/kg) | 139 g | **1,5 g/kg** |

Ces 1,5–2,2 g/kg de glucides sont **sous le repère le plus bas** de la science pour un athlète qui
s'entraîne — et **sous le plancher que l'app se cite à elle-même** : `nutritionTips('prise')`
(`logic.js:8579`) recommande déjà « glucides suffisants (**≥ 3–5 g/kg**) pour alimenter les séances
lourdes », et la carte macros (`macroBreakdown`, `logic.js:3825`) présente les glucides comme « ton
carburant pour l'effort ». Le **conseil-texte** dit 3–5 g/kg ; le **macro-chiffré** en délivre 1,5–2,2.
Contradiction interne, même famille que les correctifs inter-surfaces #639/#636/#632.

**Pourquoi ça compte pour Adrien** (athlète hybride muscu + trail/running) : les glucides sont le
carburant n°1 des séances lourdes et des sorties longues. Sous ~3 g/kg un jour de gros volume, la
qualité de séance chute (glycogène insuffisant), au détriment justement du muscle qu'on cherche à
préserver en sèche. Le déficit **doit** venir surtout du gras, pas d'un effondrement silencieux des
glucides.

### Repères scientifiques (glucides selon la charge)

- **AND / DC / ACSM 2016** (Thomas, Erdman, Burke — Position Stand « Nutrition and Athletic
  Performance », Med Sci Sports Exerc 48(3):543-568) : **3–5 g/kg** activité légère · **5–7 g/kg**
  effort modéré (~1 h/j) · **6–10 g/kg** endurance (1–3 h/j) · 8–12 g/kg charge extrême.
- **Burke 2011** (J Sports Sci 29:S17-27) : glucides ajustés au volume d'entraînement, pas fixes.
- **Helms 2014** (JISSN 11:20, prep bodybuilding naturel) : protéines hautes d'abord, **lipides à un
  plancher (~0,5–1 g/kg / 15–30 % des kcal)**, puis **les glucides remplissent le reste** — l'inverse
  de « lipides fixes à 0,9, glucides = ce qui reste ». En déficit, protéger les glucides d'entraînement.

Un déficit **sec** (peu d'entraînement) à ~2 g/kg de glucides est défendable ; le problème est
l'**absence de tout plancher** et l'**aveuglement à la charge** — le même chiffre est servi à un jour
de repos et à un jour de sortie longue.

## Options

**A — Plancher glucides + lipides flexibles (calcul, sans périodisation).**
Inverser l'ordre de remplissage dans `energyPlan`/`objectiveNutrition` : protéines fixées → **viser un
plancher glucides** (p. ex. 3 g/kg, borné pour rester dans les calories) → **lipides = reste, jamais
sous leur plancher hormonal ~0,5–0,8 g/kg** (et corriger la ligne `Math.max` morte). Un seul jeu de
macros, plus réaliste ; zéro nouvelle surface. Si les calories sont trop basses pour tenir 3 g/kg de
glucides **et** le plancher lipidique, on documente l'arbitrage (glucides d'abord jusqu'au plancher
lipidique). Coût : touche 2 fonctions pures + leurs tests ; le rendu macros bouge (contrôle §4 ter).

**B — A + conscience de la charge (périodisation légère jour dur / jour léger).**
Comme A, plus un plancher glucides **modulé** par la charge du jour (repos ~3 g/kg, jour de séance
lourde / sortie longue ~5 g/kg), en réutilisant les signaux déjà présents (`workouts` du jour,
`racePhase`, charge). Plus juste physiologiquement, mais **touche potentiellement les surfaces coach**
(le macro du jour devient contextuel) → **ripple `coach`** (rotation §4 bis) et périmètre plus large.

**C — Ne toucher qu'au texte (statu quo calcul).**
Aligner `nutritionTips` sur la réalité du calcul (retirer « ≥ 3–5 g/kg ») au lieu de corriger le
calcul. Honnête sur la contradiction, mais **abandonne** le bénéfice de performance : on rabote le
conseil juste au lieu de relever le macro faible. Déconseillé (on soigne le symptôme, pas la cause).

## Recommandation

**Option A**, réalisable en **étapes autonomes** façon P6, dans le seul domaine `nutrition` (pas de
ripple coach) :

- **A.1** — logique pure : `energyPlan`/`objectiveNutrition` remplissent glucides→plancher puis
  lipides→reste (plancher hormonal respecté) ; corriger la ligne `Math.max` morte. Tests dédiés
  (plancher glucides tenu quand les calories le permettent · lipides jamais sous plancher · sèche très
  basse → glucides prioritaires jusqu'au plancher lipidique · rétro-compat des champs renvoyés). Pas
  de bump si non branché, sinon bump.
- **A.2** — rendu : la carte macros reflète les nouvelles cibles ; contrôle §4 ter sur état chargé
  (relire les 3 lignes P/G/L cumulées, cohérence avec `nutritionTips`). Check smoke bloquant.

B (périodisation) reste une **cible ultérieure supervisée** : elle est plus juste mais engage les
surfaces coach et un choix de périmètre — à ne prendre qu'après ton feu vert, hors d'un tour `nutrition`.

## Risques / points de vigilance

- **Cohérence multi-surfaces** (§4 ter) : `energyPlan`, `objectiveNutrition`, `onboardingNutritionEstimate`
  et la carte macros doivent bouger **ensemble** — un correctif partiel recréerait une divergence.
- **Sèche agressive** : à cible calorique très basse, 3 g/kg de glucides + protéines hautes peut ne pas
  tenir sous le plancher lipidique — d'où la règle d'arbitrage explicite (protéines intouchables →
  glucides jusqu'au plancher lipidique → le reste en lipides).
- **Pas de nouveau champ** exposé à l'utilisateur (curation §3) : on **change le calcul** de `carbG`/`fatG`,
  on n'ajoute pas de note. « Retirer/corriger vaut mieux qu'ajouter. »

## ⏳ Décisions pour Adrien

1. **Périmètre** : **A** (plancher fixe ~3 g/kg + lipides flexibles) / **B** (A + périodisation par
   charge, supervisé) / **C** (n'aligner que le texte) ?
2. **Plancher glucides** : 3 g/kg (repère ACSM bas, sûr en déficit) ou plus haut pour tes gros jours ?
3. **Plancher lipidique** : 0,5 g/kg (minimum hormonal strict, Helms) ou 0,8 g/kg (plus confortable) ?
4. **Réalisation** : autonome sur un futur tour `nutrition` (option A, sans ripple coach) — OK ?
