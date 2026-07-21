# 657 — Hiérarchie : les « eyebrows » de panneaux/pages redeviennent lime (2.0.265)

## Contexte

Passe qualité UI, **itération 3/N** (mandat `passe-qualite-ui`). Cible annoncée : densité/hiérarchie typo des
panneaux du dashboard. En inspectant le rendu réel (styles calculés), j'ai trouvé un **vrai défaut de cascade**,
pas juste une question de goût.

## Le défaut (prouvé au rendu)

Les petits intitulés en majuscules au-dessus de chaque titre (`<p class="eyebrow">`) — « AUJOURD'HUI »,
« TON COACH », « À RATTRAPER »… — sont censés être **lime `--accent`, 0,7rem** (classe `.eyebrow`, comme le
kicker du hero). Mais ils rendaient **gris `--muted`, 0,9rem**.

Cause : `.level-block p,.reward,.panel p{color:var(--muted);font-size:.9rem}` (style.css) et
`.page-title p{color:var(--muted)}` (pages.css) ciblent **tout `<p>`** dans un panneau / un en-tête de page.
Or l'eyebrow EST un `<p>`. Spécificité `.panel p` = (0,1,1) > `.eyebrow` = (0,1,0) → le gris gagnait. Résultat :
la couleur d'accent voulue était **silencieusement écrasée sur les 47 panneaux ET tous les en-têtes de page**,
aplatissant la hiérarchie (le kicker et la description avaient la même couleur).

## Le correctif

`pages.css` : `p.eyebrow{color:var(--accent);font-size:.7rem;font-weight:800;letter-spacing:.14em}`.
Spécificité (0,1,1) = **égale** à `.panel p`/`.page-title p`, mais la règle est déclarée **après** (pages.css
charge tard) → elle gagne à l'ordre source, sans `!important`. Réassertion complète du style eyebrow (couleur +
taille + graisse + interlettrage) pour être robuste à d'autres overrides éventuels.

## Non-régression

- Ciblé sur `p.eyebrow` uniquement → les **descriptions** sous les titres (`<p>` sans classe) restent grises.
- Vérifié en styles calculés : **47/47 eyebrows de panneaux** = lime (`rgb(171,255,85)`) 11,2px ; en-tête de
  page (`showPage('poids')` → « OBJECTIF CORPS ») = lime 11,2px ; sa description (« Ta cible, tes paliers… »)
  = **restée grise**. Aperçu avant/après en Artifact.
- `cd src && npm run verify` → **577 tests + SMOKE OK** (dont garde-fou CSS parenthèses/accolades équilibrées).

## Suite

Prochaines surfaces : icônes d'en-tête de panneau en « tuiles » (à faire proprement — 2 spans sont des badges
texte « 1 total »/« 3 / 22 », pas des emojis, donc pas de chip aveugle), coach séance guidée, graphes.

Domaine : fondations
