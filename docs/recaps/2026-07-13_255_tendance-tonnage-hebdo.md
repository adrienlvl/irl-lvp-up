# Boucle #255 (autonome) — 11ᵉ rotation #4 : tendance de tonnage hebdo · build 1.9.189

**11ᵉ rotation, #4 (coaching) — DERNIÈRE de la rotation.** Le coach comparait des blocs mais n'offrait aucune vue **semaine par semaine** du volume soulevé. Ajout d'une **sparkline de tonnage muscu sur 8 semaines** avec tendance.

## Livré

- **Mini-graphe « 📈 Tonnage muscu · 8 semaines »** dans le panneau Programme auto (sous la comparaison de blocs).
- 8 barres (lundi→dimanche), la **semaine courante** en évidence ; couleur selon la tendance (vert ↑ / rose ↓).
- Sous-titre : `cette sem. ±X % vs moyenne` des semaines précédentes non vides ; pied : kg soulevés cette semaine + pic.
- Chaque barre a une infobulle (date, kg, nb de séances).

## Détail technique

- **`lib/logic.js`** : `weeklyTonnageTrend(workouts, todayKey, weeks=8)` → `{ weeks:[{start,tonnage,sessions}], max, total, avgPrior, last, trend, deltaPct }` ; null si aucune séance chiffrée. Réutilise `workoutTonnage`, `mondayOf`, `dateKey`. Pur + testé.
- **`app.js`** : `renderTonnageTrend()` (barres en hauteur %, tri chronologique) appelé dans `render()`.
- **`index.html`** : `#tonnageTrend`.
- **`strength.css`** : `.tonnage-trend` / `.tt-chart` / `.tt-bar` (+ variantes up/down/last/empty).

## Vérifs

- `npm run verify` → **284 tests / 284 pass** (+ test `weeklyTonnageTrend`), garde-fou CSS vert, **SMOKE OK** (`tonnageTrend`).
- **Navigateur** (localhost:8137, 4 séances injectées) : classe `tt-up`, 8 barres (dernière 100 %), « cette sem. +38 % vs moyenne », « 3 000 kg soulevés ». ✓
- `npm run dist` → **Setup 1.9.189.exe** (app d'Adrien jamais fermée).

## Fin de la 11ᵉ rotation 🏁

#1 ✅ (#252) · #2 ✅ (#253) · #3 ✅ (#254) · #4 ✅ (#255). **Tag `v1.9.189` → auto-publish en ligne.** Rotation 12 enchaînée sur #1 (mobile/PWA). Boucle autonome continue.
