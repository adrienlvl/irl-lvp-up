# 497 — Coaching : le coach lit la PENTE de la régularité de ton coucher (2.0.128)

**Boucle #497 · build 2.0.128 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

En #496, le coach « Le focus du moment » a appris à lire la **pente de la DURÉE** de sommeil
(`sleepDurationTrend` : nuits qui rallongent ou raccourcissent). Mais le sommeil a **deux axes** : la
durée ET la **régularité du coucher**. Le verdict `sleepCoachInsight` dit à quel point ton coucher est
stable **en ce moment** (`bedtimeRegularity`, écart-type en min) ; il restait **aveugle à la
DIRECTION** de cette régularité : ton heure de coucher se **resserre**-t-elle sur un créneau fixe
(l'ancre circadienne se pose) ou s'**éparpille**-t-elle de plus en plus d'un soir à l'autre (le rythme
part) ? C'était la première piste explicitement listée en « Suite possible » de **#496** (« étendre la
même conscience de tendance à la régularité du COUCHER »). Un total de sommeil correct peut s'effriter
en silence quand le coucher commence à sauter partout — un signal circadien que le snapshot ponctuel ne
couvrait pas.

## Ce qui a été livré

Une nouvelle fonction pure **`bedtimeRegularityTrend(recovery, todayKey, windowDays)`** — le pendant,
sur l'axe **RÉGULARITÉ**, de ce que `sleepDurationTrend` fait sur l'axe **DURÉE**. Elle compare la
**dispersion** (écart-type, en min, échelle **ancrée** `bedtimeAnchor` pour traverser minuit) des
heures de coucher de la fenêtre récente (7 j) à celle de la fenêtre précédente (les 7 j d'avant) et
renvoie `{ stdevMin, prevStdevMin, delta, dir, recentNights, prevNights }` ou `null`. `delta` = variation
d'écart-type (signée : négatif = se resserre). `dir` : `'tightening'` | `'dispersing'` | `'flat'`
(seuil ±15 min).

Dans la branche sommeil du coach, quand le verdict n'est **pas déjà « solide »** (`tone !== 'ok'`) **et
que la pente de DURÉE n'a rien nuancé** (`sleepTrend === null` — une SEULE note de pente à la fois,
comme les sœurs sport), on lit cette pente de régularité (champ **`sleepBedtimeTrend`** = le delta, ou
`null`) :

- coucher qui **se disperse** (`dir 'dispersing'`) → on ALERTE :
  > … Et ton coucher se disperse : de ±20 à ±75 min d'un soir à l'autre (+55 min) — ré-ancre une heure
  > fixe avant que le rythme ne parte.

- coucher qui **se resserre** (`dir 'tightening'`) → on CRÉDITE le progrès :
  > … Bon signe : ton coucher se régularise (de ±70 à ±25 min d'un soir à l'autre, -45 min) — l'ancre
  > circadienne se pose, tiens le cap.

Sommeil solide, couchers stables (pente plate), pente de durée déjà exprimée, ou < 3 couchers saisis
dans l'une des deux fenêtres → **rien ne change**.

## Conception

- **Additif pur** : `sleepBedtimeTrend` (le delta, ou `null`) TOUJOURS renvoyé ; la NOTE est **appendue
  à l'insight**, l'action (plan de recalage / bilan / créneau du soir) reste **intacte**.
- **Une seule note de pente à la fois** : gardé par `sleepTrend === null` — la pente de DURÉE reste
  prioritaire (elle porte le total, signal le plus lourd) ; la régularité ne prend la parole que quand
  la durée n'a rien dit de franc. Jamais deux notes de tendance le même jour → insight qui reste lisible.
- **Anti-contradiction** : gardé par `tone !== 'ok'` (le verdict reste l'ancre) ; up XOR down par
  construction (une seule direction de dispersion possible).
- **Données réelles uniquement** : ≥ 3 couchers saisis dans **chaque** fenêtre (récente ET précédente),
  échelle ancrée (minutes depuis midi) — symétrie avec toutes les sœurs sommeil.

## Vérif

- `bedtimeRegularityTrend` pure + testée : coucher qui se disperse (serré → éparpillé) → `dispersing` +
  delta > 0 ; qui se resserre → `tightening` + delta < 0 ; dispersion stable → `flat` ; < 3 couchers
  dans une fenêtre → `null` ; couchers absents ignorés ; date invalide → `null`.
- `adaptiveCoachFocus` : durée plate + court + coucher dispersé → `sleepTrend` null, `sleepBedtimeTrend`
  > 0 + « ton coucher se disperse » ; coucher resserré → `sleepBedtimeTrend` < 0 + « ton coucher se
  régularise », jamais « se disperse » ; durée qui s'enfonce ET coucher dispersé → la durée prime
  (`sleepTrend` < 0, `sleepBedtimeTrend` null) ; champ toujours présent (null hors pilier sommeil).
- Check smoke bloquant `coachFocus` étendu (dispersion → « se disperse » ; resserrement → « se
  régularise »).
- `cd src && xvfb-run -a npm run verify` : **475 tests + smoke 100 % vert**.

## Suite possible

- Croiser `sleepDurationTrend` × `bedtimeRegularityTrend` × `sleepImpactReport` : quand la durée remonte
  ET que le coucher se resserre ET que l'impact prouvé est fort, renforcer le crédit (« et tu le sens :
  +X d'énergie »).
- Chiffrer la note de durée par la **dette** (`sleepDebtHours` récente vs précédente) plutôt que la
  seule durée moyenne — « ta dette s'est creusée de X h » parle peut-être plus.
- Étendre la conscience de tendance au **plan de recalage** lui-même (adhérence à la cible qui monte ou
  qui décroche sur la fenêtre récente).
