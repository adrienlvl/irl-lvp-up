# #344 — Réinitialisation des filtres de la bibliothèque (1.9.278)

## Le manque

La bibliothèque a **6 filtres cumulables** (recherche, famille, matériel, objectif, ⭐ favoris,
🆕 nouveaux). En les empilant, on arrive vite à « aucun exercice ne correspond » — sans voir
**quels** filtres sont actifs ni comment revenir en arrière. Cul-de-sac.

## Ce qui change

Nouvelle fonction pure `activeExerciseFilters(f)` : liste les filtres non-défaut en étiquettes
lisibles (« 🔎 « curl » », « 💪 Bras », « ⭐ Favoris »…). `[]` si aucun.

Rendu : un **bandeau « Filtres actifs : … »** au-dessus des cartes, avec un bouton
**« ✕ Réinitialiser »** qui remet tout à zéro (recherche vidée, sélecteurs sur « tout », toggles
désactivés) en un clic. Le même bouton apparaît aussi dans l'état vide. Masqué quand aucun filtre
n'est actif — zéro encombrement en usage normal.

## Vérification navigateur (scénario cul-de-sac réel)

| Étape | Résultat |
|---|---|
| Aucun filtre | ✅ bandeau masqué, 47 exercices |
| objectif « Bras » + recherche « curl » + ⭐ Favoris | ✅ bandeau « 🔎 « curl » · 💪 Bras · ⭐ Favoris », **0 carte** |
| Clic « ✕ Réinitialiser » | ✅ bandeau masqué, objectif=all, recherche vide, favoris off, **47 exercices** |

## Tests

363 tests `node:test` (filtres par défaut → [], recherche trim/casse, objectif traduit, combinaison
famille+matériel+nouveaux, entrée nulle → []) + smoke `libraryReset` **bloquant** (applique un
filtre → bandeau visible + reset → 47 cartes, bandeau masqué).

## Rotation

#344 — début rotation 34 (build 1.9.278). Prochain #345.
