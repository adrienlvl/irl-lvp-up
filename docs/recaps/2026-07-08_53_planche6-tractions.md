# Boucle #55 — 6e planche (tractions) : les 37 exercices ont une vraie photo

**Date :** 2026-07-08
**Version :** 1.7.2 → 1.7.3

## Contexte
Après la restauration des vraies photos (#54), il manquait **6 exercices barre/traction** (aucune photo dans les 5 planches). Adrien a **généré la planche manquante avec ChatGPT** (prompt fourni la boucle précédente) et me l'a donnée.

## Ce qui a été fait
- Image reçue (`D:\Google\ChatGPT Image…png`) **copiée** en `src/assets/exercise-illustrations-v6.png`. Format **1536×1024** = identique aux autres planches → découpage sprite 3×2 exact.
- **`.sheet-6`** ajouté au CSS (strength.css).
- **`EXERCISE_ART`** complété : Tractions → `6 p0`, Tractions supination → `6 p1`, Tractions négatives → `6 p2`, Suspension barre → `6 p3`, Relevés de genoux suspendu → `6 p4`, Rowing australien → `6 p5`.
- → **les 37 exercices ont maintenant une vraie photo d'humain** (plus aucun repli SVG en usage courant ; le SVG reste comme filet de sécurité).

## Vérifications
- **Dimensions** confirmées (1536×1024, ratio 1.500). **Capture des 6 cases** inspectée : figures entières, bien cadrées, non coupées (pronation, supination, négative, dead hang, relevés de genoux, rowing australien).
- `icons.test.js` renforcé : **les 37 exercices ont une entrée `EXERCISE_ART`** + les 6 tractions sur la planche 6 + `exercisePicture` renvoie le sprite. `node --test` → **104/104** ✅ ; smoke → `SMOKE OK`.

## Résultat
Bibliothèque d'exercices **100 % en vraies photos**. Build 1.7.3.
