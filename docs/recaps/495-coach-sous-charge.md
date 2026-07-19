# 495 — Coaching : le coach repère la sous-charge d'entraînement (2.0.126)

**Boucle #495 · build 2.0.126 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

Depuis #492, le coach « Le focus du moment » lit la **charge d'entraînement** via l'ACWR
(`acuteChronicRatio`). Mais il ne réagissait qu'à **un seul bord** : la zone `high` (`loadSpike`,
ratio > 1,5), où il tempère pour éviter la blessure. Le cas **symétrique** — explicitement listé en
« Suite possible » de #492 **et** de #494 — restait muet : l'ACWR en zone **`low`** (ratio < 0,8),
quand le corps tourne **nettement SOUS son volume habituel** avec de la marge pour remonter. Là,
l'action sport générique (« prêt à pousser », « vraie séance ») ignore que c'est justement la
**fenêtre idéale** pour rebâtir du volume progressivement (≤ 10 %/semaine, le principe de
`loadAdvice` zone `low`). C'est l'« adaptation aux PROGRÈS » demandée pour la nuit, pendant exact de
l'« adaptation aux écarts » qu'était le pic.

## Ce qui a été livré

Un **coach conscient de la sous-charge**, miroir exact de `loadSpike`. Quand le pilier poussé est le
SPORT, que la séance du jour n'est pas déjà faite (`doneToday`), que le pilier n'est pas dormant
(`!reviveEligible`) et que la readiness n'ordonne pas le repos (null ou ≥ 50), le coach interroge
l'ACWR. En zone `low`, il NOMME la sous-charge (× le volume habituel) et invite à **rajouter un peu**,
progressivement (champ **`lowLoad`** = le ratio, ou `null`) :

> 🌱 Tu es en sous-charge : ta semaine est à 0,57× ton volume habituel — ton corps a de la marge pour
> remonter. Rajoute un peu de volume aujourd'hui (une série, 10 min) et reviens progressivement vers
> ta base (≤ 10 %/semaine), tu construis sans risque de blessure.

Et quand la **forme remonte** en même temps (`readinessRebound`), deux feux verts concordants → message
renforcé :

> ✨ Fenêtre idéale : ta forme remonte ET ta charge est à 0,57× ton volume habituel (sous ta base) — le
> bon moment pour rebâtir du volume. Ajoute un peu aujourd'hui et remonte progressivement vers ta base
> (≤ 10 %/semaine), sans brûler les étapes.

Sans sous-charge (charge régulière → zone `optimal`/`high`), **rien ne change**.

## Conception

- **Additif pur** : champ `lowLoad` (le ratio, ou `null`) TOUJOURS renvoyé ; l'action est remplacée
  uniquement en sous-charge, aucune autre branche touchée. Ne se déclenche que sur données réelles
  (`durée × effort > 0` sur 4 semaines) — sinon `acuteChronicRatio` renvoie `null`.
- **Mutuellement exclusif de `loadSpike`** : zone `high` XOR `low` (une seule zone ACWR à la fois),
  donc jamais les deux le même jour.
- **Garde-fous anti-contradiction** :
  - **`readinessSlide == null`** (garde clé) — si la forme GLISSE, l'action dit déjà « garde léger,
    séance allégée » ; « remonte le volume » la contredirait. On n'entre pas.
  - **`!reviveEligible`** — un pilier dormant reçoit un micro-pas (« bouge 5 min »), pas « remonte le
    volume » ; l'énergie d'activation est déjà le sujet.
  - **readiness ≥ 50 ou null** — sous 50, l'action commande déjà la récup.
  - le **créneau sport** (`sportSlot`, non gardé par `loadSpike` ici) **appende** simplement « cale ta
    séance à HH:MM » — complémentaire de « rajoute du volume », pas contradictoire.
  - l'**escalade de reprise** (`comebackStage` « building ») dit « repasse à une vraie séance » — même
    sens que « remonte le volume », pas de contradiction.

## Vérif

- `adaptiveCoachFocus` reste pure ; test node:test dédié : base chargée puis semaine allégée
  (ratio ≈ 0,57) → `lowLoad` renvoyé + « Tu es en sous-charge » + « progressivement vers ta base »,
  `loadSpike` null ; sous-charge + remontée → `readinessRebound` = 30 conservé + « Fenêtre idéale » ;
  forme qui glisse → `lowLoad` null (garde clé) ; charge régulière (ratio ≈ 1) → `lowLoad` null.
- Check smoke bloquant `coachFocus` étendu (sous-charge → action « remonter le volume » ; combiné
  rebound → « Fenêtre idéale » ; glissade → `lowLoad` null).
- `cd src && xvfb-run -a npm run verify` : **471 tests + smoke 100 % vert**.

## Suite possible

- Croiser `lowLoad` avec `weeklyKmRamp` / `volumeRamp` : proposer un chiffre concret de remontée
  (« +1 série » ou « +10 min ») calé sur la vraie base d'Adrien plutôt qu'un ordre de grandeur.
- Étendre la conscience ACWR au ton `revive`/`rebuild` un message de reprise progressive quand le
  pilier dormant revient (protéger la remontée, ≤ 10 %/semaine).
- Étendre la conscience de tendance (montante ET descendante) au pilier **sommeil** au-delà du verdict
  ponctuel `sleepCoachInsight`.
</content>
</invoke>
