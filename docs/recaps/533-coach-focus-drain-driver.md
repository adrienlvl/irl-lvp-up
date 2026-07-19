# 533 — Coaching : le coach nomme CE QUI te plombe la tête les jours à plat (focusDrainDriver)

**Build 2.0.164 · boucle #533 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1)**

## Le manque

À la boucle #532, le coach « Le focus du moment » (`adaptiveCoachFocus`, `logic.js`) a appris à
nommer, côté FOCUS, CE QUI **porte** ta fraîcheur mentale les bons jours : `focusFreshDriver` (via
`readinessDriver`) désigne le **moteur dominant** — belle nuit, énergie au top — quand ta semaine de
deep work est serrée ET que ta readiness du matin est au vert. Le recap #532 signalait lui-même la
**suite manquante** : le cas **OPPOSÉ**. Quand `focusGoalDrained` (#510) fire — objectif focus serré
mais readiness au **plancher** (< 50) — le coach disait déjà « focus court aujourd'hui, soigne ta
récup », mais restait **muet sur QUELLE composante** du check-in brume la tête. Le pendant exact de
`readinessDrag` (#525, sport), appliqué au deep work, n'existait pas. Or nommer le frein qui compte
rend l'action bien plus actionnable qu'un score nu : Adrien sait QUOI soigner ce soir pour retrouver
un esprit prêt demain.

## Ce qui est livré

Nouveau champ **`focusDrainDriver`** (`{ factor: 'sleep'|'fatigue', value }` ou `null`, **toujours**
renvoyé). Quand `focusGoalDrained` est posé (objectif focus serré × readiness < 50 le jour même) et
qu'un frein **domine** le check-in, le coach le **NOMME** et dit quoi soigner, **appendu à
l'insight** :

- sommeil → « Et ce qui te plombe la tête aujourd'hui : ta nuit courte de **4 h** — recharge le
  sommeil ce soir, c'est lui qui remettra ton cerveau en état de deep work, pas l'acharnement du jour. »
- énergie → « … ta **fatigue générale** (5/5) — le repos de ce soir vaut plus qu'un bloc forcé
  maintenant, tu retrouveras un esprit bien plus tranchant demain. »

Réemploi **total** de `readinessLimiter` (le helper pur de #525) — **zéro** nouvelle fonction. Le
coach ferme ainsi la symétrie complète côté focus : il nomme et le **moteur** de la fraîcheur
(`focusFreshDriver`) et le **frein** de la brume (`focusDrainDriver`).

## Garde-fous & honnêteté

- **Sommeil OU énergie SEULEMENT.** `readinessLimiter` peut renvoyer `soreness` comme frein
  dominant, mais des muscles douloureux pèsent sur une **séance**, pas sur un **bloc de
  concentration** : quand c'est ce facteur qui domine, on **se tait** (`focusDrainDriver` null malgré
  le plancher) plutôt que de blâmer à tort les courbatures pour un cerveau brumeux. **Honnêteté avant
  complétude** — le miroir EXACT du garde-fou de `focusFreshDriver`, qui écarte les muscles frais
  côté positif.
- **Un seul frein net.** `readinessLimiter` n'émet qu'une composante avec déficit ≥ 15 **ET** ≥ 6 de
  marge sur la 2e : deux freins à égalité (fatigue 4/5 ET courbatures 4/5) → `null` → note absente.
  Pas de frein au hasard.
- **Mutuellement exclusif** de `focusFreshDriver` par construction (drained sur < 50 XOR fresh sur
  ≥ 75) et cantonné à la branche `chosen.pillar === 'focus'`.
- **Affine, ne remplace pas.** Note **appendue** à l'insight ; `focusGoalPace`/`focusGoalDrained` et
  l'action du jour restent intacts.
- **Vocabulaire distinct** (« Et ce qui te plombe la tête ») → zéro collision à l'œil ni en regex
  avec `readinessDrag` côté sport (« Ce qui pèse le plus »), `focusFreshDriver` (« nourrit cette
  fraîcheur mentale ») ni la note `focusGoalDrained` elle-même.

## Vérification

- Test `logic.test.js` (bloc allure focus) : frein **sommeil** (3/3/3 → score 45 → `{sleep, 3}`,
  « ta nuit courte de 3 h », « recharge le sommeil ce soir »), frein **énergie** (5/5/3 → score 40 →
  `{fatigue, 5}`), **courbatures dominantes honnêtement écartées** (6/3/5 → score 45, limiter soreness
  → `null`, note muette), deux freins à égalité (5/4/4 → `null`, note muette), exclusion mutuelle avec
  `focusFreshDriver` (au vert → drain null ; à plat → fresh null).
- Check smoke **bloquant** `coachFocus` étendu : frein sommeil nommé (`focusDrainDriver.factor ===
  'sleep'`, « ta nuit courte de 3 h »), freins à égalité → `null` + note muette, courbatures
  dominantes → `null` + note muette.
- `cd src && xvfb-run -a npm run verify` → **100 % vert** (510 tests node, SMOKE OK, EXIT=0).

## Suite possible

La symétrie moteur/frein est désormais complète des deux côtés (sport : `readinessBoost`/
`readinessDrag` ; focus : `focusFreshDriver`/`focusDrainDriver`). Piste : la **zone médiane** focus
(50 ≤ readiness < 75), aujourd'hui muette de tout commentaire de forme — un mot honnête sur « forme
correcte, cale un bloc mesuré » pourrait combler ce trou sans surpromettre.
