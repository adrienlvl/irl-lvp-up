# 502 — Coaching : le coach lit la PENTE de ton hydratation (2.0.133)

**Boucle #502 · build 2.0.133 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

Depuis #501, les protéines (intrant) ET le poids (résultat) ont leur conscience de tendance dans le
focus nutrition. Restait **l'HYDRATATION** — le **dernier intrant nutrition** à ne parler que du
présent : la jauge du jour (barre d'hydratation, `hydrationPace`) dit combien de verres AUJOURD'HUI,
mais la **RÉGULARITÉ** de l'eau d'une semaine à l'autre restait muette. C'était explicitement la
**2ᵉ « Suite possible » de #501** : « chiffrer aussi la pente d'HYDRATATION (`daysHittingTarget` sur
l'eau), même moule que `proteinAdherenceTrend` ».

## Ce qui a été livré

Le moule de pente d'adhérence est désormais **factorisé** en une fonction pure générique
**`fieldAdherenceTrend(records, field, target, todayKey, windowDays)`** (le corps exact de l'ancien
`proteinAdherenceTrend`, généralisé au champ) ; `proteinAdherenceTrend` **délègue** dessus
(comportement identique, tests intacts) et une nouvelle **`hydrationAdherenceTrend(nutrition,
waterGoal, todayKey, windowDays)`** en dérive sur le champ `water`. Zéro duplication.

Dans la branche nutrition du coach, on lit cette pente (fenêtre récente 7 j vs précédente, cible de
base **8 verres** — le socle quotidien) et on NUANCE l'insight (nouveau champ **`hydrationTrend`** =
delta en jours, ou `null`), avec une règle de **PRIORISATION** qui évite le mur de texte :

- l'hydratation ne parle **que quand la pente protéines est muette** (`proteinTrend === null`) — **un
  seul intrant à la fois**, protéines d'abord (levier primaire), l'eau en **relais**. C'est du « quoi
  regarder ensuite », pas un empilement.
- régularité en **HAUSSE** (`dir up`) → crédit :
  > … Et côté hydratation, ça suit : 6 jours à tes 8 verres cette semaine vs 3 la précédente (+3) —
  > cette régularité soutient ta récup.
- régularité en **BAISSE** (`dir down`) **et pas de série protéines célébrée** (`proteinStreakActive`
  faux) → alerte bienveillante :
  > … Côté hydratation en revanche, ça décroche : 3 jours à tes 8 verres cette semaine vs 6 la
  > précédente (-3) — un verre régulier soutient récup et satiété.

Jamais de « ça décroche » sous un « 🔥 ne casse pas la série protéines ». Marche **même sans profil**
(l'eau ne dépend pas de la cible protéines).

## Conception

- **Zéro duplication** : `fieldAdherenceTrend` généralise le moule ; protéines et hydratation en
  dérivent d'une ligne. `proteinAdherenceTrend` garde son contrat exact (délégation `field='protein'`).
- **Priorisation, pas empilement** (gate `proteinTrend === null`) : un intrant-tendance parle à la
  fois. Répond au « priorisation intelligente (quoi faire en premier) » de la demande de la nuit.
- **Jamais de contradiction avec la headline** (règle héritée de #498/#501) : hausse appendable
  partout ; baisse supprimée sous une série protéines célébrée.
- **Additif pur** : `hydrationTrend` (delta jours, ou `null`) TOUJOURS renvoyé ; note appendue, action
  (protéines / collation) **intacte**.
- **Données réelles seulement** : semaine précédente renseignée requise (sinon `null`), jours sous la
  cible non comptés, cible ≤ 0 ou date invalide → `null`.

## Vérif

- `hydrationAdherenceTrend` pure + testée : hausse (+3), baisse (-4), agrégation au max par date, jours
  sous la cible ignorés, pente plate (`prev` null), aucun jour récent → `null`, cible 0 → `null`, date
  invalide → `null` ; `fieldAdherenceTrend` sans champ → `null`.
- `adaptiveCoachFocus` : grimpe sans profil (`hydrationTrend +3` + « côté hydratation, ça suit »),
  décroche hors série (`-3` + « ça décroche »), priorisation (protéines up → eau muette,
  `hydrationTrend` null, pas de « hydratation »), garde-fou série (protéines plates mais série active +
  eau en baisse → note supprimée), sans semaine précédente → `null`.
- Check smoke bloquant `coachFocus` étendu : grimpe chiffrée, priorisation (eau muette sous pente
  protéines).
- `cd src && xvfb-run -a npm run verify` : **483 tests + smoke 100 % vert**.

## Suite possible

- Croiser `hydrationTrend` avec `hydrationPace` du jour : si la régularité hebdo décroche ET qu'on est
  déjà « en retard » sur la journée, prioriser un rappel de boire là, maintenant.
- Croiser `proteinTrend` avec la répartition du jour (`proteinByMeal`) : dire À QUEL MOMENT la protéine
  décroche quand la régularité s'effrite (petit-déj sauté ? dîner léger ?) — 1ʳᵉ suite possible #501.
- Croiser `proteinTrend` (habitude) avec `weightPace` (résultat) : régularité qui remonte + plateau qui
  persiste = laisser du temps au corps plutôt que resserrer les calories — 3ᵉ suite possible #501.
