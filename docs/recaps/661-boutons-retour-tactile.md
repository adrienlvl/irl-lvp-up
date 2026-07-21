# 661 — Boutons : retour tactile (état pressé + survol lime) (2.0.269)

## Contexte

Passe qualité UI, **itération 7/N** (mandat `passe-qualite-ui`). Cible : les boutons — l'élément interactif le
plus fréquent de l'app.

## Le constat (inspecté au rendu)

Scan des feuilles de style : `.primary-button` / `.secondary-button` / `.icon-button` **n'ont AUCUN état pressé
(`:active`)** — seuls quelques boutons de niche (`.rest-presets`, `.gs-adjust`, `.body-goals`) en ont. Au toucher,
les CTA principaux ne donnent donc **aucun retour tactile** ; il n'y a que le survol global
(`button:hover{filter:brightness(1.1);transform:translateY(-1px)}`). Le bouton secondaire, au survol, ne fait que
s'éclaircir — rien d'intentionnel.

## Le changement (`pages.css`, cohérent app-wide)

- **État pressé** sur `.primary-button, .secondary-button, .icon-button` : `:active { transform: translateY(0)
  scale(.96) }` → le bouton s'enfonce à l'appui (retour tactile). Spécificité (0,2,0) > `button:hover` (0,1,1),
  donc l'appui l'emporte sur le survol soulevé → transition naturelle survol→appui.
- **Survol secondaire** : `border-color: rgba(171,255,85,.35)` (contour lime) au lieu du simple éclaircissement.
- **Transitions** élargies (transform/filter .12s + box-shadow/border-color .15s) pour que tout ça soit fluide.

## Non-régression

- Purement CSS, additif. Aucune logique ni structure touchée.
- Vérifié en styles calculés : `transition` du bouton primaire inclut désormais `box-shadow`/`border-color` ; les
  règles `.primary-button:active, .secondary-button:active, .icon-button:active` et `.secondary-button:hover`
  (border lime) sont **présentes et bien scopées** (scan `document.styleSheets`). Un `:active` ne se teste pas au
  smoke (pseudo-état) → pas de check smoke, mais garde-fou CSS (parenthèses/accolades) vert.
- `cd src && npm run verify` → **577 tests + SMOKE OK**. Artifact **interactif** (boutons réels à survoler/presser).

## Suite

Cibles restantes : chips/tags (`.tag`, `.qs-chip`), listes (`.quest`, todo, habit), page par page
(Nutrition/Focus/Alternance/Réglages), tuiles d'en-tête de panneau (exclure les 2 badges texte).

Domaine : fondations
