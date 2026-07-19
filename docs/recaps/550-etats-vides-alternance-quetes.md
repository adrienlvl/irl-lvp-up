# 550 — Plus de zone blanche : états vides du suivi Alternance et des quêtes (2.0.181)

> Rotation respectée : #549 `a11y` → #550 `alternance`. Tâche **P2.3** de la roadmap.

## Vérification préalable

Piste marquée « à VÉRIFIER » — **vérifiée, exacte, et pire que décrit** :

- `app.js:268` finissait par `if(!shown.length&&apps.length)box.innerHTML='';` — quand une recherche
  ou un filtre de statut ne matche **rien alors que des candidatures existent**, la liste rendait
  **une chaîne vide**. Le compteur affichait bien « 0 / 2 », mais la zone en dessous devenait
  **blanche** : de quoi croire une seconde que ses candidatures ont disparu. Sur le module
  **Alternance**, priorité de vie d'Adrien, c'est le pire endroit pour ce doute.
- `app.js:554` (`renderDashboardCore`) : `$('#questList').innerHTML = state.quests.map(...)` sans
  repli → supprimer toutes ses quêtes laissait la zone muette.

Ces **deux** listes étaient les seules à ne pas avoir d'état vide : 15 autres en ont déjà un
(`.empty-state`), dont le suivi Alternance lui-même quand la liste est vide **sans** filtre.

## Ce qui change

- **Alternance filtré à zéro** → « Aucune candidature ne correspond à ce filtre. Efface la recherche
  ou choisis un autre statut. » (dit ce qui se passe **et** quoi faire).
- **Quêtes vidées** → « Aucune quête pour le moment. Ajoute-en une ci-dessus pour lancer ta journée. »

Même classe `.empty-state` que les 15 existants — aucun style nouveau.

## Deux erreurs dans MON test, pas dans le code

Le check smoke est tombé en rouge deux fois, et les deux fois c'est le test qui se trompait :

1. Le filtre Alternance est piloté par la **variable de module `altQuery`** (`app.js:260`), pas par la
   valeur de `#altSearch` — écrire dans l'input sans déclencher l'évènement `input` ne filtre rien.
2. `renderQuests` **n'existe pas** : les quêtes sont rendues par **`renderDashboardCore`**.

Rappel utile pour les prochaines boucles : vérifier le **nom réel** de la fonction de rendu et le
**vrai levier** d'un filtre avant d'écrire l'assertion.

## Vérifs

- **518 tests** + smoke verts. Nouveau check smoke **BLOQUANT** `listEmptyStates` (filtre sans
  correspondance → message non vide ; quêtes vidées → message), avec restauration de l'état.
- **Navigateur** : filtre « zzzz-introuvable » sur 2 candidatures → message affiché, compteur
  « 0 / 2 », **plus de zone blanche** ; quêtes vidées → invitation affichée.

## Fichiers

- `src/app.js` — état vide filtré (`altList`) + repli `questList`.
- `src/lib/logic.js` — CHANGELOG 2.0.181.
- `src/test/renderer-smoke.cjs` — check bloquant `listEmptyStates` + assertion CHANGELOG.

Domaine : alternance
