# #615 — Plan de recalage du sommeil : la barre ne peut plus se remplir à 100 % « sans être atteinte » (2.0.228)

**Domaine choisi : `sommeil`** (frais — absent des 5 derniers recaps ; `coach` et `etudes` bloqués
par la rotation §4 bis : `coach` 2× sur 5 dont le plus récent, `etudes` dans les 2 derniers). La
priorité de nuit « coaching à fond » tombe sous §3 : la rotation s'applique **pleinement** au domaine
`coach`, qui a donc attendu son tour ce tour-ci. Angle robustesse par **mesure** (méthode P5), pas par
supposition.

## Le défaut (prouvé par fuzzing, pas supposé)

Fuzzer déterministe sur 8 000 plans « à la Adrien » (couchers tard 21 h–8 h, cibles 22 h 30–00 h,
recalage) → **395 cas** où `sleepPlanDay` renvoyait `progress: 100` **alors que** `reached: false`
**et** `daysLeft > 0`. C'est exactement la contradiction que le correctif du champ `reached` (commentaire
`logic.js` ~10037) avait éliminée côté « atteint » : **barre pleine** + « objectif pas encore atteint »
+ « arrivée dans N jours » = trois repères qui se contredisent à l'écran.

## Cause

`progress` avait un raccourci : `reached ? 100 : (totalShift > 0 ? …calcul… : 100)`.
`totalShift = startAnchor − targetAnchor` : pour un plan de recalage normal (partir d'un coucher tardif
vers un coucher plus tôt) il est **positif**, et le calcul est correct. Mais dans le cas **dégénéré**
`totalShift ≤ 0` — le point de départ enregistré par le plan est déjà **aussi tôt ou plus tôt** que
l'objectif — la branche `: 100` forçait la barre pleine **sans regarder la réalité**. Or le coucher réel
récent (`recentAnchor`) pouvait avoir glissé **après** l'objectif : `reached` et `daysLeft` reflétaient,
eux, correctement ce retard → seul `progress` mentait.

Cas réel possible : plan créé avec une cible **plus tardive** que le coucher médian du moment (objectif
« facile »), puis rechute vers plus tard. Niche mais atteignable via l'UI, et le rendu devenait incohérent.

## Le correctif (curation, pure logic, valeur identique pour tout plan normal)

Progression re-mesurée sur le **pire point réel** entre le départ du plan et le coucher récent :

```js
const fromPos = recentAnchor != null ? recentAnchor : idealAnchor;
const effShift = Math.max(startAnchor, fromPos) - targetAnchor;   // ≥ 0
const remainPos = Math.max(0, fromPos - targetAnchor);
const progress = reached ? 100 : (effShift > 0 ? clamp((effShift - remainPos) / effShift * 100) : 100);
```

Preuve d'équivalence pour `totalShift > 0` (tous les plans normaux) : quand `recent ≤ start`,
`effShift = totalShift` et `(effShift − remainPos)/effShift = (start − recent)/totalShift` = l'ancien
`(startAnchor − donePos)/totalShift`. Quand `recent > start` (régression), les deux donnent 0. Sans
données, `fromPos = idealAnchor ≤ start` → identique aussi. **Toutes les assertions `sleepPlanDay`
existantes passent sans changement** ; seul le cas dégénéré est corrigé (100 → valeur réelle < 100 tant
que non atteint).

## Vérifs

- Test étendu `sleepPlanDay` : plan dégénéré (départ 23:12 ≤ objectif 23:30) + coucher réel 23:56
  → `reached=false`, `daysLeft>0`, **`progress<100`** ; même plan avec coucher 23:20 → atteint,
  `progress=100`, `daysLeft=0` (cohérent).
- Fuzzer re-passé : **0 anomalie** sur 8 000 plans (contre 395 avant).
- `xvfb-run -a npm run verify` → **563 tests + smoke, 100 % vert**. Build **2.0.228**.

## §4 ter (texte lu par l'utilisateur)

`progress` alimente la barre du « 🌙 Plan de recalage du sommeil ». Le correctif **retire** un repère
faux (barre pleine trompeuse) et n'ajoute aucun message. Rendu plus cohérent, pas plus chargé.

Domaine : sommeil
