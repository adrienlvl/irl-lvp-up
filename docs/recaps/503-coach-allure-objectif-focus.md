# 503 — Coaching : le coach donne l'allure de ton objectif de focus (2.0.134)

**Boucle #503 · build 2.0.134 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

Après cinq boucles sur la nutrition (#498→#502), on **varie le domaine** : le FOCUS. Quand le pilier
poussé est le sport, l'objectif hebdo de séances a droit depuis #ⁿ à une **conduite du jour** riche
(`sessionGoalPace` : « il te faut 3 séances en 3 jours restants — jouable / serré / hors de portée »).
Côté **focus**, l'objectif hebdo de minutes n'affichait qu'un **compteur figé** — « Objectif hebdo :
25/120 min de focus. » — sans jamais dire s'il était **encore jouable** ni **combien viser par jour**
pour le boucler. Deux « 25/120 » n'appellent pas la même conduite selon qu'on est mardi (large) ou
dimanche (dernier jour). C'était le pendant, côté FOCUS, de `sessionGoalPace`.

## Ce qui a été livré

Un nouveau champ **`focusGoalPace`** (`'onpace' | 'tight' | null`), calculé dans le même bloc
d'objectifs que `sessionGoalPace`. Quand le pilier poussé est le focus et que l'objectif hebdo n'est
pas encore atteint (`focusWeekGoal(...).status !== 'done'`), le coach lit les **minutes restantes**
(`fw.remaining`) et les **jours restants dans la semaine calendaire** (aujourd'hui compris) puis donne
la **conduite concrète** — combien de minutes par jour restant :

- **dans les temps** (`perDay ≤ 60`) → crédit rassurant :
  > … Dans les temps : ~15 min/jour sur les 6 jours restants et l'objectif tombe — tu as la marge.
- **serré** (`perDay > 60`) → un vrai bloc chaque jour :
  > … Serré : 90 min restantes pour 1 jour — cale un vrai bloc d'~90 min chaque jour pour tenir la cible.

Objectif déjà atteint → le « Objectif hebdo atteint : N/120 min 💪 » d'avant suffit, `focusGoalPace`
reste `null`.

## Conception

- **Deux registres HONNÊTES, pas trois** : à la différence des séances (une par DATE distincte, d'où
  le « hors de portée » de `sessionGoalPace` quand il ne reste plus assez de dates), les minutes de
  focus **s'accumulent** — aujourd'hui reste toujours utilisable et **aucun cas n'est
  structurellement impossible**. On ne fabrique donc **pas** de faux « unreachable » : marge vs serré,
  point. Les jours restants **incluent** aujourd'hui (contrairement au sport, où la séance déjà posée
  ne libère plus de date).
- **Réemploi, zéro duplication** : `focusWeekGoal` (déjà branché, `remaining`/`status`) fournit le
  chiffre ; le calcul de `daysLeftIncl` réutilise le `monday`/`t0`/`dayMs` du bloc `sessionGoalPace`,
  juste à côté. Cible par défaut 120 min (comportement inchangé, aucun argument custom passé).
- **Additif pur** : `focusGoalPace` TOUJOURS renvoyé (null par défaut) ; la note est **appendue** au
  compteur, l'action (tâche phare / bloc / créneau) reste **intacte**.
- **Seuil unique et défendable** : `perDay > 60` = « il faut un vrai bloc dédié chaque jour » ; en
  deçà, la charge se dilue sans effort — l'anti-culpabilisant « tu as la marge ».

## Vérif

- `adaptiveCoachFocus` (logic.test.js, nouveau test) : mardi 90 min/6 j → `onpace` + « ~15 min/jour sur
  les 6 jours restants » ; dimanche 90 min/1 j → `tight` + « Serré : 90 min restantes pour 1 jour » ;
  objectif atteint (130/120) → `focusGoalPace` null + « atteint 💪 », aucune note d'allure ; hors pilier
  focus (sport choisi) → `focusGoalPace` null.
- Check smoke bloquant `coachFocus` étendu : allure focus `onpace` chiffrée + `tight` (dernier jour).
- `cd src && xvfb-run -a npm run verify` : **484 tests + smoke 100 % vert**.

## Suite possible

- Croiser `focusGoalPace` avec le CRÉNEAU libre du jour (`focusSlot`) : quand c'est « serré », proposer
  directement où caser le gros bloc aujourd'hui, pas seulement « cale un bloc chaque jour ».
- Personnaliser le seuil « serré » sur la MÉDIANE réelle des blocs d'Adrien (`focusBlockMin`, déjà
  calculée plus bas) plutôt qu'un 60 min fixe : « serré » = perDay > 2 × ton bloc habituel.
- Donner la même allure hebdo au SOMMEIL ou à l'HYDRATATION s'ils gagnent un objectif hebdo chiffré.
