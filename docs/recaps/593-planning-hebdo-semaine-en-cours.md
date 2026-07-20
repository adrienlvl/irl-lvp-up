# 593 — « Générer ma semaine » se pose sur la SEMAINE EN COURS (2.0.209)

> Demande d'Adrien (chantier 1/3 sur le coach & l'athlète). Loop 1 : l'ancrage semaine-courante.

## Le problème (vérifié dans le code)

`scheduleWeekProgram` (`app.js`) calculait **lundi prochain** — `monday.setDate(monday.getDate()-dow+7)`
— et posait le programme à partir de là (le message disait même « dès lundi prochain »). Donc même un
mardi, toutes les séances étaient repoussées à la semaine suivante et **les jours restants de la
semaine en cours étaient perdus**. Adrien voulait l'inverse : « regarde la semaine où on est et mets
déjà les séances possibles sur la semaine en cours ».

Bonus trouvé au passage : les horaires étaient **inversés** vs sa demande — muscu à 18:00, run à
07:30, alors qu'il veut « le matin muscu, le soir le running ».

## Ce qui change

- **`weekProgramSchedule(days, todayKey, weeks)`** (logique pure, testée) : ancre le programme sur le
  **lundi de la semaine de `todayKey`** (via `mondayOf`), couvre `weeks` semaines, et **saute les jours
  déjà passés** de la semaine en cours (`date < todayKey`). Renvoie les occurrences datées, triées.
- **`scheduleWeekProgram`** consomme ce helper : la semaine en cours reçoit ses **jours restants** tout
  de suite, puis les semaines suivantes en entier. Message corrigé (« dès CETTE semaine »).
- **Horaires** : quand une muscu et une course tombent le **même jour**, la muscu est calée à **08:00**
  (matin) et la course à **18:00** (soir) — l'ordre qu'Adrien voulait.

Le mode « muscu + course le même jour » (`buildTrainingWeek` `sameDay`, case `#wpSameDay`) existait
déjà — cette demande-là était donc satisfaite ; ce loop corrige l'ancrage temporel et les horaires.

## Vérifs

- **542 tests** + smoke verts. Test node `weekProgramSchedule` (jours passés sautés, semaine en cours
  remplie, robustesse). Check smoke **bloquant** `weekScheduleCurrent` : dans le vrai Electron, les
  dates posées par `scheduleWeekProgram` **égalent** l'ancrage semaine-courante du helper et sont
  **toutes ≥ aujourd'hui** (jamais dans le passé).

## Reste à faire (loops suivants, chantier coach/athlète)

Une exploration du code a révélé **trois** générateurs de semaine ; ce loop a corrigé celui que la
demande nomme (`#wpGenerate` → `buildTrainingWeek` → `scheduleWeekProgram`). Restent :

- **`scheduleObjectiveProgram`** (`app.js:683`, programme par objectif de l'onboarding) : **même bug**
  de lundi prochain, mais lié aux blocs d'entraînement (`state.blockStart`) → à traiter à part, avec
  soin. _Non touché ici._
- **`generateAutomaticWeek`** (`app.js:514`, bouton `#generateWeekPlan` du calendrier) : pose sur
  **aujourd'hui+0..+6** (fenêtre glissante) au lieu de lundi→dimanche — l'autre défaut qu'Adrien
  pointe (« repartir sur 7 jours neufs »). _À aligner sur la semaine calendaire._
- **Distance de course adaptée à l'objectif** : AUCUN générateur n'attribue de km ; `state.goals.distance`
  (la distance saisie à l'onboarding) existe mais n'est lue que pour le SUIVI, jamais réinjectée dans
  la génération. Gap réel et net → prochain loop.
- Chantier 2 : **suppression/annulation d'une séance dans l'agenda** + replanification intelligente.
- Chantier 3 : **graphique du poids** illisible.

## Fichiers

- `src/lib/logic.js` — `weekProgramSchedule` + CHANGELOG 2.0.209.
- `src/app.js` — `scheduleWeekProgram` ancré semaine-courante + horaires muscu matin / run soir.
- `src/test/logic.test.js`, `src/test/renderer-smoke.cjs` — test + check bloquant.

Domaine : athlete
