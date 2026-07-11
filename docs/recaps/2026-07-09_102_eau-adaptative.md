# Boucle #102 (autonome) — Objectif d'eau adaptatif · build 1.9.36

**Contexte :** 27ᵉ itération de la boucle autonome. Aire : Nutrition / hydratation.

## Livré

L'objectif d'hydratation du jour n'est plus figé à 8 verres : les **jours d'entraînement**, il passe à **10 verres (+2)** pour compenser la sudation. La jauge indique « … · **+2 (jour de séance)** ».

Petit ajustement mais pertinent pour Adrien qui court et fait de la muscu — l'objectif suit l'effort du jour.

## Détail technique

- `lib/logic.js` : `waterGoalFor(base, trainedToday)` pur + testé — base (défaut 8) +2 si séance ce jour, borné [1..20].
- `app.js` : `renderHydration` détecte une séance du jour (`state.workouts`), calcule l'objectif via `waterGoalFor`, le passe à `waterStatus` et ajoute la note.

## Vérifs

- `npm run verify` → **144 tests / 144 pass** (+1 : `waterGoalFor` — +2 séance, défaut, plafond 20, base invalide → repli), **SMOKE OK** (`waterGoalAdaptive:true`).

_Note : un test « plancher à 1 » initialement faux (0 est falsy → repli défaut 8) a été corrigé avant commit._
