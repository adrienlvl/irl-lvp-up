# Boucle #192 (demande d'Adrien, phase 2) — Design des menus déroulants · build 1.9.126

**Demande d'Adrien :** « améliore le design des fenêtres de sélection, c'est des trucs dégueulasses actuellement… que ça soit beau ». Les `<select>` utilisaient le rendu natif Windows (flèche moche, liste blanche qui jure avec le thème sombre).

## Livré — style global cohérent pour TOUS les menus déroulants

- **Flèche custom** (chevron SVG discret, couleur `--muted`) au lieu de la flèche native.
- **Rendu natif supprimé** (`appearance:none`) → le contrôle adopte le fond sombre, la bordure et le rayon du thème.
- **État focus** net : bordure verte (accent) + halo `box-shadow` (accessibilité au clavier).
- **État hover** : bordure éclaircie.
- **La liste déroulante elle-même** (`<option>`) passe en **fond sombre thématisé** (`#1b2336`), option sélectionnée surlignée en vert — fini la liste blanche criarde.

Appliqué **globalement** en une seule règle, sans toucher les ~20 styles de select existants : les propriétés de la flèche sont en `!important` sur les longhands (`background-image/-repeat/-position/-size`, `appearance`, `padding-right`) pour survivre aux `background:` raccourcis des composants, tandis que fond, bordure et rayon restent gérés par chaque composant. La flèche est un **data-URI sans `;`** (compatible CSP `img-src data:` + garde-fou CSS).

## Détail technique

- **`style.css`** : règles `select`, `select:hover`, `select:focus`, `select:disabled`, `option`, `option:checked`.
- **Smoke** : `selectStyled` vérifie `appearance:none` + `background-image` SVG effectivement calculés sur un select réel.

## Vérifs

- `npm run verify` → **229 tests / 229 pass**, **garde-fou CSS vert** (parenthèses + accolades équilibrées malgré le data-URI), **SMOKE OK** (`selectStyled:true`).
- `npm run dist` → **Setup 1.9.126.exe** (app d'Adrien jamais fermée).

## Note

À voir en vrai dans l'app (le rendu des `<option>` est géré par Chromium/Electron). Si Adrien veut aller plus loin (menus 100 % custom avec recherche, animations), c'est une itération suivante possible.
