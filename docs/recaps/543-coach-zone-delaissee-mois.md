# 543 — Coaching : le coach repère la ZONE musculaire délaissée depuis un mois (sportNeglectGuard)

**Build 2.0.174 · boucle #543 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1)**

## Le manque

Le coach « Le focus du moment » (`adaptiveCoachFocus`, `logic.js`) lit le sport sous beaucoup d'angles
— fréquence, forme du jour, charge (ACWR), carburants, équilibre course ↔ muscu (`trainBalanceGuard`,
#541), balance poussée ↔ tirage (`pushPullGuard`, #542) et groupe **le plus reposé** (`sportZoneFocus`).
Mais tout ce qui touchait aux **zones musculaires** restait sur une fenêtre **courte** :

- `sportZoneFocus` désigne le groupe à cibler **aujourd'hui** — le plus **reposé** (repos jour par jour +
  déficit hebdo 7 j). Il ne dit **jamais** « ça fait un **mois** que tu n'as pas touché tes jambes ».
- `pushPullGuard` ne regarde que le **haut du corps** (pecs/épaules vs dos).

L'angle du **long terme** — un groupe entier **laissé de côté sur 28 j**, typiquement le **bas du corps**
chez un pratiquant tourné haut du corps — n'était lu par **personne** dans le coach. Or c'est un vrai trou
structurel : les jambes/fessiers sont la **plus grosse masse musculaire**, les négliger un mois **bride la
force globale** et **crée un point faible**. Invisible à la fraîcheur (un groupe jamais servi paraît « bien
reposé » sans jamais dire qu'il est **sous-servi** sur le mois) comme à la modalité (100 % muscu peut être
« bien hybride » côté course et pourtant **zéro jambe**). `neglectedZoneReport` (28 j : séries par zone,
flag `neglected` = 0 série OU < 40 % de la moyenne) existait — mais ne vivait **que** dans l'onglet Athlète
(carte « bloc »), jamais dans le coach du jour.

## Ce qui est livré

Nouveau champ **`sportNeglectGuard`** (`{ zone, sets, mean }` ou `null`, **toujours** renvoyé). Quand le
pilier poussé est le sport et que la muscu du dernier mois laisse une zone à **zéro** (ou nettement sous la
moyenne) avec un **vrai volume**, le coach **nomme** la zone la plus délaissée et invite à la remettre au
programme, note **appendue** à l'insight :

- **zéro** : « Et sur le dernier mois, ta zone la plus délaissée, c'est les jambes : zéro série en quatre
  semaines. Un groupe musculaire entier laissé de côté aussi longtemps finit par brider ta force globale et
  creuser un point faible — ajoute les jambes à ton programme cette semaine. »
- **sous la moyenne** : « … c'est les jambes : 4 séries en quatre semaines, loin derrière tes autres groupes
  (~14 en moyenne) — ajoute les jambes à ton programme cette semaine pour combler le retard. »

## Garde-fous & honnêteté

- **Vrai volume mensuel.** `total >= 20` séries-zones sur 28 j : sans lui, « ta zone délaissée » serait du
  bruit sur un mois quasi vide (le ton rebuild/revive gère déjà « tu t'entraînes peu »). (Testé : 19 → `null`.)
- **Subordonné à `trainBalanceGuard` ET `pushPullGuard`.** N'entre **que** si les deux sont `null` : une seule
  note d'équilibre à la fois, la plus **grossière** d'abord (modalité > poussée/tirage > zone délaissée). Si
  le trou EST dans l'axe poussée/tirage (dos délaissé), `pushPullGuard` parle déjà ; cette note se réserve les
  zones que lui ne voit pas (jambes, fessiers, abdos…). (Testé : muscu push-heavy → `pushPullGuard` parle,
  `sportNeglectGuard` muet.)
- **Mêmes gardes que `sportZoneFocus`.** Pilier sport, séance du jour pas faite (`!doneToday`), pas de
  ré-amorçage dormant (`!reviveEligible`), forme qui n'ordonne pas le repos (`readiness == null` ou ≥ 50), pas
  de pic de charge (`loadSpike == null`). (Testé : `doneToday` → `null` ; readiness 40 → `null`.)
- **Affine, ne remplace pas.** Note **appendue** à l'insight ; l'action du jour (et l'éventuelle note
  `sportZoneFocus` sur la même zone, angle fraîcheur) restent intactes — les deux se **renforcent** quand elles
  visent le même groupe (tactique du jour + stratégie du mois).
- **Vocabulaire distinct** (« ta zone la plus délaissée », « sur le dernier mois », « ajoute … à ton
  programme ») → zéro collision à l'œil ni en regex avec `sportZoneFocus` (« le plus reposé », « cible en
  priorité »), `pushPullGuard` (« balance poussée/tirage », « coiffe des rotateurs ») ni `trainBalanceGuard`
  (« tout-cardio », « rééquilibrer »).
- **Zéro nouvelle fonction.** Réemploi de `neglectedZoneReport`, `doneToday`, `reviveEligible`, `loadSpike`,
  `readiness`.

## Vérification

- Tests `logic.test.js` (nouveau bloc) : muscu équilibrée haut du corps + abdos/fessiers, zéro jambe sur 28 j
  → `sportNeglectGuard === { zone:'legs', sets:0, mean:13 }` + notes « zéro série en quatre semaines » et
  « ajoute les jambes à ton programme ». Cas sous la moyenne (4 séries) → « loin derrière tes autres groupes ».
  Exclusions : volume maigre (<20), `doneToday`, readiness 40, subordination à `pushPullGuard` → tous `null`.
- Check smoke **bloquant** `coachFocus` étendu (`fNeglect` : zéro jambe → `zone:'legs'`, `sets:0`, « ta zone
  la plus délaissée » + « les jambes » ; `fPureRun.sportNeglectGuard === null`).
- `cd src && xvfb-run -a npm run verify` → **100 % vert** (515 tests node, SMOKE OK).

## Suite possible

- La note pourrait **nommer le POURQUOI par zone** (jambes → « moteur des descentes en trail » ; dos → réservé
  à `pushPullGuard` déjà) plutôt qu'un « point faible » générique — plus actionnable, mais délicat à garder
  honnête sur les 7 zones.
- `trainingByWeekday` (jour d'entraînement dominant) reste inexploité par le coach — ancrage d'habitude,
  valeur actionnable modérée.
