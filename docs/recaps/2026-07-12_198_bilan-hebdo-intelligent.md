# Boucle #198 (autonome) — Bilan hebdomadaire intelligent · build 1.9.132

**Amélioration de fond (coaching).** Le panneau « Ma semaine » affichait des chiffres bruts (séances, minutes, km) mais aucune lecture personnalisée : es-tu en avance/retard sur tes objectifs ? En hausse ou en baisse ? Faut-il lever le pied ?

## Livré — insights personnalisés dans « Ma semaine »

Une liste d'**insights** colorés (vert = bien, ambre = attention, bleu = info) qui compare ta semaine à tes objectifs et à la semaine précédente :

- **Séances vs objectif** : « ✅ 4/4 séances — objectif atteint ! » ou « 🎯 2/4 — encore 2 pour ton objectif ».
- **Course vs objectif distance** : « 🏃 12 km — objectif 10 km atteint » / « 8/10 km ».
- **Tendance de volume** vs semaine dernière : « 📈 +40 min » / « 📉 −45 min, semaine plus légère ? ».
- **Charge** : alerte si l'ACWR est en pic (risque de blessure).
- **Sommeil** : rappel si la moyenne descend sous 7 h.

Priorise les signaux forts (max 5 insights), et affiche un message d'amorce si pas encore de données.

## Détail technique

- **`lib/logic.js`** : `weeklyInsights(state, mondayKey, todayKey)` — s'appuie sur `weeklySummary` (semaine courante + précédente), `state.goals` et `acuteChronicRatio` ; renvoie `[{emoji, tone, text}]` (1–5). Pur + testé.
- **`app.js`** : rendu de `#weeklyInsights` dans la revue hebdo. **`index.html`** + **`athlete.css`** : `.weekly-insights`/`.wi-item` avec variantes de ton.

## Vérifs

- `npm run verify` → **232 tests / 232 pass** (+1 : `weeklyInsights`), garde-fou CSS vert, **SMOKE OK** (`weeklyInsights:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.132.exe** (app d'Adrien jamais fermée).

## Suite (améliorations de fond)

Quêtes auto depuis les objectifs, plan de repas concret, comparaison photos avant/après.
