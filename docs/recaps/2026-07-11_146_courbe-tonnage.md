# Boucle #146 (autonome) — Courbe « Tonnage soulevé » · build 1.9.80

**Contexte :** 9ᵉ itération du recentrage Exercices / Athlète. Focus Athlète : suivre la progression réelle en muscu, semaine après semaine.

## Livré

Une 5ᵉ courbe **« Tonnage soulevé »** dans le panneau **Graphiques · 8 semaines** (Athlète → Progrès), à côté de la charge d'effort, du focus, du sommeil et des révisions.

Elle affiche le **total de kilos soulevés par semaine** — charge × répétitions × séries, en privilégiant les séries réellement validées (setLogs complétés). C'est **la** métrique de surcharge progressive : si le tonnage monte semaine après semaine, la muscu progresse. Barre du haut = tendance (▲/▼) comme les autres courbes.

## Détail technique

- `lib/logic.js` : `workoutTonnage(workout)` — pur + testé. Somme sur les exercices : si `setLogs`, prend les séries validées (sinon toutes les séries loggées) ; sinon `charge × reps × séries`. Poids du corps → 0.
- `app.js` : `renderCharts` ajoute la série `tonnage` (via `weeklyAggregate(..., value: workoutTonnage)`) et la carte « Tonnage soulevé » (rose), incluse dans le test `hasData`.

## Vérifs

- `npm run verify` → **182 tests / 182 pass** (+1 : `workoutTonnage` — setLogs validés prioritaires, tous setLogs si aucun validé, charge×reps×séries sans setLogs, poids du corps → 0, entrées nulles). **SMOKE OK** (`tonnage:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.80.exe** (app d'Adrien jamais fermée).

_Prochaine boucle : toujours Exercices / Athlète._
