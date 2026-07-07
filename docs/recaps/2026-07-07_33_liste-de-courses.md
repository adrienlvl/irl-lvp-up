# Boucle #35 — Liste de courses depuis les manques

**Date :** 2026-07-07
**Version :** 1.2.1 → 1.2.2

## Demande d'Adrien
Choix après le générateur de repas : **« Liste de courses »** — à partir des catégories manquantes du frigo, proposer quoi acheter pour compléter un repas.

## Ce qui a été fait

### `buildShoppingList(pantry, opts)` — pur, dans `lib/logic.js`
- Regarde ce que **l'envie du jour** demande (P + F + L + l'extra du style : laitier / fruit / gourmandise) et ce qui est **absent du frigo**.
- Pour chaque catégorie manquante : renvoie `{cat, label, grams, suggestions[]}` avec
  - un **libellé** lisible (Protéine, Féculent, Légume, Fruit, Produit laitier, Gourmandise),
  - une **quantité estimée** (portion de la catégorie × nb de repas),
  - **3 aliments concrets** à acheter (`SHOPPING_STAPLES` : ex. Féculent → Riz · Pâtes complètes · Pain complet).
- Si le frigo couvre déjà tout ce que l'envie demande → **liste vide** (rien à acheter).

### UI — bloc « 🛒 Liste de courses » (onglet Nutrition → Cuisine du jour)
- Apparaît automatiquement sous les repas quand il manque des catégories (`#shoppingBlock`, masqué sinon).
- Chaque ligne : catégorie + quantité estimée + suggestions.
- Bouton **Copier** → copie la liste en texte dans le presse-papier (« - Féculent (≈ 540 g) : Riz, Pâtes complètes, Pain complet »).
- Se met à jour en même temps que les repas (changement d'envie, ajout/retrait au frigo).

## Vérifications
- `node --test` → **66/66** ✅ (2 nouveaux tests `buildShoppingList` : ne liste que les manques ; frigo complet → [], frigo vide → toutes les catégories de l'envie).
- Smoke renderer → `SMOKE OK`, check `shopping:true` ✅
- Flux réel (Electron) : frigo = 1 protéine, envie Équilibré → liste = **Féculent · Légume · Produit laitier** avec « Riz · Pâtes complètes · Pain complet ». Bloc masqué quand le frigo est complet. ✅

## Suite possible
- Préférer automatiquement le **cuit** pour féculents/protéines (macros crédibles).
- Scan du frigo par photo (Vague Sécurité).
