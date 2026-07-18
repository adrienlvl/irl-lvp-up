# #465 — Coaching adaptatif : coach méta-conscient (micro-marche quand ignoré) (2.0.96)

Priorité de la nuit (DEMANDES.md) : pousser le **Coaching adaptatif** à fond. Après le sommeil
(#459→461) et la nutrition (#464), une nouvelle capacité **transversale** : le coach remarque quand
son propre conseil ne prend pas, et **change de stratégie** au lieu de répéter plus fort.

## Le problème

`adaptiveCoachFocus` avait deux garde-fous liés au journal (`s.coachLog`) :
- la **rotation anti-radotage** (même pilier en focus 3 jours de suite → on change de PILIER) ;
- `coachFollowThrough`, qui **mesure** le taux de suivi mais ne servait qu'à une ligne d'affichage
  séparée (`#coachFollow`) — il n'influençait **pas** le message du coach.

Résultat : si Adrien laissait le coach pousser deux fois sur le même pilier (sport, focus, sommeil,
nutrition) **sans rien faire**, le coach re-servait la même consigne (« Programme une séance
courte… ») au même volume. Un conseil ignoré répété à l'identique finit ignoré plus fort.

## Ce qui change (1 greffe pure dans `adaptiveCoachFocus`)

Nouvelle prise de conscience **méta** : pour le pilier choisi (tons « à corriger » rebuild/revive,
hors rotation, hors alternance qui `return` avant), on compte les jours des **7 derniers jours
révolus** où ce MÊME pilier a été journalisé comme focus **sans** activité ce jour-là (conseil
**ignoré**, pas juste répété). Si ≥ 2 → le coach **abaisse la barre** :
- **Action** remplacée par une **micro-marche** imbattable, propre à chaque pilier :
  - sport → « Vise juste 5 min de mouvement… une marche, 10 squats. »
  - focus → « Un seul bloc de 10 min, minuteur lancé. »
  - sommeil → « Ce soir, un seul geste : écrans coupés 15 min plus tôt. »
  - nutrition → « … juste 1 apport riche en protéines (œufs, skyr, thon). »
- **Insight** complété d'une reconnaissance honnête : « Je t'ai déjà soufflé ce cap sans que ça
  prenne — alors on abaisse la barre, pas toi. »
- Champ `microStep: true` exposé (testable, stylable plus tard).

Distinct de la rotation : ici on **garde** le pilier décroché mais on **abaisse l'exigence**. Un
coach qui remarque que son approche ne prend pas et s'adapte vaut mieux qu'un coach qui hausse le ton.

## Vérification

- Sport en décrochage, journal sport ignoré 2 j → `microStep=true`, action « 5 min », insight
  « abaisse la barre, pas toi ».
- 1 seul jour ignoré → pas de bascule (seuil = 2). Conseil **suivi** (activité ce jour-là) → ne
  compte pas comme ignoré.
- Focus alternance (priorité absolue) → jamais de `microStep`.
- Rotation (pilier changé après 3 j) → pas de micro-marche (garde `!rotated`).

## Tests

453 tests (nouveau test dédié : bascule à 2 ignorés, seuil, conseil suivi, alternance exclue) +
check smoke **bloquant** `coachFocus` étendu (rendu réel : `microStep=true`, action « 5 min »,
insight « abaisse la barre »). Verify 100 % vert.

## Contexte

Build **2.0.96**. Sur `master` + PWA ; **pas de Release** (regroupée avec la série Coaching en cours).
La chaîne s'étoffe : le coach parle chiffres et actions concrètes sur les 4 piliers, **et** ajuste
son exigence selon qu'on le suit ou pas. Prochaine piste : enrichir le pilier **focus** hors
objectif, ou célébrer explicitement un `coachFollowThrough` élevé dans le ton d'un focus « reinforce ».
