# Boucle #155 (autonome) — Équilibre poussée / tirage · build 1.9.89

**Contexte :** 18ᵉ itération du recentrage Exercices / Athlète. Focus **Athlète / volume** : détecter le déséquilibre musculaire le plus courant.

## Livré

Dans la **revue hebdomadaire**, sous les séries par groupe, une ligne **« ⚖️ Poussée / tirage (4 sem.) »** qui compare, sur 28 jours :

- les séries de **poussée** (exercices touchant pectoraux ou épaules) ;
- les séries de **tirage** (exercices touchant le dos).

Elle affiche le ratio et un verdict coloré :

- **équilibré 👍** (ratio 0,67–1,5, vert) ;
- **trop de poussée** → ajoute du dos (tractions, rowing) (orange) ;
- **beaucoup de tirage** → pense aux pectoraux/épaules ;
- **aucun tirage** → ajoute du dos pour équilibrer les pompes.

Le déséquilibre pecs ≫ dos est le piège classique (surtout avec beaucoup de pompes) : mauvais pour la posture et les épaules. Cette ligne le rend visible.

## Détail technique

- `lib/logic.js` : `muscleBalance(workouts, todayKey, days=28)` — pur + testé. Somme les séries (validées sinon prévues) sur la fenêtre, classe poussée (chest/shoulders) vs tirage (back) via `exerciseZones`, renvoie `{push, pull, ratio, zone}`. `null` si ni poussée ni tirage.
- `app.js` : `renderWeeklyReview` remplit `#muscleBalance` (verdict + classe `mb-ok`/`mb-warn`).
- `index.html` : `<p id="muscleBalance">` dans le panneau revue hebdo.
- `athlete.css` : styles `.muscle-balance` (vert équilibré / orange déséquilibre), `:empty` masqué.

## Vérifs

- `npm run verify` → **192 tests / 192 pass** (+1 : `muscleBalance` — comptage poussée/tirage, ratio, zones push-heavy/no-pull/balanced, hors-fenêtre exclu, ni-l'un-ni-l'autre → null). **SMOKE OK** (`muscleBalance:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.89.exe** (app d'Adrien jamais fermée).

_Prochaine boucle : toujours Exercices / Athlète._
