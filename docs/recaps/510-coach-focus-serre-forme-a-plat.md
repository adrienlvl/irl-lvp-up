# 510 — Coaching : l'objectif focus serré et la forme à plat se réconcilient (2.0.141)

**Boucle #510 · build 2.0.141 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

#509 a nommé l'**alignement** côté FOCUS (`focusGoalFresh` : objectif hebdo de minutes SERRÉ ×
readiness du jour AU VERT → « fonce, tout s'aligne »). Mais il a laissé ouvert le **CONFLIT
symétrique et opposé** : le même objectif serré (« cale un vrai bloc d'~90 min aujourd'hui ») ALORS
QUE la readiness du matin est au **PLANCHER** (< 50 — l'esprit épuisé).

C'est le **pendant EXACT et OPPOSÉ de `focusGoalFresh`**, et le **symétrique côté FOCUS de
`restOverGoal`** (#504, sport serré × forme à plat → la récup prime). Le fil sport avait ses deux
faces : conflit (`restOverGoal`, `loadOverGoal…`) ET alignement (`lowLoadUnderGoal…`). Côté focus,
seule la face POSITIVE (l'alignement) existait — un jour où le calendrier réclame un gros bloc mais
où la tête est vide (nuit courte, fatigue, courbatures), le coach ne disait rien, laissant croire
qu'il fallait s'acharner. Or un cerveau épuisé ne produit pas de deep work : forcer un gros bloc
empile des minutes creuses qui n'avancent pas vraiment l'objectif et creusent la fatigue.

## Ce qui a été livré

Dans la branche `focusGoalPace === 'tight'` (pilier focus), en **`else if`** de `focusGoalFresh` :
quand — et **seulement** quand — un check-in de récup **daté du jour** met la readiness au plancher
(score < 50, le **même seuil** que le feu rouge sport « récupération prioritaire »), une note est
**appendue** à l'insight :

> Mais ta forme est à plat ce matin (readiness 40/100) : un cerveau fatigué ne produit pas un vrai
> bloc profond, et t'acharner empilerait des minutes creuses sans avancer l'objectif. Un focus court
> et facile aujourd'hui, soigne ta récup — l'esprit frais rattrapera ces minutes bien plus vite.

Nouveau champ **`focusGoalDrained`** (le score de readiness, ou `null`). L'insight focus (compteur,
allure, minutes/jour) reste **intact** — la note ne fait qu'ajouter la lecture « corps ».

## Conception

- **Le pendant EXACT et OPPOSÉ de `focusGoalFresh`** : même patron (note appendue à l'insight sur le
  gate `focusGoalPace === 'tight'`, readiness du jour local déjà en main), seuil inversé. Là où
  `focusGoalFresh` célébrait la fenêtre (≥ 75, esprit frais → fonce), `focusGoalDrained` désamorce le
  conflit (< 50, esprit vide → protège). C'est l'« adaptation aux écarts » demandée pour la nuit,
  appliquée au conflit focus le plus piégeux (le calendrier qui pousse quand la tête dit stop).
- **Nuance focus vs sport** : côté sport, `restOverGoal` dit « mieux vaut manquer LA séance et
  laisser l'objectif glisser » (rater une date coûte une séance). Côté focus, les minutes
  **s'accumulent** — pas de date perdue : le message porte sur la QUALITÉ (un bloc profond exige une
  tête fraîche) et la récupération rapide (« l'esprit frais rattrapera ces minutes bien plus vite »).
- **Mutuellement exclusif, prouvé** : `focusGoalDrained` (< 50) XOR `focusGoalFresh` (≥ 75) par le
  seuil. Zone médiane [50, 75[ → ni l'un ni l'autre (ni feu vert ni conflit, rien à souligner). Et,
  comme `focusGoalFresh`, il vit dans la branche `chosen.pillar === 'focus'` → jamais avec les notes
  sport (`restOverGoal`/`lowLoadUnderGoal`, branche `'sport'`).
- **Additif pur** : `focusGoalDrained` TOUJOURS renvoyé (`null` par défaut) ; note appendue, insight
  et toutes les autres branches intactes. Réemploi total (`readinessScore`, `s.recovery`, le `rs`
  déjà calculé pour `focusGoalFresh`) — zéro nouvelle fonction pure.
- **Données réelles seulement** : exige un check-in de récup **du jour même** (une readiness d'hier ne
  dit rien de la fatigue d'aujourd'hui) ET un objectif focus rendu serré par le calendrier.

## Vérif

- `adaptiveCoachFocus` (logic.test.js, test « allure focus » étendu) : dimanche 07-19, 90 min pour 1
  jour → `tight` ; recovery du jour au plancher (sleep 5/fatigue 4/soreness 4 → 40) →
  `focusGoalDrained === 40` + « ta forme est à plat ce matin (readiness 40/100) » + « focus court et
  facile aujourd'hui », `focusGoalFresh` null ; zone médiane (sleep 6/fatigue 3/soreness 3 → 60) →
  `focusGoalFresh` ET `focusGoalDrained` null ; objectif `onpace` → les deux null.
- Check smoke bloquant `coachFocus` étendu : focus serré × readiness 40 le jour même → note « à plat »
  + `focusGoalDrained === 40`, pas de feu vert ; focus serré × readiness 60 → les deux null.
- `cd src && xvfb-run -a npm run verify` : **488 tests + smoke 100 % vert**.

## Suite possible

- Le **compound côté focus** (le pendant de #508 `lowLoadUnderGoalRebound`, mais côté rouge) :
  `focusGoalDrained` ET une readiness qui **glisse** franchement (`readinessSlide`) le même jour —
  deux signaux de fatigue qui se cumulent, comme `loadOverGoalSlide` côté sport. Mais côté focus la
  pente de readiness n'est pas encore croisée (elle ne l'est que sur pilier sport). Chantier plus lourd.
- Le 3ᵉ conflit du même patron, resté ouvert depuis #507/#508/#509 : `sessionGoalPace === 'tight'` ×
  pilier **DORMANT** (`reviveEligible`) — mais un dormant reçoit déjà un micro-pas, la tension y est
  moins nette.
