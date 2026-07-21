# #639 — Coach Poids : la cible d'ajustement ne descend plus jamais sous le métabolisme de base (2.0.248)

**Domaine : nutrition** · build 2.0.248 · boucle #639 (2026-07-21)

## Rotation (§4 bis)

Priorité de nuit = coaching. Contrôle des 5 derniers recaps **par numéro** :
`638 coach · 637 athlete · 636 nutrition · 635 alternance · 634 coach`.
→ `coach` (638) et `athlete` (637) exclus (dans les 2 derniers) ; `coach` de toute façon 2× sur 5.
**`nutrition`** pris (1× sur 5, absent des 2 derniers) — domaine le mieux aligné avec la priorité
de nuit (diététique du sport, mandat coaching élite), précédent des correctifs Coach Poids
(#636/#632/#629). Angle NEUF (surface `calorieAdjustment` × plancher BMR jamais traitée).

## Défaut prouvé (contradiction inter-surfaces + violation de borne)

Sur la carte « Coach Poids » (`app.js:383`), trois valeurs cohabitent :
- la ligne macros affiche `plan.dailyTarget` ;
- la note de bas de carte affiche « Métabolisme de base **`plan.bmr`** kcal » ;
- le bloc d'ajustement affiche « Nouvelle cible : **`adj.newTarget`** kcal/j » (`calorieAdjustment`).

`energyPlan` **garantit** (doc + code `logic.js:5172`, `dailyTarget = max(bmr, tdee − deficit)`) que
la cible calorique ne descend **jamais sous le métabolisme de base**. Mais `calorieAdjustment`, qui
propose une baisse (~125 kcal/j) quand la perte cale ≥ 14 j, utilisait un plancher **générique figé à
1200 kcal** (`FLOOR = 1200`), **décorrélé du BMR** — et ne recevait même pas le BMR en argument.

**Cas nominal** (profil sec/sédentaire, fréquent) : poids 60 kg, taille 165 cm, 30 ans, homme,
`activityLevel: 'sedentaire'` (facteur 1,2), cible 55 kg.
- `basalMetabolicRate` = **1486** ; TDEE = round(1486 × 1,2) = 1783 ; goal `perte`.
- déficit borné à 25 % TDEE → apport ≈ 0,9 × BMR < BMR → `dailyTarget = max(1486, 1387) = **1486 = BMR**`.
- Sur un plateau (14 j sans bouger), `calorieAdjustment(weights, 'perte', 1486)` avec `FLOOR = 1200` :
  `cut = min(125, 1486 − 1200) = 125` → **`newTarget = 1361`**.

Résultat affiché **ensemble** sur la même carte : « 1486 kcal/jour », « Métabolisme de base 1486 kcal »
**et** « Nouvelle cible : **1361 kcal/j** » — soit un conseil de manger **125 kcal SOUS le métabolisme
de base** écrit juste en dessous. La contradiction se déclenche dès que `dailyTarget − 125 < BMR`, cas
courant pour un gabarit sec/peu actif (le plancher BMR d'`energyPlan` lie souvent).

## Correctif (curation §3, zéro champ ajouté)

`calorieAdjustment(weights, goal, dailyTarget, floor)` gagne un **4ᵉ argument optionnel** `floor`
(typiquement `energyPlan.bmr`). Le plancher effectif devient `FLOOR = max(1200, round(floor || 0))` :
- jamais sous le métabolisme de base quand il est fourni ;
- repli sur le garde-fou générique 1200 kcal quand il ne l'est pas → **rétro-compatible** (tous les
  appels existants sans 4ᵉ arg gardent le comportement exact — les tests plancher-1200 passent tels quels).

Le message « déjà au plancher calorique (~`FLOOR` kcal) » utilise désormais la valeur effective (BMR),
et la branche « relance par le cardio / plus d'activité » prend le relais **au lieu** d'une coupe
sous le minimum vital.

**Câblage minimal** : seul le point d'appel de la carte Coach Poids (`app.js:383`) passe `plan.bmr`.
L'appel à `calorieAdjustment` **dans `adaptiveCoachFocus`** (`logic.js:6387`) est **laissé au défaut
1200** — comportement byte-identique, **zéro ripple sur le coach adaptatif** (surface sans BMR affiché,
donc sans contradiction visible ; l'élargir relèverait d'un tour `coach`, hors rotation ce soir).

## Contrôle de cohérence (§4 ter)

Rendu cumulé au plancher relu : « Ton poids stagne (0 kg/sem sur N j). Tu es déjà au plancher calorique
(~1486 kcal) — relance par le cardio ou plus d'activité plutôt qu'une nouvelle baisse. Nouvelle cible :
1486 kcal/j. » — cible = BMR (pas de coupe sous le minimum), même patron que le cas plancher-1200
préexistant. Aucune redondance nouvelle introduite.

## Vérification

- **571 tests** (bloc `calorieAdjustment` étendu : plancher = BMR, coupe bornée au BMR, démonstration
  de l'ancien défaut `newTarget 1361` sans plancher, BMR < garde-fou 1200 → 1200, rétro-compat 4ᵉ arg omis)
  + smoke : `EXIT=0`, css-lint vert.
- Check smoke **bloquant** ajouté `coachAdjustNotBelowBmr` : rend la carte pour le profil sec/sédentaire
  en plateau et vérifie que toute « Nouvelle cible » reste `>=` au « Métabolisme de base » affiché
  (garde le **câblage** `plan.bmr` du rendu). Check `calorieFloor` (pur) inchangé, toujours vert.

Sources : Mifflin-St Jeor (BMR) · déficit ≤ 25 % TDEE + apport ≥ métabolisme de base (ISSN 2017).

_Domaine : nutrition._
