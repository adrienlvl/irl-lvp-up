# 554 — Coaching : le coach connaît enfin TON JOUR d'entraînement (sportHabitDay)

**Build 2.0.184 · boucle #554 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1)**

> Note de session : le travail avait été codé et vérifié en local sous le numéro 2.0.177 pendant
> qu'une autre session poussait 2.0.177 → 2.0.183 sur `master`. Rebasé proprement sur la base distante
> et **renuméroté en 2.0.184** (recap #554) — la feature `sportHabitDay` est bien inédite côté remote
> (0 occurrence avant ce commit).

## Le manque

Le coach « Le focus du moment » (`adaptiveCoachFocus`, `logic.js`) lit le sport sous tous les angles
du **QUOI** et du **COMBIEN** : la CHARGE (`loadSpike` / ACWR), la MODALITÉ (`trainBalanceGuard`,
course ↔ muscu), les ZONES (`pushPullGuard`, `sportZoneFocus`, `sportNeglectGuard`), le VOLUME de
course (`runVolumeGuard`, +10 %/sem) et la PROGRESSION de force (plateau/progress). Mais **aucun** ne
regardait le **QUAND** : sur quel jour de la semaine repose l'habitude d'entraînement.

Le signal existait pourtant déjà — `trainingByWeekday` (8 semaines : nombre de séances par jour de
semaine + jour dominant) — mais ne vivait **QUE** dans l'onglet Athlète (carte « Mes jours ·
8 semaines ») : **zéro appel** côté coach du jour. Or l'ancrage à une habitude **existante** (habit
stacking) est le levier de changement de comportement le plus solide : rappeler « c'est aujourd'hui
ton jour » le jour même où le corps a déjà le réflexe rend la séance bien plus probable qu'une
injonction abstraite — et c'est un ton RPG qui **célèbre une régularité acquise** plutôt que de
gronder un manque.

## Ce qui est livré

Nouveau champ **`sportHabitDay`** (`{ weekday, count, total, pct }` ou `null`, **toujours** renvoyé).
Quand le pilier poussé est le sport et qu'**aujourd'hui est justement le jour dominant** sur les
8 dernières semaines, le coach le **nomme** et invite à honorer le rendez-vous, note **appendue** à
l'insight :

> « Et c'est justement ton jour : sur les 8 dernières semaines, c'est le jeudi que tu t'entraînes le
> plus (6 séances sur 9, 67 %). Ton corps a déjà ce rendez-vous dans le rythme — honore-le
> aujourd'hui : t'appuyer sur une ancre d'habitude qui existe déjà rend la séance bien plus facile à
> lancer que de compter sur la seule volonté. »

## Garde-fous & honnêteté

- **Vraie habitude requise.** `total >= 8` séances sur 8 sem (~1/sem, une base réelle) **et** jour
  dominant vu `>= 3` fois : sans ce plancher, « ton jour » serait du bruit. (Testé : 4 jeudis → `null`.)
- **Concentration réelle.** `pct >= 30 %` des séances (le hasard sur 7 jours donnerait ~14 %) **et
  pic UNIQUE** (`sorted[0] > sorted[1]`) : qui s'entraîne tous les jours n'a pas de jour fétiche.
  (Testé : séances éparpillées < 30 % → `null`.)
- **Le jour, c'est aujourd'hui.** `todayIdx === wd.bestDay` : muet les autres jours, même si l'habitude
  existe. (Testé : même habitude un mercredi → `null`.)
- **Séance non encore faite.** `!doneToday` : si Adrien a déjà bougé, l'habitude est **honorée**, rien
  à rappeler. (Testé : séance du jour ajoutée → `null`.)
- **Pas de ré-amorçage dormant.** `!reviveEligible` (aligné sur le guard voisin `runVolumeGuard`) : en
  ton « revive », le coach relance en douceur, pas le moment de brandir une habitude.
- **La forme n'ordonne pas le repos.** `readiness == null || readiness >= 50`, et **pas de pic de
  charge** (`loadSpike == null`) : on ne pousse pas la séance un jour rouge. (Testé : readiness au
  plancher → `null`.)
- **Axe ORTHOGONAL, pas subordonné.** Le QUAND (pas le QUOI) ne fire que ~1 j/sem (le jour dominant)
  → aucun sur-empilement avec les guards de zone/charge. Vocabulaire distinct (« c'est justement ton
  jour », « tu t'entraînes le plus », « ce rendez-vous », « ancre d'habitude ») → zéro collision à
  l'œil ni en regex.
- **Affine, ne remplace pas.** Note **appendue** à l'insight ; l'action du jour reste intacte.
- **Zéro nouvelle fonction.** Réemploi total de `trainingByWeekday`, `doneToday`, `reviveEligible`,
  `loadSpike`, `readiness`.

## Vérification

- Tests `logic.test.js` (nouveau bloc) : 6 jeudis + 3 mardis sur 8 sem, aujourd'hui = jeudi →
  `sportHabitDay === { weekday: 3, count: 6, total: 9, pct: 67 }` + note « c'est le jeudi que tu
  t'entraînes le plus (6 séances sur 9, 67 %) » et « ancre d'habitude ». Exclusions : jour ≠ dominant,
  base < 8, séance du jour faite, readiness au rouge, aucune concentration (< 30 %) → tous `null`.
- Checks smoke **bloquants** `coachFocus` (harnais existant) + `whatsNew` sur `CHANGELOG[0].v === '2.0.184'`.
- `cd src && xvfb-run -a npm run verify` → **100 % vert** (520 tests node, SMOKE OK).

## Suite possible

- Le coach lit désormais charge, modalité, zones, volume, progression **et** jour d'habitude côté
  sport. Piste restante côté sport : l'**heure** de la séance (créneau `sportSlot` existe mais n'est
  pas croisé avec l'agenda réel du jour).
- Côté transverse : un « bilan hebdo » du coach qui synthétise les guards déclenchés dans la semaine
  (méta-coaching), plutôt qu'une note par note — gros chantier → à écrire en proposition d'abord.
</content>
