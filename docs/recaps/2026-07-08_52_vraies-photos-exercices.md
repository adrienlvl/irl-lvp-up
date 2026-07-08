# Boucle #54 — Vraies illustrations photo restaurées (humain)

**Date :** 2026-07-08
**Version :** 1.7.1 → 1.7.2

## Demande d'Adrien
> « Les anciennes images de ChatGPT étaient très bien, tu voyais un humain, pas juste un bonhomme vert — c'est ça que je veux. »

## Constat
Les 5 planches photo (un vrai humain, fond sombre assorti au thème, **30 illustrations**) existaient toujours dans `assets/`. Elles avaient été abandonnées au profit des figures SVG. Le **vrai bug** d'alors : les **6 exercices de traction/barre n'ont aucune photo** → ils affichaient une mauvaise case (« coupé/mal aligné »), ce qui avait déclenché le passage global au SVG.

## Ce qui a été fait
- **`EXERCISE_ART`** (lib/exercise-icons.js) : mapping catalogué **exercice → planche/case** pour les **31 exercices** disposant d'une photo (identifiés en inspectant les 5 planches).
- **`exercisePicture(name, extraClass, animated)`** centralise l'affichage : **vraie photo** (sprite CSS `sheet-N art-pM`) si dispo, sinon **figure SVG animée en repli**.
- Branché sur les **3 points d'affichage** : carte de la bibliothèque, fiche détaillée, vignettes (séance guidée, historique, séance préparée) — via `exerciseVisual`.
- **Repli SVG** uniquement pour les 6 exercices sans photo (Tractions, supination, négatives, Suspension barre, Relevés de genoux suspendu, Rowing australien).

## Vérifications
- **Capture PNG réelle** (16 exercices, grand + vignette) inspectée : figures nettes, **aucune coupe** — y compris poses larges (hollow hold, dead bug, superman, planche). Certaines cases montrent **2 positions** (kettlebell swing, mollets) = le mouvement avec un humain.
- `node --test` → **103/103** ✅ ; smoke → `SMOKE OK` (37 cartes rendues, `exIcons` OK).
- `assets/**` déjà inclus dans le build → les PNG sont livrés.

## Suite possible
- Les 6 exercices de traction n'ont pas de photo : Adrien peut m'en fournir (générées via ChatGPT, même style/fond) et je les intègre au mapping.
- Reste Vague S.8 : scan frigo (photo→IA), OAuth agenda, signature de code.
