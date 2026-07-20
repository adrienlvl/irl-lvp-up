# 600 — Distance de course par objectif dans « Générer ma semaine » (2.0.216)

> Demande d'Adrien (chantier coach/athlète, gap repéré dès l'exploration #593) : « une distance de
> course adaptée à mon objectif (ou l'objectif que j'ai entré) ».

## Le gap

Aucun générateur n'attribuait de **km** aux courses : `buildTrainingWeek` créait des runs
`{type:'run', long, title:'🏃 Course facile'}` sans distance. Le volume hebdo saisi
(`state.goals.distance`) existait mais n'était **jamais réinjecté** dans la génération.

## Ce qui change

- **`runDistances(count, weeklyKm, emphasis)`** (pur, testé) : répartit un volume de course
  **hebdomadaire** sur `count` séances, façon plan de course — la **sortie longue** (dernière) prend la
  plus grosse part (fraction plus élevée quand il y a peu de séances : ~58 % à 2 courses, ~35 % à 4+),
  **toujours la plus longue de la semaine** ; les courses faciles se partagent le reste. Sans volume
  saisi → base par défaut selon l'accent de l'objectif (facile 14 / balanced 22 / vitesse 26 km).
  Bornes : ≥ 3 km/course ; 1 seule séance → run modéré plafonné (12 km).
- **`buildTrainingWeek`** accepte `opts.weeklyKm/emphasis` : chaque course reçoit un champ `km` et son
  **titre l'affiche** (« 🏃 Sortie longue · 13 km »). Le titre porte le km jusque dans l'agenda
  (`scheduleWeekProgram` réutilise le titre).
- **`renderWeekProgram`** passe `state.goals.distance` (la distance que tu as entrée).

## Effet (30 km/sem, 3 sorties)

« 🏃 Course facile · 8,5 km » × 2 + « 🏃 Sortie longue · 13 km » (total ≈ 30 km).

## Vérifs

- **547 tests** + smoke verts. Tests `runDistances` (répartition, longue = plus grosse même à 2
  courses — bug de sur-répartition corrigé, plancher 3 km, défaut par accent) et `buildTrainingWeek`
  (km sur chaque course, titre, total ≈ volume). Vérifié via DOM (« 8,5 / 8,5 / longue 13 km »).

## Suite série coaching

Fait : poids/nutrition (#595), zoom poids (#596), redesign séance (#597), prehab (#598), progression
muscu (#599), distance par objectif (#600). Restent : **zones d'intensité course** (polarisé 80/20,
zone 2, allure des runs générés), **VO2max/fractionné**, **affûtage**, et **volume/deload muscu**.

## Fichiers

- `src/lib/logic.js` — `runDistances` + `buildTrainingWeek` (opts.weeklyKm, km sur runs) + export + CHANGELOG.
- `src/app.js` — `renderWeekProgram` passe `weeklyKm`.
- `src/test/logic.test.js` — tests.

Domaine : athlete
