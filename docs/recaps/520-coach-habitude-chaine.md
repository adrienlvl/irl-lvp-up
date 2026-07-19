# 520 — Coaching : la chaîne d'habitude à ne pas casser aujourd'hui (2.0.151)

**Boucle #520 · build 2.0.151 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).**

## Le manque

Les recaps #517/#518/#519 concluaient à la **saturation des croisements inter-piliers** (sommeil
chronique × {nutrition, sport, focus}, hydratation × {focus, sport}, readiness du jour × {sport,
nutrition}) et poussaient vers une proposition de consolidation. Avant de m'y rabattre, relecture du
code réel de `adaptiveCoachFocus` : le coach lit les **4 piliers** (sport, focus, sommeil, nutrition),
les objectifs hebdo, la readiness, la charge (ACWR), l'hydratation, la balance… mais reste
**totalement aveugle au tracker d'habitudes** (`s.habits`). Le mot « habitude » n'apparaissait qu'en
texte générique ; **aucune** lecture de `s.habits`, alors que la demande de la nuit liste
explicitement « habitudes » parmi les données à exploiter et réclame « la recommandation concrète et
actionnable du jour » + « priorisation intelligente (quoi faire en premier aujourd'hui) ».

Or une **série d'habitude qui se joue aujourd'hui** (prévue ce jour, pas encore cochée) est le signal
le plus **time-critical** du coach : contrairement à une tendance chronique qui peut attendre, elle
**tombe** si la journée se termine sans validation. La protection de série (« don't break the chain »)
est l'un des leviers comportementaux les plus puissants. C'est une **source de données neuve**, pas
une 41ᵉ note de remplissage inter-pilier.

## Ce qui a été livré

Un nouveau champ **`habitAtRisk`** dans `adaptiveCoachFocus`, calculé juste avant l'objet de retour.
On réutilise **`habitsAtRisk`** (déjà testé : habitudes prévues ce jour, non cochées, série ≥ min,
triées série décroissante) avec le seuil **3** (même seuil « en jeu » que `streakAtRisk` des piliers).
Quand au moins une habitude est menacée, on **nomme la plus longue série** et on signale s'il en reste
d'autres à cocher :

> Ne casse pas la chaîne : ton habitude « Lecture » tient depuis 12 jours et n'est pas encore cochée
> aujourd'hui (+1 autre à cocher) — un petit geste et elle continue.

`habitAtRisk` renvoie `{ name, streak }` (la série menacée la plus longue) ou `null`.

## Conception

- **Source de données neuve, orthogonale aux piliers.** Le coach ne lisait jamais `s.habits`. La note
  s'appende **quel que soit le pilier/ton choisi** (sport, focus, sommeil, nutrition ; rebuild, revive,
  reinforce) — c'est un axe transversal, pas un croisement inter-pilier de plus.
- **Signal TIME-CRITICAL = priorité du jour.** Une série tombe ce soir si rien n'est fait ; les
  tendances chroniques, non. C'est pile « quoi faire en premier aujourd'hui ». On nomme la **plus
  longue** série menacée (déjà en tête de `habitsAtRisk`, trié desc) et on **compte le reste**
  (priorisation honnête sans noyer l'insight).
- **Seuil 3, cohérent avec l'existant.** Même seuil « en jeu » que `streakAtRisk` (pilier). En dessous,
  la chaîne ne vaut pas encore un rappel — `habitStreak` est tolérant au jour en cours, donc une série
  de 3 tient encore mais tombe le soir sans validation.
- **Alternance intacte.** La branche alternance `return` en amont : la note habitude ne s'y ajoute
  jamais, l'onglet 💼 (sacré) reste mono-focus.
- **Vocabulaire distinct, zéro collision.** « Ne casse pas la chaîne », « ton habitude "X" », « cochée
  aujourd'hui » — aucune collision à l'œil ni en regex avec `streakAtRisk` (« en jeu », « d'affilée sur
  ton pilier »), `brokenStreak` (« avant cette pause ») ni `streakRebuild` (« tu reconstruis »).
- **Additif pur.** `habitAtRisk` TOUJOURS renvoyé (`null` par défaut) ; note **appendue** à l'insight,
  action du jour **intacte**. Réemploi total de `habitsAtRisk` — **zéro** nouvelle fonction pure.

## Vérif

- `adaptiveCoachFocus` (logic.test.js, nouveau test dédié) : habitude quotidienne série 3 (13-14-15)
  non cochée le 16 → `habitAtRisk === { name:'Lecture', streak:3 }`, note « Ne casse pas la chaîne …
  tient depuis 3 jours » ; cochée aujourd'hui → `null`, note absente ; série 2 (< seuil) → `null` ;
  deux habitudes à risque → la plus longue (Lecture, 5) nommée + « (+1 autre à cocher) » ; aucune
  habitude → `null`.
- Check smoke bloquant `coachFocus` étendu : habitude à risque → note + `habitAtRisk.streak === 3` ;
  cochée → `null`, pas de note ; série trop courte → `null`.
- `cd src && xvfb-run -a npm run verify` : **497 tests + smoke 100 % vert**.

## Suite possible

- **Autre axe transversal habitude possible** (à ne pas forcer) : féliciter un **palier de série
  d'habitude** franchi aujourd'hui (le pendant positif de `habitAtRisk`, via `habitBestStreak`
  /`STREAK_MILESTONES`), ou surfacer une habitude à **régularité chroniquement basse** (`habitConsistency`)
  comme celle à relancer. À peser selon la valeur unitaire réelle, sans empiler.
- **Saturation des croisements inter-piliers toujours d'actualité** : la proposition de consolidation
  (table déclarative des guards plutôt que blocs `if` empilés, `adaptiveCoachFocus` > 1500 lignes)
  reste le meilleur candidat `docs/proposals/` dès qu'aucune capacité neuve à forte valeur ne se
  présente.
