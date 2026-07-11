# Boucle #153 (autonome) — Filtre historique par exercice · build 1.9.87

**Contexte :** 16ᵉ itération du recentrage Exercices / Athlète. Focus **Exercices** : retrouver rapidement l'historique d'un mouvement précis.

## Livré

Dans le panneau **« Historique local »**, un nouveau menu déroulant **« Tous les exercices »** à côté du filtre Discipline. Il se peuple automatiquement avec tous les exercices déjà enregistrés (triés) et permet de **n'afficher que les séances contenant cet exercice** — pratique pour revoir toutes ses séances de « Développé couché » ou de « Tractions ».

Les deux filtres (discipline + exercice) se **cumulent**. Le menu s'actualise à chaque rendu pour inclure les nouveaux exercices, en conservant la sélection courante.

## Détail technique

- `lib/logic.js` : `workoutsWithExercise(workouts, name)` — pur + testé. Filtre les séances contenant l'exercice (dans `exercises[]` ou le champ top-level `exercise`) ; `'all'`/vide → toutes.
- `app.js` : `renderTrainingHistory` peuple `#historyExercise` (via `loggedExerciseNames`, tri FR) et applique `workoutsWithExercise` après le filtre discipline ; `onchange` câblé ; message vide rendu générique (« Aucune séance ne correspond à ces filtres »).
- `index.html` : `<select id="historyExercise">`.

## Vérifs

- `npm run verify` → **190 tests / 190 pass** (+1 : `workoutsWithExercise` — exercises[]/top-level, all/vide → toutes, inconnu → [], non-tableau). **SMOKE OK** (`historyExFilter:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.87.exe** (app d'Adrien jamais fermée).

_Prochaine boucle : toujours Exercices / Athlète._
