# #638 — Coach : « aucune obligation de t'entraîner » ne contredit plus « repars » (build 2.0.247)

## Contexte

Priorité de nuit = coaching adaptatif à fond (`docs/DEMANDES.md`, CAP 3.0 étape 1 · MANDAT COACHING
ÉLITE). Rotation §4 bis vérifiée **avant de coder**
(`grep -h "^Domaine :" $(ls -t docs/recaps/*.md | head -5)` → `athlete, alternance, athlete, nutrition, coach`) :
les 2 derniers (`athlete`, `alternance`) sont bloqués, `athlete` apparaît 2× → exclu. **`coach`**
(1× sur 5, absent des 2 derniers) est **libre** — c'est le domaine de la priorité de nuit. Beaucoup de
contradictions coach déjà closes (voir CHANGELOG) → exploration ciblée d'un **angle neuf** avant de coder.

## Défaut prouvé (contradiction intra-insight, angle NEUF)

Dans `adaptiveCoachFocus` (`logic.js`), le bloc **objectif de séances** (`chosen.pillar === 'sport'`,
branche `wc >= g`, ~`logic.js:5611-5651`) s'exécute **quel que soit le `tone`** de l'insight — aucun
test de ton. Or :

- Le **`tone`** est choisi sur la fenêtre **glissante 7 j** (`recentDays < prevDays` avec `prevDays ≥ 3`
  → tier 0 → `rebuild`), et l'insight `rebuild` dit alors **« Ton entraînement s'essouffle… un petit
  geste suffit à repartir »** (`logic.js:5581`) — une **injonction à reprendre**.
- Le compteur `wc` compte la **semaine calendaire** (lundi→aujourd'hui) : une fenêtre **différente**.
  `wc >= g` (objectif calendaire tenu) et `recentDays < prevDays` (momentum en recul) sont donc
  **compatibles** dans un cas nominal.
- Quand, en plus, la séance du jour n'est pas faite et la readiness du matin ≥ 75, `sessionGoalBonus`
  appendait (`logic.js:5649`) : **« objectif de séances déjà dans la poche, aucune obligation de t'y
  remettre aujourd'hui… »** — une **dispense de s'entraîner**.

Résultat, dans le **même** insight : « un petit geste suffit à repartir » **puis** « aucune obligation
de t'y remettre aujourd'hui ». L'un ordonne de reprendre, l'autre en dispense. Distinct de 2.0.196/
2.0.200 (« garde le rythme » du ton *reinforce* vs repos/pic) et de 2.0.245 (poids « resserre » vs
« pause diète ») : ici la contradiction est **dans l'insight lui-même**, non anticipée par le commentaire
de `sessionGoalBonus` (qui ne raisonnait que sur la cohabitation avec l'**action** readiness, en contexte
de momentum).

**Contre-exemple exécuté (§4 ter, rendu réel)** — état chargé, `today = dim 2026-07-19`, `goals.sessions = 2`,
workouts `06/08/10` (semaine passée, 3 j → `prevDays=3`) + `13/14` (semaine en cours, 2 j → `recentDays=2`,
`wc=2`), check-in du jour `8/1/1` → readiness 100 :
> Ton entraînement s'essouffle · « 2 jours actifs cette semaine, contre 3 la précédente. Un petit geste
> suffit à repartir. Objectif hebdo déjà tenu : 2/2 séances 💪 Et ta forme est au top ce matin (readiness
> 100/100) : objectif de séances déjà dans la poche, **aucune obligation de t'y remettre aujourd'hui**… »

## Correctif (curation §3, zéro champ ajouté)

**Garde-fou de ton** sur `sessionGoalBonus` (`logic.js:5644`) : la condition passe de `if (!sportDoneToday …)`
à **`if (tone === 'reinforce' && !sportDoneToday …)`**. Le cadrage « aucune obligation → séance de plus =
pur bonus » n'a de sens que sous **`reinforce`** (momentum en hausse, « garde le rythme »), le seul ton où
il ne heurte aucune injonction — cas déjà défendu par le commentaire existant. En `rebuild`/`revive`
(l'insight ordonne de repartir/relancer), le bonus est désormais **muet**. Le **« Objectif hebdo déjà tenu
💪 »** (`logic.js:5618`, un simple constat, non injonctif) reste affiché quel que soit le ton — non touché.

## §4 ter — contrôle de cohérence cumulé

Rendu réel des deux cas :
- **rebuild (corrigé)** : « …s'essouffle · 2 j contre 3… un petit geste suffit à repartir. Objectif hebdo
  déjà tenu : 2/2 séances 💪 » + action « c'est le jour d'une vraie séance, monte l'intensité ». Plus de
  « aucune obligation » → cohérent (constat positif + invitation à repartir + action).
- **reinforce (préservé)** : « …monte en régime · garde le rythme. Objectif hebdo déjà tenu 💪 … aucune
  obligation… du gain offert… ». Le bonus légitime reste intact.

## Vérification

- `logic.test.js` : bloc `sessionGoalBonus` étendu — nouveau cas `rebuildBonus` (tone `rebuild` × objectif
  calendaire tenu × readiness verte → `sessionGoalBonus === null`, insight sans « aucune obligation » /
  « du gain offert », « Un petit geste suffit à repartir » ET « Objectif hebdo déjà tenu 💪 » présents).
  **571 tests verts.**
- `renderer-smoke.cjs` : check **bloquant** `coachFocus` étendu (`fSessBonusRebuild`) — même scénario,
  assertions symétriques. **Smoke OK.**
- Bump `2.0.246 → 2.0.247` + entrée CHANGELOG + 2 assertions `CHANGELOG[0].v`.

Domaine : coach
