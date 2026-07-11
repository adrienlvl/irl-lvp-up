# Boucle #152 (autonome) — Compteur de tonnage en direct (séance guidée) · build 1.9.86

**Contexte :** 15ᵉ itération du recentrage Exercices / Athlète. Focus **Exercices / séries** : donner un retour immédiat pendant la séance.

## Livré

Dans l'en-tête de la **séance guidée**, un compteur qui s'incrémente en temps réel à chaque série cochée : **« 💪 N séries · X kg »**.

- **N** = nombre de séries validées sur toute la séance (tous exercices confondus) ;
- **X kg** = tonnage cumulé des séries validées (charge × reps).

Seules les séries réellement **cochées** comptent (pas les séries pré-remplies non faites), donc le chiffre reflète l'effort effectué. Petit shot de motivation qui grimpe au fil de la séance.

## Détail technique

- `lib/logic.js` :
  - `completedTonnage(exercises)` — pur + testé. Σ charge × reps des `setLogs` cochés.
  - `completedSetCount(exercises)` — pur + testé. Nombre de `setLogs` cochés.
- `app.js` : `renderGuidedWorkout` remplit `#guidedSessionStats` (déjà re-render à chaque validation de série).
- `index.html` : `<span id="guidedSessionStats">` dans l'en-tête `guided-progress`.
- `strength.css` : style `.guided-session-stats` (rose), `:empty` masqué.

## Vérifs

- `npm run verify` → **189 tests / 189 pass** (+1 : `completedTonnage`/`completedSetCount` — séries cochées uniquement, poids du corps compté en séries mais 0 kg, sans setLogs ignoré, vide/null). **SMOKE OK** (`guidedStats:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.86.exe** (app d'Adrien jamais fermée).

_Prochaine boucle : toujours Exercices / Athlète._
