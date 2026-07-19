# 496 — Coaching : le coach lit la PENTE de ton sommeil (2.0.127)

**Boucle #496 · build 2.0.127 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

Quand le pilier poussé est le SOMMEIL, `adaptiveCoachFocus` remplace le compteur générique par le
**verdict chiffré** de `sleepCoachInsight` (moy. 7 j + dette 14 j + régularité) — un état des lieux
**ponctuel**. Mais ce verdict reste **aveugle à la DIRECTION** : deux « moy. 6,5 h » n'appellent pas le
même mot selon que les nuits **remontent** (recalage qui paie) ou **s'enfoncent** (dette qui s'installe).
Côté SPORT, le coach lit déjà la pente de forme (`readinessSlide` #493 / `readinessRebound` #494) ; côté
SOMMEIL, la même conscience de tendance manquait — c'était la piste explicitement listée en « Suite
possible » de **#493, #494 ET #495** (« étendre la conscience de tendance, montante ET descendante, au
pilier sommeil au-delà du verdict ponctuel »). C'est à la fois l'« adaptation aux écarts » (dégradation)
et l'« adaptation aux PROGRÈS » (remontée) demandées pour la nuit, sur un domaine que le snapshot ne
couvrait pas.

## Ce qui a été livré

Une nouvelle fonction pure **`sleepDurationTrend(recovery, todayKey, windowDays)`** — miroir, côté
sommeil, de `readinessTrend` / `morningEnergyTrend` : elle compare la moyenne des nuits chiffrées de la
fenêtre récente (7 j) à celle de la fenêtre précédente (les 7 j d'avant) et renvoie
`{ avg, prevAvg, delta, dir, days, count }` (dir `'up'`/`'down'`/`'flat'`, seuil ±0,4 h) ou `null`.

Dans la branche sommeil du coach, quand le verdict n'est **pas déjà « solide »** (`tone !== 'ok'`, sinon
« ça s'aggrave » contredirait « sommeil solide ») et qu'une pente franche existe, on **NUANCE le verdict**
par sa direction (champ **`sleepTrend`** = le delta en h, ou `null`) :

- nuits qui **s'enfoncent** (dir `'down'`) → on ALERTE :
  > … Et la pente s'enfonce : tes nuits sont passées de 7 à 4,7 h (-2,3 h vs la semaine précédente) —
  > enraye maintenant, avant que la dette ne s'installe.

- nuits qui **remontent** (dir `'up'`) → on CRÉDITE le progrès (motivant même si le total reste court) :
  > … Bonne nouvelle : ça remonte (+2,3 h, de 3 à 5,3 h vs la semaine précédente) — tu es sur la bonne
  > pente, tiens le cap encore quelques soirs.

Sommeil solide, ou nuits stables (pente plate), ou pas de semaine précédente renseignée → **rien ne
change**.

## Conception

- **Additif pur** : `sleepTrend` (le delta, ou `null`) TOUJOURS renvoyé ; la NOTE est **appendue à
  l'insight** (le verdict), l'action (plan de recalage / bilan / créneau du soir) reste **intacte**.
- **Mutuellement exclusif** up XOR down (une pente à la fois par construction).
- **Anti-contradiction** : gardé par `tone !== 'ok'` — le verdict reste l'ancre, la pente ne fait que le
  raffiner ; on n'annonce jamais une dégradation sous un « sommeil solide ».
- **Données réelles uniquement** : ≥ 3 nuits chiffrées récentes + une semaine précédente renseignée
  (`prevAvg != null`), sinon `sleepTrend` reste `null`. Déduplication par date, `sleep > 0` (symétrie
  avec toutes les sœurs sommeil).

## Vérif

- `sleepDurationTrend` pure + testée : pente montante (+1 h), descendante (-1,5 h), plate (0,2 h sous le
  seuil), sans semaine précédente (`prevAvg` null), < 2 nuits récentes → `null`, `sleep:0` ignoré, date
  invalide → `null`.
- `adaptiveCoachFocus` : sommeil urgent + nuits qui s'enfoncent → `sleepTrend < 0` + « la pente
  s'enfonce » ; nuits qui remontent → `sleepTrend > 0` + « ça remonte », jamais « s'enfonce » ; pente
  plate → `sleepTrend` null, aucune note ; champ toujours présent (null hors pilier sommeil).
- Check smoke bloquant `coachFocus` étendu (dégradation → « la pente s'enfonce » ; remontée → « ça
  remonte »).
- `cd src && xvfb-run -a npm run verify` : **473 tests + smoke 100 % vert**.

## Suite possible

- Étendre la même conscience de tendance à la **régularité du COUCHER** (`bedtimeRegularity`) : un écart
  de coucher qui se resserre ou se disperse est un signal circadien complémentaire de la durée.
- Croiser `sleepTrend` (durée) avec `sleepImpactReport` : quand la durée remonte ET que l'impact prouvé
  est fort, renforcer le crédit (« et tu le sens : +X d'énergie le lendemain »).
- Chiffrer la note par la **dette** plutôt que la seule durée moyenne (`sleepDebtHours` récente vs
  précédente) : « ta dette s'est creusée de X h » parle peut-être plus qu'un delta d'heures moyennes.
</content>
</invoke>
