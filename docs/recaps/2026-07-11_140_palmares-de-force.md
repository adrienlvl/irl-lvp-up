# Boucle #140 (autonome) — Palmarès de force (1RM par exercice) · build 1.9.74

**Contexte :** 3ᵉ itération du recentrage Exercices / Athlète. Focus : donner une **vue d'ensemble de la force**, au-delà du toast de record ponctuel.

## Livré

Nouveau panneau **« 🏆 Palmarès de force »** (Athlète → Progrès), sous la progression : un tableau classé de **tes meilleures séries** par exercice.

- Pour chaque exercice chargé : **meilleure série** (charge × reps) + **1RM estimé** (Epley).
- **Trié du 1RM le plus élevé au plus faible**, le n°1 mis en avant (👑, carte dorée).
- Balaie **tout l'historique** (séries `setLogs` incluses) ; ignore les mouvements sans charge (gainage, etc.).
- Limité aux 12 premiers + compteur « +N autres… ».

Jusqu'ici les records n'apparaissaient qu'en toast fugace au moment de battre un PR. Maintenant Adrien a un vrai tableau de bord de sa force, consultable à tout moment.

## Détail technique

- `lib/logic.js` : `strengthRecords(workouts)` — pur + testé. Parcourt les séances, retient par exercice la série au **1RM estimé le plus haut** (réutilise `estimate1RM`), renvoie `[{name, load, reps, e1rm, date}]` trié.
- `app.js` : `renderStrengthRecords()` (câblé dans `render()`), rendu tableau `#strengthRecords`.
- `index.html` : panneau `strength-records-panel` après la progression.
- `athlete.css` : styles `.strength-records` / `.sr-row` (carte dorée pour le n°1).

## Vérifs

- `npm run verify` → **176 tests / 176 pass** (+1 : `strengthRecords` — meilleure série par 1RM, setLogs, tri, sans-charge ignoré, vide). **SMOKE OK** (`strengthRecords:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.74.exe** (app d'Adrien jamais fermée).

_Note : 1RM affiché = estimation Epley, indicatif (ne pas tester à froid)._

_Prochaine boucle : toujours Exercices / Athlète._
