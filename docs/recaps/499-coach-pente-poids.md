# 499 — Coaching : le coach lit la PENTE de ton poids (2.0.130)

**Boucle #499 · build 2.0.130 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

Quand le pilier poussé est la NUTRITION, `adaptiveCoachFocus` relie déjà la discipline du jour au
**résultat corporel** via `weightGoalProgress` (`weightGoalPct`) : « 50 % de ton objectif de perte
atteint (3 kg sur 6) ». Mais ce chiffre est un **cumul depuis le départ** — un état des lieux
**aveugle à la DIRECTION du moment**. Deux « 50 % » n'appellent pas le même mot selon que la balance
**progresse encore** (garder le cap, projeter une arrivée) ou **stagne / repart** — le **plateau
classique**, où le pourcentage global rassure à tort alors que les dernières pesées ne bougent plus.
C'était le dernier pilier du coach dont l'enrichissement restait purement **ponctuel** : le SPORT lit
la pente de forme (`readinessSlide`/`readinessRebound`) et de charge (`loadSpike`/`lowLoad`), le
SOMMEIL celle de durée (`sleepDurationTrend`) et de régularité du coucher (`bedtimeRegularityTrend`),
le FOCUS celle du volume (`focusMinutesTrend`, #498). La NUTRITION avait le cumul, pas la pente.

## Ce qui a été livré

La branche nutrition lit désormais **`weightTrend(s.weights, tgtW)`** — fonction pure **déjà
existante** (rythme kg/sem sur les 6 dernières pesées, direction, `onTrack`, `weeksToTarget`) — et
**NUANCE l'insight** selon la trajectoire réelle (nouveau champ **`weightPace`** = kg/sem, ou `null`) :

- **sur la bonne pente, ETA courte** (`onTrack` + `weeksToTarget ≤ 26`) → **crédit projeté** :
  > … À ton rythme récent (0,49 kg/sem), tu touches ta cible dans ~6 semaines — tiens le cap.

- **bonne pente mais horizon lointain** (`weeksToTarget > 26`) → crédit de **direction** sans ETA
  irréaliste :
  > … Et tes dernières pesées vont dans le bon sens (0,06 kg/sem) — tiens le cap, le résultat suit.

- **plateau** (`onTrack` faux, direction plate) → **alerte calories**, orientée par le sens de
  l'objectif :
  > … Mais la balance ne descend plus (0 kg/sem sur tes dernières pesées) — baisse un peu tes calories
  > ou ajoute du cardio pour relancer. _(en prise : « ne monte plus … ajoute un peu de calories »)_

- **dérive** (`onTrack` faux, mauvais sens) → **alerte recadrage** :
  > … Mais tes dernières pesées repartent à la hausse (+0,21 kg/sem) — resserre tes calories pour
  > reprendre la perte. _(en prise : « repartent à la baisse … remonte tes calories »)_

## Conception

- **Additif pur** : `weightPace` (kg/sem, ou `null`) TOUJOURS renvoyé ; la NOTE est **appendue** à
  l'insight (après le compteur de progression cumulée) ; l'action (protéines / collation) **intacte**.
- **Deux axes distincts, pas de contradiction** : le ton du pilier juge l'**habitude nutrition**, la
  note juge le **résultat balance**. Un « ça paie (50 %) » + « mais ça stagne maintenant » n'est pas
  contradictoire — c'est le plateau, honnête et actionnable (le cas de valeur).
- **Adapté au sens de l'objectif** : messages distincts perte / prise (`wp.direction`), jamais un
  « resserre tes calories » sur un objectif de prise.
- **Réemploi** : `weightTrend`, déjà pure et testée, n'est pas dupliquée — seule la lecture côté coach
  est neuve. `weightGoalProgress` (cumul) et `calorieAdjustment` (plateau 14 j, autre surface) restent
  intacts.
- **Données réelles seulement** : ≥ 2 pesées exploitables (`weightTrend` renvoie `null` sinon) et un
  objectif de poids ; sinon `weightPace` reste `null` et rien n'est ajouté.

## Vérif

- `adaptiveCoachFocus` (logic.test.js) : ETA courte (85→82, ~6 sem, `weightPace -0.49`), plateau
  (50 % + « ne descend plus », `weightPace 0`), dérive (« repartent à la hausse (+0,21) »), horizon
  lointain (« bon sens … résultat suit », pas d'ETA chiffrée), prise stagnante (« ne monte plus …
  ajoute des calories »), 1 pesée / sans objectif → `weightPace null`, aucune note.
- Check smoke bloquant `coachFocus` étendu : ETA dans l'insight + `weightPace`, cas plateau, champ
  `null` sans objectif.
- `cd src && xvfb-run -a npm run verify` : **478 tests + smoke 100 % vert**.

## Suite possible

- Croiser `weightPace` avec `calorieAdjustment` : quand le plateau est confirmé sur 14 j, citer la
  cible calorique concrète proposée (« ~125 kcal de moins ») plutôt qu'un conseil qualitatif.
- Croiser `weightPace` (poids) avec `measurementRecentDelta` (tour de taille) : un poids qui stagne
  mais un tour de taille qui baisse = recomposition, pas un vrai plateau — nuancer le « ne descend
  plus » pour ne pas décourager à tort.
- Étendre la même conscience de pente au pilier nutrition côté **adhérence protéines** (série de jours
  sur cible qui monte/descend), au-delà du seul résultat balance.
</content>
</invoke>
