# 597 — Séance guidée : redesign UI « beau, au niveau du Coach Poids » (2.0.213)

> Demande d'Adrien : « le coach d'exercices pour guider la séance doit être mieux fait, améliore
> l'UI, le design doit vraiment être beau, au niveau du Coach Poids. »

## Constat (vu à l'écran avant de coder)

La séance guidée est fonctionnellement riche (échauffement, exercice, cible, dernière fois, séries,
chrono, retour au calme…) mais le **design** était plat : séries en lignes génériques avec de gros
boutons verts répétés, exercice sans hiérarchie forte, chrono discret.

## Ce qui change — CSS pur, zéro changement de logique

- **Séries du jour** (le plus plat) → **cartes soignées** : badge rond numéroté (vert plein quand
  validé), labels KG/REPS en capitales, chiffres **gros, centrés, gras**, et un état **« Validée ✓ »**
  vert satisfaisant (dégradé + anneau sur le badge) qui illumine la ligne.
- **Exercice = héros** : nom en **1,55 rem**, illustration sur un **fond dégradé** encadré (au lieu
  d'un bloc plat), format en accent, conseil bien hiérarchisé.
- **Chrono de repos = vedette** : décompte en **1,85 rem**, dégradé **turquoise → indigo** (texte),
  sur un **panneau assorti** avec sa barre de progression déjà dégradée.
- **Theme-aware** : vérifié beau en **sombre ET clair** (couleurs via variables + dégradés qui tiennent
  sur les deux fonds).

Aucune classe ni structure DOM changée → tous les handlers (valider une série, ±série, repos,
navigation) intacts.

## Vérifs

- **543 tests** + smoke verts, garde-fou **css-lint** OK (parenthèses/accolades équilibrées).
- **Navigateur** : séries en cartes + état « Validée ✓ », exercice héros, chrono dégradé — capturé en
  thème **sombre** et **clair**.

## Fichiers

- `src/companion.css` — `.guided-set-row` / `.guided-set-head` redessinés (cards, badge, état validé).
- `src/strength.css` — `.guided-exercise-visual` (fond dégradé), `h3` (hero), `.guided-rest` +
  `#guidedRestTime` (chrono dégradé, panneau assorti).
- `src/lib/logic.js` — CHANGELOG 2.0.213.

Domaine : athlete
