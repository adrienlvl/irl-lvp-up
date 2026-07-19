# 504 — Coaching : la récup passe avant l'objectif serré quand le corps dit stop (2.0.135)

**Boucle #504 · build 2.0.135 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

On **varie le domaine** après focus (#503) et cinq boucles nutrition : le **SPORT**. Le coach « Le
focus du moment » sait déjà deux choses le même jour, mais **sans jamais les croiser** :

- l'**allure de l'objectif hebdo de séances** (`sessionGoalPace`) — quand elle est **serrée**, l'insight
  dit « Serré mais jouable : 3 séances pour 3 jours restants — **il en faut une chaque jour** pour tenir
  l'objectif » ;
- la **forme du jour** (`readiness`) — quand elle est **au plancher** (< 50), l'action dit « readiness
  15/100 — **récupération prioritaire** : mobilité/marche plutôt qu'une grosse séance aujourd'hui ».

Réunies le même jour, ces deux consignes se **contredisent frontalement** : *pousse une séance chaque
jour* d'un côté, *repose-toi aujourd'hui* de l'autre. Le coach parlait des deux coins de la bouche — un
**bug de crédibilité** exactement du type que le reste du module évite avec soin (« le pire bug d'un
coach : radoter un ordre déjà exécuté / se contredire »).

## Ce qui a été livré

Une **réconciliation** dans le bloc readiness (qui s'exécute juste après le calcul de `sessionGoalPace`,
donc y a accès). Quand — et **seulement** quand — l'allure est **`tight`** ET la readiness du jour
**< 50**, le coach **tranche honnêtement** : la récup prime sur le chiffre. Note **appendue** à l'insight,
sous la phrase « il en faut une chaque jour » qu'elle vient nuancer :

> Mais ta forme est à plat aujourd'hui (readiness 15/100) : la récup prime sur le chiffre — mieux vaut
> manquer la séance du jour et laisser l'objectif glisser que de forcer sur une réserve vide, tu repars
> plus fort.

Nouveau champ **`restOverGoal`** (le score du jour, ou `null`). L'action de récup (« mobilité/marche »)
reste **intacte** — la note ne fait que réconcilier l'insight avec elle.

## Conception

- **Un seul conflit, précis** : gate `sessionGoalPace === 'tight'` × `readiness < 50`. Les autres allures
  n'ont **aucune pression à désamorcer** — `'unreachable'` dit déjà « pas un échec, repars plein lundi »,
  et `'onpace'` a de la marge (pas de « une chaque jour »). Idem readiness ≥ 50 : l'action ne réclame pas
  de repos, aucune contradiction.
- **Priorisation intelligente** (« quoi faire en premier aujourd'hui », demande de la nuit) appliquée au
  conflit le plus piégeux : le **calendrier qui pousse** quand le **corps dit stop**. Le coach choisit la
  récup — rater une séance vaut mieux qu'une blessure ou une forme qui s'enfonce (« adaptation aux
  écarts »).
- **Additif pur** : `restOverGoal` TOUJOURS renvoyé (`null` par défaut) ; note appendue, action intacte,
  aucune autre branche touchée. Réemploi total (`sessionGoalPace`, `readinessScore` déjà branchés) — zéro
  duplication, zéro nouvelle fonction pure.
- **Données réelles seulement** : exige un check-in **daté du jour** (readiness) ET un objectif hebdo
  défini rendu serré par le calendrier — jamais de note fabriquée.

## Vérif

- `adaptiveCoachFocus` (logic.test.js, nouveau test) : vendredi 07-17, 3 séances pour 3 j (tight) +
  readiness 15 → `restOverGoal === 15` + « ta forme est à plat aujourd'hui (readiness 15/100) » + « la
  récup prime sur le chiffre », action « récupération prioritaire » intacte ; forme au vert le même jour
  serré → `restOverGoal` null, aucune note ; forme à plat mais allure large (mardi, onpace) → `restOverGoal`
  null (pas de conflit).
- Check smoke bloquant `coachFocus` étendu : conflit tight × readiness 15 chiffré + forme au vert → null.
- `cd src && xvfb-run -a npm run verify` : **485 tests + smoke 100 % vert**.

## Suite possible

- Étendre la réconciliation au conflit **`loadSpike` × objectif serré** : un pic de charge aigu (ACWR
  haut) réclame déjà d'alléger — même tension avec « une séance chaque jour ». Le coach pourrait trancher
  pareil (tempérer prime sur le chiffre) même sans check-in readiness du jour.
- Symétrique côté FOCUS : `focusGoalPace === 'tight'` croisé avec une readiness/fatigue à plat — mais le
  focus fatigue moins le corps, à peser (le conflit y est moins net).
- Croiser `restOverGoal` avec la **pente de readiness** (`readinessSlide`) : une forme à plat **isolée**
  (un mauvais jour) n'appelle pas tout à fait le même mot qu'une forme à plat **dans une glissade** (fatigue
  qui s'installe → là, lâcher l'objectif hebdo est encore plus clairement le bon choix).
