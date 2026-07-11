# Boucle #132 (autonome) — Score de forme du jour (readiness) · build 1.9.66

**Contexte :** 57ᵉ itération de la boucle autonome. Aire : Athlète / récupération.

## Livré

Le check-in de récupération (sommeil, fatigue, courbatures) est désormais résumé en un **score de forme 0-100** avec un verdict, affiché sur une jauge colorée :

> **72** /100 · Forme du jour · **Correct — garde une marge** (bord jaune)

- **≥ 75** vert « Prêt à pousser », **50-74** jaune « Correct — garde une marge », **< 50** rouge « Récupération prioritaire ».
- Un chiffre unique et lisible qui synthétise les trois signaux — plus parlant que trois curseurs séparés pour décider de pousser ou d'alléger.

## Détail technique

- `lib/logic.js` : `readinessScore(recovery)` pur + testé — sommeil `min(1, h/8)×40` + fatigue `((5−f)/4)×30` + courbatures `((5−s)/4)×30`, arrondi, bornes robustes ; `null` sans check-in.
- `app.js` : `renderRoadmapFeatures` remplit `#recoveryScore` (classe `ready`/`ok`/`low`).
- `index.html` / `athlete.css` : élément `#recoveryScore` + styles de jauge.

## Vérifs

- `npm run verify` → **167 tests / 167 pass** (+1 : `readinessScore` — parfait 100, médiocre 40, correct 73, null), **SMOKE OK** (`readiness:true`). `node --check app.js` OK.
