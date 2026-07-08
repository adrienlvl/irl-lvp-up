# Boucle #66 — 1ʳᵉ planche d'animation live (Pompes · Goblet · Tractions) · build 1.8.9

**Contexte :** Adrien a généré sa première planche « animation » — format **3 exercices × 2 poses** (ligne du haut = départ, ligne du bas = fin), en suivant le prompt d'exemple. Excellent format : autonome, 2 poses garanties cohérentes (même génération).

## Refonte du moteur (format 2 cases sur la même planche)

Le moteur (boucle #65) supposait une planche « position B » séparée (`sheet-<n>b`). Adapté au format d'Adrien, plus propre :
- `EXERCISE_ANIM` : `nom → "<planche> <caseA> <caseB>"` (les 2 poses sont **2 cases de la même planche**).
- `buildAnimatedArt` empile 2 calques de la **même** image à 2 `background-position` différentes ; la case B clignote (`@keyframes exFrameFlip`, `prefers-reduced-motion` respecté).
- `exercisePicture(name, extra, true)` anime si `EXERCISE_ANIM[name]` existe ; sinon photo fixe. Vignettes (`animated=false`) toujours fixes.
- Plus besoin de fichiers `sheet-<n>b`.

## Intégré (planche 9)

`assets/exercise-illustrations-v9.png` (1536×1024). `EXERCISE_ANIM` :
- `Pompes classiques` → `9 p0 p3` (haut : bras tendus ↔ bas : poitrine au sol)
- `Goblet squat kettlebell` → `9 p1 p4` (debout ↔ accroupi)
- `Tractions` → `9 p2 p5` (suspension ↔ menton à la barre)

`.sheet-9` ajouté (strength.css). Ces 3 exercices s'animent en **vue détail + séance guidée**.

## Vérifs

- `npm run verify` → **120 tests / 120 pass**, **SMOKE OK** (`animEngine:true`).
- Test : builder 2 calques (case A/B même planche), gating par `EXERCISE_ANIM`, format `^\d+ p[0-5] p[0-5]$`, noms connus.
- **Animation vérifiée par capture 2 frames sur la vraie planche 9** : t≈0,4 s = positions de départ (pompe haute, goblet debout, traction suspendue) ; t≈1,3 s = positions de fin (pompe basse, squat bas, menton à la barre). Personnage entier, aucune coupe.

## Suite (Adrien)

Même format pour couvrir les 44 exercices restants (~15 planches de 3 exercices, ligne haut = départ, ligne bas = fin). À son rythme : chaque planche livrée → j'ajoute 3 entrées `EXERCISE_ANIM` + `.sheet-<n>` → 3 exercices animés de plus. Plan/regroupement fourni en artifact.
