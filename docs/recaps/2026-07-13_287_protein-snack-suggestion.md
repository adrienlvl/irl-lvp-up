# #287 — Idée de collation pour combler le protéique restant (1.9.221)

**Rotation 19 · item #4 (CLÔTURE) · liberté totale (domaine : nutrition)**

## Problème
Le panneau Nutrition affichait la protéine du jour (consommée / cible) mais ne
disait pas *quoi faire* du reste : « il me manque 30 g, je mange quoi ? ». Aucune
suggestion concrète et actionnable pour combler l'écran quotidien.

## Amélioration
Sous la barre de protéines, un bandeau propose une **collation concrète** dont
l'apport couvre au mieux le protéique restant du jour.

### Logique pure — `proteinSnackSuggestion(consumed, target)`
- `gap = round(target − consumed)`.
- `null` si l'objectif est atteint (écart ≤ 5 g) ou si la cible est inconnue (≤ 0).
- Sinon choisit dans `PROTEIN_SNACKS` (table triée par apport) la **plus petite
  collation** qui couvre l'écart ; à défaut la plus grosse disponible.
- Renvoie `{ gap, snack, snackProtein }`.
- `PROTEIN_SNACKS` : amandes (6) → œuf (7) → fromage blanc (12) → skyr (15) →
  2 œufs+pain (18) → whey (24) → blanc de poulet (30) → poulet+skyr (45).

### Rendu — dans `renderHydration()`
- Réutilise `prot` (consommé du jour) et `tgt` (`proteinTarget`) déjà calculés.
- Bandeau `#proteinSnack` masqué quand `null`.
- « 💪 Il te reste **X g** de protéines · Idée : <collation> (~Y g) ».

## Tests
- `logic.test.js` : écart 30 → poulet 30 g ; écart 10 → fromage blanc 12 g ;
  écart énorme → 45 g ; objectif atteint / dépassé → `null` ; cible 0 → `null`.
- `renderer-smoke.cjs` : check `proteinSnack` (présence `#proteinSnack` + calcul).
- **Bonus** : corrigé l'assertion `CHANGELOG[0].v` du smoke (`whatsNew`) restée à
  `1.9.219` → passée à `1.9.221` ; `whatsNew` repasse à `true`.
- `npm run verify` : **308 tests + SMOKE OK**.
- Vérif navigateur (tab-8) : 115/145 g → « Il te reste 30 g · Blanc de poulet
  (120 g) (~30 g) » ; 145/145 g → bandeau masqué. ✔

## Fichiers
- `src/lib/logic.js` — `PROTEIN_SNACKS` + `proteinSnackSuggestion()` + exports + CHANGELOG[0] 1.9.221.
- `src/app.js` — bandeau `#proteinSnack` dans `renderHydration()`.
- `src/index.html` — `#proteinSnack` après le bloc protéines.
- `src/extras.css` — `.protein-snack`.
- `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`.

## Clôture rotation 19
Items : #284 rythme révision BTS · #285 série journées complètes · #286 bilan
sommeil hebdo · #287 collation protéinée. → **tag `v1.9.221` + push (auto-publish)**.
