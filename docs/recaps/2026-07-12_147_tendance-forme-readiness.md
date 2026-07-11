# Boucle #147 (autonome) — Tendance de forme (readiness) · build 1.9.81

**Contexte :** 10ᵉ itération du recentrage Exercices / Athlète. Focus **Athlète / récupération** : voir l'évolution de la forme, pas juste le score du jour.

## Livré

Dans le panneau **« Récupération »**, sous le score de forme du jour, une **mini-courbe de la forme (readiness) sur les 8 derniers check-ins** avec un indicateur de tendance :

- barres = score de readiness (0-100) par check-in, du plus ancien au plus récent ;
- en-tête : **delta** entre le premier et le dernier point (▲ vert si +5, ▼ rouge si −5, ▬ sinon).

Ça transforme le check-in ponctuel en signal de tendance : la fatigue s'accumule-t-elle (courbe qui descend → lever le pied) ou la récup remonte-t-elle (feu vert pour pousser) ? Complète le score du jour et la dette de sommeil.

## Détail technique

- `lib/logic.js` : `readinessTrend(recoveryList, limit=8)` — pur + testé. Trie par date, garde les N derniers, calcule le `readinessScore` de chacun, renvoie `{points:[{date,score}], delta, direction:'up'|'down'|'flat', latest}`. `null` si < 2 check-ins.
- `app.js` : `renderRoadmapFeatures` remplit `#readinessTrend` (en-tête + `barChartSvg` violet).
- `index.html` : `<div id="readinessTrend">` sous `#recoveryScore`.
- `athlete.css` : styles `.readiness-trend` / `.rt-head` (delta coloré up/down/flat), `:empty` masqué.

## Vérifs

- `npm run verify` → **183 tests / 183 pass** (+1 : `readinessTrend` — scores, delta, direction, tri chronologique forcé, < 2 → null). **SMOKE OK** (`readinessTrend:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.81.exe** (app d'Adrien jamais fermée).

_Prochaine boucle : toujours Exercices / Athlète._
