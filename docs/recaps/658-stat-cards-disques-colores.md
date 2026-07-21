# 658 — Stats du dashboard : disques colorés + libellés capitales (2.0.266)

## Contexte

Passe qualité UI, **itération 4/N** (mandat `passe-qualite-ui`). Cible visée au départ : la séance guidée
(demande explicite d'Adrien). **Constat après inspection en navigateur** : le dialog de séance guidée est
**déjà bien traité** (nom d'exercice en hero 24,8px, bloc repos en dégradé avec minuteur 29,6px, lignes de
séries à badge `S1` + inputs centrés + Valider, bouton suivant lime). Le retravailler à l'aveugle = churn/risque.
J'ai donc **pivoté** vers une surface clairement plus faible et sûre : les **cartes de stats** du dashboard.

## Le problème

Les 3 cartes `.stat` (Vitalité / Focus / Équilibre) affichaient un **symbole coloré nu** (♥ ◉ ✦) collé au
chiffre. Correct mais pauvre : rien n'ancrait l'icône, le libellé était un petit texte gris quelconque.

## Le changement (`pages.css`, contenu à `.stat`)

- **Disque coloré** derrière chaque symbole : `40×40`, radius 12, fond teinté de **la couleur sémantique de la
  carte** (rose `--pink` pour Vitalité, violet `--purple` pour Focus, lime `--accent` pour Équilibre) — le glyphe
  garde sa couleur, le fond en reprend une version à 15 %.
- Chiffre porté à **1,5rem** (hiérarchie), libellé en **petites capitales espacées** (0,7rem, 700).
- Résultat : de vraies « cartes de stats » colorées et lisibles, cohérentes avec les tuiles de la nav (#655).

## Non-régression

- Purement CSS, ciblé sur `.stat`/`.stat-health|focus|life>span`. Aucune logique touchée.
- Vérifié en styles calculés : 3/3 disques `40px` radius 12 avec le bon fond teinté (`rgba(251,113,133,.15)` /
  `(167,139,250,.15)` / `(171,255,85,.15)`), glyphe de la bonne couleur, chiffre 24px, libellé `uppercase` 11,2px.
- `cd src && npm run verify` → **577 tests + SMOKE OK** (garde-fou CSS parenthèses/accolades inclus). Artifact avant/après.

## Note pour la suite

Séance guidée **déjà au niveau** — ne pas la refondre sans raison précise. Cibles restantes : icônes d'en-tête de
panneau en tuiles (⚠️ 2 spans sont des badges texte « 1 total »/« 3 / 22 », pas des emojis → chip non aveugle),
graphes/sparklines, boutons, page par page.

Domaine : fondations
