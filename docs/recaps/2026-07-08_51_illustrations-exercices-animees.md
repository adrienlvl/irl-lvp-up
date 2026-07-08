# Boucle #53 — Illustrations d'exercices qui montrent l'exécution

**Date :** 2026-07-08
**Version :** 1.7.0 → 1.7.1

## Demande d'Adrien
> « Améliore les exercices, surtout les illustrations, elles sont nulles, ça montre pas la bonne exécution — c'est très important ! »

## Constat
`lib/exercise-icons.js` fournissait 10 pictogrammes **statiques mono-position** (un seul instant figé) → on ne voyait pas le mouvement.

## Ce qui a été fait
- **Refonte de `exercise-icons.js`** : figures articulées (tête, colonne, membres avec articulations) définies par **deux positions** — départ (A) et position travaillée (B) — pour chaque schéma de mouvement.
- **Montre l'exécution** :
  - **Grande vue** (fiche exercice, séance guidée) : la figure **fait le va-et-vient** entre A et B (animation SVG SMIL, 2,8 s) → on voit le geste.
  - **Cartes / vignettes** : rendu **statique lisible** = position travaillée pleine + autre position en fantôme + **flèche de mouvement** orange (pas de clignotement sur 37 cartes).
- **Flèche de mouvement** (orange, contraste sur les 2 thèmes) sur chaque pattern + **repère de posture** quand utile (ligne d'alignement en pointillés pour le gainage).
- **Granularité affinée** : 10 → **12 patterns** — *traction* (vertical) ≠ *rowing* (horizontal), *gainage* (isométrique) ≠ *core dynamique* (bird dog/dead bug/…).
- `exerciseIcon(name, animated)` ; passé `true` dans la fiche détaillée et la vignette guidée.

## Vérifications
- **Capture PNG réelle** des 12 patterns (grand + petit) inspectée visuellement : figures reconnaissables, non tronquées, lisibles à petite taille. ✔
- Nouveau **`test/icons.test.js`** : les **37 exercices** mappent tous à un pattern connu ; chaque pattern a A+B ; `exerciseIcon` renvoie un SVG valide (`viewBox 0 0 80 76`), animé ⇒ `<animate>`, patterns distincts, repli propre sur nom inconnu.
- `node --test` → **103/103** ✅ ; smoke → `SMOKE OK`, check `exIcons:true`.
- Export Node ajouté à `exercises-data.js` (`exercises`, `programs`) pour le test.

## Suite possible
- Affiner quelques poses (développé militaire, mollets), ou ajouter une 2e vue (face/profil) par exercice si besoin.
- Reste Vague S.8 : scan frigo (photo→IA, confidentialité), OAuth agenda, signature de code.
