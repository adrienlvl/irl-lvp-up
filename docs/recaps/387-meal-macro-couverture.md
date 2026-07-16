# #387 — Couverture de `mealMacro` (macros à la portion, générateur de repas)

## Le manque (couverture §4.1, domaine nutrition)

`mealMacro(food, grams)` — la **brique atomique** qui met à l'échelle les macros d'un aliment
(valeurs pour 100 g du frigo → valeurs de la portion réelle) — était la **seule fonction pure de
`logic.js` avec zéro référence dans les tests**, et elle n'était même **pas exportée**
(`module.exports`). Elle est pourtant appelée à chaque assiette par `generateMeals` (onglet Cuisine /
menus) : c'est elle qui produit le `kcal` et le `p` (protéines) affichés à Adrien pour chaque
ingrédient d'un repas suggéré.

Rien ne verrouillait son contrat de correction :

```js
function mealMacro(food, grams) {
  const at = k => (food && food[k] != null ? food[k] : 0) * grams / 100;
  return { name: food.n, grams, kcal: Math.round((food.kcal || 0) * grams / 100), p: Math.round(at('p')) };
}
```

Deux propriétés silencieuses, faciles à casser par un futur refactor :

- **Mise à l'échelle par 100 g + arrondi** : `kcal`/`p` = valeur pour 100 g × grammes / 100,
  arrondis. Changer le diviseur, l'ordre ou l'arrondi ferait dériver les macros affichées sans que
  rien ne rougisse.
- **Garde anti-NaN** : `food.kcal || 0` et le garde `food[k] != null` ramènent un champ manquant ou
  `null` à **0** — sans quoi un aliment de frigo incomplet injecterait un `NaN` dans le total du
  repas (`totalKcal`/`totalP`) et casserait l'affichage.

## Le geste (couverture, zéro changement de comportement)

Export de `mealMacro` (ajout au seul `module.exports` — les globals navigateur sont déjà
automatiques, script sans bundler) + **3 blocs de tests** (`logic.test.js`, 419 → **422**), placés
à côté des tests `generateMeals` :

1. **Échelle + arrondi** : 100 g → valeurs brutes conservées (échelle neutre) ; 130 g de poulet →
   `kcal 192` (148 × 1,3 = 192,4→192) et `p 39` ; arrondi honnête d'un fractionnaire (riz 2,7 g/100 g
   × 130 g = 3,51 → **4** ; kcal 169).
2. **Proportionnalité** : doubler la portion (100 g → 200 g) double exactement `kcal` et `p` ;
   portion nulle → 0.
3. **Robustesse anti-NaN** : aliment sans macros → `kcal`/`p` à 0 (assertion explicite
   `!Number.isNaN`) ; champs `null` (données hostiles) traités comme 0.

## Vérification

`xvfb-run -a npm run verify` : **422 tests + smoke** verts (419 → 422). Smoke **inchangé** (aucune
modification du renderer).

## Contexte

**Pas de bump de version** : tests seuls + export, sans effet utilisateur (§6 de VPS-AUTOPILOT).
Build reste **2.0.28**. Backlog autonome §4.1 (couverture d'une fonction pure non testée, cas limites
réels : échelle, arrondi, proportionnalité, garde anti-NaN). **Domaine varié** (nutrition) après
plusieurs itérations calendrier/ICS (#381, #385, #386) et anniversaires (#384). Aucune Release, zéro
dépendance, aucune donnée perso, aucune feature retirée. Boucle #387.
