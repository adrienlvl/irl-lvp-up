# Boucle #123 (autonome) — Régularité d'hydratation hebdo · build 1.9.57

**Contexte :** 48ᵉ itération de la boucle autonome. Aire : Nutrition / régularité.

## Livré

Le bilan hebdomadaire nutrition indique maintenant, à côté des protéines, la **régularité d'hydratation** :

> 7 derniers jours renseignés : … · 💪 4/7 j ≥ 130 g · **💧 5/7 j ≥ 8 verres.**

Pertinent pour Adrien qui court et transpire — l'hydratation régulière soutient la récupération.

## Détail technique

- `lib/logic.js` :
  - **Généralisation propre** : nouvelle fonction `daysHittingTarget(records, field, target, sinceKey, todayKey)` (jours où un champ ≥ cible, agrégés par date).
  - `proteinDaysOnTarget` **refactorée** pour déléguer à `daysHittingTarget(..., 'protein', ...)` — zéro duplication, son test existant reste vert.
- `app.js` : `renderGrowth` calcule aussi `daysHittingTarget(state.nutrition,'water',8,…)` et l'ajoute à `#nutritionWeekStatus`.

## Vérifs

- `npm run verify` → **160 tests / 160 pass** (+1 : `daysHittingTarget` — eau, agrégation max même jour, hors fenêtre, cible 0, vide ; `proteinDaysOnTarget` toujours vert après refacto), **SMOKE OK** (`waterWeek:true`).
