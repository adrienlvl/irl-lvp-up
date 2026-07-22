# #675 — Coach focus (jours serrés) : la note « carburant » côté énergie ne répète plus l'appel à l'action (2.0.278)

## Contexte / rotation
Priorité nuit (`docs/DEMANDES.md`) = pousser le **coaching adaptatif** en QUALITÉ (§3 : curation, pas
volume). Rotation §4 bis — grep tolérant sur les 5 derniers recaps (674→670) :
`docs, docs, coach, robustesse, docs` → `docs` bloqué (2 derniers **et** 3× dans les 5) ; **`coach`
libre** (1× en #672, hors les 2 derniers). Quota de propositions §4 bis.4 : le #674 est une proposition
(scan frigo) → quota **non déclenché**, itération de code permise. Piste prise **par son nom** : le recap
#672 laissait explicitement « la note sœur `focusFreshDriver` non auditée pour la même collision de queue —
candidat pour un futur tour coach (à vérifier en rendu chargé, pas en présumant) ».

## Méthode — §4 ter à la lettre (rendre le cumulé, LE LIRE en entier)
`/tmp`-free : rendu direct de `adaptiveCoachFocus` sur l'état chargé de la branche `tight × readiness
verte` (objectif focus SERRÉ le dernier jour + check-in de récup au vert le jour même), variantes SOMMEIL
et ÉNERGIE de `focusFreshDriver`. Les deux notes qui s'appendent :

- **`focusGoalFresh`** (`logic.js:5903`) — pose déjà l'appel à l'action :
  « … **l'esprit est frais** pour tenir un vrai bloc. Les deux signaux s'alignent : c'est **LE moment de
  pousser pour boucler l'objectif** focus. »
- **`focusFreshDriver`** (`logic.js:5922/5923`) — dont la valeur PROPRE (#532) est de **nommer le
  carburant** de la fraîcheur pour qu'Adrien le reproduise.

## Défaut prouvé — asymétrie sommeil vs énergie
En lisant le cumulé **en entier** :

- Variante **SOMMEIL** — PROPRE : « … ta nuit de 8 h — un cerveau reposé est le vrai **carburant du deep
  work**, **attaque d'abord ta tâche la plus exigeante** tant que la tête suit. » La queue EXPLIQUE un
  mécanisme (pas une redite) puis donne un ordre **NEUF** — le séquençage « la tâche la plus dure
  d'abord », que `focusGoalFresh` ne donne pas.
- Variante **ÉNERGIE** — RÉ-servait l'écho : « … ton énergie est au top (fatigue 1/5) — **l'esprit est
  vif**, **profite-en pour aller au fond du bloc** le plus dur avant que la journée l'entame. »
  - « l'esprit est **vif** » = **3ᵉ** assertion de fraîcheur d'esprit (après « l'esprit est frais » et
    « ta forme est au vert » de `focusGoalFresh`).
  - « profite-en pour aller au fond du bloc » = **re-service** de l'injonction « pousse … tenir un vrai
    bloc » déjà posée.

Même collision de queue que #672 (branche AVANCE), mais localisée **uniquement côté énergie** — le
sommeil échappait au piège par construction (mécanisme explicatif au lieu d'une re-assertion).

## Correctif — §3 curation (retirer/reformuler, pas ajouter)
La variante énergie est calquée sur la variante sommeil (`logic.js:5923`) — elle garde ses deux seules
valeurs propres (nommer le carburant + le séquençage neuf), sans redite :

> « … ton énergie est au top (fatigue 1/5) — **cette vivacité est le carburant du deep work, attaque
> d'abord ta tâche la plus exigeante** avant que la journée l'entame. »

Zéro champ ajouté, branche sommeil et champ `focusFreshDriver` inchangés. Commentaire de curation posé
en miroir de #672 (`logic.js`, bloc `focusFreshDriver`).

## Vérif
- Test `logic.test.js` (moteur énergie) durci : assert de la nouvelle queue + **`!/l'esprit est vif/`** et
  **`!/aller au fond du bloc/`** (preuve de non-redite).
- Smoke `coachFocus` : nouveau volet bloquant `fFreshEner` (sleep 6/fat 1/sore 3 → driver fatigue) qui
  asserte « cette vivacité est le carburant du deep work, attaque d'abord ta tâche la plus exigeante » et
  rejette l'écho retiré. Le volet sommeil `fFreshDrv` reste inchangé.
- `cd src && xvfb-run -a npm run verify` → **580 tests + SMOKE OK** (100 % vert).
- Bump **2.0.278** + CHANGELOG en tête + 2 assertions `CHANGELOG[0].v`.

## Suites possibles (non traitées ici)
La famille `focus…Driver` est désormais auditée pour la collision de queue sur les deux branches
positives (AVANCE #672, SERRÉE #675) et les deux carburants (sommeil/énergie). Le pendant NÉGATIF
(`focusDrainDriver`, « ce qui te plombe la tête ») n'a pas de note d'action jumelle au-dessus → pas de
collision attendue, mais non re-vérifié en rendu chargé ce tour — candidat mineur si un futur tour coach
manque de piste.

_Domaine : coach._
