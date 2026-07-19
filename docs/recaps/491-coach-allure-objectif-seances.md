# 491 — Coaching : le coach juge l'allure de ton objectif de séances (2.0.122)

**Boucle #491 · build 2.0.122 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

Quand le pilier poussé est le SPORT et qu'un objectif hebdo de séances est défini
(`goals.sessions`), `adaptiveCoachFocus` affichait un simple **compteur figé** :
« Objectif hebdo : 2/4 séances. ». Utile, mais **muet sur l'essentiel** : cet objectif est un
**quota à date butoir** (dimanche). Deux personnes à « 2/4 » ne sont pas dans la même situation
selon qu'on est **mardi** (encore 6 jours, large) ou **samedi** (2 jours, quasi mort). Le coach ne
disait ni si l'objectif était **encore jouable**, ni **quoi faire** pour le tenir — exactement
l'« adaptation aux progrès ET aux écarts » + la « recommandation actionnable du jour » demandées.

## Ce qui a été livré

Un **coach d'allure** greffé sur le compteur objectif sport. Quand l'objectif n'est pas encore tenu
(`wc < g`), il calcule la **faisabilité réelle** — séances restantes à faire (`need = g − wc`) face
aux **jours restants** de la semaine calendaire où en caser une (`remain`) — et adapte le message en
trois registres (champ `sessionGoalPace`) :

- **`onpace`** (de la marge, `need < remain`) : « Dans les temps : 3 séances en 6 jours restants —
  tu as la marge pour boucler l'objectif hebdo. »
- **`tight`** (`need === remain`) : « Serré mais jouable : 3 séances pour 3 jours restants — il en
  faut une chaque jour pour tenir l'objectif. »
- **`unreachable`** (`need > remain`) : « L'objectif de 4 ne passera plus cette semaine (3 séances
  pour 2 jours restants) — engrange ce que tu peux, tu repars plein lundi. » (et, la semaine bouclée
  sans marge : « La semaine se termine à 1/4 — pas un échec, un objectif à viser plein dès lundi. »)

Un objectif chiffré **selon le temps qui reste** guide mieux qu'un compteur figé — sans jamais
culpabiliser quand la semaine est simplement trop courte.

## Conception

- **Un jour restant = une DATE active** : `remain` compte les jours FUTURS où une nouvelle date de
  séance peut encore tomber, cohérent avec `wc` (qui compte des dates distinctes). On **exclut
  aujourd'hui** de `remain` si la séance du jour est déjà posée (elle ne libère plus de date) —
  sinon un dimanche soir déjà entraîné aurait paru « encore jouable ».
- **Semaine calendaire** (lundi → dimanche), la même que le compteur `wc` existant ; `daysLeftIncl`
  vaut 7 le lundi, 1 le dimanche.
- **Additif pur** : champ `sessionGoalPace` (`'onpace' | 'tight' | 'unreachable' | null`) TOUJOURS
  renvoyé ; note **appendue** au compteur, aucune autre branche touchée. Muet (`null`) sans objectif
  défini ou objectif déjà tenu (le « déjà tenu 💪 » historique suffit).

## Vérif

- `adaptiveCoachFocus` reste pure ; test node:test dédié couvrant les 5 cas (mardi → onpace 3/6 ;
  vendredi → tight 3/3 ; samedi → unreachable 3/2 ; dimanche séance faite → semaine terminée 1/4 ;
  objectif tenu 4/4 → `null` ; sans objectif → `null`).
- Check smoke bloquant `coachFocus` étendu (`fPaceTight` serré, `fPaceOut` hors de portée, absence
  d'allure sans objectif).
- `cd src && xvfb-run -a npm run verify` : **467 tests + smoke 100 % vert**.

## Suite possible

- Étendre l'allure au **focus** (`focusWeekGoal` expose déjà done/target/status) et au **run**
  (`runWeekGoal`), avec le même raisonnement jours-restants.
- Croiser l'allure « serré » avec l'agenda : proposer les créneaux libres des jours restants quand
  il faut une séance chaque jour pour tenir l'objectif.
