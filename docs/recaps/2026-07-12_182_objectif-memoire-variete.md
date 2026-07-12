# Boucle #182 (autonome) — Objectif mémorisé + variété des exercices · build 1.9.116

**Phase 1 (générateur par objectif).** Deux frictions : (1) l'objectif choisi n'était pas retenu — il fallait le re-sélectionner à chaque visite ; (2) le générateur donnait toujours exactement les mêmes exercices (les « meilleurs »), sans possibilité de varier.

## Livré

- **Objectif mémorisé** : le choix (athlétique / muscle / sèche / endurance / forme) est enregistré dans l'état (`state.fitnessObjective`). En rouvrant l'app, le bon objectif est présélectionné et le programme s'affiche automatiquement.
- **Bouton « 🔄 Varier les exercices »** : propose une **autre sélection valide** (rotation dans chaque groupe musculaire), avec un compteur « Variante N ». Idéal pour casser la routine ou éviter un matériel occupé, tout en gardant des exercices pertinents pour la zone. La variante est mémorisée (`state.objectiveSeed`).
- Changer d'objectif dans la liste régénère et sauvegarde immédiatement.

## Détail technique

- **`lib/logic.js`** : `pickExercisesForZones(zones, exercises, n, offset)` — nouvel argument `offset` qui fait tourner la liste triée de chaque zone (rotation modulo taille) → sélection différente mais toujours pertinente ; `objectiveProgram(key, exercises, {perSession, seed})` propage `seed` (décalé par séance pour varier chaque jour). Purs + testés.
- **`app.js`** : `state.fitnessObjective` + `state.objectiveSeed` (défauts + persistés) ; `runObjectiveProgram` lit/écrit l'objectif et la graine, bouton `#objectiveVary`, handler `change` sur `#objectiveSelect`, présélection + auto-rendu au chargement.
- **`strength.css`** : styles `.op-tools`.

## Vérifs

- `npm run verify` → **220 tests / 220 pass** (test `pickExercisesForZones` étendu à la rotation `offset`), garde-fou CSS vert, **SMOKE OK** (`objectiveMemory:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.116.exe** (app d'Adrien jamais fermée).

## Suite (phase 1)

Adaptation au matériel dispo (profil équipement) · programmes de course détaillés par objectif · lien objectif ↔ Coach Poids (calories/macros cohérentes).
