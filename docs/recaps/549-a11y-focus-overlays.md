# 549 — Focus clavier des 3 overlays plein écran (2.0.180)

> Rotation des domaines **reprise** après l'exception coach accordée par Adrien (#547, #548).
> Domaine `a11y`, tâche **P2.1** de la roadmap.

## Vérification préalable : la piste était-elle vraie ?

P2.1 était marquée « à VÉRIFIER avant de coder » (son agent de contre-vérification était tombé sur
une limite d'usage). **Vérifiée, et exacte** :

- `#weekPage`, `#calendarPage`, `#ultraPage` sont des `<section>` `position:fixed;inset:0` qui
  **recouvrent** `<main class="app-shell">` ;
- elles étaient ouvertes par un simple `.hidden=false` — **6 emplacements** dans `app.js`
  (L743, L871, L872 ×2, L883, L926) — sans **aucune** gestion du focus ;
- les vrais `<dialog>` ouverts en `showModal()` piègent et restituent le focus **gratuitement**,
  d'où l'écart : personne n'avait remarqué que ces trois-là n'en bénéficiaient pas.

**Conséquence réelle au clavier** : à l'ouverture le focus **restait dans le dashboard caché
derrière**, on pouvait tabuler à l'aveugle dans du contenu invisible, et à la fermeture le focus ne
revenait jamais au bouton d'origine. Échap fermait déjà (L1089) mais ne réglait rien du focus.

## Ce qui change

Deux helpers, et **tous** les points d'entrée routés à travers eux (7 remplacements, plus aucun
`.hidden=false` direct sur ces trois éléments) :

- **`openOverlay(el, opener)`** — mémorise le déclencheur, affiche l'overlay, pose `inert` +
  `aria-hidden` sur `<main class="app-shell">`, puis déplace le focus **dans** l'overlay (son premier
  élément focusable, en pratique le bouton « ← Retour »).
- **`closeOverlay(el)`** — masque, et **seulement si plus aucun overlay n'est ouvert** : retire
  `inert`/`aria-hidden` et **restitue le focus** au déclencheur.

Subtilité qui compte : `overlayReturnFocus` n'est mémorisé que **si aucun overlay n'est déjà ouvert**.
Sans ça, une **transition** (Ma semaine → Calendrier) écraserait le déclencheur d'origine par un
bouton lui-même sur le point d'être masqué — et le focus final atterrirait dans le vide.

## Vérifs

- **518 tests** + smoke verts. Nouveau check smoke **BLOQUANT** `overlayFocus` : focus entré dans
  l'overlay, `<main>` neutralisé, `inert` maintenu pendant une transition, puis focus **restitué** au
  déclencheur.
- **Navigateur — parcours clavier réel de bout en bout** : focus sur le bouton → ouverture → focus sur
  `closeWeekPage` ✅ · `<main>` `inert` ✅ · **bouton du dashboard derrière NON focusable** ✅ (preuve
  qu'`inert` mord vraiment) · Échap → fermeture ✅ · `<main>` rendu ✅ · **focus restitué au bouton
  d'origine** ✅.

## Fichiers

- `src/app.js` — `openOverlay`/`closeOverlay`, 7 points d'entrée routés (dont le handler Échap).
- `src/lib/logic.js` — CHANGELOG 2.0.180.
- `src/test/renderer-smoke.cjs` — check bloquant `overlayFocus` + assertion CHANGELOG.

Domaine : a11y
