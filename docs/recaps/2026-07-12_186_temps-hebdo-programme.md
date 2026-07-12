# Boucle #186 (autonome, phase 2) — Temps hebdo du programme · build 1.9.120

**Phase 2 (polissage global).** Le programme par objectif ne disait pas combien de temps il demande par semaine — info clé pour savoir si c'est tenable avec un emploi du temps chargé.

## Livré

Le panneau affiche désormais, sous l'en-tête, une ligne **« ⏱️ ≈ X h/semaine · N séances (M muscu, K course) »**. Adrien voit d'un coup d'œil l'engagement horaire de chaque objectif avant de programmer (ex. « ≈ 4,3 h/semaine · 6 séances »).

## Détail technique

- **`lib/logic.js`** : `programWeekSummary(week)` — nb de séances, minutes totales, heures (1 décimale), répartition muscu/course. Robuste aux entrées invalides. Pur + testé.
- **`app.js`** : `runObjectiveProgram` calcule le résumé (`programWeekSummary(lastObjectiveProgram.week)`) et l'affiche dans `.op-summary`. **`strength.css`** : style `.op-summary`.

## Vérifs

- `npm run verify` → **225 tests / 225 pass** (+1 : `programWeekSummary`), garde-fou CSS vert, **SMOKE OK** (`objectiveSummary:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.120.exe** (app d'Adrien jamais fermée).

## Suite (phase 2)

Polissage : séances guidées, Coach Poids, palmarès, responsive mobile, accessibilité.
