# 541 — Coaching : le coach regarde l'ÉQUILIBRE course ↔ muscu (trainBalanceGuard)

**Build 2.0.172 · boucle #541 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1)**

## Le manque

Le coach « Le focus du moment » (`adaptiveCoachFocus`, `logic.js`) lit le pilier sport sous **tous
les angles… sauf un**. Il connaît la **fréquence** (jours actifs, allure hebdo `sessionGoalPace`), la
**forme du jour** (`readiness`), la **charge** (ACWR : `loadSpike`/`lowLoad`) et les **carburants
chroniques** (sommeil, hydratation, mobilité, protéines : les `*TrainGuard`). Mais il n'a **jamais**
regardé la **RÉPARTITION** entre course et renforcement — l'axe *modalité*.

Or Adrien est un athlète **hybride** (trail + renfo — c'est écrit dans le code de
`weekTrainingBalance`). Pour lui, une semaine entièrement d'un seul côté est un vrai trou, **invisible
à tous les autres signaux** : la fréquence peut être parfaite, la charge optimale, la forme au vert —
et la semaine quand même **100 % course** ou **100 % muscu**. Le déséquilibre ne se voit que si on
compte les deux modalités, ce que le coach ne faisait pas. `weekTrainingBalance` (course vs muscu sur
N jours) existait pourtant et n'était **jamais** appelé par le coach (0 occurrence).

## Ce qui est livré

Nouveau champ **`trainBalanceGuard`** (`{ missing: 'run'|'strength', count }` ou `null`, **toujours**
renvoyé). Quand le pilier poussé est le sport et que la semaine récente (7 j) bascule **à 100 % d'un
côté**, le coach nomme le manque et le pilier à recaler, note **appendue** à l'insight :

- Semaine **tout-cardio** (0 renfo) : « Et regarde l'équilibre de ta semaine : 4 sorties de course et
  zéro renfo, alors que tu pratiques les deux d'habitude — une semaine tout-cardio laisse filer tes
  gains de force et prive les appuis que la course sollicite du renfort qui les protège. Cale une
  séance de renfo pour rééquilibrer. »
- Semaine **tout-muscu** (0 course) : « … une semaine tout-muscu érode la base aérobie que tu as
  construite. Cale une sortie de course pour rééquilibrer. »

**Pourquoi c'est un croisement neuf et honnête.** Le déséquilibre course/muscu porte des risques
réels et distincts : tout-cardio → gains de force qui fondent + appuis/tendons privés du renfort qui
les protège (terrain à blessure) ; tout-muscu → base aérobie qui s'érode. Aucun autre signal ne les
capte. C'est exactement le type de « croisement inédit » que le recap #540 appelait, **hors** l'axe
readiness/allure désormais saturé.

## Garde-fous & honnêteté

- **Hybridité PROUVÉE.** La note ne parle que si Adrien pratique **bel et bien les deux** d'habitude
  (`weekTrainingBalance` sur **28 j** : `runs > 0` ET `strength > 0`). Sans cette preuve, pousser du
  renfo à un **coureur pur** (ou l'inverse) serait du bruit, pas du coaching. (Testé : coureur pur →
  `null`.)
- **Vrai déséquilibre.** Semaine récente **pure** d'un côté (`runs === 0` XOR `strength === 0`) **et**
  volume réel (**total ≥ 3** séances — 1-2 séances d'un type ne font pas un déséquilibre). (Testé :
  2 séances → `null`.)
- **Cohérent avec les autres notes sport.** Séance du jour pas déjà faite (`!doneToday`), pilier pas
  dormant (`!reviveEligible` — un micro-pas de reprise n'a pas à parler d'équilibre), forme du jour qui
  n'ordonne pas le repos (`readiness == null || >= 50`) et **pas en pic de charge** (`loadSpike == null`
  — « cale une séance » contredirait « allège »). (Testé : readiness 40 → `null` ; ACWR en pic →
  `null`.)
- **Affine, ne remplace pas.** Note **appendue** ; l'action du jour reste intacte.
- **Vocabulaire distinct** (« l'équilibre de ta semaine », « tout-cardio/tout-muscu », « base
  aérobie », « rééquilibrer ») → zéro collision à l'œil ni en regex avec les notes
  readiness/charge/carburant sport.
- **Zéro nouvelle fonction.** Réemploi de `weekTrainingBalance`, `doneToday`, `readiness`, `loadSpike`,
  `reviveEligible`.

## Vérification

- Tests `logic.test.js` (nouveau bloc, +7 assertions) : semaine tout-cardio → `trainBalanceGuard ===
  { missing: 'strength', count: 3 }` + notes « 3 sorties de course et zéro renfo », « tout-cardio »,
  « renfo pour rééquilibrer » ; miroir tout-muscu → `{ missing: 'run', count: 3 }` + « base aérobie » /
  « course pour rééquilibrer ». Exclusions : coureur pur, 2 séances, `doneToday`, readiness 40, ACWR en
  pic → tous `null`.
- Check smoke **bloquant** `coachFocus` étendu (`fBalance`, `fPureRun`).
- `cd src && xvfb-run -a npm run verify` → **100 % vert** (513 tests node, SMOKE OK).

## Suite possible

- La note traite le cas **binaire** (100 % / 0 %). Un déséquilibre **modéré** (ex. 4 course / 1 muscu
  sur la semaine) n'est pas flaggé — volontairement : nommer chaque léger penchant deviendrait du
  bruit. À laisser tel quel sauf besoin avéré.
- `trainingByWeekday` (jour d'entraînement dominant) reste inexploité par le coach : un ancrage
  d'habitude (« c'est ton jour ») serait un autre croisement temporel — mais sa valeur actionnable est
  plus faible (encouragement plutôt que correction), à peser avant de l'ajouter.
