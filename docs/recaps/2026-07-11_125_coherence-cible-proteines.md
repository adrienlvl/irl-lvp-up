# Boucle #125 (autonome) — Cohérence de la cible protéines · build 1.9.59

**Contexte :** 50ᵉ itération de la boucle autonome. Aire : Nutrition / fiabilité (cohérence des chiffres).

## Problème corrigé

Deux cibles de protéines **différentes** étaient affichées dans la même page :
- la **jauge** « Protéines du jour » utilisait `proteinTarget(poids, objectif)` (goal-aware : **1,8 g/kg** en recomposition) ;
- le texte **« cap indicatif »** et le **bilan hebdo** utilisaient un `poids × 1,6` **codé en dur**.

Pour Adrien (81 kg, recomposition) : jauge sur **145 g**, texte sur **130 g** — incohérent, et 130 g est sous-évalué pour un objectif de recomposition musculaire.

## Livré

`renderGrowth` utilise désormais **`proteinTarget(poids, objectif).gramsPerDay` partout** (variable locale renommée `protTgt` pour ne pas masquer la fonction importée). Toutes les mentions de la cible protéines sont maintenant **cohérentes et adaptées à l'objectif**.

## Détail technique

- `app.js` : `renderGrowth` — remplacement du `Math.round(weight*1.6)` par `proteinTarget(...).gramsPerDay` ; propagé au « cap indicatif », au bilan hebdo (`💪 X/7 j ≥ Y g`) et au comptage `proteinDaysOnTarget`.
- (Coquille `${weekNutright…}` introduite puis corrigée avant vérif.)

## Vérifs

- `npm run verify` → **161 tests / 161 pass** (`proteinTarget` déjà couvert), **SMOKE OK** — nouveau check `proteinTargetUnified` : la cible du profil par défaut vaut **145 g** et le texte de statut l'affiche. `node --check app.js` OK.
