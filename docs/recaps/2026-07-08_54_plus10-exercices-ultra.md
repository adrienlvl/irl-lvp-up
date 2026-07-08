# Boucle #56 — +10 exercices ciblés ultra-trail hybride

**Date :** 2026-07-08
**Version :** 1.7.3 → 1.8.0

## Demande d'Adrien
« Tu as essayé d'ajouter des exercices utiles ? » → proposition de 3 blocs ciblés ultra-trail, choix **« tout »**.

## Ce qui a été ajouté (bibliothèque 37 → 47)
- **Puissance & plyo** (économie de course + relance en côte) : **Squat sauté**, **Fentes sautées**, **Montées de genoux** (A-skips), **Sauts de cheville** (pogos).
- **Chaîne postérieure & anti-blessure** (descentes) : **Pont fessier une jambe**, **Good morning kettlebell**, **Nordic curl** (ischios excentrique — prévention n°1).
- **Stabilité & proprioception** (terrain accidenté) : **Turkish get-up kettlebell**, **Équilibre unipodal**, **Planche touches d'épaule** (anti-rotation).

Chaque fiche : `kind` (matériel réel), `family`, séries/reps (unité sec/pas si besoin), **cue / explication / objectif / à éviter** dans le ton coaching existant.

## Illustrations
- Mappés à un **pattern SVG** (repli) → ils rendent tout de suite (figure animée) en attendant leurs photos.
- Photos à venir : **planches 7 (6 exos) + 8 (4 exos)** — prompt fourni à Adrien (même style/fond que v1-v6). Une fois générées : `assets/exercise-illustrations-v7/8.png` + `.sheet-7/8` CSS + `EXERCISE_ART` → vraies photos.

## Vérifications
- `node --test` → **104/104** ✅ (test « chaque exercice rend quelque chose : photo si dispo, sinon figure » ; les 47 ont un pattern).
- Smoke → `SMOKE OK`, **exCount 47**, 47 cartes rendues.

## Suite
- Générer les planches 7/8 (Adrien) → je les branche.
- Option : intégrer ces exos dans les programmes guidés (plyo/prévention).
