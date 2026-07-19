# 484 — Coaching : le coach brandit tes séries en jeu (2.0.115)

**Boucle #484 · build 2.0.115 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

`adaptiveCoachFocus` (« Le focus du moment ») sait déjà énormément de choses, mais quand il
**RENFORCE** un pilier qui tourne bien (ton `reinforce`), son insight restait abstrait :
« X jours actifs cette semaine, en hausse. Garde le rythme. » Il était **aveugle** à un signal
pourtant décisif et déjà présent dans les données : une **SÉRIE de jours CONSÉCUTIFS** sur ce pilier,
encore **vivante** mais **pas encore honorée aujourd'hui**.

Or l'aversion à la perte est le ressort de motivation le plus puissant d'une app gamifiée : perdre
une série de 6 jours fait agir bien plus fort que gagner « un jour de plus » abstrait. Le coach avait
tous les éléments pour s'appuyer dessus (les séries quotidiennes existent déjà via `dailyStreak`,
`STREAK_MILESTONES`) — il ne le faisait nulle part pour un **pilier seul**.

## Ce qui a été livré

Nouveau signal **Coach de la SÉRIE EN JEU** dans `adaptiveCoachFocus` : quand il renforce un pilier
(tone `reinforce`, hors rotation) dont le geste du jour n'est **pas encore posé**, il lit la série de
jours consécutifs (`dailyStreak` sur les dates actives réelles du pilier, grâce incluse) et, si elle
est **réelle** (≥ 3 jours, seuil du 1er palier `STREAK_MILESTONES`), il la **nomme** :

> Ton entraînement monte en régime… 🔥 **Ta série de 3 jours d'affilée sur ton entraînement est en
> jeu — un seul geste aujourd'hui la garde vivante.**

Points de conception :

- **En jeu, pas prolongée** : dès que le geste du jour est posé (entrée active datée d'aujourd'hui),
  la série est prolongée, plus menacée → le coach **se tait** (`streakAtRisk` null). Le test
  `activeToday` est **local** au pilier choisi, valable pour les 4 piliers (pas seulement sport/focus
  que traque `doneToday`).
- **Disjoint du comeback** (#482/#483) : une reprise fraîche raconte déjà l'histoire du run — on ne
  double pas le récit (gate `!comeback`).
- **Additif pur** : champ `streakAtRisk` (nombre de jours, ou `null`) TOUJOURS renvoyé ; note
  **appendue** à l'insight, action intacte.

## Vérif

- `adaptiveCoachFocus` reste pur ; test node:test étendu (série de 3 j en jeu, série prolongée par le
  geste du jour, série de 2 j sous le seuil, disjonction avec le comeback).
- Check smoke bloquant `coachFocus` étendu (série ≥ 3 nommée ; série prolongée → aucune note).
- `cd src && xvfb-run -a npm run verify` : **464 tests + smoke 100 % vert**.

## Suite possible

- Escalade des paliers de série d'un pilier (7 / 14 / 30 j) comme pour les journées complètes (#480).
- Signal symétrique côté correction : une série longue **qui vient de casser** (mérite un mot
  d'encouragement plutôt qu'un reproche).
</content>
</invoke>
