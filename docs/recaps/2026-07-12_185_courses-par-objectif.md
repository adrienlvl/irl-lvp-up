# Boucle #185 (autonome) — Courses adaptées à l'objectif · build 1.9.119

**Phase 1 (générateur par objectif) — dernier point.** Les courses générées suivaient toujours le même mélange, quel que soit l'objectif. Or un coureur en sèche a intérêt à faire du fractionné/tempo (brûle + élève le seuil), un objectif endurance veut du volume/sorties longues, et les jours de grosse muscle appellent un footing facile de récup.

## Livré

Le mix de types de course s'adapte à l'objectif :

| Objectif | Accent course | Contenu |
|---|---|---|
| 🏃 Corps athlétique | équilibré | facile + fractionné + tempo + longue |
| 💪 Prise de muscle | footing de récup | tout facile (préserve la muscu) |
| 🔥 Perte de gras | tempo & fractionné | intervalles + tempo pour brûler |
| 🏔️ Endurance / trail | sorties longues | volume, facile + longue |
| ⚖️ Remise en forme | course facile | doux, endurance de base |

L'accent est affiché dans l'en-tête du programme (« 3 muscu · 4 course/sem. · tempo & fractionné »).

## Détail technique

- **`lib/logic.js`** :
  - `runPlanWeek(count, {emphasis})` — 4 modèles de mélange (`balanced`/`endurance`/`vitesse`/`facile`) ; accent inconnu → équilibré (rétrocompat : sans `emphasis`, comportement identique à avant, plan de course manuel inchangé).
  - `FITNESS_OBJECTIVES` : chaque objectif porte `runEmphasis` + `runFocus` (libellé) ; `objectiveProgram` passe l'accent et renvoie `runFocus`.
- **`app.js`** : en-tête du programme affiche `runFocus`.

## Vérifs

- `npm run verify` → **224 tests / 224 pass** (+2 : `runPlanWeek` accents, `objectiveProgram` courses), garde-fou CSS vert, **SMOKE OK** (`objectiveRuns:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.119.exe** (app d'Adrien jamais fermée).

## Bilan phase 1 — générateur « Programme auto par objectif » COMPLET

Split muscu par objectif · courses adaptées · lancement guidé · progression 4 semaines · objectif mémorisé · varier les exercices · adaptation au matériel · nutrition alignée. → Bascule **phase 2** (polissage global) à la prochaine itération.
