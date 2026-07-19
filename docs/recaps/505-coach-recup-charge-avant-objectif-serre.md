# 505 — Coaching : le pic de charge passe avant l'objectif serré (2.0.136)

**Boucle #505 · build 2.0.136 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

C'est la **1ʳᵉ « Suite possible » de #504**, mise en œuvre. #504 a réconcilié l'objectif hebdo serré
avec la **forme du jour** (`restOverGoal` : readiness au plancher → la récup prime). Restait le
conflit **jumeau**, resté ouvert : le coach « Le focus du moment » sait deux choses le même jour,
**sans les croiser** :

- l'**allure de l'objectif hebdo de séances** (`sessionGoalPace`) — **serrée** → l'insight dit
  « Serré mais jouable : … **il en faut une chaque jour** pour tenir l'objectif » ;
- la **charge des 7 derniers jours** (`loadSpike`, via l'ACWR aigu/chronique) — en **PIC** (zone
  `high`) → l'action dit « **allège aujourd'hui** (-30 % de volume) » / « semaine de **consolidation** ».

Réunies, elles se **contredisent** : *pousse une séance chaque jour* vs *lève le pied*. Même **bug
de crédibilité** que #504 — mais côté **charge cumulée** cette fois, pas forme d'un jour.

## Ce qui a été livré

Une **réconciliation** dans le bloc `loadSpike` (qui s'exécute après le calcul de `sessionGoalPace`,
donc y a accès). Quand — et **seulement** quand — le pic est détecté (ACWR `high`) ET l'allure est
**`tight`**, le coach **tranche** : tempérer la charge prime sur le chiffre. Note **appendue** à
l'insight, sous la phrase « il en faut une chaque jour » qu'elle nuance :

> Mais ta charge est en pic cette semaine (2,3× ton volume habituel) : tempérer prime sur le chiffre —
> empiler une séance chaque jour sur un corps déjà en zone de blessure serait le pire choix. Laisse
> l'objectif glisser, consolide, tu repars plus solide.

Nouveau champ **`loadOverGoal`** (le ratio ACWR, ou `null`). L'action de tempérage de charge
(« allège » / « consolidation ») reste **intacte** — la note ne fait que réconcilier l'insight avec elle.

## Conception

- **Le pendant, côté CHARGE, de `restOverGoal`** : même patron, autre signal. Un **pic de charge**
  est un indicateur de risque de blessure encore **plus net** qu'une mauvaise forme d'un jour (la
  charge cumulée, pas une nuit) → laisser l'objectif hebdo glisser une semaine est un choix d'autant
  plus évident.
- **Mutuellement exclusif de `restOverGoal` par construction** : `restOverGoal` exige
  `readiness < 50`, le bloc `loadSpike` exige `readiness == null || readiness >= 50` → **jamais les
  deux notes le même jour**. Aucun empilement possible.
- **Un seul conflit, précis** : gate `loadSpike` × `sessionGoalPace === 'tight'`. `'unreachable'` dit
  déjà « repars plein lundi » (aucune pression), `'onpace'` a de la marge (aucun conflit).
- **Additif pur** : `loadOverGoal` TOUJOURS renvoyé (`null` par défaut) ; note appendue, action
  intacte, aucune autre branche touchée. Réemploi total (`loadSpike`, `sessionGoalPace` déjà branchés)
  — zéro duplication, zéro nouvelle fonction pure.
- **Données réelles seulement** : exige des séances **chiffrées** (durée × effort > 0 sur 4 semaines,
  sinon l'ACWR est `null`) ET un objectif hebdo rendu serré par le calendrier.

## Vérif

- `adaptiveCoachFocus` (logic.test.js, nouveau test) : jeudi 07-16, 1 séance dans la semaine (07-14)
  + objectif 5 → `tight`, charge en pic → `loadOverGoal === loadSpike` (> 1,5) + « ta charge est en
  pic cette semaine » + « tempérer prime sur le chiffre », action de charge (« Charge en hausse
  brutale / allège ») intacte ; charge régulière + serré → `loadOverGoal` null ; pic + objectif large
  (`onpace`) → `loadOverGoal` null.
- Check smoke bloquant `coachFocus` étendu : conflit `tight` × pic chiffré + objectif large → null.
- `cd src && xvfb-run -a npm run verify` : **486 tests + smoke 100 % vert**.

## Suite possible

- Croiser `loadOverGoal`/`restOverGoal` avec la **pente de readiness** (`readinessSlide`) : une charge
  en pic **dans une glissade de forme** (fatigue qui s'installe) rend le choix « lâche l'objectif »
  encore plus net — un mot plus ferme.
- Symétrique côté FOCUS déjà noté en #504 (`focusGoalPace === 'tight'` × fatigue) — à peser, le focus
  fatigue moins le corps.
- Le 3ᵉ conflit du même patron : `sessionGoalPace === 'tight'` × pilier **DORMANT** (`reviveEligible`)
  — mais un dormant reçoit déjà un micro-pas, la tension y est moins nette.
