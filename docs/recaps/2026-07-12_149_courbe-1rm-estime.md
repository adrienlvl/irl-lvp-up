# Boucle #149 (autonome) — Courbe du 1RM estimé · build 1.9.83

**Contexte :** 12ᵉ itération du recentrage Exercices / Athlète. Focus Athlète / progression : visualiser l'évolution de la force, pas seulement le volume.

## Livré

Dans le panneau **Progression** (Athlète), en plus de la courbe de volume, une nouvelle **sparkline du 1RM estimé** sur les 8 dernières séances de l'exercice sélectionné, avec un **delta coloré** :

- barres = 1RM estimé (Epley, meilleur set du jour) par séance ;
- label : évolution entre la 1ʳᵉ et la dernière séance (**▲ vert / ▼ rouge kg**).

Le volume peut monter juste parce qu'on fait plus de séries ; le **1RM estimé** dit si on devient réellement plus fort. Les deux courbes côte à côte donnent la vraie lecture de la progression.

## Détail technique

- `lib/logic.js` : `estimatedOneRmSeries(workouts, name, limit=8)` — pur + testé. Un point par jour de séance = meilleur 1RM estimé du jour (setLogs ou charge/reps), trié ancien→récent, N dernières séances. Ignore les séries sans charge.
- `app.js` : `renderExerciseProgression` construit `rmSpark` (via `barChartSvg` violet) + delta, inséré après la courbe de volume.
- `athlete.css` : couleurs du delta (`.rm-up`/`.rm-down`/`.rm-flat`) dans le label.

## Vérifs

- `npm run verify` → **186 tests / 186 pass** (+1 : `estimatedOneRmSeries` — meilleur set du jour, tri, limite, séries sans charge ignorées, vide). **SMOKE OK** (`oneRmSeries:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.83.exe** (app d'Adrien jamais fermée).

_Prochaine boucle : toujours Exercices / Athlète._
