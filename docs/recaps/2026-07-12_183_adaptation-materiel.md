# Boucle #183 (autonome) — Adaptation au matériel dispo · build 1.9.117

**Phase 1 (générateur par objectif).** Le générateur pouvait proposer des exercices nécessitant du matériel qu'Adrien n'a pas (kettlebell, barre de traction, gilet lesté, poignées). Or son profil liste déjà l'équipement dispo (`state.profile.equipment`).

## Livré

Le programme auto **ne propose plus que des exercices réalisables** avec le matériel coché dans le profil. Les 6 types de matériel de la bibliothèque :
- **Poids du corps** / **Trail** → toujours proposés (aucun matériel requis) ;
- **Kettlebell**, **Barre de traction**, **Gilet lesté**, **Poignées de pompes** → proposés seulement si cochés dans le profil.

Un bandeau **« 🎒 Adapté à ton matériel »** indique ce qui est exclu le cas échéant (« exercices exclus faute de : Kettlebell, Barre de traction ») et rappelle que c'est modifiable dans Profil. Par défaut tout le matériel est coché → aucun changement pour qui a l'équipement complet ; l'adaptation se déclenche dès qu'on décoche.

## Détail technique

- **`lib/logic.js`** (purs + testés) :
  - `EQUIP_KIND_REQ` (kind d'exercice → clé équipement), `EQUIP_LABELS` (libellés).
  - `exerciseAvailable(exercise, equipment)` — réalisable si pas de matériel requis ou matériel dispo.
  - `filterByEquipment(exercises, equipment)` — filtre la liste (equipment falsy = pas de filtre).
  - `objectiveProgram(..., {equipment})` — pré-filtre le pool d'exercices avant sélection.
- **`app.js`** : `runObjectiveProgram` passe `state.profile.equipment` et affiche le bandeau `.op-equip` (matériel manquant calculé via `EQUIP_LABELS`). **`strength.css`** : styles `.op-equip`.

## Vérifs

- `npm run verify` → **222 tests / 222 pass** (+2 : `exerciseAvailable`/`filterByEquipment`, `objectiveProgram` matériel), garde-fou CSS vert, **SMOKE OK** (`objectiveEquipment:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.117.exe** (app d'Adrien jamais fermée).

## Suite (phase 1)

Programmes de course détaillés par objectif · lien objectif ↔ Coach Poids (calories/macros cohérentes).
