# #561 — Coach : le crédit de suivi n'écrase plus l'action « lève le pied »

**Build 2.0.186** · domaine `coach` · demande de nuit (Coaching adaptatif à fond, CAP 3.0 étape 1).
Fichiers : `src/lib/logic.js` (`adaptiveCoachFocus`, bloc `followThrough`), `src/test/logic.test.js`,
`src/lib/logic.js` (CHANGELOG), assertions `CHANGELOG[0].v` (logic.test.js + renderer-smoke.cjs).

## Pourquoi cette itération est du `coach` (rotation §4 bis vérifiée)

`for f in $(ls -t docs/recaps/*.md | head -5)…` → `#560 tests · #559 etudes · #558 coach · #557 robustesse ·
#556 tests`. Les **2 derniers** recaps = #560 (tests) et #559 (etudes) ; `coach` (#558) **n'y est pas** et
n'apparaît **qu'une fois** dans les 5 derniers → la rotation §4 bis **autorise `coach`** cette boucle. La
priorité de nuit (DEMANDES.md) pointe le coaching adaptatif ; §3 rappelle que la rotation prime même sur
elle — ici elle ne bloque pas, les deux convergent. (Mon premier `grep -h` avait donné un ordre trompeur —
recontrôlé fichier par fichier avant de coder.)

## Le défaut réel (contradiction entre deux guards — attrapé en rendu chargé, §4ter)

`adaptiveCoachFocus` a un bloc **méta-conscient positif** (`logic.js` l. ~7017) : en ton `reinforce` (bon
élan, hors rotation) avec un suivi récent élevé des conseils (`coachFollowThrough ≥ 70 %` sur ≥ 3 jours), le
coach **crédite** l'effort dans l'insight (« Tu as tenu 3/3 de mes caps cette semaine ») **et réécrivait
l'action** en « Un jour actif de plus aujourd'hui : tu prouves que la régularité te ressemble. ».

Son garde-fou ne testait qu'`if (loadSpike == null)`, avec le commentaire « un jour actif de plus
contredirait *allège aujourd'hui* ». Or `loadSpike` (pic de charge, l. 6188) exige `readiness null ou ≥ 50`,
tandis que les **deux autres** signaux « lève le pied » exigent l'inverse :

- **readiness < 50** → action « récupération prioritaire : vise mobilité, marche ou technique légère » (l. 5533),
- **readinessSlide** (forme qui glisse, readiness 50-74, tendance ≤ -12 sur ≥ 4 check-ins) → action « Séance
  allégée aujourd'hui, et soigne ta récup » (l. 6140).

Ces deux-là sont **mutuellement exclusifs** de `loadSpike` → `loadSpike == null` ne les couvrait **jamais**.
Résultat, reproduit en **rendu réel chargé** (état : série 13-14-15 finissant hier → `reinforce`, coachLog
sport ×3 tous honorés → suivi 100 %, recovery du jour `sleep 3/fatigue 5/soreness 5` → readiness **15/100**) :

```
ACTION : Un jour actif de plus aujourd'hui : tu prouves que la régularité te ressemble.
```

…alors que le coach venait de calculer « récupération prioritaire, pas de grosse séance ». « Repose-toi » et
« fais un jour actif de plus » le même jour, sur une **réserve vide** — exactement le conseil dangereux
(blessure, dégoût) que la ligne 5533 existe pour éviter. C'est le cas de figure §3 « corriger un guard qui en
**contredit** un autre », pas du volume.

## Le correctif (garde-fou élargi, aucune note ajoutée ni retirée)

Le coach possède **déjà** la définition canonique de « le sport doit lever le pied aujourd'hui » — `sportEase`
(l. ~7200) : `(readiness < 50) || loadSpike != null || readinessSlide != null`. On reprend **exactement** les
trois signaux au lieu du seul pic :

```js
const sportEaseToday = chosen.pillar === 'sport'
  && ((readiness != null && readiness < 50) || loadSpike != null || readinessSlide != null);
if (!sportEaseToday) action = 'Un jour actif de plus aujourd'hui : tu prouves que la régularité te ressemble.';
```

Le **crédit du suivi reste dans l'insight** (inchangé) — on ne retire rien de ce que le coach dit, on cesse
seulement d'**écraser** un conseil actionnable par un slogan contradictoire. Pour les piliers **non-sport**,
`sportEaseToday` est faux (readiness/slide/spike n'existent que pour le sport) → comportement **inchangé**.

## Vérif (rendu réel, §4ter)

Trois états rendus pour de vrai (script jetable) et couverts par le nouveau test :
- **readiness 15/100 + reinforce + suivi 100 %** → action = « Readiness 15/100 — récupération prioritaire… »
  (plus « jour actif de plus ») ; insight garde « Tu as tenu 3/3 de mes caps ». L'insight `streakAtRisk`
  (« un seul geste aujourd'hui la garde vivante ») **s'harmonise** avec l'action légère — pas de contradiction
  résiduelle.
- **forme qui glisse (readiness 60, -40 pts)** → action « Séance allégée aujourd'hui » préservée.
- **readiness verte (100)** → « Un jour actif de plus » **reste** affiché (garde-fou anti-sur-correction, aucune
  régression).

Nouveau test logique `adaptiveCoachFocus : le crédit de suivi (reinforce) n'écrase pas l'action « lève le
pied »` (les 3 cas). `cd src && xvfb-run -a npm run verify` → **524 tests + smoke, exit 0**.

## Pistes vérifiées mises de côté (pour de prochaines boucles `coach`, hors rotation immédiate)

Deux autres contradictions/défauts confirmés par lecture du code lors de cette chasse (non traités ici pour
garder un correctif net) :
- **recompFraming vs coupe calorique** (`logic.js` ~5919 vs ~5949) : en objectif de perte + stagnation +
  taille qui fond, l'insight peut dire « vise ~X kcal de moins » **puis** « tiens tes calories encore une
  semaine avant de couper » — deux ordres caloriques opposés dans la même phrase. Fix : ne pas émettre le
  `tail` de coupe chiffrée quand `recompFraming` va s'appliquer.
- **followThrough hors sport** (`logic.js:7024`) : pour les piliers `sommeil`/`focus`/`nutrition` en
  `reinforce`, « Un jour actif de plus aujourd'hui » écrase une action pilier-spécifique riche (ex. cible de
  coucher du plan de recalage) par un slogan de saveur sportive — « un jour actif » n'a pas de sens pour le
  sommeil. Fix : borner l'écrasement aux piliers où l'expression a du sens (jugement à poser avec §4ter).

Domaine : coach
