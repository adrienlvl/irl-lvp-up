# 611 — Pause diète (diet break) : le coach dit QUAND remonter à la maintenance (2.0.224)

> Priorité de nuit d'Adrien (« coaching à fond, profondeur réelle, science d'abord ») + mandat
> coaching élite (diététicien du sport). Domaine `nutrition` — choisi par rotation : `athlete` (3×) et
> `coach` (2×) saturés dans les 5 derniers recaps ; `nutrition` absent → domaine neuf ET aligné.

## Le manque, vérifié dans le code

Le Coach Poids est déjà mûr sur le RYTHME de perte (`energyPlan` personnalisé par corpulence, #595),
les protéines, les macros, et la relance sur PLATEAU (`calorieAdjustment` : « coupe 125 kcal / ajoute du
cardio »). Mais **rien** ne gérait la **DURÉE** d'un déficit : `grep -niE "refeed|di[eè]te|thermogen|
leptin|matador|déficit prolong"` → **aucune** occurrence. C'est le pendant nutrition du deload muscu
(#608) qui, lui, existe côté entraînement mais pas côté alimentation.

Or un déficit calorique tenu trop longtemps déclenche une **adaptation métabolique** (baisse du
métabolisme de repos, chute leptine/thyroïde, NEAT, faim) qui freine la perte ET menace le muscle. Le
geste correct n'est **pas** de couper plus — c'est d'insérer une **pause à la maintenance**.

## Science d'abord (WebSearch, sources citées dans le code + CHANGELOG)

- **Trexler 2014** (JISSN 11:7) — « metabolic adaptation to weight loss » : l'adaptation est réelle et
  s'aggrave avec la durée/agressivité du déficit ; recommande diet breaks / refeeds.
- **MATADOR** (Byrne 2018, Int J Obes 42:129) — cycles 2 sem déficit / 2 sem maintien : **plus** de gras
  perdu et **moins** de chute du métabolisme de repos qu'un déficit continu.
- **ICECAP** (Peos 2021, Med Sci Sports Exerc) — une pause d'**1 semaine** en maintenance a fait
  **GAGNER +0,7 kg de masse maigre** chez des pratiquants entraînés.
- Repère pratique (RP/Israetel, Helms) : ~8-12 sem de déficit continu → pause.

## Ce qui est livré

**`dietBreakRecommendation(weights, goal, todayKey, opts)`** — fonction pure testée. Elle **mesure le
déficit par la perte de poids réelle** (proxy fiable, pas de saisie calorique quotidienne fidèle) :
médiane hebdo (robuste au bruit eau/sel), série de semaines qui descendent ou plafonnent, cassée par un
**regain net** (≥ 0,3 kg = maintien/pause déjà pris). Déclenche à `weeksTrigger` sem. calendaires
(défaut 10) **avec** perte cumulée réelle (≥ 1,5 kg) et ≥ 4 semaines relevées (preuve de continuité).
Ne s'active que sur `goal === 'perte'`. **Ambitieux mais sûr : n'accélère jamais le déficit**, propose
le geste protecteur. Renvoie `{ due, weeksDeficit, netLossKg, weeks, kcalBump, advice, emoji }`.

**Rendu** (`renderCoachWeight`, `#coachWeightBody`) : carte `⏸️ Pause diète` display-only. Curation §3
clé — quand la pause est due, elle **remplace** le message `calorieAdjustment` (« coupe encore »), qui
serait **contradictoire** : plafonner après un long régime appelle une pause, pas un tour de vis de plus
(exactement le piège que Trexler décrit). Style `.cw-dietbreak` (ton bleu « calme », distinct de l'ambre
« alerte » de `.cw-adjust`).

## Contrôle §4 ter (rendu cumulé, relu en entier)

Rendu sur un état chargé (12 sem. de perte, −6 kg, déficit 520 → +525 kcal) : **une seule** phrase
actionnable, cohérente, sans redondance ni contradiction. Sur ce profil `calorieAdjustment` ne se
déclenche pas (perte en cours ≠ stagnation) ; la suppression protège le cas-gris plateau-après-long-cut.

## Vérifs

- `cd src && xvfb-run -a npm run verify` → **561 tests + smoke 100 % vert**. Nouveau test node
  `dietBreakRecommendation` (série continue → due, regain qui casse, goal≠perte → null, < 3 sem. → null,
  seuil 10 sem., kcalBump). Nouveau check smoke **bloquant** `dietBreakReco` (logique + `#coachWeightBody`).
- Build **2.0.224** : `package.json` + CHANGELOG en tête + 2 assertions `CHANGELOG[0].v`.

## Fichiers

- `src/lib/logic.js` — `dietBreakRecommendation` (+ export), entrée CHANGELOG.
- `src/app.js` — carte `⏸️` dans `renderCoachWeight`, gate anti-contradiction sur `calorieAdjustment`.
- `src/athlete.css` — `.cw-dietbreak`.
- `src/test/logic.test.js`, `src/test/renderer-smoke.cjs` — test + check bloquant + assertions version.

Domaine : nutrition
