# Boucle #150 (autonome) — Exercices favoris ⭐ · build 1.9.84

**Contexte :** 13ᵉ itération du recentrage Exercices / Athlète. Focus **Exercices** : accès rapide aux mouvements fétiches. 150ᵉ boucle de la série. 🎉

## Livré

Un système de **favoris** dans la bibliothèque d'exercices :

- **Étoile ☆ / ★** dans la fiche d'un exercice (bouton « Ajouter aux favoris » / « Retirer des favoris ») — marque persistante (`state.exerciseFavorites`).
- **Badge ★** doré affiché en haut des cartes des exercices favoris.
- **Filtre « ⭐ Favoris »** dans les contrôles de la bibliothèque (à côté de « 🆕 Nouveaux »), cumulable avec matériel / famille / zone / recherche.

Adrien peut ainsi étoiler sa poignée d'exos préférés et les retrouver en un clic, sans refaire défiler les 47.

## Détail technique

- `lib/logic.js` : `toggleFavorite(favorites, name)` — pur + testé. Ajoute/retire un nom, renvoie une **nouvelle** liste (immuable), nettoie les non-chaînes, ignore les noms vides.
- `app.js` : `state.exerciseFavorites` (défaut `[]` + normalisé en tableau) ; `updateFavButton()` (libellé + état du bouton) ; handler `#toggleFavExercise` ; badge/`ex-card-fav` + filtre `libraryFavOnly` dans `renderExerciseLibrary` ; toggle `#exerciseFavOnly` câblé.
- `index.html` : bouton `#exerciseFavOnly`, actions de fiche (`#toggleFavExercise`).
- `extras.css` : `.ex-fav-badge`, `.ex-card-fav`, `.exercise-detail-actions`, `#toggleFavExercise.is-fav`.

## Vérifs

- `npm run verify` → **187 tests / 187 pass** (+1 : `toggleFavorite` — ajout/retrait, immutabilité, nettoyage). **SMOKE OK** (`favorites:true` — étoiler « Gainage planche » ajoute un badge et le filtre ne laisse qu'une carte). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.84.exe** (app d'Adrien jamais fermée).

_Prochaine boucle : toujours Exercices / Athlète._
