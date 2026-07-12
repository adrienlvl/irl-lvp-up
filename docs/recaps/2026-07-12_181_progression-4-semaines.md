# Boucle #181 (autonome) — Progression 4 semaines du programme auto · build 1.9.115

**Phase 1 (générateur par objectif).** Avant : « Programmer la semaine (4 sem.) » répétait 4× la même semaine à l'identique. Or le muscle progresse par **surcharge progressive** : il faut monter puis décharger.

## Livré

Le programme auto suit maintenant un **bloc de progression sur 4 semaines** :

| Semaine | Phase | Ce qui change |
|---|---|---|
| S1 | **Base** | Prise de marques, technique propre |
| S2 | **Volume** | +1 série par exercice, même charge |
| S3 | **Intensité** | Monte la charge / haut de la fourchette de reps |
| S4 | **Décharge** | Volume réduit (~60 %) — le corps surcompense et récupère |

- Le panneau affiche un **encart « 📈 Progression sur 4 semaines »** (les 4 phases + explication), la décharge en bleu.
- Lors de la programmation dans l'agenda, chaque séance muscu porte sa phase dans le titre : `🏋️ Haut du corps · S2 Volume · 45 min`, `… · S4 Décharge · …` — tu sais quoi faire chaque semaine sans réfléchir.

## Détail technique

- **`lib/logic.js`** (purs + testés) :
  - `blockPhase(weekIndex)` → `{week, phase, short, setDelta, intensity, deload, note}`, cycle tous les 4 (gère index négatif).
  - `progressSets(baseSets, weekIndex)` → séries de la semaine (S2 = base+1, S4 ≈ 60 % arrondi, planchers 1/2).
- **`app.js`** : `scheduleObjectiveProgram` applique la phase au titre par semaine ; `runObjectiveProgram` affiche l'encart de progression.
- **`strength.css`** : styles `.op-ramp` / `.op-phase` (responsive).

## Vérifs

- `npm run verify` → **221 tests / 221 pass** (+2 : `blockPhase`/`progressSets`), garde-fou CSS vert, **SMOKE OK** (`objectiveProgression:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.115.exe** (app d'Adrien jamais fermée).

## Suite (phase 1)

Adaptation au matériel dispo · variété/rotation + bouton régénérer · mémoriser l'objectif choisi · lien objectif ↔ Coach Poids.
