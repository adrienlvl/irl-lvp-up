# Boucle #65 — Moteur d'animation des exercices (début↔fin) · build 1.8.8

**Demande d'Adrien :** « je veux TOUTES les animer » (montrer l'exécution avec un humain qui bouge).

## Approche (efficace pour Adrien)

Plutôt que régénérer les 47 exercices, on **réutilise les 8 planches actuelles comme « position 1 »** et Adrien génère **8 planches « position 2 »** (mêmes exercices, mêmes cases) → **8 planches à générer, pas 16**. Le moteur fait alterner les deux positions.

## Moteur livré (prêt, neutre tant qu'aucune planche B)

- `buildAnimatedArt(artValue, extra, name)` (pur) empile **2 calques photo** : `.frame-a` (position 1, planche existante) + `.frame-b` (position 2, `sheet-<n>b`).
- CSS `@keyframes exFrameFlip` (1,8 s, `steps(1)`) fait **clignoter la position B en alternance** → mini-démo du mouvement. Respecte **`prefers-reduced-motion`** (fige sur la position A).
- **Activation par planche** : `ANIMATED_SHEETS` (Set). Tant qu'un numéro de planche n'y est pas, ses exercices restent en **photo fixe** (aucune régression). Dès qu'une planche « position B » est intégrée (CSS `.sheet-<n>b` + numéro ajouté au Set), ses exercices s'animent — **en vue détail / séance uniquement** (`animated=true`), pas dans les vignettes.

## Vérifs

- `npm run verify` → **120 tests / 120 pass** (+1 : builder 2 calques + gating), **SMOKE OK** (`animEngine:true`).
- **Bascule validée par capture 2 frames** : en simulant des planches B (images de substitution), la case affiche la position 1 à t≈0,4 s puis la position 2 à t≈1,3 s. Empilement, opacité alternée et cadrage OK (personnage entier, pas de coupe).

## Prochaine étape (Adrien)

Générer les **8 planches « position 2 »** (v1b…v8b) selon le **plan case par case** fourni (chaque case = l'autre phase du mouvement). Conseil : envoyer **v1b d'abord**, je l'intègre et on valide le rendu réel avant de faire les 7 autres. À chaque planche livrée : j'ajoute `.sheet-<n>b` + le numéro dans `ANIMATED_SHEETS` → ces exercices s'animent.
