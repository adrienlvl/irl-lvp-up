# Boucle #135 (autonome) — Heatmap de régularité du focus · build 1.9.69

**Contexte :** 60ᵉ itération de la boucle autonome. Aire : Focus & Vie / motivation (révisions BTS).

## Livré

La page **Focus** affiche maintenant une **carte de régularité type GitHub** des **blocs de concentration** sur 8 semaines — le pendant, pour les révisions, de la heatmap ajoutée pour l'entraînement.

- Une pastille par jour, plus foncée selon le nombre de blocs de focus.
- Vue d'ensemble de la constance des révisions BTS, à côté de la série « 🔥 X jours de focus d'affilée ».

## Détail technique

- **Réutilisation** : `renderFocusRitual` appelle la fonction pure déjà testée `trainingHeatmap(state.focusSessions, today, 8)` — elle compte n'importe quels enregistrements datés, donc marche pour les blocs de focus sans nouveau code de logique.
- `index.html` : conteneur `#focusHeatmap` (mêmes styles `.hm-grid`/`.hm-cell` que l'athlète).

## Vérifs

- `npm run verify` → **169 tests / 169 pass** (logique déjà couverte par le test `trainingHeatmap`), **SMOKE OK** — nouveau check `focusHeatmap` : 56 cellules rendues (8 × 7). `node --check app.js` OK.
