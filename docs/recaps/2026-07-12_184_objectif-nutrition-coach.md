# Boucle #184 (autonome) — Lien objectif ↔ Coach Poids (calories/macros) · build 1.9.118

**Phase 1 (générateur par objectif).** L'entraînement et la nutrition étaient déconnectés : le programme par objectif ne disait rien sur « combien manger ». Or l'objectif détermine la direction calorique.

## Livré

Le panneau « Mon programme selon mon objectif » affiche désormais un bloc **« 🍽️ Nutrition alignée »** cohérent avec l'objectif choisi :

| Objectif | Orientation | Protéines |
|---|---|---|
| 🏃 Corps athlétique | Maintien | 1,8 g/kg |
| 💪 Prise de muscle | Surplus (~+10 %) | 2,0 g/kg |
| 🔥 Perte de gras | Déficit (~-18 %) | 2,2 g/kg |
| 🏔️ Endurance | Léger surplus glucidique (+5 %) | 1,6 g/kg |
| ⚖️ Remise en forme | Autour du maintien (-5 %) | 1,6 g/kg |

À partir du poids/taille/âge/sexe/activité (déjà connus du profil), il calcule **kcal/jour + macros (P/G/L)** et un conseil court, avec renvoi au **Coach Poids** pour le détail. Si le profil est incomplet, un message invite à le renseigner. Les calories ne descendent jamais sous le métabolisme de base.

## Détail technique

- **`lib/logic.js`** (purs + testés) : `OBJECTIVE_NUTRITION` (direction/ajustement/protéines par objectif) et `objectiveNutrition(objectiveKey, opts)` — réutilise `basalMetabolicRate` + `activityLevelFactor`/`activityFactor` (mêmes formules que le Coach Poids, cohérence garantie).
- **`app.js`** : `runObjectiveProgram` calcule `objectiveNutrition(...)` depuis l'état et affiche le bloc `.op-nutri` (ou un indice si données manquantes). **`strength.css`** : styles `.op-nutri`/`.op-macros` (responsive 2 colonnes en mobile).

## Vérifs

- `npm run verify` → **223 tests / 223 pass** (+1 : `objectiveNutrition`), garde-fou CSS vert, **SMOKE OK** (`objectiveNutrition:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.118.exe** (app d'Adrien jamais fermée).

## Suite (phase 1)

Programmes de course détaillés par objectif (types de séances adaptés). Ensuite : générateur bien complet → bascule phase 2 (polissage global).
