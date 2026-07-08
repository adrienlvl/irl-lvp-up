# Boucle #64 — Objectifs physiques par zone · build 1.8.7

**Demande d'Adrien :** « ajoute des objectifs différents, par exemple 6-pack pour les abdos, gros biceps, grosses jambes… » → cibler l'entraînement par zone du corps.

## Livré

Nouveau sélecteur **🎯 Objectif** dans la bibliothèque d'exercices (page Exercices), à côté du filtre par famille :

🔥 Abdos (tablette) · 💪 Bras (biceps & triceps) · 🎯 Pectoraux · 🦅 Dos (largeur) · 🏔️ Épaules · 🦵 Jambes · 🍑 Fessiers.

Quand on choisit un objectif, la bibliothèque **ne montre que les exercices qui travaillent cette zone**, et **classe les plus ciblés en tête** (zone principale avant zone secondaire). Le compteur devient « X exercices pour « 🔥 Abdos » — les plus ciblés d'abord ». Chaque carte garde sa photo, son format (séries × reps), son repère.

## Sous le capot

- Les **47 exercices tagués par zone musculaire** (`EXERCISE_ZONES`, zone principale en premier). Exemples : Gainage planche → abs ; Tractions supination → arms/back ; Squat sauté → legs/glutes ; Rowing kettlebell → back/arms.
- Fonctions **pures + testées** dans `lib/logic.js` : `TRAINING_GOALS`, `EXERCISE_ZONES`, `exerciseZones`, `goalMatch`, `goalRank` (0 = principale, 99 = hors cible).
- `app.js` : `renderExerciseLibrary` gagne le filtre + tri par objectif ; `#exerciseGoal` câblé.
- `index.html` : `#exerciseGoal` (8 options) ; `strength.css` : `.exercise-controls` passe à 4 colonnes.

## Vérifs

- `npm run verify` → **119 tests / 119 pass** (+2 : couverture des zones, `goalRank`), **SMOKE OK** (`goalsZones:true`).
- **Test de couverture** : chaque clé de `EXERCISE_ZONES` existe dans la bibliothèque, chaque exercice a ≥ 1 zone, chaque objectif propose ≥ 5 exercices.
- Aperçu par objectif contrôlé (ordre ciblé cohérent) : abdos = gainages/hollow/dead bug ; bras = pompes diamants + tractions supination ; pecs = pompes + floor press ; dos = soulevé/rowing/tractions ; jambes = squats/fentes/mollets ; fessiers = swing/soulevé une jambe/ponts.

## Note — animation des photos (question d'Adrien)

Les photos restent **fixes** (une pose par exercice). Pour animer l'exécution avec un humain il faut **2 poses par exercice** (début ↔ fin) à faire alterner en CSS — nécessite de nouvelles planches « 2 poses » générées par Adrien. Noté en item « à venir » dans la roadmap (5.0f → animation).
