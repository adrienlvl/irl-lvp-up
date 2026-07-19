# 544 — Coaching : le coach surveille la MONTÉE de KILOMÉTRAGE de course (runVolumeGuard)

**Build 2.0.175 · boucle #544 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1)**

## Le manque

Le coach « Le focus du moment » (`adaptiveCoachFocus`, `logic.js`) lit le sport sous beaucoup
d'angles — fréquence, forme du jour, charge **globale** (ACWR : `loadSpike`/`lowLoad`), carburants
chroniques, équilibre course ↔ muscu (`trainBalanceGuard`, #541), poussée ↔ tirage (`pushPullGuard`,
#542), groupe le plus reposé (`sportZoneFocus`) et zone délaissée sur le mois (`sportNeglectGuard`,
#543). Mais l'**axe de PROGRESSION du volume de COURSE** — la fameuse règle des **+10 %/semaine** —
n'était lu par **personne**.

`loadSpike` s'appuie sur `acuteChronicRatio`, dont la charge est **durée × effort de TOUTES les
séances**. C'est une mesure globale, **aveugle au kilométrage propre à la course** : un coureur peut
garder une ACWR « optimale » tout en faisant **bondir** ses km de course — remplacer du renfo par du
footing, ou courir plus mais en endurance facile (effort bas → load modérée). Or c'est le **mileage**
qui casse : monter le volume de course trop vite est **la première cause de blessure du coureur**
(périostite, fracture de fatigue, tendinopathie), parce que **tendons, os et articulations** s'adaptent
bien plus lentement que le système cardio-respiratoire. `weeklyKmRamp` (km course 0-6 j vs 7-13 j, zone
`high` = +30 %) **existait** mais ne vivait **que** dans l'onglet Athlète (carte « progression km ») —
**jamais** appelé par le coach du jour (0 occurrence).

## Ce qui est livré

Nouveau champ **`runVolumeGuard`** (`{ thisWeekKm, lastWeekKm, rampPct }` ou `null`, **toujours**
renvoyé). Quand le pilier poussé est le sport et que la semaine de course bondit dans la zone `high`
(+30 %) **sur une vraie base**, le coach **nomme** le saut et invite à plafonner, note **appendue** à
l'insight :

> « Et surveille ta montée de kilométrage : tu es passé de 20 à 30 km de course cette semaine (+50 %),
> bien au-delà des +10 %/semaine que tes tendons, tes os et tes articulations encaissent sans casser —
> c'est le cardio qui suit vite, pas eux. Monter le mileage trop vite est la première cause de blessure
> du coureur (périostite, fracture de fatigue) : plafonne l'augmentation autour de +10 % la semaine
> prochaine, le temps que le corps s'adapte au volume. »

## Garde-fous & honnêteté

- **Vraie base.** `ramp.lastWeekKm >= 10` : sans ce plancher, un « +150 % » sur 2 km serait du bruit.
  (Testé : base de 4 km → `null`.)
- **Progression maîtrisée = silence.** Seule la zone `high` (+30 %, au-delà de la fourchette saine
  +10 %/sem) parle ; `build` (10-30 %), `steady` (±10 %), `down` ne disent rien. (Testé : +5 % → `null`.)
- **Subordonné à `loadSpike`.** N'entre **que** si `loadSpike == null` : une seule note « charge/blessure »
  à la fois, la plus **grossière** d'abord (ACWR global > mileage course).
- **Aucune contradiction avec `trainBalanceGuard`.** `missing: 'run'` exige `runs === 0` cette semaine →
  km de course = 0 → jamais zone `high` → jamais « ajoute une course » vs « plafonne tes km » le même jour.
- **Mêmes gardes que les autres notes sport.** Pilier sport, séance du jour pas faite (`!doneToday`), pas
  de ré-amorçage dormant (`!reviveEligible`), forme qui n'ordonne pas le repos (`readiness == null` ou
  ≥ 50). (Testé : course faite aujourd'hui → `null` ; readiness 40 → `null`.)
- **Coureur pur sans distance saisie → muet.** Des sorties `type: 'run'` sans `distance` donnent
  `weeklyKmRamp` nul → `null` (vérifié au smoke : `fPureRun.runVolumeGuard === null`).
- **Vocabulaire distinct** (« ta montée de kilométrage », « km de course cette semaine », « +10 %/semaine »,
  « tendons, os et articulations », « périostite, fracture de fatigue ») → zéro collision à l'œil ni en
  regex avec `loadSpike` (« ton volume habituel », « charge en pic »), les guards carburant (« socle
  invisible », « carburant »), ni les guards d'équilibre (« tout-cardio », « balance poussée/tirage »,
  « ta zone la plus délaissée »).
- **Zéro nouvelle fonction.** Réemploi de `weeklyKmRamp`, `doneToday`, `reviveEligible`, `loadSpike`,
  `readiness`.

## Vérification

- Tests `logic.test.js` (nouveau bloc) : 20 km → 30 km (+50 %, zone `high`) →
  `runVolumeGuard === { thisWeekKm: 30, lastWeekKm: 20, rampPct: 50 }` + notes « surveille ta montée de
  kilométrage » et « de 20 à 30 km de course cette semaine (+50 %) ». Exclusions : base < 10 km, +5 %
  (steady), muscu pure, course faite aujourd'hui, readiness 40 → tous `null`.
- Check smoke **bloquant** `coachFocus` étendu (`fRamp` : +50 % → `rampPct: 50`, `thisWeekKm: 30`,
  « surveille ta montée de kilométrage » ; `fPureRun.runVolumeGuard === null`).
- `cd src && xvfb-run -a npm run verify` → **100 % vert** (516 tests node, SMOKE OK).

## Suite possible

- La note pourrait relier le kilométrage à une **échéance de course** (`racePhase`/`raceGoalStatus`) :
  ramper vite en phase d'affûtage est encore plus risqué. Délicat à garder honnête sans course planifiée.
- `runPace` (allure) reste inexploité par le coach — une dérive d'allure (fatigue chronique) serait un
  signal complémentaire, mais la donnée d'allure est plus bruitée que le volume.
</content>
</invoke>
