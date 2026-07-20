# #579 — P5.2 : « Garde le rythme » ne survit plus un jour de pic où la séance est déjà faite (coach, build 2.0.200)

**Domaine : coach** · build 2.0.200 · curation (retrait d'une phrase contradictoire), aucun ajout.

## Rotation (§4 bis.3)

5 derniers domaines (avant cette boucle) = `a11y · docs · coach · athlete · fondations`
(#578 · #577 · #576 · #575 · #574).
- 2 derniers recaps = `a11y` (#578) + `docs` (#577) → **interdits**.
- `coach` : 1× dans les 5 derniers (#576) et **absent des 2 derniers** → **autorisé**.

Priorité de nuit #1 (coaching adaptatif, en QUALITÉ — §3) et rotation **convergent** cette boucle.
Piste **mûre, vérifiée et documentée** en #577 (mémoire `coach-leads-contradictions-2guards`) : le
fix de P5.2 attendait justement une boucle `coach`-ouverte. C'est celle-ci.

> Note : mon premier `grep "^Domaine :"` n'a renvoyé que 3 lignes car #577 et #575 étiquettent en
> italique (`_Domaine : …_`). Recompté à la lecture des recaps → `coach` bien autorisé.

## Le défaut (contradiction inter-panneaux mesurée par le fuzzer P5.2, recap #577)

Sur la carte « Le focus du moment », le ton `reinforce` écrit « … en hausse. **Garde le rythme.** »
— une injonction à continuer. Le strip #576 (`logic.js`, après le calcul de `loadSpike`) l'efface
quand la charge est en pic (ACWR zone `high`)… **mais seulement** sous la garde de **prescription**
sport (`logic.js:6300` : `pillar === 'sport' && !doneToday && readiness null/≥50`). `loadSpike` n'est
calculé que là.

Or le **Bilan hebdo** (`weeklyInsights`, `logic.js:2462`) calcule l'ACWR **inconditionnellement** et
affiche « 🟥 **Charge en pic (ACWR …)** : prévois une semaine plus légère » dès la zone `high`.

→ Un jour de pic **où la séance du jour est déjà faite** (`doneToday`), `loadSpike` reste `null`, le
strip #576 ne s'exécute pas, et « Garde le rythme. » **survit** dans le coach pendant que le Bilan
ordonne d'alléger. Et c'est le cas **le plus courant** : un jour de pic de charge est souvent un jour
où l'on vient justement de s'entraîner. `readiness < 50` était déjà couvert par le strip #573.

## Le fix (curation, pas ajout — §3)

Après le strip #576, un complément qui interroge l'ACWR **indépendamment** de la garde de
prescription, uniquement dans le trou résiduel (`loadSpike == null` + phrase encore présente) et
**pour le pilier sport** (`logic.js`, après l.6354) :

```js
if (tone === 'reinforce' && chosen.pillar === 'sport' && loadSpike == null
    && insight.indexOf(' Garde le rythme.') !== -1 && typeof acuteChronicRatio === 'function') {
  const acwr = acuteChronicRatio(s.workouts, todayKey);
  if (acwr && acwr.zone === 'high') insight = insight.replace(' Garde le rythme.', '');
}
```

**Pourquoi sport uniquement** (et non « indépendant de `pillar` » comme l'idée brute du recap #577 le
suggérait) : « Garde le rythme » est écrit pour le pilier `chosen` quel qu'il soit (`logic.js:5253`).
Sur un focus **non-sport** (sommeil, focus), l'injonction parle du rythme de **ce** pilier — pas de la
charge d'entraînement du Bilan hebdo. Le retirer là serait une **sur-curation** (on effacerait un
encouragement sommeil légitime). §4 ter — lire le rendu cumulé — tranche pour sport-only. La
contradiction mesurée en #577 était d'ailleurs un focus **sport** `reinforce` + `doneToday`.

Même source ACWR (`acuteChronicRatio(s.workouts, todayKey)`) et même seuil (`zone === 'high'`) que le
Bilan hebdo → les deux panneaux disent désormais la même chose, par construction. On ne recalcule
l'ACWR que dans le trou résiduel (rare), pas dans le chemin `!doneToday` déjà couvert par `loadSpike`.

## Contrôle de cohérence (§4 ter) — rendu cumulé coach + Bilan hebdo

État de pic `doneToday` (séance du jour + 4 séances lourdes récentes + 2 légères, ACWR 3,75) :

```
COACH   insight : « 5 jours actifs cette semaine, en hausse. Objectif hebdo : 1/3 séances … »  (plus de « Garde le rythme. »)
        action  : « Séance déjà faite aujourd'hui 💪 — verrouille avec 5 min d'étirements … »
BILAN   🟥 Charge en pic (ACWR 3.75) : prévois une semaine plus légère pour éviter la blessure.
```

Le coach ne **pousse** plus, son action est orientée récup, le Bilan alerte sur le pic : **cohérents**.
Le constat « en hausse » (stat hebdo vraie) reste. **Aucune note/champ ajouté** — une contradiction
de moins.

## Non-régression

- Montée **saine** un jour `doneToday` (charge régulière, ACWR non-`high`) → « Garde le rythme. »
  **conservé** (test dédié).
- `!doneToday` + pic → toujours géré par `loadSpike`/#576 (le nouveau bloc s'abstient, `loadSpike != null`).
- `readiness < 50` → toujours géré par le strip #573.
- Piliers non-sport → intacts (nouveau bloc gardé sur `pillar === 'sport'`).

+1 cas ajouté au test #576 (`reinforce × frein hors seuil`) : pic `doneToday` (retrait) + montée saine
`doneToday` (conservation), chacun avec son préalable `acuteChronicRatio(...).zone`. **532 tests +
smoke verts** (`coachFocus`, `weeklyInsights`, `coachCuration` verrouillés).

## Statut P5.2

Angle **coach ↔ Bilan hebdo** : la contradiction mesurée en #577 est désormais **corrigée**. Reste
l'angle **coach ↔ « Ma journée »** (`renderMyDay`/`upcomingKeyDates`, domaine `agenda`) — non encore
fuzzé. P5.2 **reste ouvert** sur ce dernier angle pour une future mesure.

Recap #579.

_Domaine : coach_
