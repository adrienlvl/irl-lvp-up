# 425 — Couverture : `bestE1rmByExercise`, formes legacy et garde-fous verrouillés (tests seuls)

## Le manque (§4.1 — couverture réelle, domaine frais force/1RM)

`bestE1rmByExercise(workouts, startKey, endKey)` (`src/lib/logic.js:3924`) renvoie, par exercice, le
**meilleur 1RM estimé** (formule d'Epley via `estimate1RM`) sur la fenêtre de dates `[startKey..endKey]`.
Elle sait lire **deux formes de séance** :

- la forme moderne `w.exercises[]` avec `setLogs[]` (le cas d'une séance guidée récente) ;
- la forme **legacy mono-exercice** `w.exercise` + `w.load`/`w.reps` (`logic.js:3928`), encore présente
  dans d'anciennes séances — c'est le même repli que les ~6 autres lecteurs muscu (`workoutsWithExercise`,
  `strengthPlateau`, `loggedExerciseNames`, `strengthRecords`…) ;
- et, dans les deux cas, le **repli `{load, reps}`** quand un exercice n'a pas de `setLogs` (`logic.js:3931`).

Son unique test (`test/logic.test.js:3510`) n'exerçait que la forme **moderne avec setLogs** via un seul
helper `wo(...)`. Manquaient totalement : la forme **legacy** `w.exercise`, le **repli sans setLogs**, le
**max de 1RM sur plusieurs séries**, l'**inclusion/exclusion aux bornes** de la fenêtre, et tous les
garde-fous (date mal formée, charge nulle au poids du corps, exercice sans nom, entrée non-tableau,
`exercises[]` **vide** qui doit retomber sur `w.exercise` grâce à la garde `.length`). Une régression qui
casserait la lecture des anciennes séances (retrait d'un repli) serait passée **inaperçue**.

## Le geste (tests seuls, aucun code modifié)

Chaque comportement a d'abord été **exécuté sur le vrai code** (`node -e …`) puis figé dans un **nouveau
`test('bestE1rmByExercise : formes legacy …')`** (juste après le test existant), en dérivant les valeurs
attendues de `L.estimate1RM(...)` plutôt que de constantes en dur (le test suit la formule, pas un nombre) :

- **legacy mono** `{exercise:'Squat', load:100, reps:5}` → `{Squat: estimate1RM(100,5)}` (116,5) ;
- **exercises[] sans setLogs** → repli `{load, reps}` ;
- **plusieurs setLogs** → **meilleur** 1RM retenu (120×2 = 128 > 100×5) ;
- **exercises[] vide + w.exercise** → repli sur la forme legacy (garde `.length`) ;
- **fenêtre** : la veille du début et le lendemain de la fin exclus, `start`/`end` exacts **inclus** ;
- garde-fous : date absente/mal formée ignorée, charge nulle (poids du corps → `estimate1RM` null) sans
  entrée, exercice sans nom ignoré, `null`/tableau d'objets hostiles → `{}` sans exception ;
- même exercice sur **plusieurs séances** de la fenêtre → meilleur 1RM toutes séances confondues.

Aucune ligne de `logic.js` touchée : la fonction était déjà correcte — c'est un **filet de non-régression**
sur ses replis de compatibilité (données anciennes) et ses bornes.

## Portée & sûreté

- Purement additif, tests uniquement → **pas de bump de version, pas d'entrée CHANGELOG** (règle
  VPS-AUTOPILOT §2.6). **+1 test → 437**, 0 échec. Aucune Release, zéro dépendance, aucune donnée perso,
  aucune fonctionnalité retirée.
- Variété (§4) : domaine **force / 1RM** (jamais travaillé dans les dernières boucles), type
  **couverture (§4.1)**, après la robustesse Agenda (#424), le polish anniversaires (#423) et la couverture
  énergie (#422). Fonction repérée via un audit des fonctions pures peu nommées dans les tests.

## Vérif & version

`cd src && xvfb-run -a npm run verify` → **437 tests + smoke 100 % verts** (`SMOKE OK`). Pas de bump
(2.0.58 conservé, tests seuls). Boucle #425.
