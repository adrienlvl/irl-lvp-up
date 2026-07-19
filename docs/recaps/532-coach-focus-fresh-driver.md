# 532 — Coaching : le coach nomme CE QUI porte ta fraîcheur mentale (focusFreshDriver)

**Build 2.0.163 · boucle #532 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1)**

## Le manque

À la boucle #531, le coach « Le focus du moment » (`adaptiveCoachFocus`, `logic.js`) a appris à
dire POURQUOI ta forme est **bonne** côté SPORT : `readinessBoost` (via `readinessDriver`) nomme le
**moteur dominant** — belle nuit, énergie au top, muscles frais — quand la readiness est au vert et
que le pilier poussé est le sport. Le recap #531 signalait lui-même la **suite manquante** : côté
**FOCUS**, `focusGoalFresh` (#509) sait déjà dire, quand ton objectif de deep work hebdo est **serré**
ET que ta readiness du matin est **au vert** (≥ 75), « les deux signaux s'alignent, c'est LE moment de
pousser » — mais il restait **muet sur QUELLE composante** du check-in te rend l'esprit si clair. Le
pendant exact de `readinessBoost`, appliqué à la concentration, n'existait pas. Or reconnaître le geste
qui te donne un **cerveau prêt** (une belle nuit, une énergie haute) ferme la boucle « adaptation aux
**PROGRÈS** » côté focus : Adrien voit quel comportement paie et le **répète**.

## Ce qui est livré

Nouveau champ **`focusFreshDriver`** (`{ factor: 'sleep'|'fatigue', value }` ou `null`, **toujours**
renvoyé). Quand `focusGoalFresh` est posé (objectif focus serré × readiness ≥ 75 le jour même) et
qu'un moteur **domine** le check-in, le coach le **NOMME** et le relie au deep work, **appendu à
l'insight** :

- sommeil → « Et ce qui nourrit cette fraîcheur mentale : ta nuit de **8 h** — un cerveau reposé est
  le vrai **carburant du deep work**, attaque d'abord ta tâche la plus exigeante tant que la tête suit. »
- énergie → « … ton **énergie est au top** (fatigue 1/5) — l'esprit est vif, profite-en pour aller au
  fond du bloc le plus dur avant que la journée l'entame. »

Réemploi **total** de `readinessDriver` (le helper pur de #531) — **zéro** nouvelle fonction.

## Garde-fous & honnêteté

- **Sommeil OU énergie SEULEMENT.** `readinessDriver` peut renvoyer `soreness` comme moteur dominant
  (muscles frais), mais des muscles frais ne **portent pas** une session de concentration : quand
  c'est ce facteur qui domine, on **se tait** (`focusFreshDriver` null malgré le vert) plutôt que de
  servir une explication douteuse. **Honnêteté avant complétude** — la vraie différence avec le sport,
  où les trois moteurs comptent.
- **Un seul moteur net.** `readinessDriver` n'émet qu'une composante à `frac ≥ 0,75` **ET** ≥ 0,2
  au-dessus de la 2e : trois forces à égalité (nuit 8 h, fatigue 1/5, courbatures 1/5 → tout à frac 1)
  → `null` → note absente. Pas de moteur au hasard.
- **Mutuellement exclusif** de `focusGoalDrained` par construction (fresh sur ≥ 75, drained sur < 50)
  et cantonné à la branche `chosen.pillar === 'focus'` (jamais avec les notes sport).
- **Affine, ne remplace pas.** Note **appendue** à l'insight ; `focusGoalPace`/`focusGoalFresh` et
  l'action du jour restent intacts.
- **Vocabulaire distinct** (« nourrit cette fraîcheur mentale », « carburant du deep work ») → zéro
  collision à l'œil ni en regex avec `readinessBoost` côté sport (« Ce qui te porte aujourd'hui ») ni
  avec la note `focusGoalFresh` (« les deux signaux s'alignent »).

## Vérification

- Test `logic.test.js` (bloc allure focus) : moteur **sommeil** (8/2/2 → score 85 → `{sleep, 8}`,
  « ta nuit de 8 h », « carburant du deep work »), moteur **énergie** (6/1/3 → score 75 → `{fatigue, 1}`),
  **courbatures dominantes honnêtement écartées** (6/2/1 → score 83, driver soreness → `null`, note
  muette), tout au top à égalité (8/1/1 → `null`), forme à plat (< 50 → `null`).
- Check smoke **bloquant** `coachFocus` étendu : moteur sommeil nommé (`focusFreshDriver.factor ===
  'sleep'`, « ta nuit de 8 h », « carburant du deep work »), tout au top → `null` + note muette,
  courbatures dominantes → `null` + note muette.
- `cd src && xvfb-run -a npm run verify` → **100 % vert** (510 tests node, SMOKE OK, EXIT=0).

## Suite possible

Le pendant OPPOSÉ côté focus manque encore : quand `focusGoalDrained` fire (forme à plat, « focus
court aujourd'hui »), nommer le **frein dominant** via `readinessLimiter` (« ce qui te plombe : ta nuit
courte de 4 h ») — le pendant de `readinessDrag` (#525, sport) appliqué au deep work.
