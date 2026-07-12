# Boucle #168 (autonome) — Coach Poids : ajustement calorique auto · build 1.9.102

**Contexte :** thème D (Coach Poids). Réagir à la réalité : quand le poids stagne, le plan doit s'ajuster.

## Livré

Dans le panneau **🎯 Coach Poids**, sous les macros, un bandeau **⚖️ ajustement** apparaît **quand le poids stagne** :

- Détection : **≥ 3 pesées sur ≥ 14 jours** avec un rythme quasi nul dans le mauvais sens (perte qui ne descend plus, ou prise qui ne monte plus).
- Proposition : **−125 kcal/jour** (perte, ou ajouter du cardio) / **+125 kcal/jour** (prise), avec la **nouvelle cible calorique** affichée directement.
- Message contextualisé (« Ton poids stagne (+0 kg/sem sur 21 j). Baisse d'environ 125 kcal/jour… »).

Le plan cesse d'être théorique : il se recale sur ce qui se passe vraiment sur la balance.

## Détail technique

- `lib/logic.js` : `calorieAdjustment(weights, goal, dailyTarget)` — pur + testé. Trie les pesées, exige ≥ 14 j de recul, calcule le rythme réel, renvoie `{stagnating, suggestion:'reduce'|'increase', delta, newTarget, ratePerWeek, message}` (plancher 1200 kcal en perte).
- `app.js` : `renderCoachWeight` insère le bandeau `.cw-adjust` quand `stagnating`.
- `athlete.css` : style `.cw-adjust` (orange).

## Vérifs

- `npm run verify` → **208 tests / 208 pass** (+1 : `calorieAdjustment` — stagnation perte/prise, recul insuffisant, perte qui progresse, maintien). **SMOKE OK** (`coachAdjust:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.102.exe** (app d'Adrien jamais fermée).

## Suite (boucle en cours)

Menu réel calé sur les calories ; suivi des mensurations vers la cible ; historique du score d'adhérence ; boutons « programmer » la semaine type.
