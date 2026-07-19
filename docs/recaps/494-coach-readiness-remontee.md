# 494 — Coaching : le coach repère la forme qui remonte (2.0.125)

**Boucle #494 · build 2.0.125 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

Le build précédent (#493) a appris au coach à repérer la **fatigue qui s'installe** (`readinessSlide`) :
une readiness du jour « correcte » (50-74) mais qui **glisse** check-in après check-in. Il manquait le
**symétrique positif**, explicitement listé en « Suite possible » de #493 : la readiness du jour dans la
**même zone [50, 75[** mais qui **remonte** franchement. Là, l'action générique — « séance correcte,
mais garde une marge : pas de record aujourd'hui » — pose un **plafond prudent** qui **sous-vend la
récupération réelle** quand le corps réencaisse (retour de vacances, deload qui paie, sommeil qui se
recale). Le score d'un seul jour n'y voit qu'un « milieu de tableau » ; la **pente ascendante** dit que
la marge revient. C'est exactement l'« adaptation aux PROGRÈS » demandée pour la nuit, pendant de
l'« adaptation aux écarts » qu'était la glissade.

## Ce qui a été livré

Un **coach conscient de la remontée de forme** greffé sur l'action sport, miroir exact de
`readinessSlide`. Quand le pilier poussé est le SPORT, que la séance du jour n'est pas déjà faite
(`doneToday`) et que la readiness du jour est dans la zone [50, 75[, le coach interroge `readinessTrend`.
Si elle **monte franchement** (`direction === 'up'`, hausse **≥ 12 pts** sur **≥ 4 check-ins**), il
l'ANNONCE et invite à réhausser au lieu de tenir la marge (champ **`readinessRebound`** = le delta
positif, ou `null`) :

> 📈 Readiness 70/100 aujourd'hui — et ta forme remonte franchement sur tes 5 derniers check-ins
> (+30 pts) : ton corps réencaisse. Tu peux réhausser un peu l'intensité aujourd'hui, sans viser le
> record d'un coup — la marge revient.

Sans remontée (forme stable → tendance plate, ou pente descendante → c'est `readinessSlide` qui parle),
jour au vert (≥ 75, déjà « prêt à pousser ») ou jour bas (< 50, déjà « récup »), **rien ne change**.

## Conception

- **Additif pur** : champ `readinessRebound` (le delta, ou `null`) TOUJOURS renvoyé ; l'action est
  **remplacée** uniquement en cas de remontée franche, aucune autre branche touchée. Ne se déclenche que
  sur données réelles (≥ 4 check-ins datés).
- **Mutuellement exclusif de `readinessSlide`** : une pente est `'up'` XOR `'down'` (`readinessTrend`),
  donc jamais les deux le même jour. Même zone d'angle mort [50, 75[, directions opposées.
- **Garde-fous anti-contradiction** :
  - le **`loadSpike`** (plus bas, plus urgent) garde la main : un pic de charge coïncidant avec une forme
    qui remonte doit tempérer (« réencaisse » ne vaut pas « ajoute du volume brutalement ») — il réécrit
    alors l'action, `readinessRebound` reste dans le champ, informatif ;
  - l'**escalade de reprise** (`comebackStage` « building ») pousse déjà vers la vraie séance : la
    remontée ne l'entrave PAS (contrairement à la glissade, `readinessRebound` n'est **pas** ajouté au
    garde-fou `sportEase`) — les deux disent « tu peux pousser », cohérent.

## Vérif

- `adaptiveCoachFocus` reste pure ; test node:test dédié : remontée +30 pts / readiness 70 →
  `readinessRebound` renvoyé + « ta forme remonte franchement » + « réhausser un peu l'intensité »,
  `readinessSlide` null ; forme stable (~63) → les deux null, « garde une marge » ; pic de charge
  coïncidant → `readinessRebound` conservé dans le champ mais action tempérée par `loadSpike`.
- Check smoke bloquant `coachFocus` étendu (remontée → action rehaussée, `readinessSlide` null).
- `cd src && xvfb-run -a npm run verify` : **470 tests + smoke 100 % vert**.

## Suite possible

- Croiser `readinessRebound` avec `morningEnergyTrend` (énergie du matin) : deux pentes MONTANTES
  concordantes = feu vert renforcé pour remonter en charge (le pendant de la piste #493, deux pentes
  descendantes = surmenage renforcé).
- Relier `readinessRebound` à l'ACWR zone `low` : forme qui remonte + sous-charge = fenêtre idéale pour
  remonter le volume progressivement (≤ 10 %/semaine, cf. `loadAdvice`).
- Étendre la conscience de tendance (montante ET descendante) au pilier **sommeil** au-delà du verdict
  ponctuel `sleepCoachInsight`.
