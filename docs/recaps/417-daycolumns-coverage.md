# 417 — Couverture : `dayColumns`, coloration d'intervalles de la grille agenda (tests seuls)

## Le manque (§4.1 — couverture réelle, domaine frais)

`dayColumns` (`src/lib/logic.js:6561`) répartit les événements datés d'une journée (start/end en
minutes) en **colonnes** pour la grille horaire de l'agenda : deux blocs qui se chevauchent tombent
côte à côte. C'est une **coloration de graphe d'intervalles** (place chaque bloc dans la première
colonne libérée, `cols` = concurrence maximale du cluster) — logique fine, mais son test ne couvrait
que trois cas de base :

- deux blocs qui se chevauchent + un isolé (2 colonnes / 1 colonne),
- des blocs contigus sans chevauchement (1 colonne),
- liste vide → `[]`.

**Non couvert** — pourtant central au comportement :

- la **réutilisation de colonne** : un 3ᵉ bloc qui démarre *après* la fin du 1ᵉʳ doit **reprendre sa
  colonne** au lieu d'en ouvrir une nouvelle (le cœur de l'algo : 3 événements peuvent tenir sur
  2 colonnes) ;
- la **préservation de l'ordre d'entrée** : la sortie est indexée sur l'ordre d'ENTRÉE (mapping par
  `.i`) alors que l'algorithme trie en interne par `start` — une entrée désordonnée doit ressortir
  alignée sur l'entrée, avec le bon clustering ;
- la **concurrence maximale** : trois blocs mutuellement chevauchants → **3 colonnes** distinctes
  (`cols` = max de recouvrement du cluster) ;
- la **borne `end`** : `end` absent ou ≤ `start` est ramené à `start + 1` (un bloc de longueur nulle
  occupe quand même un créneau, et deux tels blocs au même départ se retrouvent côte à côte) ;
- la **coercition** des `start`/`end` non numériques → `0` (`Number(...) || 0`), sans planter.

## Le geste (tests seuls, aucun code modifié)

Les cinq comportements ont d'abord été **exécutés sur le code réel** (`node -e …`) puis figés en
assertions ajoutées au `test('dayColumns …')` existant (`test/logic.test.js:3750`). Aucune ligne de
`logic.js` touchée : la fonction était déjà correcte — c'est un **filet de non-régression** sur son
algorithme (réutilisation de colonnes, ordre, concurrence, bornes), pas une correction de bug.
Aucun nouveau `test()` : uniquement des assertions dans le bloc existant, donc le **compte de tests
reste inchangé (434)**.

## Portée & sûreté

- Purement additif, tests uniquement → **pas de bump de version, pas d'entrée CHANGELOG** (règle
  VPS-AUTOPILOT §6 : changement sans effet utilisateur). Aucune Release, zéro dépendance, aucune
  donnée perso, aucune fonctionnalité retirée.
- Variété (§4) : domaine **Agenda / grille horaire** (jamais travaillé dans les dernières boucles),
  type **couverture (§4.1)**, après un correctif Nutrition/Poids (#416), la couverture géo (#415) et
  les parseurs de dates (#414). Fonction repérée via un audit des fonctions pures peu testées.

## Vérif & version

`cd src && xvfb-run -a npm run verify` → **434 tests + smoke 100 % verts** (`SMOKE OK`). Pas de bump
(2.0.54 conservé, tests seuls). Boucle #417.
