# 527 — Coaching : le coach salue et PROJETTE quand ta force monte (progression du jour)

**Build 2.0.158 · boucle #527 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1)**

## Le manque

À la boucle #526, le coach « Le focus du moment » (`adaptiveCoachFocus`, `logic.js`) a appris à voir
quand ta force **STAGNE** : `sportPlateau` nomme un lift chargé qui plafonne et donne le geste pour
débloquer. Mais c'était l'axe « adaptation aux **écarts** » seulement. Il manquait le **pendant
positif** : reconnaître une force qui **MONTE** et **PROJETER** où elle mène — l'axe « adaptation
dynamique aux **progrès** » explicitement demandé pour la nuit. Or l'app calcule déjà cette prévision :
`bestStrengthForecast(workouts)` parcourt les exercices **chargés** les mieux suivis, estime le gain de
**1RM par semaine** (première → dernière séance) et le nombre de semaines jusqu'au **prochain palier
rond**. Cette intelligence ne vivait que dans l'onglet Athlète (carte « bloc », ligne 🎯) — **jamais**
dans le coach quotidien.

## Ce qui est livré

Nouveau champ **`sportProgress`** (`{ exercise, current, milestone, weeks, perWeek }` ou `null`,
**toujours** renvoyé). Quand le coach pilote sur le SPORT et qu'un exercice chargé grimpe vraiment, il
**NOMME** le lift, son 1RM estimé, sa pente hebdo et surtout l'**ETA au prochain palier**, **appendu à
l'insight** (axe progression) :

> « Sur ta lancée : ton **Squat** gagne du terrain — 1RM estimé à **128,5 kg** (+**12,65 kg/sem**). À ce
> rythme, tu passes la barre des **130 kg** dans **~1 semaine** — garde ce cap de surcharge progressive. »

Un chiffre nu devient un objectif motivant et daté. Réemploi total : `bestStrengthForecast` (+
`strengthForecast`, `estimatedOneRmSeries`, `nextStrengthMilestone`, `dateAfterWeeks`) — **zéro**
nouvelle fonction.

## Garde-fous & honnêteté

- **Même gate de vraie séance** que `sportPlateau` : pilier SPORT · `!doneToday` · pas de spike de charge
  (`loadSpike == null`) · readiness pas au rouge (`null` ou ≥ 50) · pilier en bonne santé
  (`tone !== 'rebuild' && tone !== 'revive'` : une pente se lit sur des séances récentes, pas quand le
  sport est décroché → le coach dit alors « rouvre la porte »).
- **Exclusion mutuelle stricte** avec `sportPlateau` : la note ne parle que si `sportPlateau == null`.
  Jamais « ça stagne » **et** « ça grimpe » dans le même insight — la **correction** du plateau prime
  (cohérent avec la priorité du coach au problème à régler).
- **Muet sans données** : aucun exercice chargé avec une **pente positive nette** (`bestStrengthForecast`
  → `null`) → note absente. Exercices au poids du corps (charge 0) ignorés.
- **Affine, ne remplace pas** : note appendue à l'insight, action du jour (créneau, groupe) intacte.
- **Vocabulaire distinct** (« gagne du terrain », « passes la barre des », « cap de surcharge
  progressive ») → zéro collision regex avec `sportPlateau` (« marque le pas »), `sportZoneFocus`
  (« cible en priorité »), `sportSlot` (« cale ta séance ») ni les guards récup. « grimpe » réservé
  ici au SPORT ; les notes nutrition (« régularité grimpe », « l'eau grimpe ») sont sur le pilier
  nutrition → jamais dans le même insight.

## Vérification

- Test `logic.test.js` dédié : Squat qui monte → lift nommé, `current`=128,5, `milestone`=130,
  `weeks`=1, palier projeté ; plateau → `sportProgress` null (exclusion mutuelle) ; sport dormant
  (revive) → null ; séance faite → null ; poids du corps → null ; autre pilier → null.
- Check smoke **bloquant** `coachFocus` étendu : progression Squat nommée + palier projeté dans
  l'insight, plateau → note de progression muette.
- `cd src && xvfb-run -a npm run verify` → **100 % vert** (505 tests node, SMOKE OK, EXIT=0).
