# Boucle #110 (autonome) — Jours à la cible protéines · build 1.9.44

**Contexte :** 35ᵉ itération de la boucle autonome. Aire : Nutrition / régularité.

## Livré

Le bilan hebdomadaire nutrition indique maintenant combien de **jours** des 7 derniers ont atteint la **cible de protéines** :

> 7 derniers jours renseignés : … · **💪 4/7 jours ≥ 130 g.**

Mesure de régularité concrète — bien plus utile qu'une simple moyenne pour un objectif de recomposition/muscu (l'apport protéique compte jour après jour, pas en moyenne).

## Détail technique

- `lib/logic.js` : `proteinDaysOnTarget(nutrition, target, sinceKey, todayKey)` pur + testé — agrège les protéines par date (max), compte les jours ≥ cible dans la fenêtre ; robuste (cible nulle, listes vides, entrée non-tableau).
- `app.js` : `renderGrowth` calcule la valeur sur les 7 derniers jours (cible = `poids × 1,6`) et l'ajoute à `#nutritionWeekStatus`.

## Vérifs

- `npm run verify` → **150 tests / 150 pass** (+1 : `proteinDaysOnTarget` — comptage, agrégation même jour, hors fenêtre, cible nulle, entrée invalide), **SMOKE OK** (`proteinWeek:true`).
