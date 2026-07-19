# 498 — Coaching : le coach lit la PENTE de ton focus (2.0.129)

**Boucle #498 · build 2.0.129 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

Le coach « Le focus du moment » a acquis une conscience de tendance sur presque tous ses piliers : le
SPORT lit la pente de forme (`readinessSlide`/`readinessRebound`, #493/#494) et la charge
(`loadSpike`/`lowLoad`, #492/#495) ; le SOMMEIL lit la pente de durée (`sleepDurationTrend`, #496) et
de régularité du coucher (`bedtimeRegularityTrend`, #497) ; la NUTRITION relie la cible protéines au
résultat corporel (`weightGoalPct`). Restait **un seul pilier totalement aveugle à la direction : le
FOCUS**. Son enrichissement nommait le chantier phare (`focusByTask`) et calait la durée du bloc sur la
médiane réelle, mais restait muet sur le **VOLUME** : deux « 3 jours actifs » n'appellent pas le même
mot selon que les **minutes de concentration montent ou s'effritent**. Le décompte de jours actifs
(`recentDays` vs `prevDays`) ne voit pas ça — on peut faire plus de jours pour moins de minutes, ou
l'inverse.

## Ce qui a été livré

Une nouvelle fonction pure **`focusMinutesTrend(focusSessions, todayKey, windowDays)`** — le pendant,
côté FOCUS, de ce que `sleepDurationTrend` fait pour le sommeil et `readinessTrend` pour la forme. Elle
**somme les minutes de focus par jour** (plusieurs sessions le même jour se **cumulent** — temps total
réel), puis compare le **TOTAL** de la fenêtre récente (7 j) à celui de la précédente (les 7 j d'avant)
et renvoie `{ recent, prev, delta, dir, days, count }` ou `null`. `delta` = variation de minutes
(signée) ; `dir` : `'up'` | `'down'` | `'flat'` (seuil **±30 min**) ; `prev` = `null` s'il n'y a pas de
semaine précédente renseignée.

Dans la branche focus du coach, on lit cette pente et on **NUANCE l'insight — uniquement quand la pente
CONCORDE avec le ton**, pour ne JAMAIS contredire la headline (champ **`focusTrend`** = le delta en min,
ou `null`) :

- pilier focus **à corriger** (`tone` rebuild/revive, « ton focus s'essouffle ») **et minutes en
  RECUL** → on quantifie la dégradation :
  > … Tes minutes de focus reculent : 300 → 90 min cette semaine (-210 min) — un bloc aujourd'hui
  > inverse la pente.

- pilier focus **en renfort** (`tone` reinforce, « monte en régime ») **et minutes en HAUSSE** → on
  crédite la montée :
  > … Et le volume grimpe : 60 → 240 min de focus cette semaine (+180 min) — tu montes en puissance,
  > garde le cap.

Pente plate, mismatch pente/ton, ou pas de semaine précédente renseignée → **rien ne change**.

## Conception

- **Additif pur** : `focusTrend` (le delta, ou `null`) TOUJOURS renvoyé ; la NOTE est **appendue à
  l'insight**, l'action (tâche phare / durée de bloc / créneau agenda) reste **intacte**.
- **Jamais de contradiction avec la headline** : la note n'apparaît que quand la **direction de la
  pente coïncide avec le sens du ton** — recul sous « s'essouffle », hausse sous « monte en régime ».
  Un mismatch (p. ex. plus de minutes sous un pilier qu'on corrige par ailleurs) reste **muet**, pas de
  « ça grimpe » sous « s'essouffle ».
- **Mutuellement exclusif** up XOR down (une pente à la fois par construction).
- **Données réelles uniquement** : semaine précédente renseignée (`prev != null`) et au moins un jour
  de focus récent, sinon `focusTrend` reste `null`. Minutes ≤ 0 ignorées, dédup/cumul par date.

## Vérif

- `focusMinutesTrend` pure + testée : hausse (+200 min), baisse (-240 min), sessions du même jour
  cumulées, pente plate (20 min sous le seuil), sans semaine précédente (`prev` null), aucun jour
  récent → `null`, minutes 0 ignorées, date invalide → `null`.
- `adaptiveCoachFocus` : focus à corriger + minutes en recul → `focusTrend < 0` + « minutes de focus
  reculent » ; focus en renfort + minutes en hausse → `focusTrend > 0` + « le volume grimpe », jamais
  « reculent » ; hors pilier focus → `focusTrend` null.
- Check smoke bloquant `coachFocus` étendu (recul → « minutes de focus reculent » ; hausse → « le
  volume grimpe »).
- `cd src && xvfb-run -a npm run verify` : **477 tests + smoke 100 % vert**.

## Suite possible

- Croiser `focusMinutesTrend` avec `focusByTask` : quand le volume recule, dire SUR QUELLE tâche il a
  le plus chuté (« et c'est surtout « X » qui a décroché »).
- Chiffrer la note par la médiane de bloc récente plutôt que le total (« tes blocs raccourcissent » vs
  « tu en fais moins »), deux causes distinctes d'un même recul de minutes.
- Étendre la même conscience de tendance au dernier pilier encore ponctuel côté volume : croiser la
  pente de focus avec l'objectif hebdo (`focusWeekGoal`) pour dire si la pente suffit à tenir le cap.
