# 500 — Coaching : le coach chiffre la cible calorique du plateau (2.0.131)

**Boucle #500 · build 2.0.131 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

Depuis #499, quand le pilier poussé est la NUTRITION, `adaptiveCoachFocus` lit la **pente de poids**
(`weightPace`) et alerte quand la balance CALE — plateau (« ne descend plus ») ou dérive (« repartent
à la hausse »). Mais l'action restait **qualitative** : « baisse un peu tes calories ou ajoute du
cardio ». Or l'app **sait déjà chiffrer** le geste : la carte « Coach Poids » branche `calorieAdjustment`
(fenêtre ~14 j, plancher calorique) et affiche « Nouvelle cible : 2126 kcal/j ». Le focus du jour, lui,
restait vague — alors que c'est la surface la plus lue. C'était la **première « Suite possible » de #499**
(« citer la cible calorique concrète proposée plutôt qu'un conseil qualitatif »).

## Ce qui a été livré

La branche « hors-piste » de la pente de poids (plateau **et** dérive, `wt.onTrack === false`) cite
désormais le **NOMBRE exact** quand la stagnation est **confirmée sur ~14 j** — nouveau champ
**`calorieTarget`** (kcal/j, ou `null`). On calcule le plan calorique du jour (`energyPlan` depuis le
profil ; poids récent = `wt.current`, déjà en main) puis on interroge `calorieAdjustment` :

- **plateau / dérive, marge sous la cible** (`adj.delta > 0`) → cible chiffrée :
  > … Mais la balance ne descend plus (0 kg/sem sur tes dernières pesées) — vise ~2126 kcal/j (environ
  > 125 de moins) ou ajoute du cardio pour relancer. _(en prise : « environ 125 de plus … pour relancer
  > la prise »)_

- **déjà au plancher calorique** (`adj.delta === 0`) → réorientation honnête, pas d'énième baisse :
  > … — tu es déjà au plancher calorique (~1102 kcal/j), relance par le cardio ou plus d'activité
  > plutôt qu'une nouvelle baisse.

- **profil incomplet** (BMR incalculable → `energyPlan` null) ou **14 j non confirmés** → on **garde le
  conseil qualitatif** d'avant, `calorieTarget` reste `null`.

## Conception

- **Réemploi, zéro duplication** : `energyPlan` + `calorieAdjustment`, deux fonctions pures déjà
  branchées côté Coach Poids, produisent **le même chiffre** que la carte poids — le coach ne
  recalcule rien de neuf, il relaie le nombre là où on le lit vraiment.
- **Additif pur** : `calorieTarget` TOUJOURS renvoyé (null par défaut) ; seule la **queue** du message
  plateau/dérive change quand le chiffre existe ; l'action (protéines / collation) reste **intacte**.
- **Deux fenêtres, deux rôles honnêtes** : `weightTrend` (6 pesées) DÉCLENCHE l'alerte de pente ;
  `calorieAdjustment` (14 j, critères propres) ne CHIFFRE que si **lui aussi** confirme — sinon on ne
  fabrique pas un nombre que la fenêtre longue ne soutient pas, on reste qualitatif.
- **Adapté au sens de l'objectif** (`wp.direction`) : « de moins » en perte, « de plus » en prise,
  jamais l'inverse. `plan.goal` doit concorder (`maintien` → pas de chiffre).
- **Plancher respecté** : `calorieAdjustment` borne déjà la baisse au plancher (1200 kcal) et renvoie
  `delta === 0` → on bascule sur le cardio au lieu d'annoncer une baisse illusoire.

## Vérif

- `adaptiveCoachFocus` (logic.test.js, nouveau test) : plateau + profil → `calorieTarget` numérique +
  « vise ~N kcal/j (environ N de moins) », plus de message vague ; dérive + profil → même chiffrage ;
  prise + profil → « de plus » ; petit gabarit → « plancher calorique … cardio » ; sans profil →
  `calorieTarget` null + message qualitatif conservé. Les tests #499 (sans profil) inchangés.
- Check smoke bloquant `coachFocus` étendu : plateau + profil complet → `calorieTarget > 0` +
  « vise ~N kcal/j (environ N de moins) ou ajoute du cardio » ; sans profil → `calorieTarget` null.
- `cd src && xvfb-run -a npm run verify` : **479 tests + smoke 100 % vert**.

## Suite possible

- Croiser `calorieTarget` avec l'adhérence protéines réelle du jour : si les calories sont déjà basses
  MAIS la cible protéines n'est jamais atteinte, prioriser « mange tes protéines » avant « baisse les
  calories » (ne pas creuser un déficit sur un régime déjà pauvre en protéines).
- Citer aussi le geste **cardio** chiffré (min/sem) quand on est au plancher, pas seulement « ajoute du
  cardio » — réemployer `energyPlan`/TDEE pour estimer les kcal à brûler.
- Étendre la conscience de pente au dernier angle nutrition encore ponctuel : série de jours à la cible
  protéines qui monte/descend (au-delà du seul résultat balance), pendant de `focusMinutesTrend`.
