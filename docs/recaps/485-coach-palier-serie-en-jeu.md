# 485 — Coaching : le coach brandit le palier au bout d'une série en jeu (2.0.116)

**Boucle #485 · build 2.0.116 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

Depuis #484, `adaptiveCoachFocus` (« Le focus du moment ») sait nommer une **série en jeu** : quand
il renforce un pilier qui tourne bien (`reinforce`) et que le geste du jour n'est pas encore posé, il
brandit la série de jours consécutifs (`streakAtRisk`) pour jouer l'aversion à la perte. Mais il
restait **aveugle au moment où cette série touche un PALIER** : à streak = 6, poser le geste du jour
porte la série à **7 = un palier** (`STREAK_MILESTONES`), et pourtant le coach servait exactement le
même message qu'à streak = 3 ou 4. Or décrocher un jalon dans la foulée est une **carotte** qui
s'ajoute au **bâton** de la perte — deux ressorts qui tirent dans le même sens le jour précis où le
palier est à portée d'un seul geste. « Escalade des paliers de série d'un pilier (7 / 14 / 30 j) »
figurait en tête des prochaines pistes de **#484**.

## Ce qui a été livré

Dans le bloc `streakAtRisk`, quand la série en jeu (`streak >= 3`) est à **exactement un jour** d'un
palier — c.-à-d. `nextStreakMilestone(streak).remaining === 1`, donc `streak + 1 ∈ STREAK_MILESTONES`
—, le coach **appende** la carotte du jalon à la note « série en jeu » :

> 🔥 Ta série de 6 jours d'affilée sur ton entraînement est en jeu — un seul geste aujourd'hui la
> garde vivante. **Et ce geste décroche le palier d'une semaine ! 🏅**

Libellés calés sur ceux des journées complètes (#477) : 7 → « une semaine », 14 → « deux semaines »,
30 → « un mois », au-delà → « N jours ».

Points de conception :

- **Le jour exact où c'est vrai** : la série court jusqu'à hier (grâce de `dailyStreak`), donc le
  geste d'aujourd'hui la porte à `streak + 1`. La carotte n'apparaît **que** quand ce `streak + 1`
  est pile un palier (`remaining === 1`) — pas la veille, pas le surlendemain. Un streak = 3 (prochain
  palier à 4 jours) n'affiche **rien** de plus.
- **Réutilise l'échelle existante** (`STREAK_MILESTONES` / `nextStreakMilestone`), aucune nouvelle
  échelle, aucun nouveau seuil.
- **Additif pur** : nouveau champ `streakMilestoneReach` (valeur du palier atteignable aujourd'hui,
  ou `null`) TOUJOURS renvoyé ; le libellé s'ajoute à la note existante, l'action reste intacte. Il
  hérite de toutes les gardes de `streakAtRisk` (ton `reinforce`, hors rotation, hors comeback, geste
  du jour non encore posé).

## Vérif

- `adaptiveCoachFocus` reste pur ; test node:test étendu (série de 6 j → `streakMilestoneReach` 7 +
  « décroche le palier d'une semaine » ; série de 3 j loin du palier → `streakMilestoneReach` null,
  pas de note « palier »).
- Check smoke bloquant `coachFocus` étendu (`fMilestone` : streak 6, palier 7 nommé ; `fSeries` :
  streak 3 → aucune note « palier »).
- `cd src && xvfb-run -a npm run verify` : **464 tests + smoke 100 % vert**.

## Suite possible

- Signal symétrique côté correction : une série longue **qui vient de casser** mérite un mot
  d'encouragement plutôt qu'un reproche (piste #484 encore ouverte).
- Palier en jeu à plusieurs jours (« encore 2 jours pour la semaine complète ») comme carotte plus
  précoce, si ça ne dilue pas le message du jour même.
</content>
</invoke>
