# 659 — Sparklines : aire dégradée sous la courbe (2.0.267)

## Contexte

Passe qualité UI, **itération 5/N** (mandat `passe-qualite-ui`). Cible : les mini-graphes. La fonction
`sparkLineSvg` (app.js) ne dessinait qu'un **trait** — le pattern « premium » (Apple Santé, Strava, apps
finance) est une **aire dégradée** sous la courbe. Contenu (2 usages : tour de taille, sommeil), testable.

## Le changement (`app.js` — `sparkLineSvg`)

- Ajout d'un `<path>` d'**aire** fermé à la ligne de base (`M0 100 … L100 100 Z`), rempli par un
  `<linearGradient>` vertical (`userSpaceOnUse` y1=8→y2=100) de la couleur passée, de `opacity 0.28` en haut
  à `0` en bas → fondu propre sous la courbe.
- Le trait reste net par-dessus (inchangé). **Pas de point terminal** : le conteneur `.spark-line` est
  `preserveAspectRatio="none"` (44px, étiré) → un `<circle>` deviendrait une ellipse. Aire seule = sûr.
- `id` de gradient **unique par appel** (`sk1`, `sk2`… via compteur `_sparkUid`) → pas de collision quand
  plusieurs sparklines coexistent (sommeil + taille sur la même page).

## Non-régression

- Comportement conservé : `< 2 points → ''` (les checks smoke `sleepSpark`/`measureSpark` l'exigent), trait
  toujours présent (`<path`).
- **Nouveau check smoke BLOQUANT `sparkArea`** : vérifie `<linearGradient`, `fill="url(#sk…"`, exactement
  **2 `<path>`**, id unique par appel (`a !== b`), et `''` sur 1 point.
- **Piège évité (et documenté dans le check)** : le bloc de checks est une **template literal** qui mange les
  backslashes → une 1ʳᵉ version du check en **regex** (`\d`, `\(`) passait au navigateur mais échouait en
  smoke Electron (backslashes mangés). Réécrit **sans regex** (`includes`/`split`). C'est exactement le piège
  VPS-AUTOPILOT §6 (`/1\/3 fait\s/`) — ne JAMAIS mettre de regex à backslash dans les checks smoke.
- Vérifié en navigateur : `linearGradient` présent, `fill="url(#sk…)"`, 2 `<path>`, ids `sk2`≠`sk3`.
- `cd src && npm run verify` → **577 tests + SMOKE OK** (garde-fou CSS inclus). Artifact avant/après.

## Suite

`barChartSvg` (barres) est utilisé dans BEAUCOUP plus d'endroits (charts grid, adhérence, volume, 1RM,
forme) — un polish « coins hauts arrondis » serait plus impactant mais plus risqué → itération dédiée, testée.
Autres cibles : boutons, listes/chips, page par page.

Domaine : fondations
