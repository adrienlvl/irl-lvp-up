# Boucle #34 — Générateur de repas « frigo + envie du jour »

**Date :** 2026-07-06
**Version :** 1.2.0 → 1.2.1

## Demande d'Adrien
> « Après le mieux ça serait pas de générer des repas équilibrés, ça je sais le faire, mais utiliser un générateur qui peut faire en fonction de mes goûts du jour, en fonction de ce que j'ai envie de manger et qui est dans le frigo par exemple ! »

Donc : **pas** de repas équilibrés génériques, mais un générateur qui part de **ce qu'il y a dans le frigo** + **l'envie du jour**.

## Ce qui a été fait

### 1. Inventaire « Mon frigo » (`state.pantry`)
- Nouveau tableau `pantry` dans l'état (defaults + `normalizeState`).
- Depuis la recherche CIQUAL, chaque résultat a un bouton **＋** (`data-add-food`) → ajoute l'aliment au frigo.
- Les aliments du frigo s'affichent en **chips** (`#pantryList`), retirable d'un clic (`data-remove-pantry`).

### 2. Envie du jour
- 4 styles (`#envieStyles`, `data-style`) : **Équilibré · Léger · Protéiné · Réconfort**.
  Chaque style ajuste les portions (féculent/légume), l'extra (dessert/fruit/gourmandise) et un multiplicateur protéines (`pMul` jusqu'à ×1.4 en Protéiné).
- Champ texte **« envie de… »** (`#envieText`) → sert d'**ancre** : si un aliment du frigo correspond, il est imposé dans les repas.

### 3. Générateur `generateMeals(pantry, opts)` (pur, dans `lib/logic.js`)
- Regroupe le frigo par catégorie CIQUAL, compose `count` repas (P protéine + F féculent + L légume + extra selon l'envie).
- Ancre forcée si `opts.anchor` matche (normalisation accents/œ).
- Calcule par repas : ingrédients + grammes + kcal + **protéines totales**.
- Renvoie aussi `missing[]` = catégories absentes du frigo (base d'une future liste de courses).
- Bouton **« Autres idées »** (`#moreMealsBtn`) → `seed += 3`, nouvelles combinaisons sans planter.

### 4. UI / CSS / Tests
- Section **« Cuisine du jour »** dans l'onglet Nutrition (`index.html`).
- CSS `.kitchen-panel / .pantry-chip / .envie-styles / .meal-card` (`extras.css`).
- 3 tests `generateMeals` (`test/logic.test.js`), smoke `kitchen` (`renderer-smoke.cjs`).

## Vérifications
- `node --test` → **64/64** ✅
- Smoke renderer → `SMOKE OK` ✅
- Flux réel (Electron, `check-meal.cjs`) : ajout de 3 aliments via ＋ (frigo=3), envie **Protéiné**, génération = **3 repas**, « Autres idées » = 3 repas re-rendus sans erreur. ✅

## Limite connue / piste
- La recherche CIQUAL remonte souvent la version **crue** (« Riz blanc, cru » → kcal élevés). Le générateur utilise ce qui est ajouté ; pour des chiffres réalistes, ajouter la version **cuite**.
- Piste future : préférer automatiquement le « cuit » pour féculents/protéines + **liste de courses** depuis `missing[]`.
- Piste future (Vague Sécurité) : **scan du frigo par photo** → remplit `pantry` automatiquement.
