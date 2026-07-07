# Boucle #51 — Nutrition : les aliments cuits avant les crus

**Date :** 2026-07-08
**Version :** 1.6.0 → 1.6.1

## Contexte
Suite de la boucle après la roadmap d'audit. Item de `docs/ROADMAP.md` connu depuis la 1.2.1 : la recherche CIQUAL remontait les versions **crues** (« Riz blanc, cru » = 528 kcal/100 g) → macros trompeuses dans le frigo et le générateur de repas.

## Ce qui a été fait
- **`searchFoods` (lib/foods-data.js)** : nouveau classement — les versions **cuites** remontent avant les **crues** (cru : score +2, cuit : score −1), **sauf si la requête contient « cru »** (`wantsRaw`, regex `crue?s?`). Plats composés toujours en dernier.
- Effet mesuré : « riz » → *Riz thaï cuit (143 kcal), Riz blanc cuit (145), Riz rouge cuit (141), Riz complet cuit (158)* — avant : *Riz blanc cru (528 kcal)* en tête. « poulet » → versions rôties/cuites d'abord. « riz cru » → toujours les crus.
- Impact en cascade : le frigo (« Mon frigo ») et le **générateur de repas** reçoivent désormais par défaut des aliments aux **kcal réalistes**.

## Vérifications
- 2 nouveaux tests (`foods.test.js`) : cuit avant cru sur « riz » + « poulet » non cru en tête ; « riz cru » explicite → tous crus. → **98/98** ✅, `SMOKE OK`.
- Vérif live Node du classement réel (sortie ci-dessus).

## État du backlog
Ce qui reste demande une décision/action d'Adrien : publier le lot 1.5.2→1.6.1 (`npm run release`), signature de code, Vague S.8 (scan frigo photo, sync agenda OAuth). → point fait à Adrien.
