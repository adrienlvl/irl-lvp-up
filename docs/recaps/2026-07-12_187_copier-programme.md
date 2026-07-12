# Boucle #187 (autonome, phase 2) — Copier le programme · build 1.9.121

**Phase 2 (polissage global).** Le programme par objectif ne pouvait qu'être programmé dans l'agenda ; impossible de le partager (coach, notes, message).

## Livré

Bouton **« 📋 Copier le programme »** dans le panneau : copie tout le programme en **texte lisible** (titre, résumé, répartition heures/séances, chaque jour avec ses exercices `séries×reps` ou le conseil de course, et la ligne nutrition kcal/macros). Idéal pour l'envoyer à un coach ou le coller dans ses notes. Retour visuel « ✓ Copié ».

## Détail technique

- **`lib/logic.js`** : `objectiveProgramText(program, {nutri})` — met en forme le programme en texte brut (réutilise `programWeekSummary`) ; `''` si programme vide. Pur + testé.
- **`app.js`** : bouton `#objectiveCopy` (via `navigator.clipboard`), regroupé avec le bouton Programmer dans `.op-actions`. **`strength.css`** : styles `.op-actions`.

## Vérifs

- `npm run verify` → **226 tests / 226 pass** (+1 : `objectiveProgramText`), garde-fou CSS vert, **SMOKE OK** (`objectiveCopy:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.121.exe** (app d'Adrien jamais fermée).

## Suite (phase 2)

Polissage : séances guidées, Coach Poids, palmarès, responsive mobile, accessibilité.
