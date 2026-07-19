# 490 — Coaching : le coach salue le micro-jalon de reprise (2.0.121)

**Boucle #490 · build 2.0.121 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

`adaptiveCoachFocus` (« Le focus du moment ») savait brandir une **série en jeu** (`streakAtRisk`,
≥ 3 j), le **palier** à décrocher, le **record perso** approché (#484→#488), et **consoler** une
série cassée côté correction (`brokenStreak`, #486/#487). Mais la marche la plus fragile — et la
plus décisive — d'un retour restait **muette** : quand une série **repart après une rupture**, ses
**2 premiers jours** tombent SOUS le seuil « en jeu » de 3, donc rien ne les saluait, alors même que
c'est là qu'on rebâtit ce qu'on avait perdu et que l'encouragement compte le plus. « Célébrer le
retour à 2/3 jours d'affilée comme un “tu reconstruis ce que tu avais perdu” » figurait dans les
**prochaines pistes** de #486/#487/#488 (piste répétée, jamais traitée).

## Ce qui a été livré

Nouveau signal **`streakRebuild`** dans le bloc renforcement. Quand le coach **renforce** un pilier
(`tone 'reinforce'`, hors rotation, hors `comeback`) dont la série **en cours est courte** (2 ou 3 j,
`streakAtRisk` resté muet — soit streak < 3, soit streak 3 mais geste du jour déjà posé) ET qu'il
existe un **record perso NOTABLE** (`bestDailyStreak` ≥ 7 j) au-dessus, il nomme la **reconstruction**
et cite le record comme **cap** vers lequel remonter :

> 🌱 Tu reconstruis : 2 jours d'affilée sur ton entraînement, tu retrouves le chemin de ta meilleure
> série (record perso : 12 jours). Le plus dur — repartir — est derrière toi, une marche à la fois.

Repartir après une chute demande plus de cran que tenir : le saluer transforme un compteur « trop
petit pour compter » en preuve qu'on remonte.

## Conception

- **Réutilise l'existant** : `dailyStreak` (série en cours) + `bestDailyStreak` (record all-time,
  #488), aucun nouveau calcul ni champ d'état.
- **Disjoint par construction** : de `streakAtRisk` (série ≥ 3 « en jeu » — garde `streakAtRisk == null`,
  qui couvre streak < 3 ET streak 3 avec geste du jour posé) ; du `comeback` (relance après long trou,
  ≥ 14 j — il raconte déjà l'histoire) ; de `brokenStreak` (ton `rebuild`, côté correction).
- **Record notable seulement** (≥ 7 j) : une reprise n'est un « retour vers du solide » que s'il y
  avait du solide — cohérent avec le seuil des autres signaux de record (#488).
- **Additif pur** : champ `streakRebuild` (record perso visé, ou `null`) TOUJOURS renvoyé ; note
  **appendue** à l'insight, action **intacte**. Dégrade proprement sans record notable.

## Vérif

- `adaptiveCoachFocus` reste pure ; test node:test étendu (reprise 2 j + record 7 j → `streakRebuild`
  7 + « Tu reconstruis : 2 jours » + « record perso : 7 jours » ; reprise 3 j avec geste du jour posé
  → `streakRebuild` 7 + « 3 jours » ; série 2 j sans record ≥ 7 → `null` ; séries en jeu de 3 et 5 j
  → `null`, c'est `streakAtRisk` qui parle).
- Check smoke bloquant `coachFocus` étendu (`fRebuild` : 2 j + record 7 j → reconstruction saluée ;
  série 3 j en jeu → `streakRebuild` null).
- `cd src && xvfb-run -a npm run verify` : **466 tests + smoke 100 % vert**.

## Suite possible

- Fêter explicitement, côté **célébration** (pas seulement anticipation), le jour où la reprise
  RATTRAPE puis DÉPASSE l'ancien record perdu.
- Graduer le micro-jalon selon l'ampleur du record retrouvé (retrouver le chemin d'un mois vs d'une
  semaine), comme `brokenStreakTier` (#487) le fait pour la série cassée.
