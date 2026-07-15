# #317 — « Prochaine séance » et « Planifier la suite » voient enfin le programme (1.9.251)

## Le manque, vérifié avant de coder

Deux widgets d'entraînement lisaient **uniquement `state.plans`** :
- la ligne « ⏭️ Prochaine séance » (en-tête Athlète) ;
- le widget « Planifier la suite » (`#plannedList`).

Or `state.plans` ne contient que les créneaux **ajoutés à la main** (`#addPlan`) ou par le
planificateur hebdo (`generateAutomaticWeek`, avec `auto:true`). Tous les GÉNÉRATEURS de programme
— `scheduleObjectiveProgram` (objprog), `scheduleCoachWeek`, `scheduleRunPlan`,
`scheduleZonePlan`/`scheduleWeekProgram` (planner) — écrivent dans **`state.agenda`**, sans entrée
`plans`. Conséquence : **après l'onboarding principal** (qui lance un programme d'objectif),
l'utilisateur voyait « Aucune séance planifiée » et une prochaine séache vide, alors que son agenda
contenait 4 semaines de séances. Un décalage direct avec le retour d'Adrien sur « Planifier la
suite ».

## Ce qui change

Nouvelle fonction pure `upcomingSessions(plans, agenda, todayKey, opts)` : vue **unifiée** des
séances à venir, fusionnant `state.plans` et les séances sport de `state.agenda`.

- **Dédup** : on EXCLUT les agenda liés à un plan (`planId`) — `generateAutomaticWeek` pousse à la
  fois un plan ET un agenda avec `planId`, les compter tous deux doublonnerait.
- **Filtre** : `kind:'sport'`, non terminé, non journée-entière, date ≥ aujourd'hui.
- **`opts.nowMinutes`** : pour « prochaine séance », écarte les séances du jour déjà passées.
- Tri par date puis heure, `opts.limit` optionnel.

Câblage :
- **En-tête « prochaine séance »** : `upcomingSessions(..., {nowMinutes, limit:1})[0]`. Le libellé
  d'une séance de programme est raccourci à sa partie utile (`label.split(' · ')[0]` →
  « 🏋️ Haut du corps » plutôt que « … · S1 Adapt · 45 min »).
- **« Planifier la suite »** : rendu depuis la vue unifiée. Les séances de programme portant des
  exercices (`workout`) ont un bouton **« Démarrer → »** qui ouvre la séance guidée (via
  `startGuidedFromNames`, déjà utilisé en vue Jour) ; les séances de course s'affichent en ligne
  d'info « programme ». Toutes sont **reportables à demain**. Les créneaux `plans` gardent leurs
  boutons habituels (20 min / Mobilité / Demain).

`nextTrainingSession` (l'ancienne source de l'en-tête) reste exportée et testée — simplement plus
appelée par ce chemin.

## Vérification navigateur (state en mémoire, vrai flux)

Programme d'objectif placé via `scheduleObjectiveProgram` (8 séances), puis `renderGrowth` /
`renderAthlete` :

| Contrôle | Avant | Après |
|---|---|---|
| « Planifier la suite » | « Aucune séance planifiée » | ✅ 6 séances de programme, avec Démarrer |
| « Prochaine séance » | vide / créneau manuel seul | ✅ 🏋️ Haut du corps — dans 6 j |
| « Démarrer → » sur une séance de programme | (inexistant) | ✅ ouvre la guidée avec ses 2 exercices |

Note : un premier essai a montré la guidée qui ne s'ouvrait pas — parce que mes noms d'exercices de
test (« Développé ») ne correspondaient à aucune entrée réelle et `startGuidedFromNames` faisait
`alert('Aucun exercice reconnu')`. Refait avec de vrais noms (`exercises.slice(0,2)`) : la guidée
s'ouvre avec les 2 exercices. Artefact de test, pas un bug.

## Tests

346 tests `node:test` + smoke verts. `upcomingSessions` : fusion plans + programme, exclusion des
doublons `planId`, des non-sport / journée-entière / terminés / passés, filtre `nowMinutes`, tri et
`limit`. Smoke `plannedMergesProgram` verrouille la présence du widget et la fusion.

## Rotation

#317 — rotation 27 en cours (build 1.9.251).
