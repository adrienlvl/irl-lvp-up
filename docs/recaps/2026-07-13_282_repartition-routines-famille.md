# Boucle #282 (autonome) — 18ᵉ rotation #3 : répartition des routines par famille · build 1.9.216

**18ᵉ rotation, #3 (bien-être).** Ajout d'une **répartition des routines de la semaine par famille** (échauffement / mobilité / étirement / détente) — pour voir d'un coup d'œil si on varie les types de séances bien-être.

## Livré

- **Ligne « Cette semaine : 🤸 Mobilité ×N · 🔥 Échauffement ×N · 🧘 Étirement ×N · 😌 Détente ×N »** dans le panneau bien-être (sous la heatmap).
- Triée par nombre décroissant ; masquée si aucune routine cette semaine.

## Détail technique

- **`lib/logic.js`** : `WELLNESS_FAMILIES` (mapping routine → famille + emoji) + `wellnessFamilyBreakdown(wellnessDone, startKey, endKey)` → `[{ family, emoji, count }]` trié ; ignore parcours et clés inconnues. Pur + testé.
- **`app.js`** : `renderWellnessFamilies()` (chips) appelé dans `render()`.
- **`index.html`** : `#wellnessFamilies`.
- **`strength.css`** : `.wellness-families` / `.wf-chip`.
- **CHANGELOG** complété (v1.9.216).

## Vérifs

- `npm run verify` → **303 tests / 303 pass** (+ test `wellnessFamilyBreakdown`), garde-fou CSS vert, **SMOKE OK** (`wellnessFamilies`).
- **Navigateur** (2 mobilité, 1 étirement, 1 échauffement) : « 🤸 Mobilité ×2 · 🔥 Échauffement ×1 · 🧘 Étirement ×1 ». ✓
- `npm run dist` → **Setup 1.9.216.exe** (app d'Adrien jamais fermée).

## Suite (rotation 18)

#1 ✅ (#280), #2 ✅ (#281), #3 ✅ (#282). Prochain : **#4 coaching** (dernière → tag + auto-publish + notif de rotation, puis rotation 19 sur #1). Boucle autonome continue.
