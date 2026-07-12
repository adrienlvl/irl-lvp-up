# Boucle #160 (autonome) — Coach Poids : nutrition détaillée · build 1.9.94

**Contexte :** étape **4/6** du module Coach Poids. On traduit les calories/macros cibles en assiette concrète, jour par jour.

## Livré

Dans le panneau **🎯 Coach Poids**, sous le plan d'entraînement, un bloc **« 🍽️ Ta journée d'assiette »** :

- **Répartition des calories cibles sur 4 repas** : Petit-déjeuner 25 %, Déjeuner 35 %, Dîner 30 %, Collation 10 %, avec **kcal + protéines/glucides/lipides par repas**.
- **Repères « quoi manger »** adaptés à l'objectif :
  - *perte* → rester sous la dépense, limiter sucres/alcool ;
  - *prise* → surplus modéré, collations denses ;
  - + base commune : protéines à chaque repas, moitié d'assiette de légumes, féculents complets, hydratation.
- Renvoi vers le panneau **« Cuisine du jour »** pour des idées de repas concrètes (frigo + CIQUAL).

## Détail technique

- `lib/logic.js` :
  - `mealSplit(dailyTarget, proteinG, carbG, fatG)` — pur + testé. Renvoie 4 repas `{meal, share, kcal, proteinG, carbG, fatG}` ; `[]` si calories invalides.
  - `nutritionTips(goal)` — pur + testé. Liste de conseils selon perte/prise/maintien.
- `app.js` : `renderCoachWeight` ajoute le bloc `.cw-nutri` (repas + tips).
- `athlete.css` : styles `.cw-meals` / `.cw-meal` / `.cw-tips`.

## Vérifs

- `npm run verify` → **200 tests / 200 pass** (+2 : `mealSplit` répartition 25/35/30/10 % + macros ; `nutritionTips` par objectif). **SMOKE OK** (`coachNutri:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.94.exe** (app d'Adrien jamais fermée).

## Suite

5. Coaching narratif « comment y arriver » + checklist hebdo + adhérence. 6. Affiner l'estimation (recalage tendance réelle, activité manuelle).
