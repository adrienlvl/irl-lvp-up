# 501 — Coaching : le coach lit la PENTE de ton adhérence protéines (2.0.132)

**Boucle #501 · build 2.0.132 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

Quand le pilier poussé est la NUTRITION, `adaptiveCoachFocus` a désormais une conscience de tendance
sur le **résultat corporel** (`weightPace`, #499 ; cible calorique chiffrée, #500). Mais l'**HABITUDE
protéines elle-même** — l'intrant qu'Adrien contrôle jour après jour — ne disait que son état
**PONCTUEL** : soit la série en cours (`proteinStreak`), soit le compte de la semaine
(`proteinDaysOnTarget` → « 4/7 jours à ta cible »). Aucun des deux ne voit la **DIRECTION** : deux
« 4/7 » n'appellent pas le même mot selon que la régularité **DÉCOLLE** (4 cette semaine contre 1 la
précédente) ou **S'EFFRITE** (4 contre 7). C'était la piste « Suite possible » répétée en **#498, #499
ET #500** : étendre la conscience de pente au dernier angle nutrition encore ponctuel — l'adhérence
protéines, pendant côté INTRANT de `focusMinutesTrend`.

## Ce qui a été livré

Une nouvelle fonction pure **`proteinAdherenceTrend(nutrition, target, todayKey, windowDays)`** — le
pendant, côté NUTRITION façon intrant, de `focusMinutesTrend`. Elle agrège la protéine du jour au **MAX
par date** (comme `daysHittingTarget`), puis compte les **jours à la cible** de la fenêtre récente
(7 j) vs la précédente (les 7 d'avant). Renvoie `{ recent, prev, delta, dir, days, count }` ou `null` :

- `null` si **aucun jour nutrition saisi** dans la fenêtre récente (rien à dire).
- `prev = null` si la semaine précédente n'a **aucun jour saisi** — on ne compare pas à un vide (pas de
  fausse pente « ça s'effondre » née d'un simple non-suivi).
- `delta` = variation de jours-à-la-cible (signée) ; `dir` : `'up'` | `'down'` | `'flat'` (seuil
  **±2 jours**) ; `count` = nb de jours nutrition récents saisis.

Dans la branche nutrition du coach, on lit cette pente et on **NUANCE l'insight** (nouveau champ
**`proteinTrend`** = delta en jours, ou `null`) **sans JAMAIS contredire la headline** :

- régularité en **HAUSSE** (`dir up`) → crédit, appendu sous une série **comme** sous le verdict neutre :
  > … Et ta régularité grimpe : 5 jours à la cible cette semaine vs 2 la précédente (+3) — la
  > dynamique est bonne, garde le cap.

- régularité en **BAISSE** (`dir down`) **et pas de série en cours** (`streak.current < 2`) → alerte
  bienveillante, seulement sous le verdict neutre « N/7 » (qui reconnaît déjà l'imperfection) :
  > … Mais ta régularité s'effrite : 3 jours à la cible cette semaine vs 6 la précédente (-3) — un
  > jour réglé aujourd'hui enraye la glissade.

Sous une **série célébrée** (« 🔥 2 jours d'affilée »), une baisse hebdo est **supprimée** (jamais de
« ça s'effrite » sous un « ne casse pas la série ») ; seule une hausse peut s'y appendre.

## Conception

- **Additif pur** : `proteinTrend` (delta jours, ou `null`) TOUJOURS renvoyé ; NOTE appendue à
  l'insight, action (protéines / collation) **intacte**.
- **Jamais de contradiction avec la headline** (règle héritée de `focusMinutesTrend`, #498) : la hausse
  concorde avec les deux tons (série ou neutre) ; la baisse ne s'affiche que sous le ton neutre.
- **Deux axes distincts** : `weightPace` juge le **résultat balance**, `proteinTrend` juge
  l'**habitude** — ils ne se marchent pas dessus (un poids qui stagne mais une protéine qui remonte est
  une bonne nouvelle honnête, et vice-versa).
- **Réemploi, zéro duplication** : mêmes conventions que `daysHittingTarget` (max par date) et
  `focusMinutesTrend` (fenêtres glissantes) ; `proteinStreak` / `proteinDaysOnTarget` intacts.
- **Données réelles seulement** : semaine précédente renseignée requise (sinon `null`), jours sous la
  cible non comptés, cible ≤ 0 ou date invalide → `null`.

## Vérif

- `proteinAdherenceTrend` pure + testée : hausse (+3), baisse (-4), agrégation au max par date, jours
  sous la cible ignorés, pente plate (±1 sous le seuil), sans semaine précédente (`prev` null), aucun
  jour récent → `null`, cible 0 → `null`, date invalide → `null`.
- `adaptiveCoachFocus` : neutre + s'effrite (`proteinTrend -3` + « régularité s'effrite : 3 … vs 6 »),
  neutre + grimpe (`+3` + « régularité grimpe : 4 … vs 1 », jamais « s'effrite »), série + grimpe
  (note sous « 🔥 3 jours »), série + baisse hebdo → note SUPPRIMÉE (`proteinTrend` null), sans semaine
  précédente → null, hors pilier nutrition → null.
- Check smoke bloquant `coachFocus` étendu (s'effrite chiffrée, grimpe chiffrée, sans semaine
  précédente → null).
- `cd src && xvfb-run -a npm run verify` : **481 tests + smoke 100 % vert**.

## Suite possible

- Croiser `proteinTrend` avec `proteinByMeal` / la répartition du jour : quand la régularité s'effrite,
  dire À QUEL MOMENT la protéine décroche (petit-déj sauté ? dîner léger ?) pour un geste ciblé.
- Chiffrer aussi la pente d'HYDRATION (`daysHittingTarget` sur l'eau) — dernier intrant nutrition sans
  conscience de tendance, même moule que `proteinAdherenceTrend`.
- Croiser `proteinTrend` (habitude) avec `weightPace` (résultat) quand les deux existent : une
  régularité qui remonte ET un plateau qui persiste = laisser du temps au corps plutôt que resserrer.
