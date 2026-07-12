# Boucle #164 (autonome) — Séances ciblées préconçues (abdos/bras/dos/bas du corps) · build 1.9.98

**Contexte :** thème B de la demande d'Adrien — pouvoir faire des exercices ciblés pour **abdos, bras, dos et bas du corps (jambes)**, en séances toutes prêtes.

## Livré

Dans la **bibliothèque d'exercices**, une barre **« 🎯 Séances ciblées prêtes »** avec 4 boutons :

- **🔥 Abdos** (Abdos béton) · **💪 Bras** · **🦅 Dos** (Dos largeur) · **🦵 Bas du corps** (jambes + fessiers).

Un clic **compose la séance** (les meilleurs exercices de la zone, avec séries/reps de la bibliothèque) et la **lance immédiatement en séance guidée** — donc avec le minuteur de repos, le suivi des séries et le compteur de tonnage. De l'envie (« aujourd'hui j'attaque les bras ») à la séance en un tap.

## Détail technique

- `lib/logic.js` : `BODY_GOALS` (4 envies → titre/emoji/zones) + `bodyGoalWorkout(key, exercises, opts)` — pur + testé. Filtre la bibliothèque sur la/les zones, trie par pertinence (`goalRank`), prend les N meilleurs (défaut 5) avec séries/reps. `null` si clé inconnue.
- `app.js` : handler `#bodyGoalsBar` → `openGuidedWorkout({title, exercises})`.
- `index.html` : barre `#bodyGoalsBar` (4 boutons) dans les contrôles de la bibliothèque.
- `extras.css` : styles `.body-goals` (boutons tactiles).

## Vérifs

- `npm run verify` → **205 tests / 205 pass** (+1 : `bodyGoalWorkout` — composition par zone, tri, séries/reps, clé inconnue → null, 4 envies). **SMOKE OK** (`bodyGoals:true` — 4 boutons + exercices bien dans la zone). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.98.exe** (app d'Adrien jamais fermée).

## Suite (boucle en cours)

Plan de course ≥ 4×/sem (thème C) ; sélecteur d'objectif corporel plus riche ; améliorations Coach Poids & progression ; responsive mobile continu.
