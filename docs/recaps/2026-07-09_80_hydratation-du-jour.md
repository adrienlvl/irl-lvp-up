# Boucle #80 (autonome) — Hydratation du jour · build 1.9.14

**Contexte :** 5ᵉ itération de la boucle autonome. Aire : Nutrition.

## Livré

Dans le panneau **Nutrition**, un suivi **💧 Hydratation du jour** à faible friction :
- **jauge de progression** (bleue → verte à l'objectif),
- boutons **« + 1 verre »** et **« − »**,
- libellé **verres / objectif (8) · litres · ✓ objectif atteint**.

Pas besoin de remplir tout le journal nutrition : les boutons **mettent à jour l'entrée du jour** (upsert de `state.nutrition`, champ `water`), et le journal complet reste synchronisé (`#waterInput`).

## Détail technique

- `lib/logic.js` : `waterStatus(waterLog, dateKey, goal)` pur + testé (verres bornés 0-40, litres = verres × 0,25, % plafonné à 100, `done`).
- `app.js` : `renderHydration()` (appelée par `renderGrowth`), `bumpWater(±1)` (upsert entrée du jour), boutons câblés. Pas de nouvelle collection d'état (réutilise `state.nutrition`).
- `index.html` : widget `.hydration-quick` dans `nutrition-panel`. `extras.css` : jauge + contrôles.

## Vérifs

- `npm run verify` → **127 tests / 127 pass** (+1 : `waterStatus`), **SMOKE OK** (`hydration:true`).
