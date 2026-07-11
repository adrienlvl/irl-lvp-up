# Boucle #108 (autonome) — Logger les protéines d'un aliment · build 1.9.42

**Contexte :** 33ᵉ itération de la boucle autonome. Aire : Nutrition / recherche d'aliments.

## Livré

Chaque résultat de la **recherche d'aliments** (base CIQUAL) gagne un bouton **« 💪 +X »** qui ajoute directement les **protéines de l'aliment (pour 100 g)** au total de protéines du jour — en complément du bouton **＋** qui l'ajoute au frigo.

Logger sa journée devient plus rapide : on cherche « poulet », on voit « P 31 », un clic et la jauge de protéines monte.

- N'apparaît que pour les aliments avec des protéines (> 0).
- Retour visuel « ✓ ajouté » 1 s ; réutilise `bumpProtein` (borné [0..500 g], persistant).

## Détail technique

- `app.js` : `renderFoods` ajoute un bouton `data-log-prot`; handler `#foodResults` appelle `bumpProtein(Math.round(food.p))`.
- `extras.css` : style `.food-prot` (pastille violette) + grille `.food-row` élargie (2 tracks `auto`).

## Vérifs

- `npm run verify` → **148 tests / 148 pass**, **SMOKE OK** (nouveau check `foodLogProt` : `bumpProtein` défini + `searchFoods` renvoie des aliments protéinés). `node --check app.js` OK.

_Fonctionnalité UI réutilisant une logique déjà testée (`bumpProtein`) : couverte par un check smoke._
