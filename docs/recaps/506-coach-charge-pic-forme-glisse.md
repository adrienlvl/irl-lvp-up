# 506 — Coaching : le pic de charge dans une forme qui glisse durcit le verdict (2.0.137)

**Boucle #506 · build 2.0.137 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

C'est la **1ʳᵉ « Suite possible » de #505** (elle-même listée en #504), mise en œuvre : croiser le
conflit **`loadOverGoal`** (pic de charge qui écrase un objectif hebdo serré) avec la **pente de
readiness** (`readinessSlide`).

Depuis #505, quand l'objectif hebdo de séances est **serré** ET la charge des 7 j en **PIC**, le
coach tranche : « tempérer prime sur le chiffre ». Mais il traitait de la même façon **deux
situations distinctes** :

- un pic de charge sur une forme du jour **stable** (une seule lecture, un instant) ;
- un pic de charge **pendant que la forme GLISSE** relevé après relevé (`readinessSlide` : chute
  ≥ 12 pts sur ≥ 4 check-ins, readiness du jour dans [50, 75[).

Le second cas est **plus sérieux** : ce ne sont plus deux façons de lire un même moment, mais **deux
signaux de fatigue concordants qui se cumulent** — charge cumulée trop haute ET récupération qui
décroche. Le même mot « prudent » sous-vendait ce cumul.

## Ce qui a été livré

Dans le bloc `loadOverGoal` (qui s'exécute **après** le calcul de `readinessSlide`, donc y a accès),
quand — et **seulement** quand — le conflit `tight` × pic est déjà retenu ET que `readinessSlide`
n'est pas nul, la note appendue **durcit de registre** :

> Mais ta charge est en pic cette semaine (2,3× ton volume habituel) ET ta forme glisse en parallèle
> (-18 pts sur tes derniers check-ins) : deux signaux de fatigue qui se cumulent, pas un coup de mou
> isolé. Laisser l'objectif hebdo glisser n'est plus prudent, c'est la seule option saine —
> consolide, protège-toi, tu repars bien plus solide.

Nouveau champ **`loadOverGoalSlide`** (le delta négatif de la glissade, ou `null`). Sans glissade, la
note **douce d'origine** de #505 est conservée à l'identique. L'action de charge reste **intacte**.

## Conception

- **Renfort, pas nouveau conflit** : on ne déclenche rien de neuf — on **module** le registre d'une
  note qui existait déjà (#505), selon un signal déjà calculé (`readinessSlide`, #493). Le gate reste
  `tight` × pic ; on regarde juste si la forme glisse **en plus**.
- **Chevauchement possible, prouvé** : `loadOverGoal` exige readiness `null || ≥ 50`, `readinessSlide`
  exige readiness `[50, 75[` → ils **peuvent** coïncider (readiness du jour dans [50, 75[). À
  l'inverse, `restOverGoal` (readiness < 50) ne croise **jamais** `readinessSlide` : c'est donc bien
  **`loadOverGoal` seul** que la pente pouvait renforcer.
- **Additif pur** : `loadOverGoalSlide` TOUJOURS renvoyé (`null` par défaut) ; branche `if/else` sur
  la seule chaîne de la note, action intacte, aucune autre branche touchée. Réemploi total
  (`loadOverGoal`, `readinessSlide` déjà branchés) — zéro nouvelle fonction pure.
- **Données réelles seulement** : exige l'ACWR en zone `high` (séances chiffrées sur 4 sem.), un
  objectif hebdo rendu serré par le calendrier, ET une vraie glissade de readiness (≥ 4 check-ins
  datés, chute ≥ 12 pts).

## Vérif

- `adaptiveCoachFocus` (logic.test.js, nouveau test) : jeudi 07-16, pic de charge + objectif 5
  (`tight`) + readiness en glissade 100→55 (-45 pts) → `loadOverGoalSlide === -45` + « ta forme glisse
  en parallèle (-45 pts) » + « deux signaux de fatigue qui se cumulent » + « la seule option saine »,
  et **plus** de « tempérer prime sur le chiffre » (registre remplacé) ; même pic + forme **stable**
  (63 constant) → `loadOverGoalSlide` null + note douce d'origine conservée ; pas de pic (charge
  régulière) + forme qui glisse → `loadOverGoal` et `loadOverGoalSlide` null.
- Check smoke bloquant `coachFocus` étendu : pic × serré × glissade → note ferme + `loadOverGoalSlide`
  chiffré ; pic × serré × forme stable → note douce + `loadOverGoalSlide` null.
- `cd src && xvfb-run -a npm run verify` : **487 tests + smoke 100 % vert**.

## Suite possible

- Symétrique côté FOCUS déjà noté (#504/#505) : `focusGoalPace === 'tight'` × fatigue — le focus
  fatigue moins le corps, à peser.
- 3ᵉ conflit du même patron : `sessionGoalPace === 'tight'` × pilier **DORMANT** (`reviveEligible`) —
  mais un dormant reçoit déjà un micro-pas, la tension y est moins nette.
- Le pendant POSITIF : `lowLoad` (sous-charge) × `readinessRebound` (forme qui remonte) × objectif
  serré → « c'est LE moment de pousser pour boucler l'objectif », deux feux verts concordants.
