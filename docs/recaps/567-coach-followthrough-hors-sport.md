# #567 — Coach : le crédit de suivi n'écrase plus l'action d'un pilier NON-sport

**Build 2.0.190** · domaine `coach` · demande de nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).
Fichiers : `src/lib/logic.js` (`adaptiveCoachFocus`, bloc `followThrough` ~l. 7099), `src/test/logic.test.js`,
`CHANGELOG` (logic.js) + les 2 assertions `CHANGELOG[0].v` (logic.test.js + renderer-smoke.cjs).

## Pourquoi cette itération est du `coach` (rotation §4 bis vérifiée)

`grep -h "^Domaine :" $(ls -t docs/recaps/*.md | head -5)` → `#566 a11y · #565 etudes · #564 coach ·
#563 tests · #562 etudes`. Les **2 derniers** recaps = #566 (a11y) et #565 (etudes) ; `coach` (#564)
**n'y est pas** et n'apparaît **qu'une fois** dans les 5 derniers → la rotation §4 bis **autorise
`coach`** cette boucle. La priorité de nuit (DEMANDES.md) pointe le coaching adaptatif ; §3 rappelle
que la rotation prime même sur elle — ici elle ne bloque pas, les deux convergent.

## Le défaut réel (piste vérifiée #561, attrapée en rendu chargé §4ter)

Suite directe de #561 (garde-fou readiness) et #564 (recomp vs coupe). Le bloc **méta-conscient positif**
de `adaptiveCoachFocus` (`logic.js` ~l. 7086) : en ton `reinforce`, hors rotation, avec un suivi récent
élevé des conseils (`coachFollowThrough ≥ 70 %` sur ≥ 3 jours), le coach **crédite** l'effort dans
l'insight **et réécrivait l'action** en « Un jour actif de plus aujourd'hui : tu prouves que la régularité
te ressemble. ».

Depuis #561 le garde-fou ne bornait l'écrasement qu'aux jours où **le sport doit lever le pied**
(`sportEaseToday` = readiness < 50 / loadSpike / readinessSlide) — mais **uniquement pour le pilier sport**.
Pour les piliers **non-sport** (`sommeil`/`focus`/`nutrition`), `sportEaseToday` est toujours faux → la
condition `if (!sportEaseToday)` était **toujours vraie** → l'action pilier-spécifique se faisait **systématiquement**
écraser par le slogan **sportif** « un jour actif de plus ». Or « un jour actif » n'a **aucun sens pour le
sommeil** — une nuit ne se « fait » pas dans la journée.

Reproduit en **rendu réel chargé** (script jetable) — sommeil **en hausse** (5 nuits cette semaine vs 2 la
précédente → `reinforce`, pilier sommeil), `coachLog` sommeil ×3 tous honorés → `followThrough` 100 % :

```
AVANT : ACTION = « Un jour actif de plus aujourd'hui : tu prouves que la régularité te ressemble. »
APRÈS : ACTION = « Vise un coucher 30 min plus tôt ce soir. »
```

L'insight, lui, disait déjà « Sommeil solide : moy. 8 h sur 6 nuits, rythme régulier. » — un slogan « jour
actif » collé dessous est à la fois **hors-sujet** (sport) et **destructeur** (il jette le seul conseil
actionnable de coucher). C'est le cas de figure §3 « corriger un guard qui en **contredit** un autre », pas du
volume : **aucune note ajoutée**.

## Le correctif (garde-fou borné au sport, aucune note ajoutée ni retirée)

```js
const sportEaseToday = chosen.pillar === 'sport'
  && ((readiness != null && readiness < 50) || loadSpike != null || readinessSlide != null);
if (chosen.pillar === 'sport' && !sportEaseToday) action = 'Un jour actif de plus aujourd'hui : …';
```

On ajoute `chosen.pillar === 'sport' &&` devant l'écrasement. Le **crédit du suivi reste dans l'insight**
(inchangé, tous piliers confondus) — on cesse seulement d'**écraser** l'action riche d'un pilier non-sport
par un slogan sportif. Pour le **sport**, le comportement est **strictement inchangé** (`sportEaseToday`
exige déjà `pillar === 'sport'`, donc les deux branches sport se comportent comme avant).

## Vérif (rendu réel, §4ter)

Cinq états rendus pour de vrai (script jetable) :
- **sommeil reinforce + ft 100** → action « Vise un coucher 30 min plus tôt ce soir. » (plus « jour actif »).
- **focus reinforce + ft 100** → action de base focus « Encore un jour actif aujourd'hui… » (plus le slogan « un jour actif de **plus** »).
- **nutrition reinforce + ft 100** → idem, action de base nutrition préservée.
- **sport reinforce vert (readiness 100)** → « Un jour actif de plus » **reste** (non-régression).
- **sport reinforce readiness 15/100** → « récupération prioritaire… » **préservée** (non-régression #561).

Nouveau test logique `adaptiveCoachFocus : le crédit de suivi (reinforce) n'écrase pas l'action d'un pilier
NON-sport`. `cd src && xvfb-run -a npm run verify` → **528 tests + smoke, exit 0**.

## Pistes coach restantes

La chasse #561 est désormais **entièrement traitée** : followThrough-repos (#561), recomp vs coupe (#564),
followThrough hors sport (ce recap). Prochaine boucle `coach` : repartir d'une nouvelle lecture chargée
d'`adaptiveCoachFocus` (curation/hiérarchisation du rendu cumulé, §3 qualité pas volume).

Domaine : coach
</content>
</invoke>
