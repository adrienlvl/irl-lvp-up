# 526 — Coaching : le coach voit enfin quand ta FORCE stagne (plateau du jour)

**Build 2.0.157 · boucle #526 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1)**

## Le manque

Le coach « Le focus du moment » (`adaptiveCoachFocus`, `logic.js`) savait, sur le pilier SPORT, dire
**DE** s'entraîner, **QUAND** (créneau `sportSlot`, #…) et depuis peu **QUOI** travailler (groupe le
plus reposé, `sportZoneFocus` #524). Mais rien ne regardait si la **charge PROGRESSE** vraiment. Or
l'app détecte déjà les plateaux : `strengthPlateauAny(workouts)` parcourt les exercices **chargés** les
mieux suivis, calcule leur **1RM estimé** séance après séance, et repère le premier dont la meilleure
valeur ne dépasse plus, sur les 3 dernières séances, celle d'avant la fenêtre. Cette intelligence ne
vivait que dans l'onglet Athlète (« Prochain bloc : change une variable ») — **jamais** dans le coach
quotidien. Répéter les mêmes séries sur un lift qui stagne n'apporte plus rien : c'est exactement l'axe
« adaptation aux **écarts** » demandé pour la nuit, sur une donnée d'entraînement réelle et personnelle.

## Ce qui est livré

Nouveau champ **`sportPlateau`** (`{ exercise, best }` ou `null`, **toujours** renvoyé). Quand le coach
pilote sur le SPORT et qu'un exercice chargé stagne, il **NOMME** le lift concerné et donne le geste de
surcharge progressive, **appendu à l'insight** (axe progression, distinct de l'action « quoi/quand ») :

> « Côté progression : ton **Squat** marque le pas — son 1RM estimé stagne autour de **116,5 kg** depuis
> 3 séances, sans nouveau record. Pour débloquer ça : ajoute une répétition à charge égale, ralentis la
> phase de descente, ou décharge une semaine avant de reprendre plus lourd. »

Réemploi total : `strengthPlateauAny` (+ `estimatedOneRmSeries`, `strengthPlateau`, `loggedExerciseNames`)
— **zéro** nouvelle fonction.

## Garde-fous & honnêteté

- **Gate de vraie séance**, comme `sportZoneFocus` : pilier SPORT · `!doneToday` · pas de spike de charge
  (`loadSpike == null`) · readiness pas au rouge (`null` ou ≥ 50).
- **Pilier en bonne santé exigé en plus** (`tone !== 'rebuild' && tone !== 'revive'`) : un plateau se lit
  sur des séances **récentes et régulières**, pas quand le sport est décroché (l'historique serait vieux,
  et le coach dit alors « rouvre la porte », pas « casse ton plateau »). Ce gate écarte aussi tout
  chevauchement avec le micro-pas (`microStep`, réservé à rebuild/revive).
- **Muet sans données** : aucun exercice chargé avec assez d'historique (`strengthPlateauAny` →
  `{ plateau:false }`) → note absente. Exercices au poids du corps (charge 0) ignorés.
- **Affine, ne remplace pas** : note appendue à l'insight, action du jour (créneau, groupe) intacte.
- **Vocabulaire distinct** (« marque le pas », « 1RM estimé stagne », « sans nouveau record ») → zéro
  collision regex avec `sportSlot` (« cale ta séance »), `sportZoneFocus` (« cible en priorité ») ni les
  guards récup (« socle invisible », « carburant », « matériau »). « plafonne » volontairement évité
  (déjà employé par les guards sommeil/protéine).

## Vérification

- Test `logic.test.js` dédié : plateau Squat nommé + geste concret ; force en progression → `null` ;
  sport dormant (revive) → `null` (historique trop vieux) ; séance faite → `null` ; poids du corps →
  `null` ; autre pilier → `null`.
- Check smoke **bloquant** `coachFocus` étendu : plateau Squat nommé dans l'insight + progression → muet.
- `cd src && xvfb-run -a npm run verify` → **100 % vert** (504 tests node, SMOKE OK, EXIT=0).
