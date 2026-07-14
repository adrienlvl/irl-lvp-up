# Boucle #283 (autonome) — 18ᵉ rotation #4 : blocs par objectif · build 1.9.217

**18ᵉ rotation, #4 (coaching) — DERNIÈRE de la rotation.** La comparaison de blocs opposait le 1er au dernier ; ajout d'une vue **par objectif** : combien de blocs de muscle / sèche / endurance… tu as terminés, avec le tonnage et les séances de chacun.

## Livré

- **Carte « 📚 Mes blocs par objectif »** (sous la comparaison de blocs) : une ligne par objectif présent dans l'historique — nb de blocs, séances, tonnage cumulé.
- Triée par nombre de blocs décroissant. Affichée dès **2 objectifs** différents.

## Détail technique

- **`lib/logic.js`** : `blocksByObjective(history, workouts)` → `[{ objective, blocks, tonnage, sessions }]` (regroupe l'historique de blocs par objectif via `blockWindowStats`, tri décroissant). Pur + testé.
- **`app.js`** : `renderBlocksByObjective()` (labels + emoji par objectif) appelé dans `render()`.
- **`index.html`** : `#blocksByObjective`.
- **`strength.css`** : `.blocks-by-objective` / `.bbo-row`.
- **CHANGELOG** complété (v1.9.217).

## Vérifs

- `npm run verify` → **304 tests / 304 pass** (+ test `blocksByObjective`), garde-fou CSS vert, **SMOKE OK** (`blocksByObjective`).
- **Navigateur** (2 blocs muscle + 1 sèche) : « 💪 Muscle ×2 · 4 séances · 1 400 kg » puis « 🔥 Sèche ×1 · 200 kg ». ✓
- `npm run dist` → **Setup 1.9.217.exe** (app d'Adrien jamais fermée).

## Fin de la 18ᵉ rotation 🏁

#1 ✅ (#280) · #2 ✅ (#281) · #3 ✅ (#282) · #4 ✅ (#283). **Tag `v1.9.217` → auto-publish en ligne.** Rotation 19 enchaînée sur #1. Boucle autonome continue (Adrien dort).
