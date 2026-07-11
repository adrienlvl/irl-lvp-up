# Boucle #154 (autonome) — Garde-fou kilométrage (règle +10 %/sem) · build 1.9.88

**Contexte :** 17ᵉ itération du recentrage Exercices / Athlète. Focus **Athlète / ultra-trail** : prévenir la blessure liée à une montée en charge trop rapide.

## Livré

Dans le panneau **« Objectif ultra-trail »**, sous la synthèse course, une ligne **« 📈 Garde-fou kilométrage »** qui applique la règle bien connue des coureurs : **ne pas augmenter son volume hebdo de plus de ~10 % par semaine**.

Elle compare les km courus sur les **7 derniers jours** à ceux de la **semaine précédente** (7-13 j) et affiche un verdict coloré :

- **⚠️ hausse rapide (> 30 %)** → risque de blessure, lève le pied (rouge) ;
- **progression soutenue (10-30 %)** (vert) ;
- **volume stable (-10..10 %)** (turquoise) ;
- **semaine plus légère (< -10 %)** → récup (jaune) ;
- **première semaine de référence** si pas d'historique la semaine d'avant.

## Détail technique

- `lib/logic.js` : `weeklyKmRamp(workouts, todayKey)` — pur + testé. Somme les km `run` sur 0-6 j et 7-13 j, calcule `rampPct` et la `zone`. `null` si aucun km sur les deux semaines ; `zone:'start'` si semaine précédente vide.
- `app.js` : `renderAthlete` remplit `#trailRamp` (phrase + classe `ramp-*`).
- `index.html` : `<p id="trailRamp">`.
- `trail.css` : styles `.trail-ramp` + variantes couleur par zone, `:empty` masqué.

## Vérifs

- `npm run verify` → **191 tests / 191 pass** (+1 : `weeklyKmRamp` — fenêtres 7/14 j, rampPct, zones build/high/start, vide/date invalide → null). **SMOKE OK** (`kmRamp:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.88.exe** (app d'Adrien jamais fermée).

_Prochaine boucle : toujours Exercices / Athlète._
