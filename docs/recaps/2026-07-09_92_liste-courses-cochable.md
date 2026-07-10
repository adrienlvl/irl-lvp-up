# Boucle #92 (autonome) — Liste de courses cochable · build 1.9.26

**Contexte :** 17ᵉ itération de la boucle autonome. Aire : Nutrition / cuisine.

## Livré

La **liste de courses** (bloc « Cuisine du jour ») devient interactive :
- chaque article se **coche d'un clic** (case ✓, texte barré et estompé) au fur et à mesure du panier,
- un compteur affiche **« X articles à acheter »** puis **« Tout est coché ✓ »**,
- l'état est **persistant** (survit au rechargement) via `state.shoppingChecked`.

Avant, la liste était en lecture seule (copier uniquement) : impossible de suivre ce qui restait à prendre.

## Détail technique

- `lib/logic.js` : `remainingShopping(items, checked)` pur + testé (nombre d'articles non cochés, robuste à `checked` nul / entrée non-tableau).
- `app.js` :
  - `defaults` + `normalizeState` : nouveau champ `shoppingChecked` (objet `{ label: true }`, défensif contre tableau/valeur invalide).
  - `renderShoppingList` : rangées `<button data-shop-toggle>` avec état coché + `#shoppingRemaining`.
  - handler `#shoppingList` : bascule le libellé, `save()`, re-render.
- `index.html` : `#shoppingRemaining` dans l'en-tête du bloc. `extras.css` : styles `.shop-check` / `.shop-done` / `.shop-remaining`.

## Vérifs

- `npm run verify` → **136 tests / 136 pass** (+1 : `remainingShopping` — vide, partiel, complet, null, non-tableau), **SMOKE OK** (`shoppingCheck:true`).
