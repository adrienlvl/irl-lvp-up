# Boucle #113 (autonome) — Dette de sommeil 7 jours · build 1.9.47

**Contexte :** 38ᵉ itération de la boucle autonome. Aire : Athlète / récupération.

## Livré

Le conseil de **récupération** signale désormais la **dette de sommeil** accumulée sur les 7 derniers jours quand elle devient significative :

> … 💤 **3,5 h de sommeil en retard sur 7 j** (moy. 6,5 h) : protège tes nuits, ce sera ta meilleure séance.

- N'apparaît que si c'est parlant : au moins **3 nuits renseignées** et **≥ 2 h** de dette cumulée.
- Le sommeil pilote la récupération : ce rappel aide Adrien à alléger l'entraînement quand il manque de repos.

## Détail technique

- `lib/logic.js` : `sleepDebtHours(recovery, target, sinceKey, todayKey)` pur + testé — somme des heures sous la cible (défaut 7,5 h), ne compte que les nuits `sleep > 0` ; retourne `{ debt, nights, target, avg }`.
- `app.js` : `renderRoadmapFeatures` calcule la dette sur 7 jours et l'ajoute au `#recoveryAdvice` (avec ou sans check-in du jour).

## Vérifs

- `npm run verify` → **153 tests / 153 pass** (+1 : `sleepDebtHours` — dette, nuits comptées, moyenne, hors fenêtre, nuit à 0 ignorée, entrée invalide), **SMOKE OK** (`sleepDebt:true`).

_Note : assertions du test initialement fausses (nights/avg) corrigées avant commit._
