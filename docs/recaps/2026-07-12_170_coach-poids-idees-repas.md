# Boucle #170 (autonome) — Coach Poids : idées de repas concrètes · build 1.9.104

**Contexte :** thème D (Coach Poids / nutrition). Passer des macros abstraites à « quoi mettre concrètement dans l'assiette ».

## Livré

Dans la **journée d'assiette** du Coach Poids, chaque repas (petit-déjeuner / déjeuner / dîner / collation) affiche maintenant, sous ses kcal + macros, un **exemple d'assiette concret** adapté au moment de la journée (ex. petit-déj → *« Flocons d'avoine + fromage blanc + fruit + oléagineux »*). Un bouton **« 🔁 Autres idées »** fait tourner les propositions (3 idées par repas).

Note pédagogique : ajuster les portions pour approcher les kcal du repas. Renvoi conservé vers « Cuisine du jour » (frigo + CIQUAL) pour des idées à partir de ce qu'on a.

## Détail technique

- `lib/logic.js` : `MEAL_IDEAS` (3 assiettes/repas) + `mealIdea(mealName, kcal, seed)` — pur + testé. Rotation par `seed`, repli générique pour un repas inconnu.
- `app.js` : `coachMenuSeed` + rendu de l'exemple sous chaque repas ; bouton `#coachMenuMore` (incrémente le seed → re-render).
- `athlete.css` : style `.cw-meal-ex` (ligne exemple, séparateur pointillé).

## Vérifs

- `npm run verify` → **210 tests / 210 pass** (+1 : `mealIdea` — exemple par repas, rotation seed, cycle, repli). **SMOKE OK** (`coachMenu:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.104.exe** (app d'Adrien jamais fermée).

## Suite (boucle en cours)

Suivi des mensurations vers la cible ; historique du score d'adhérence ; responsive mobile continu.
