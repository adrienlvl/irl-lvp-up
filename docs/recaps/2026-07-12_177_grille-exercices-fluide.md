# Boucle #177 (autonome) — Bibliothèque d'exercices fluide (mobile) · build 1.9.111

**Contexte :** thème E (responsive mobile). La grille des cartes d'exercices était en colonnes fixes.

## Livré

La grille `#exerciseCards` passe de `repeat(3,1fr)` (+ override média `repeat(2,1fr)`) à **`repeat(auto-fill, minmax(158px, 1fr))`** : elle s'adapte **automatiquement** au nombre de colonnes que la largeur permet — 1-2 colonnes sur téléphone, 2-3 sur tablette, 3+ sur grand écran — sans dépendre d'un point de rupture rigide. Gap réduit à 8px sur petit écran.

Résultat : des cartes toujours lisibles et bien remplies quelle que soit la taille d'écran, sans rognage ni colonnes trop étroites.

## Détail technique

- `strength.css` : `.exercise-cards` en `auto-fill minmax(158px,1fr)` ; la règle média ne fixe plus le nombre de colonnes (juste le gap).

## Vérifs

- `npm run verify` → **216 tests / 216 pass** (dont garde-fou CSS vert : parenthèses/accolades équilibrées). **SMOKE OK** (comptage des 47 cartes inchangé). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.111.exe** (app d'Adrien jamais fermée).

## Suite (boucle en cours)

Autres grilles/listes en fluide ; vue jour timeline ; tap targets ; polissages Coach Poids / progression.
