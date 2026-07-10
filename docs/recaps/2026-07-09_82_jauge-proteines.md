# Boucle #82 (autonome) — Jauge protéines du jour · build 1.9.16

**Contexte :** 7ᵉ itération de la boucle autonome. Complète le suivi hydratation (#80).

## Livré

Sous la jauge d'hydratation, une jauge **💪 Protéines du jour** (violette) affiche les grammes du jour (entrée nutrition) vs la **cible personnalisée** — un repère instantané pour la recomposition. Passe au vert quand la cible est atteinte.

## Détail technique

- `app.js` : `renderHydration` gère aussi la protéine — `proteinTarget(profile.weight, profile.goal).gramsPerDay` (déjà testé) × `pct(prot, cible)` (déjà testé) → largeur de barre + libellé « X / cible g ✓ ».
- `index.html` : widget `.protein-quick` dans `nutrition-panel`. `extras.css` : `.protein-fill` (dégradé violet, vert à l'objectif).
- Aucune nouvelle donnée / fonction pure : réutilise `proteinTarget` et `pct`.

## Vérifs

- `npm run verify` → **128 tests / 128 pass**, **SMOKE OK** (`hydration:true`, inclut `proteinFill`).
