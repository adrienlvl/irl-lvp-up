# 507 — Coaching : l'objectif serré et la sous-charge s'alignent (2.0.138)

**Boucle #507 · build 2.0.138 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

C'est le **pendant POSITIF** listé en « Suite possible » de #506, mis en œuvre : le symétrique exact et
**opposé** de `loadOverGoal`.

Toute la lignée #504→#506 traitait des **conflits** entre l'objectif hebdo serré et le corps :

- #504 `restOverGoal` : serré × forme du jour à plat → la récup prime, lâche l'objectif.
- #505 `loadOverGoal` : serré × **pic** de charge → tempérer prime, lâche l'objectif.
- #506 `loadOverGoalSlide` : le même pic **pendant que la forme glisse** → registre durci.

À chaque fois, l'objectif serré **contredisait** un signal du corps, et le coach tranchait en faveur du
corps. Mais le coach ne savait pas reconnaître le cas INVERSE : quand l'objectif serré et le corps
**tirent dans le même sens**. Le bloc `lowLoad` (#494, sous-charge : « ton corps a de la marge pour
remonter ») s'exécute pourtant **après** le calcul de `sessionGoalPace`, sans jamais le croiser. Résultat :
un jour où l'insight dit « il en faut une chaque jour pour tenir l'objectif » ET où la charge est en
sous-charge (donc le corps peut absolument encaisser cette cadence), le coach ne le **nommait pas** — il
ratait une occasion de dire « fonce, tout s'aligne ».

## Ce qui a été livré

Dans le bloc `lowLoad` (zone ACWR `low`), quand — et **seulement** quand — la sous-charge est détectée ET
`sessionGoalPace === 'tight'`, une note est **appendue** à l'insight (exactement comme `loadOverGoal`,
mais positive) :

> Et bonne nouvelle : cette cadence serrée tombe pile — ta charge n'est qu'à 0,6× ton volume habituel, ton
> corps a toute la marge pour enchaîner ces séances sans risque. Les deux signaux s'alignent : c'est LE
> moment de pousser pour boucler l'objectif.

Nouveau champ **`lowLoadUnderGoal`** (le ratio ACWR, ou `null`). L'action de sous-charge (« Tu es en
sous-charge » / « Fenêtre idéale ») reste **intacte** — la note ne fait qu'ajouter la lecture calendrier.

## Conception

- **Le pendant EXACT et OPPOSÉ de `loadOverGoal`** : même patron (note appendue à l'insight sur le gate
  `sessionGoalPace === 'tight'`), signal inversé. Là où le pic (zone `high`) créait un **conflit** que le
  coach désamorçait, la sous-charge (zone `low`) crée un **alignement** que le coach célèbre. C'est
  l'« adaptation aux progrès » demandée par la nuit, appliquée à la priorisation.
- **Mutuellement exclusif, prouvé** : `lowLoadUnderGoal` exige ACWR zone `low`, `loadOverGoal` exige zone
  `high` (une seule zone à la fois) → jamais les deux. Et `restOverGoal` exige readiness < 50 quand ce
  bloc exige readiness `null || ≥ 50` → jamais avec lui non plus. Aucune superposition de notes possible.
- **Un seul cas, précis** : gate `tight` × sous-charge. `'unreachable'`/`'onpace'` n'ont pas de cadence
  quotidienne serrée à soutenir — aucune opportunité à souligner.
- **Additif pur** : `lowLoadUnderGoal` TOUJOURS renvoyé (`null` par défaut) ; note appendue, action et
  toutes les autres branches intactes. Réemploi total (`lowLoad`, `sessionGoalPace` déjà branchés) — zéro
  nouvelle fonction pure.
- **Données réelles seulement** : exige des séances **chiffrées** (durée × effort > 0 sur 4 sem., sinon
  l'ACWR est `null`) ET un objectif hebdo rendu serré par le calendrier.

## Vérif

- `adaptiveCoachFocus` (logic.test.js, nouveau test) : jeudi 07-16, 1 séance dans la semaine (07-13) +
  objectif 5 → `tight`, charge en sous-charge → `lowLoadUnderGoal === lowLoad` (< 0,8) + « cette cadence
  serrée tombe pile » + « LE moment de pousser pour boucler l'objectif », action « Tu es en sous-charge »
  intacte ; objectif large (2 → `onpace`) + sous-charge → `lowLoadUnderGoal` null ; sous-charge sans
  objectif → null ; objectif serré mais charge régulière → `lowLoad` null → `lowLoadUnderGoal` null.
- Check smoke bloquant `coachFocus` étendu : serré × sous-charge → note + `lowLoadUnderGoal` chiffré ;
  large × sous-charge → null.
- `cd src && xvfb-run -a npm run verify` : **488 tests + smoke 100 % vert**.

## Suite possible

- Symétrique côté FOCUS déjà noté (#504/#505) : `focusGoalPace === 'tight'` × un signal de fraîcheur — le
  focus n'a pas d'ACWR, mais une forme (readiness) au vert pourrait jouer le rôle du « feu vert corps ».
- Le double feu vert **renforcé** : `lowLoadUnderGoal` ET `readinessRebound` le même jour (forme qui
  remonte + charge basse + objectif serré) — trois signaux concordants, un mot encore plus enthousiaste.
- Le 3ᵉ conflit du même patron, resté ouvert : `sessionGoalPace === 'tight'` × pilier **DORMANT**
  (`reviveEligible`) — mais un dormant reçoit déjà un micro-pas, la tension y est moins nette.
