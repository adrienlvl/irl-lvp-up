# Boucle #227 (autonome) — 4ᵉ rotation #4 : progression de force par exercice · build 1.9.161

**4ᵉ rotation, #4 (coaching périodisé) — dernière de la rotation.** La comparaison de blocs (#223) donnait tonnage + séances globaux. Elle montre maintenant la **progression de force concrète, exercice par exercice**.

## Livré

- **Bloc « 💪 Force par exercice (1RM estimé) »** ajouté à la carte de comparaison (dès 2 blocs terminés) : pour chaque exercice-clé chargé présent dans le **1ᵉʳ et le dernier** bloc, le **meilleur 1RM estimé** de chaque bloc et la progression.
  - Ex. « Squat 70→88 kg **+25%** », « Développé couché 47→53 kg **+13%** ».
  - Trié par progression décroissante, top 3 dans la carte (fonction limitée à 5 par défaut).
  - Vert si progression, rose si régression.
  - Exercices sans charge (poids du corps sans lest) exclus automatiquement.

## Détail technique

- **`lib/logic.js`** : `bestE1rmByExercise(workouts, start, end)` (meilleur 1RM estimé par exo sur une fenêtre, via `estimate1RM` + setLogs) + `blockExerciseProgress(history, workouts, {limit})` (compare 1ᵉʳ/dernier bloc, `[]` si < 2 blocs). Purs + testés. Exports ajoutés.
- **`app.js`** : `renderBlockStatus` enrichit `#blockCompare` avec la liste `.bc-ex`.
- **`strength.css`** : `.bc-ex` / `.bc-ex-head` / `.bc-up-t` / `.bc-down-t`.

## Vérifs

- `npm run verify` → **260 tests / 260 pass** (+1 : `bestE1rmByExercise`/`blockExerciseProgress`), garde-fou CSS vert, **SMOKE OK** (`blockExProgress:true`).
- **Navigateur** (2 blocs, Squat 60×5→75×5, Développé 40×5→45×5) : carte = « Squat 70→88 kg +25% · Développé couché 47→53 kg +13% ». ✓
- `npm run dist` → **Setup 1.9.161.exe** (app d'Adrien jamais fermée).

## 🏁 Rotation 4 COMPLÈTE

#1 nudge install PWA (#224) · #2 onboarding jours dispo (#225) · #3 bien-être contextuel (#226) · #4 progression de force par exercice (#227). → Point à Adrien, boucle stoppée.
