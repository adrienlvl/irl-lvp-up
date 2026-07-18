# 447 — Coach Poids : seuil « maintien » d'`energyPlan` aligné sur `weightTargetAdvice` (2.0.79)

**Boucle #447 · build 2.0.79 · domaine Nutrition/Coach Poids · correctness (§4.1/§4.4)**

## Le manque (vérifié avant de coder, exécuté sous node)

`energyPlan` (`logic.js:4589`, plan calorique complet du Coach Poids) et `weightTargetAdvice`
(`logic.js:5135`, bloc conseil « recomposition/cible saine » du **même écran**) dérivent le MÊME
verdict perte/prise/maintien depuis `poids − cible`, avec une **logique de rythme identique**
(0,6 %/sem borné 0,25–0,9 kg en perte, 0,25 kg/sem en prise, même formule `weeks`). Seul le seuil
« maintien » divergeait : `< 0,3` dans `energyPlan`, `< 0,5` dans `weightTargetAdvice`.

`weightTargetAdvice` est la couche de conseil ajoutée **après** `energyPlan` (cf. commentaire
`logic.js:5121`, boucle #403) — la référence autoritaire. Sur la fenêtre `[0,3 ; 0,5[ kg`, les deux
fonctions se **contredisaient sur le même écran**.

**Reproduction (exécutée avant fix, `weight 80 → target 79,65`, écart 0,35 kg) :**

- `energyPlan(...)` → `goal: 'perte'`, `deficit: 528` kcal/j, `dailyTarget: 2231`, `weeks: 1`
  → affichait « Perdre 0,4 kg » + un vrai déficit calorique.
- `weightTargetAdvice(...)` → `direction: 'maintien'` (note « recomposition, le poids bougera peu »).

Or 0,35 kg ≈ 0,5 % du poids, soit l'ordre de grandeur de la fluctuation quotidienne eau/sel :
prescrire ~500 kcal/j de déficit pour un tel écart est absurde (il serait « brûlé » en ~5 jours puis
dépassé). Le seuil `0,3` est l'aberrant ; `0,5` (référence conseil) est le comportement correct.

Candidat trouvé par un audit frais des domaines nutrition/coach (hors famille legacy `w.exercise`
close #440→#444 et hors module Alternance #446). Trou de couverture : aucun test n'exerçait la
fenêtre `[0,3 ; 0,5[` d'`energyPlan` (les tests utilisaient des écarts de 0, 4 et 8 kg).

## Le correctif

`logic.js:4596` — seuil `Math.abs(diff) < 0.3` → `< 0.5`, aligné sur `weightTargetAdvice` (l. 5146),
avec commentaire expliquant l'alignement (même écran, même logique de rythme, fluctuation eau/sel).
Rétro-compatible : un écart ≥ 0,5 kg reste `perte`/`prise` à l'identique ; seule la zone `[0,3 ; 0,5[`
bascule de `perte`/`prise` (avec déficit/surplus factice) vers `maintien` (`weeks: 0`, `deficit: 0`).

## Tests

- **logic.test.js** (`energyPlan`) : +4 assertions — écart 0,35 kg → `goal: 'maintien'`, `deficit: 0`,
  `weeks: 0`, ET `weightTargetAdvice(...).direction === 'maintien'` pour la même entrée (les deux
  sœurs s'accordent). Les cas existants (perte 8 kg, prise 4 kg, maintien exact) restent verts.
- Pure logique (le rendu `renderCoachPlan`/`renderTargetAdvice` n'est pas modifié) : couverture par
  `logic.test.js`, check smoke `targetAdvice`/`coachWeight` reste vert. **444 tests + smoke 100 % vert.**

`cd src && xvfb-run -a npm run verify` → **OK** (`SMOKE OK`, `targetAdvice:true`).

## Suite

Deux verdicts du Coach Poids désormais cohérents pour tout écart poids↔cible. Aucune autre paire de
fonctions ne dérive la direction depuis `poids − cible` (grep confirmé) → pas de jumeau restant.
Piste voisine de complétude (confiance faible, NON traitée) : `examCountdown` (`logic.js:1744`) fait
`weeksLeft: Math.round(d/7)` (→ 0 à J‑3) là où `studyPacing` (`logic.js:1767`) borne à `Math.max(1, …)`
— arrondi défendable, pas un résultat objectivement faux ; ne pas coder tel quel.
