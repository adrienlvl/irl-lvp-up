# Boucle #239 (autonome) — 7ᵉ rotation #4 : prévision de force sur la carte de bloc · build 1.9.173

**7ᵉ rotation, #4 (coaching périodisé) — dernière de la rotation.** `strengthForecast` existait mais n'était pas surfacée. Elle est maintenant **affichée sur la carte de bloc en cours** : quand atteins-tu ton prochain palier de force.

## Livré

- **Ligne de prévision** sur la carte « Mon bloc » : « 🎯 Squat : ~1 sem. pour 100 kg (1RM est. 97,5 · +2,5 kg/sem) ».
- Choisit l'exercice-clé **le plus suivi** qui progresse (prévision valide) ; masquée si aucun exercice ne progresse.

## Détail technique

- **`lib/logic.js`** : `bestStrengthForecast(workouts, {step, todayKey, limit})` — parcourt les exercices chargés (les plus suivis d'abord), applique `strengthForecast`, renvoie la 1re prévision valide + le nom. Pur + testé.
- **`app.js`** : `renderBlockStatus` (branche bloc en cours) affiche la prévision.
- **`strength.css`** : `.bs-forecast`.

## Vérifs

- `npm run verify` → **271 tests / 271 pass** (+1 `bestStrengthForecast`), garde-fou CSS vert, **SMOKE OK** (`blockForecast:true`).
- **Navigateur** (bloc S2 + Squat 90→97,5) : carte affiche « 🎯 Squat : ~1 sem. pour 100 kg (1RM est. 97,5 · +2,5 kg/sem) ». ✓
- `npm run dist` → **Setup 1.9.173.exe** (app d'Adrien jamais fermée).

## 🏁 Rotation 7 COMPLÈTE

#1 badge d'app PWA (#236) · #2 jauge de complétude onboarding (#237) · #3 mini-heatmap routines (#238) · #4 prévision de force sur la carte de bloc (#239). → Notif + enchaînement rotation 8. Boucle autonome continue.
