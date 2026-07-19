# 486 — Coaching : le coach console une série qui vient de casser (2.0.117)

**Boucle #486 · build 2.0.117 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

Depuis #484/#485, `adaptiveCoachFocus` (« Le focus du moment ») sait brandir une **série encore
vivante** que tu risques de perdre — mais **uniquement en ton `reinforce`** (le pilier tourne bien,
`streakAtRisk` / `streakMilestoneReach`). **Côté correction** (`rebuild`), quand le coach te ramène
sur un pilier que tu as laissé retomber, il ne faisait que **constater le recul** (« 0 jour actif
cette semaine, contre 5 la précédente »). Il était **aveugle** au fait qu'avant cette pause tu tenais
peut-être une **belle série** — et un pilier qui recule juste après un vrai run ne mérite pas un
reproche mais un mot qui reconnaît l'acquis. « Signal symétrique côté correction : une série longue
qui vient de casser mérite un mot d'encouragement plutôt qu'un reproche » figurait en **tête des
prochaines pistes** de #484 **et** #485.

## Ce qui a été livré

Nouveau signal **Coach de la SÉRIE ROMPUE** — le pendant **consolant** de la série en jeu. Quand le
coach corrige un pilier (`tone === 'rebuild'`, hors rotation) dont la série est **bien rompue
aujourd'hui** (`dailyStreak(today) === 0` : ni aujourd'hui ni hier honorés) mais dont le **dernier
geste reste frais** (≤ 10 j), il mesure la **longueur** de la série close à ce dernier jour actif et,
si elle était **réellement longue** (≥ 4, au-dessus du seuil « en jeu » de 3), il **nomme l'acquis**
pour recadrer :

> 0 jour actif cette semaine, contre 5 la précédente. Un petit geste suffit à repartir. **Tu tenais
> 5 jours d'affilée sur ton entraînement avant cette pause — pas un échec, une série à relancer : un
> geste aujourd'hui et tu repars.**

Perdre une série n'est pas repartir de zéro : nommer ce que tu avais bâti transforme la culpabilité
(« j'ai lâché ») en élan (« je repars de là »).

Points de conception :

- **Longueur mesurée en réutilisant `dailyStreak`** : on prend le **dernier jour actif** (max des
  dates ≤ aujourd'hui) comme « aujourd'hui » de `dailyStreak(dates, lastKey)` → la longueur exacte de
  la série qui s'est close ce jour-là, sans nouvelle fonction.
- **Bien rompue, pas juste en pause d'un jour** : `dailyStreak(dates, todayKey) === 0` garantit qu'il
  ne reste rien ni aujourd'hui ni hier (grâce épuisée) — sinon la série est encore vivante, terrain de
  `streakAtRisk`.
- **Fraîche, pas dormante** : dernier geste ≤ 10 j. Au-delà, on glisse vers le pilier **dormant**,
  terrain du ré-amorçage (`reviveStep`), qui n'existe qu'en ton `revive`.
- **Longue** : ≥ 4 jours (au-dessus du seuil « en jeu » de 3) — pour honorer le « série *longue* » de
  la piste et ne pas consoler sur un run de 3 jours anecdotique.
- **Disjoint par construction** : `streakAtRisk` / `streakMilestoneReach` / `comeback` sont
  `reinforce`-only, le ré-amorçage est `revive`-only ; ce signal est `rebuild`-only → jamais deux
  récits de série le même jour.
- **Additif pur** : nouveau champ `brokenStreak` (longueur de la série rompue, ou `null`) TOUJOURS
  renvoyé ; la note s'ajoute à l'insight, l'action reste intacte.

## Vérif

- `adaptiveCoachFocus` reste pur ; test node:test étendu (série de 5 j close il y a une semaine →
  `brokenStreak` 5 + « Tu tenais 5 jours d'affilée… avant cette pause » ; série de 3 j close → sous le
  seuil, `brokenStreak` null ; reinforce → `brokenStreak` null ; série encore vivante aujourd'hui →
  null).
- Check smoke bloquant `coachFocus` étendu (`fBroken` : rebuild, `brokenStreak` 5, note nommée ;
  `fShortBroken` : 3 j → null ; `fSeries` reinforce → null).
- `cd src && xvfb-run -a npm run verify` : **464 tests + smoke 100 % vert**.

## Suite possible

- Nuance de la reprise selon la longueur de la série perdue (« tu tenais un mois — ça vaut une vraie
  reprise » vs « 4 jours, vite relancé ») pour graduer l'encouragement.
- Micro-jalon de reprise après une série rompue : célébrer le retour à 2/3 jours d'affilée comme un
  « tu reconstruis ce que tu avais perdu ».
</content>
