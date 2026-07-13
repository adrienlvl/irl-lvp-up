# Boucle #263 (autonome) — 13ᵉ rotation #4 : régularité d'entraînement · build 1.9.197

**13ᵉ rotation, #4 (coaching) — DERNIÈRE de la rotation.** On suivait le volume et la force, mais pas la **régularité** : s'entraîner de façon constante compte autant que l'intensité. Ajout d'un score de régularité sur 28 jours.

## Livré

- **Carte « 📏 Régularité · 28 j »** : score 0-100 (intervalles entre séances constants = 100) + label (Très régulier / Régulier / Irrégulier / En dents de scie).
- Détail : nb de séances, écart moyen entre séances, plus longue pause. Jauge colorée (vert / rose).

## Détail technique

- **`lib/logic.js`** : `trainingConsistency(workouts, todayKey, windowDays=28)` → `{ sessions, avgGapDays, maxGapDays, regularity, label }` ; régularité = `100·(1 − CV)` (CV = écart-type/moyenne des intervalles) ; null si < 3 séances. Pur + testé.
- **`app.js`** : `renderTrainingConsistency()` (jauge + tone tc-good/tc-ok/tc-low) appelé dans `render()`.
- **`index.html`** : `#trainingConsistency`.
- **`strength.css`** : `.training-consistency` / `.tc-bar`.
- **CHANGELOG** complété (v1.9.197).

## Vérifs

- `npm run verify` → **290 tests / 290 pass** (+ test `trainingConsistency`), garde-fou CSS vert, **SMOKE OK** (`trainingConsistency`).
- **Navigateur** (localhost:8137) : cadence tous les 3 j → « Très régulier » 100 % (tc-good, « 1 tous les 3 j ») ; cadence en dents de scie → « En dents de scie » 18 % (tc-low). ✓
- `npm run dist` → **Setup 1.9.197.exe** (app d'Adrien jamais fermée).

## Fin de la 13ᵉ rotation 🏁

#1 ✅ (#260) · #2 ✅ (#261) · #3 ✅ (#262) · #4 ✅ (#263). **Tag `v1.9.197` → auto-publish en ligne.** Rotation 14 enchaînée sur #1 (mobile/PWA). Boucle autonome continue.
