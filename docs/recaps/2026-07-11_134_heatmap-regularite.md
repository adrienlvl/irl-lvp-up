# Boucle #134 (autonome) — Carte de régularité (heatmap) · build 1.9.68

**Contexte :** 59ᵉ itération de la boucle autonome. Aire : Athlète / motivation visuelle.

## Livré

Le panneau « Ton volume » (page Athlète) affiche une **carte de régularité type GitHub** des **8 dernières semaines** : une pastille par jour, plus foncée selon le nombre de séances.

- Colonnes = semaines (lundi en haut → dimanche en bas), jours futurs de la semaine en cours estompés.
- Vue d'ensemble immédiate de la constance — complément visuel des badges « 🔥 X sem. » et de la série de séances.

## Détail technique

- `lib/logic.js` : `trainingHeatmap(workouts, todayKey, weeks=8)` pur + testé → tableau `w*7` de `{ date, count, future }`, **aligné lundi** (compatible `grid-auto-flow: column`).
- `app.js` : `renderAthlete` remplit `#trainingHeatmap` (classes `hm-1`/`hm-2` selon l'intensité, `hm-future`).
- `index.html` / `athlete.css` : conteneur + grille `.hm-grid` (7 lignes, flux par colonnes).

## Vérifs

- `npm run verify` → **169 tests / 169 pass** (+1 : `trainingHeatmap` — longueur w*7, alignement lundi, comptes, jours futurs, vide, date invalide), **SMOKE OK** (`heatmap:true`). `node --check app.js` OK.
