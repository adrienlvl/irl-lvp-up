# 488 — Coaching : le coach brandit ton record perso de série (2.0.119)

**Boucle #488 · build 2.0.119 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

`adaptiveCoachFocus` (« Le focus du moment ») sait, côté renforcement, nommer une **série en jeu**
(`streakAtRisk`, #484/#485) et la carotte d'un **palier fixe** à décrocher aujourd'hui
(`streakMilestoneReach` : 7/14/30… jours). Mais il restait **aveugle au levier le plus intime** : la
**plus longue série jamais tenue** sur ce pilier — ton **record personnel**. « Rappeler le record
personnel de série d'un pilier quand la reprise s'en rapproche » figurait dans les **prochaines pistes**
de #487. Battre son propre record fait agir plus fort qu'un jalon générique : le run en cours prend du
sens quand on sait qu'il flirte avec un sommet personnel.

## Ce qui a été livré

Nouvelle fonction pure **`bestDailyStreak(dateKeys)`** — jumelle de `dailyStreak`, mais mesure la
**plus longue** série de jours consécutifs de l'historique (le RECORD), pas celle en cours. Ancrage à
midi (comme `wellnessBestStreak`) → robuste aux changements d'heure ; déduplique et ignore les clés
invalides.

Branché dans le **coach de la série en jeu** (`tone 'reinforce'`, hors rotation, série ≥ 3 non honorée
aujourd'hui). Quand la série en jeu touche un record **notable** (≥ 7 j — une vraie semaine à
défendre ; en dessous, palier/série suffisent), le coach ajoute une note, en **deux cas disjoints du
palier du jour** (on se tait si `streakMilestoneReach` a déjà parlé — une seule carotte bonus/jour) :

- **`break`** (`streak === best`, le run en cours EST déjà le record all-time) → un geste le
  **prolonge en nouveau record** :

  > 🏆 Et là tu bats ton record perso sur ton entraînement : jamais tu n'avais tenu autant de jours
  > d'affilée.

- **`near`** (`best > streak`, à ≤ 3 j) → un record d'un run **passé** est à portée, chiffré
  (aujourd'hui compte comme le 1er des jours à tenir pour l'égaler) :

  > Ton record perso ici est de 8 jours d'affilée — encore 3 jours pour l'égaler.

Points de conception :

- **Réutilise les dates du pilier** déjà collectées par le bloc `streakAtRisk` (mêmes prédicats
  d'activité). Le run en cours fait partie de l'historique → `best ≥ streak` par construction, donc
  `streak === best` ⟺ le run actuel est le max.
- **Record notable seulement** (≥ 7 j) : évite de qualifier de « record » une série de 3 j qui n'a rien
  à défendre — le palier/la série en jeu tiennent déjà la motivation précoce.
- **Une seule carotte bonus/jour** : gaté par `!streakMilestoneReach` → jamais deux célébrations
  empilées le même jour.
- **Additif pur** : nouveau champ `streakRecordReach` (`'break'` | `'near'` | `null`) TOUJOURS renvoyé ;
  note appendue à l'insight, action intacte. `bestDailyStreak` exportée.

## Vérif

- `bestDailyStreak` testée (deux runs → le plus long ; désordre/doublons/clés invalides ; run
  traversant un mois ; vide/null → 0).
- `adaptiveCoachFocus` reste pure ; test node:test étendu (run de 7 j = record → `break` + « tu bats
  ton record perso » ; record passé de 8 j à un run de 5 j → `near` + « encore 3 jours pour l'égaler »
  sans déclencher de palier ; séries de 3 et 6 j < 7 → `streakRecordReach` null).
- Check smoke bloquant `coachFocus` étendu (`fRecord` : 7 j → `break`, magnitude nommée ; séries de 3
  et 6 j → note record null).
- `cd src && xvfb-run -a npm run verify` : **465 tests + smoke 100 % vert**.

## Suite possible

- Micro-jalon de reprise après une série rompue : célébrer le retour à 2/3 jours d'affilée comme un
  « tu reconstruis ce que tu avais perdu » (piste #486/#487 encore ouverte).
- Fêter explicitement le franchissement d'un NOUVEAU record perso le jour où le geste est posé (côté
  célébration, pendant de ce signal d'anticipation).
</content>
</invoke>
