# 509 — Coaching : l'objectif focus serré et la forme au vert s'alignent (2.0.140)

**Boucle #509 · build 2.0.140 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

C'est la **« Suite possible » côté FOCUS**, notée de façon répétée depuis #504/#505 puis rappelée en
tête de liste par #507 et #508, enfin mise en œuvre : le **pendant EXACT, côté focus, de
`lowLoadUnderGoal`** (l'alignement sport « objectif serré × sous-charge », #507).

Toute la lignée #504→#508 avait construit la réconciliation objectif-serré × corps **côté SPORT** :

- Conflits (#504 `restOverGoal`, #505/#506 `loadOverGoal`/`loadOverGoalSlide`) : le corps prime.
- Alignements (#507 `lowLoadUnderGoal`, #508 `…Rebound`) : quand la charge est basse / la forme
  remonte, le calendrier serré et le corps **tirent dans le même sens** → on le nomme.

Mais **côté FOCUS**, l'allure `focusGoalPace === 'tight'` (« cale ~90 min aujourd'hui pour tenir la
cible ») ne croisait **aucun** signal de forme. Le focus n'a pas d'ACWR (les minutes s'accumulent,
pas de notion de charge/récup) — mais la readiness du matin (sommeil, fatigue, courbatures) mesure la
**fraîcheur d'esprit**, et un cerveau reposé encaisse un gros bloc de concentration comme un corps
frais encaisse une séance. Un jour où l'insight focus dit « il faut un vrai bloc aujourd'hui » ET où
un check-in de récup met la forme au vert, le coach ratait l'occasion de dire « fonce, tout
s'aligne ».

## Ce qui a été livré

Dans la branche `focusGoalPace === 'tight'` (pilier focus), quand — et **seulement** quand — un
check-in de récup **daté du jour** met la readiness au vert (score ≥ 75, le **même seuil** que le feu
vert sport « prêt à pousser »), une note est **appendue** à l'insight (exactement comme
`lowLoadUnderGoal`, mais côté focus) :

> Et bonne nouvelle : cette cadence serrée tombe pile — ta forme est au vert ce matin (readiness
> 100/100), l'esprit est frais pour tenir un vrai bloc. Les deux signaux s'alignent : c'est LE moment
> de pousser pour boucler l'objectif focus.

Nouveau champ **`focusGoalFresh`** (le score de readiness, ou `null`). L'insight focus (compteur,
allure, minutes/jour) reste **intact** — la note ne fait qu'ajouter la lecture « corps ».

## Conception

- **Le pendant EXACT, côté focus, de `lowLoadUnderGoal`** : même patron (note appendue à l'insight
  sur le gate `…GoalPace === 'tight'`), signal transposé. Là où le sport lisait la marge dans l'ACWR
  bas, le focus lit la fraîcheur dans la readiness haute. Le « feu vert corps » demandé par la suite
  possible, joué par la readiness du jour.
- **Mutuellement exclusif, prouvé** : `focusGoalFresh` vit dans la branche `chosen.pillar ===
  'focus'` ; `restOverGoal`/`lowLoad`/`lowLoadUnderGoal` vivent dans la branche `chosen.pillar ===
  'sport'`. Un pilier à la fois → jamais deux notes d'alignement le même jour.
- **Un seul cas, précis** : gate `tight` × readiness ≥ 75. `'onpace'` a de la marge (aucune cadence
  quotidienne à soutenir) ; une readiness `< 75` n'est pas un feu vert. Rien à souligner alors.
- **Additif pur** : `focusGoalFresh` TOUJOURS renvoyé (`null` par défaut) ; note appendue, insight et
  toutes les autres branches intactes. Réemploi total (`readinessScore`, `s.recovery` déjà branchés
  côté sport) — zéro nouvelle fonction pure.
- **Données réelles seulement** : exige un check-in de récup **du jour même** (une readiness d'hier
  ne dit rien de la forme d'aujourd'hui) ET un objectif focus rendu serré par le calendrier.

## Vérif

- `adaptiveCoachFocus` (logic.test.js, test « allure focus » étendu) : dimanche 07-19, 90 min pour 1
  jour → `tight` ; **sans** recovery → `focusGoalFresh` null, pas de note ; **avec** recovery du jour
  au vert (sleep 8/fatigue 1/soreness 1 → 100) → `focusGoalFresh === 100` + « ta forme est au vert ce
  matin (readiness 100/100) » + « LE moment de pousser pour boucler l'objectif focus » ; recovery du
  jour basse (< 75) → `focusGoalFresh` null ; objectif `onpace` → `focusGoalFresh` null.
- Check smoke bloquant `coachFocus` étendu : focus serré sans récup → `focusGoalFresh` null ; focus
  serré × readiness 100 le jour même → note + `focusGoalFresh === 100` ; focus serré × readiness
  basse → null.
- `cd src && xvfb-run -a npm run verify` : **488 tests + smoke 100 % vert**.

## Suite possible

- Le **compound côté focus** (le pendant de #508 `lowLoadUnderGoalRebound`) : `focusGoalFresh` ET une
  readiness qui **remonte** franchement (`readinessRebound`) le même jour — mais côté focus le rebond
  n'est pas encore calculé (readiness n'est croisée que sur pilier sport). Chantier plus lourd.
- Le 3ᵉ conflit du même patron, resté ouvert : `sessionGoalPace === 'tight'` × pilier **DORMANT**
  (`reviveEligible`) — mais un dormant reçoit déjà un micro-pas, la tension y est moins nette.
