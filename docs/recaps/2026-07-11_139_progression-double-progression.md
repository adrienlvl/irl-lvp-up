# Boucle #139 (autonome) — Suggestion de progression (double progression) · build 1.9.73

**Contexte :** 2ᵉ itération du recentrage Exercices / Athlète. Focus : coacher la **surcharge progressive** exercice par exercice.

## Livré

Dans le panneau **Progression** (Athlète), sous la dernière séance de l'exercice sélectionné, une ligne d'objectif claire et actionnable, calculée en **double progression** :

- **Sous le haut de la fourchette** (ex. 9 reps sur une cible 8–12) → *« vise 10 reps à 12 kg (puis +2,5 kg au bout de 12) »*.
- **Au plafond atteint** (12 reps) → *« 12 reps atteintes à 40 kg : monte à 42,5 kg et repars à 8 reps »*.

C'est la méthode d'hypertrophie la plus simple à suivre : on ajoute des reps jusqu'au haut de la fourchette, puis on augmente la charge et on redescend en bas. Fini le « je mets combien aujourd'hui ? ».

## Détail technique

- `lib/logic.js` :
  - `progressionSuggestion(workouts, name, opts)` — pur + testé. Cherche la dernière séance chargée de l'exercice (meilleure série si `setLogs`), applique la double progression (`{minReps, maxReps, increment}`, défauts 8 / 12 / 2,5). Renvoie `{action:'reps'|'weight', nextLoad, nextReps, lastLoad, lastReps, …}` ou `null` (exercice au poids du corps / pas de données).
  - `progressionText(sugg)` — pur + testé. Formate la phrase FR (kg avec virgule).
- `app.js` : `renderExerciseProgression` insère `#prog-next` (ligne mise en avant, violet) avant le 1RM.
- `athlete.css` : style `.prog-next`.

## Vérifs

- `npm run verify` → **175 tests / 175 pass** (+2 : `progressionSuggestion` — +reps/+charge, setLogs, poids du corps → null ; `progressionText`). **SMOKE OK** (`progression:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.73.exe** (app d'Adrien jamais fermée).

_Prochaine boucle : toujours Exercices / Athlète._
