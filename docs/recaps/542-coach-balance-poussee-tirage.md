# 542 — Coaching : le coach surveille la balance POUSSÉE ↔ TIRAGE (pushPullGuard)

**Build 2.0.173 · boucle #542 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1)**

## Le manque

Le coach « Le focus du moment » (`adaptiveCoachFocus`, `logic.js`) lit désormais le sport sous
beaucoup d'angles — fréquence, forme du jour, charge (ACWR), carburants chroniques, équilibre
**course ↔ muscu** (`trainBalanceGuard`, #541) et groupe **le plus reposé** (`sportZoneFocus`). Mais
il restait **aveugle à la STRUCTURE interne de la muscu** : le penchant **poussée ↔ tirage**.

Pousser (pecs, épaules) bien plus qu'on ne tire (dos) est le déséquilibre le plus **courant** en
musculation — et le plus **sournois**, car chaque séance de poussée paraît saine isolément. Cumulé
sur des semaines, il **enroule les épaules vers l'avant** (posture) et met la **coiffe des rotateurs**
en tension asymétrique : terrain classique de douleur d'épaule. Ce risque est **invisible** aux deux
axes voisins : la **fraîcheur** (`sportZoneFocus`) peut voir le dos « reposé » sans jamais chiffrer
qu'il est sous-travaillé sur le mois ; la **modalité** (`trainBalanceGuard`) peut voir une semaine
« bien hybride » côté course/muscu et pourtant tout en poussée. `muscleBalance` (28 j : séries de
poussée vs tirage) et `pushPullAdvice` existaient — mais ne vivaient **que** dans l'onglet Athlète,
**jamais** appelés par le coach du jour (0 occurrence).

## Ce qui est livré

Nouveau champ **`pushPullGuard`** (`{ zone, push, pull, ratio }` ou `null`, **toujours** renvoyé).
Quand le pilier poussé est le sport et que la muscu du dernier mois **penche nettement** d'un côté
avec un vrai volume, le coach **nomme** le penchant et le côté à recharger, note **appendue** à
l'insight :

- **push-heavy** : « Et regarde ta balance poussée/tirage sur 4 semaines : 35 séries de poussée
  (pecs, épaules) pour seulement 3 de tirage — pousser bien plus qu'on ne tire enroule les épaules
  vers l'avant et met la coiffe des rotateurs en tension. Ajoute du dos (tractions, rowing) à ta
  prochaine séance, tes épaules te remercieront. »
- **no-pull** (zéro tirage) : « … et zéro tirage — que de la poussée enroule les épaules… Cale du
  dos (tractions, rowing), c'est ta priorité posture. »
- **pull-heavy** / **no-push** : miroirs (« ajoute des pecs et des épaules pour un haut du corps
  complet »).

## Garde-fous & honnêteté

- **Vrai déséquilibre + vrai volume.** `pushPullAdvice(bal, 10)` : ne parle que si zone `push-heavy` /
  `pull-heavy` / `no-pull` / `no-push` **et** ≥ 10 séries poussée+tirage sur 28 j (`ok === false`).
  Balance correcte ou signal maigre → `null`. (Testé : balanced 10/9 → `null` ; 1 séance → `null`.)
- **Subordonné à `trainBalanceGuard`.** N'entre **que** si `trainBalanceGuard == null` : inutile
  d'affiner la balance poussée/tirage le jour où le coach dit déjà « cale carrément une séance de
  renfo » (un côté entier de la modalité manque) — le signal grossier prime sur le fin. (Testé :
  semaine 100 % course chez un hybride push-heavy → `trainBalanceGuard` parle, `pushPullGuard` muet.)
- **Mêmes gardes que `sportZoneFocus`.** Pilier sport, séance du jour pas faite (`!doneToday`), pas de
  ré-amorçage dormant (`!reviveEligible`), forme qui n'ordonne pas le repos (`readiness == null` ou
  ≥ 50), pas de pic de charge (`loadSpike == null`) — on ne charge un côté que quand une vraie séance
  est encouragée. (Testé : `doneToday` → `null` ; readiness 40 → `null`.)
- **Affine, ne remplace pas.** Note **appendue** à l'insight ; l'action du jour reste intacte.
- **Vocabulaire distinct** (« balance poussée/tirage sur 4 semaines », « coiffe des rotateurs »,
  « enroule les épaules », « haut du corps complet », « priorité posture ») → zéro collision à l'œil
  ni en regex avec `sportZoneFocus` (« le plus reposé », « cible en priorité »), `trainBalanceGuard`
  (« tout-cardio », « base aérobie », « rééquilibrer ») ni les guards récup. (Ce vocabulaire n'existait
  que dans `warmupFor`/`cooldownFor` et l'onglet Athlète, jamais dans la sortie du coach.)
- **Zéro nouvelle fonction.** Réemploi de `muscleBalance`, `pushPullAdvice`, `doneToday`,
  `reviveEligible`, `loadSpike`, `readiness`.

## Vérification

- Tests `logic.test.js` (nouveau bloc) : push-heavy 35/3 → `pushPullGuard === { zone:'push-heavy',
  push:35, pull:3, ratio:11.67 }` + notes « 35 séries de poussée… pour seulement 3 de tirage »,
  « coiffe des rotateurs en tension », « Ajoute du dos (tractions, rowing) » ; no-pull → « zéro
  tirage » / « priorité posture ». Exclusions : balanced, volume maigre, `doneToday`, readiness 40,
  subordination à `trainBalanceGuard` → tous `null`.
- Check smoke **bloquant** `coachFocus` étendu (`fPush` : push-heavy 35/3 + « coiffe des rotateurs » +
  « Ajoute du dos » ; `fPureRun.pushPullGuard === null`).
- `cd src && xvfb-run -a npm run verify` → **100 % vert** (514 tests node, SMOKE OK).

## Suite possible

- L'axe **structure interne** n'est traité qu'en poussée/tirage (haut du corps). Un axe
  **haut ↔ bas du corps** (jambes/fessiers vs reste) serait le pendant sur l'autre grande fracture,
  mais sa valeur « prévention » est plus faible (moins de risque articulaire direct) — à peser.
- `trainingByWeekday` (jour d'entraînement dominant) reste inexploité par le coach : ancrage
  d'habitude (« c'est ton jour »), plus encouragement que correction — valeur actionnable modérée.
