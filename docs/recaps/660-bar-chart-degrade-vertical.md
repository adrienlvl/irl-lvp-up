# 660 — Graphes en barres : dégradé vertical (2.0.268)

## Contexte

Passe qualité UI, **itération 6/N** (mandat `passe-qualite-ui`). Suite logique de #659 (sparklines) : la fonction
`barChartSvg` (app.js) dessinait des barres en **aplat** de couleur. Elle est utilisée PARTOUT (grille des 5
graphes hebdo, adhérence, volume d'exercice, 1RM estimé, tendance de forme…) → un polish ici se voit sur tout.

## Choix de conception

Les barres vivent dans un SVG `preserveAspectRatio="none"` (étiré). **Les coins arrondis par `path` y seraient
distordus** (rayon horizontal ≠ vertical) — impossible à valider sans capture (cassée cette session). J'ai donc
choisi la voie **sûre et sans distorsion : un dégradé vertical**, qui ne dépend pas de l'aspect ratio :

- Chaque barre se remplit d'un `<linearGradient>` vertical (`y1=0→y2=1`, objectBoundingBox = relatif à CHAQUE
  barre) : couleur pleine en haut → `opacity 0.5` en bas. Profondeur, sans nuire à la comparaison des hauteurs.
- `rx` porté de 1 à 1,2 (coins à peine plus doux). Infobulles `<title>` conservées.
- `id` de gradient **unique par appel** (`bc1`, `bc2`… via `_barUid`) → pas de collision quand 5 graphes
  coexistent dans la grille.

## Risque vérifié

`var(--accent)` (utilisé par le graphe de volume) **résout bien** dans un `stop-color` de gradient : monté dans
le DOM, `getComputedStyle(stop).stopColor === 'rgb(171, 255, 85)'` (lime). Les barres ne deviennent donc pas
invisibles avec une couleur en variable CSS. Vérifié aussi pour les couleurs hex (#f0883e…).

## Non-régression

- **Nouveau check smoke BLOQUANT `barGradient`** : `<linearGradient` présent, `fill="url(#bc…"`, **1 `<rect>`
  par point**, `<title>` (tooltip) conservé, id unique par appel — en `includes`/`split` (PAS de regex : le bloc
  de checks est une template literal qui mange les backslashes, cf. #659 et VPS-AUTOPILOT §6).
- Check `charts` existant (grille) reste vert. Vérifié en navigateur : hex + `var(--accent)`, 3 rects, ids `bc1`≠`bc2`.
- `cd src && npm run verify` → **577 tests + SMOKE OK**. Artifact avant/après.

## Suite

Cibles restantes : boutons primaires/secondaires, listes/chips, page par page (Nutrition, Focus, Alternance,
Réglages), tuiles d'en-tête de panneau (exclure les 2 badges texte).

Domaine : fondations
