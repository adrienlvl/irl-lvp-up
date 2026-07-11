# Boucle #122 (autonome) — Bibliothèque : filtre « 🆕 Nouveaux » · build 1.9.56

**Contexte :** 47ᵉ itération de la boucle autonome. Aire : Exercices / découverte.

## Livré

La **bibliothèque d'exercices** (47 mouvements illustrés) gagne un bouton bascule **« 🆕 Nouveaux »** qui n'affiche que les exercices **jamais réalisés** :

- se combine avec la recherche, le filtre par famille et l'objectif/zone déjà présents,
- s'appuie sur `loggedExerciseNames(state.workouts)` (les mêmes noms que le badge « ✓ déjà fait »),
- bouton avec état actif (surligné) — pour sortir de la routine et tester de nouveaux mouvements.

## Détail technique

- `index.html` : bouton `#exerciseNewOnly` dans la barre de filtres. `strength.css` : style `.lib-filter-toggle` + `.active`.
- `app.js` :
  - `libraryNewOnly` (état) ; handler du bouton bascule + re-render.
  - `renderExerciseLibrary` calcule `doneSet` en amont et filtre `!libraryNewOnly || !doneSet.has(x.name)` (suppression du `doneSet` dupliqué plus bas).

## Vérifs

- `npm run verify` → **159 tests / 159 pass**, **SMOKE OK** — nouveau check `libNewOnly` qui **exerce** le bouton (clic ON/OFF, vérifie le rendu des cartes sans casse). `node --check app.js` OK.
