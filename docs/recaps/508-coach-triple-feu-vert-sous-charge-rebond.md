# 508 — Coaching : le triple feu vert (sous-charge × objectif serré × forme qui rebondit) (2.0.139)

**Boucle #508 · build 2.0.139 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

C'est la **2ᵉ « Suite possible » de #507**, mise en œuvre : le **pendant POSITIF exact** du compound
`loadOverGoalSlide` (#506, côté PIC).

Le fil #504→#507 a construit deux compounds symétriques dans la même branche sport :

- **Côté ROUGE** (#506) : le conflit `loadOverGoal` (pic de charge × objectif serré) durcit de registre
  quand, EN PLUS, la forme **glisse** (`readinessSlide`) → `loadOverGoalSlide` : **deux signaux de fatigue
  qui se cumulent**, pas deux lectures d'un même instant.
- **Côté VERT** (#507) : l'alignement `lowLoadUnderGoal` (sous-charge × objectif serré) nomme **deux feux
  verts** — le calendrier presse ET le corps a de la marge.

Mais côté vert, le compound manquait. Quand la sous-charge coïncide avec une forme qui **remonte**
franchement (`readinessRebound`, déjà calculé plus haut : +≥12 pts sur ≥4 check-ins), ce n'est plus « charge
basse + calendrier qui presse » (deux lectures d'un même moment) mais **trois signaux de fraîcheur
concordants qui se cumulent** — et la note à « deux signaux » sous-vendait cette fenêtre exceptionnelle.

## Ce qui a été livré

Dans le bloc `lowLoad`, quand — et **seulement** quand — l'alignement `tight` × sous-charge est déjà retenu
ET que `readinessRebound` n'est pas nul, la note appendue **s'enthousiasme et nomme les trois signaux** :

> Et bonne nouvelle : cette cadence serrée tombe pile — ta charge n'est qu'à 0,6× ton volume habituel ET ta
> forme remonte franchement (+30 pts sur tes derniers check-ins) : trois feux verts concordants (charge basse,
> forme qui rebondit, calendrier qui presse), pas un hasard — c'est LE moment de pousser pour boucler
> l'objectif, ton corps est prêt.

Nouveau champ **`lowLoadUnderGoalRebound`** (le delta positif de la remontée, ou `null`). Sans remontée, la
note à **deux signaux** de #507 est conservée à l'identique. L'action de sous-charge (« Fenêtre idéale » /
« Tu es en sous-charge ») reste **intacte**.

## Conception

- **Le pendant POSITIF EXACT de `loadOverGoalSlide`** : même patron (compound qui module le registre d'une
  note existante selon un second signal de tendance déjà calculé), signal inversé. Là où le côté rouge
  cumulait deux fatigues pour **durcir**, le côté vert cumule deux fraîcheurs pour **enthousiasmer**.
- **Renfort, pas nouveau cas** : on ne déclenche rien de neuf — on module la note de #507 selon
  `readinessRebound` (#494), déjà branché dans la même branche sport.
- **Compatible par construction, prouvé** : le bloc `lowLoad` exige `readinessSlide == null` (ligne 5713) ET
  `readinessRebound` exige direction `'up'` (slide XOR rebound, une pente à la fois) → `readinessRebound`
  **peut** être non nul ici. C'est donc bien `lowLoadUnderGoal` que le rebond pouvait renforcer.
- **Additif pur** : `lowLoadUnderGoalRebound` TOUJOURS renvoyé (`null` par défaut) ; branche `if/else` sur la
  seule chaîne de la note, action intacte, aucune autre branche touchée. Réemploi total (`lowLoad`,
  `sessionGoalPace`, `readinessRebound` déjà branchés) — zéro nouvelle fonction pure.
- **Données réelles seulement** : exige l'ACWR en zone `low` (séances chiffrées sur 4 sem.), un objectif hebdo
  rendu serré par le calendrier, ET une vraie remontée de readiness (≥ 4 check-ins datés, hausse ≥ 12 pts).

## Vérif

- `adaptiveCoachFocus` (logic.test.js, test #507 étendu) : jeudi 07-16, sous-charge + objectif 5 (`tight`) +
  readiness en remontée 40→70 (+30 pts) → `lowLoadUnderGoalRebound === 30` + « ta forme remonte franchement
  (+30 pts) » + « trois feux verts concordants », et **plus** de « Les deux signaux s'alignent » (registre
  remplacé) ; sous-charge + serré **sans** recovery → `lowLoadUnderGoalRebound` null + note à deux signaux
  d'origine conservée ; action « Fenêtre idéale » intacte.
- Check smoke bloquant `coachFocus` étendu : sous-charge × serré × rebond → note « trois feux verts » +
  `lowLoadUnderGoalRebound === 30` ; sous-charge × serré sans rebond → `lowLoadUnderGoalRebound` null + « Les
  deux signaux s'alignent ».
- `cd src && xvfb-run -a npm run verify` : **488 tests + smoke 100 % vert**.

## Suite possible

- Symétrique côté FOCUS, resté ouvert (#507) : `focusGoalPace === 'tight'` × readiness au vert (esprit frais)
  — le focus n'a pas d'ACWR, mais une forme au vert pourrait jouer le rôle du « feu vert corps ».
- Le 3ᵉ conflit du même patron, resté ouvert : `sessionGoalPace === 'tight'` × pilier **DORMANT**
  (`reviveEligible`) — mais un dormant reçoit déjà un micro-pas, la tension y est moins nette.
