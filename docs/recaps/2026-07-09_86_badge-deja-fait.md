# Boucle #86 (autonome) — Badge « ✓ déjà fait » sur les exercices · build 1.9.20

**Contexte :** 11ᵉ itération de la boucle autonome. Aire : Exercices / Athlète.

## Livré

Dans la **bibliothèque d'exercices**, chaque exercice **déjà réalisé au moins une fois** (dans l'historique de séances) affiche un badge **✓ déjà fait** et une bordure de carte teintée. → Suivi de couverture : on voit d'un coup d'œil les mouvements jamais essayés, ce qui motive à varier.

## Détail technique

- `lib/logic.js` : `loggedExerciseNames(workouts)` pur + testé → noms uniques présents dans `w.exercise` (top-level) et `w.exercises[].name`.
- `app.js` : `renderExerciseLibrary` construit le Set une fois et ajoute la classe `ex-card-done` + le badge `.ex-done` aux cartes concernées.
- `extras.css` : styles `.ex-done` / `.exercise-card.ex-card-done`.

## Vérifs

- `npm run verify` → **130 tests / 130 pass** (+1 : `loggedExerciseNames` — uniques, top-level + exercises[], vide → []), **SMOKE OK**.
