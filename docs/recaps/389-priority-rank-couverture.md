# #389 — Couverture : `priorityRank`, dernier trou des fonctions pures (sans bump)

## Le manque (couverture §4.1)

Après les boucles #385/#386/#387, un balayage exhaustif des déclarations `function` de `logic.js`
(355 fonctions) croisé avec `test/logic.test.js` a montré qu'il restait **une seule** fonction pure
sans aucune référence dans les tests : **`priorityRank`** (`logic.js:107`).

Ce n'est pas un helper anecdotique : il sert de **clé de tri** dans **deux** chemins à chaud —
l'ordre des événements de l'agenda (`logic.js:133`) et celui des to-do du jour (`logic.js:1097`).
Son contrat cache une subtilité réelle jamais verrouillée : `AGENDA_PRIORITIES.indexOf(p)` renvoie
`-1` pour toute priorité inconnue, **replié sur `1`** — c'est-à-dire **le même rang que `'normal'`**.
Autrement dit, une entrée à priorité corrompue (`'urgent'`, casse erronée, non-string) se trie
comme une normale, et n'est **jamais reléguée en bas** comme le serait une `'low'`. Rien ne gardait
ce choix de repli contre un futur refactor (p. ex. quelqu'un qui « corrigerait » `-1 → 2`).

## Le geste (tests seuls, zéro changement de comportement)

**`test/logic.test.js`** — 2 blocs (+2, **422 → 424**), insérés à côté du test de normalisation des
priorités :

- **`priorityRank : rang aligné sur AGENDA_PRIORITIES`** — `high`→0, `normal`→1, `low`→2 ; ordre
  strict `high < normal < low` (croissant = du plus fort au plus faible) ; et cohérence prouvée
  contre la source de vérité exportée (`AGENDA_PRIORITIES.forEach((p,i) => rank(p) === i)`) — si
  quelqu'un réordonne la constante, le test suit et reste vrai, s'il casse l'alignement il tombe.
- **`priorityRank : priorité inconnue → rang normal`** — l'invariant clé : `'urgent'`, `'HIGH'`,
  `'Low'`, `''`, `'medium'`, `'p1'` **et** les entrées non-string hostiles (`undefined`, `null`,
  `0`, `3`, `NaN`, `{}`, `[]`, `['high']`, `true`) renvoient toutes **le rang de `'normal'`**,
  jamais le rang de `'low'`. Le repli au milieu (pas en bas) est désormais explicitement testé.

## Vérification

`xvfb-run -a npm run verify` : **424 tests + smoke** verts (`whatsNew` toujours vert en 2.0.29).

## Contexte

**Pas de bump** : tests seuls, aucun effet utilisateur ni changement de `logic.js` → pas d'entrée
CHANGELOG (VPS-AUTOPILOT §6). Toutes les fonctions pures de `logic.js` ont désormais **au moins un
test direct**. Backlog autonome **§4.1 (couverture des fonctions pures peu testées)**. Aucune
Release, zéro dépendance, aucune donnée perso, aucune feature retirée. Boucle #389.
