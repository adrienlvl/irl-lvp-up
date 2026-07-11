# Boucle #141 (autonome) — Fiche exercice personnalisée · build 1.9.75

**Contexte :** 4ᵉ itération du recentrage Exercices / Athlète. Focus **Exercices** : transformer la fiche d'un exercice en carte de coaching personnalisée.

## Livré

Quand on clique sur un exercice dans la **bibliothèque**, sa fiche affiche désormais, en tête, un **bloc d'historique personnel** (si l'exercice a déjà été fait) :

- 🗓️ **nombre de séances** + **dernière date** + **total de séries** loggées ;
- 🏆 **meilleure série** : `charge × reps` avec **1RM estimé** (ou « N reps » pour le poids du corps) ;
- 🎯 **cible de progression** du jour (double progression, réutilise `progressionSuggestion`) ;
- 📊 **sparkline de volume** sur les 8 dernières séances.

Avant, la fiche ne montrait qu'un record perso en une ligne. Maintenant c'est un vrai récap : où j'en suis, ce que j'ai fait de mieux, et quoi viser aujourd'hui — le tout au même endroit.

## Détail technique

- `lib/logic.js` : `exerciseHistoryStats(workouts, name)` — pur + testé. Renvoie `{sessions, lastDate, bestSet:{load,reps,e1rm}|null, bestReps, totalSets}` (gère `setLogs`, `completedSets`, format top-level ; `null` si jamais fait).
- `app.js` : handler `#exerciseCards` — construit `histBlock` (historique + `progressionText` + `exerciseVolumeSeries` → `barChartSvg`) en tête de `#exerciseDetailNotes`.
- `extras.css` : styles `.ex-hist` / `.ex-hist-line` / `.ex-hist-next` / `.ex-hist-spark`.

## Vérifs

- `npm run verify` → **177 tests / 177 pass** (+1 : `exerciseHistoryStats` — séances, dernière date, total séries, meilleure série chargée vs reps au poids du corps, inconnu/vide → null). **SMOKE OK** (`exerciseHistory:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.75.exe** (app d'Adrien jamais fermée).

_Prochaine boucle : toujours Exercices / Athlète._
