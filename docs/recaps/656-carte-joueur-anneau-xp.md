# 656 — Carte joueur : anneau de progression XP autour de l'avatar (2.0.264)

## Contexte

Passe qualité UI, **itération 2/N** (mandat d'Adrien : « le design/UI est toujours mauvaise, continue les
boucles » — voir mémoire `passe-qualite-ui`). Après la nav (#655), la surface suivante = la **carte joueur**
du tableau de bord (`#today.player-card`), le cœur émotionnel du « RPG de vie » : c'est la 1ʳᵉ chose qu'on voit,
et elle méritait d'être au niveau du Coach Poids.

> **Exception de rotation assumée** : #655 et #656 portent tous deux `Domaine : fondations`. C'est voulu —
> la passe qualité UI est une **série mandatée** (comme la série coaching l'a été), pas une monomanie subie.

## Le problème

L'avatar était un **carré arrondi** (⚡) avec, en dessous, une **barre linéaire plate** pour l'XP. Correct,
mais générique et sans identité. La progression et l'avatar vivaient à deux endroits différents.

## Le changement

- **Avatar rond dans un anneau de progression** (`#xpRing.avatar-ring`) : conic-gradient vert lime qui se
  remplit selon l'XP dans le niveau, découpé en anneau propre par un `mask` radial (donut). Style « anneaux
  d'activité » des montres de sport — l'XP se lit pile là où est l'avatar.
- **Barre linéaire supprimée** : redondante avec l'anneau + le « X / 100 XP » chiffré (conservé).
- **`NIVEAU X` en vert** (`--accent`) pour ressortir.
- Responsive : anneau 74px desktop / 64px mobile ; avatar 56 / 48px.

## Câblage

- `index.html` : `<div class="avatar-ring" id="xpRing" style="--xp:0">` enveloppe l'avatar ; la ligne
  `<div class="xp-track">…</div>` est retirée.
- `app.js` (`renderDashboardCore`, l.592) : `$('#xpBar').style.width` — dont l'élément n'existe plus —
  remplacé par `$('#xpRing').style.setProperty('--xp', within)` + mise à jour de l'`aria-label`
  (« niveau X, Y % vers le suivant »). **Garde `if(_xr)`** pour ne jamais planter si l'élément manque.
- `pages.css` : `.avatar-ring` + `::before` (conic + mask) + `.avatar` rond + `#levelLabel` accent + média mobile.

## Non-régression

- Le smoke ne lit que `#xpLabel` (`levelSet`) — conservé. Aucun autre JS/smoke ne référence `#xpBar`/`.xp-track`.
- Vérifié en **styles calculés** (capture bloquée cette session) : `--xp` bien posé par le JS (ex. 40),
  `::before` = `conic-gradient(rgb(171,255,85) 40%, …)` + `mask` radial, avatar `border-radius:50%` 56px,
  `#levelLabel` lime, barre linéaire absente, **aucune erreur JS** (le dashboard se rend malgré le retrait
  de `#xpBar`). Aperçu avant/après publié en Artifact pour Adrien.
- `cd src && npm run verify` → **577 tests + SMOKE OK**.

## Suite

Prochaine surface : densité / hiérarchie typographique des panneaux du dashboard (Mission Control, Ma journée,
Habitudes…), puis coach séance guidée, graphes, page par page.

Domaine : fondations
