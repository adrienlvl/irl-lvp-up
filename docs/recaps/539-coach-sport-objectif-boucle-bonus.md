# 539 — Coaching : le coach cadre une séance de plus en BONUS LIBRE côté sport quand l'objectif de séances est déjà bouclé (sessionGoalBonus)

**Build 2.0.170 · boucle #539 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1)**

## Le manque

Le coach « Le focus du moment » (`adaptiveCoachFocus`, `logic.js`) lit finement la forme du jour
côté **focus** sur les deux registres d'objectif : non tenu (`focusGoalFresh`/`Ahead`/`Steady`/
`Drained`) **et** déjà bouclé (`focusGoalBonus`, #538 — « un bloc de plus serait du pur bonus »).
Côté **sport**, la symétrie était incomplète : la branche « Objectif hebdo déjà tenu : 2/2 séances
💪 » (ligne 5124-5125) ne lisait **pas du tout** la forme du jour. Un matin où l'objectif de
séances est bouclé ET le corps au vert, le coach laissait le bon geste possible **sans un mot**.

Les recaps #536 **et** #538 signalaient tous deux cette suite, en la marquant **délicate** : côté
sport, l'action readiness pousse déjà « c'est le jour d'une vraie séance, monte l'intensité » dès
readiness ≥ 75 → un « bonus » mal cadré (façon « séance tranquille / en douceur ») la
**contredirait**.

## Ce qui est livré

Nouveau champ **`sessionGoalBonus`** (le score du jour, ou `null`, **toujours** renvoyé). Quand
l'objectif de séances est **déjà tenu** (`wc >= g`), qu'un check-in de récup **du jour** met le
corps **au vert** (readiness ≥ 75) ET que **la séance du jour n'est pas encore faite**, le coach
cadre honnêtement, **appendu au « déjà tenu 💪 »** :

> Et ta forme est au top ce matin (readiness 100/100) : objectif de séances déjà dans la poche,
> aucune obligation de t'y remettre aujourd'hui — mais si l'envie de bouger est là, chaque séance en
> plus est du gain offert, du rab pris sans aucun compteur dans le dos.

C'est le pendant **exact**, côté séances, de `focusGoalBonus` (#538).

**Pourquoi ce cadrage ne contredit PAS l'action.** Le risque signalé par #536/#538 est réel :
l'action readiness dit « prêt à pousser, monte l'intensité » au vert. La note **ne dit donc pas**
« lève le pied / séance tranquille » (ce serait contre l'action). Elle retire la seule **pression
du calendrier** (objectif bouclé → plus aucune obligation de s'entraîner) et reframe toute séance de
plus en **bonus libre** — du gain offert, pris par envie. Les deux messages coexistent sans se
mordre : *si* Adrien s'entraîne, il s'entraîne bien (l'action tient) ; mais le compteur hebdo ne le
pousse plus (l'insight le libère).

## Garde-fous & honnêteté

- **Au vert SEULEMENT.** readiness ≥ 75. Objectif bouclé × tête moyenne (60) ou basse → aucun mot.
  (Testé : 6/3/3 → 60 → `sessionGoalBonus` null.)
- **Données réelles.** Exige un check-in de récup **du jour** ; sans check-in → null. (Testé.)
- **Séance du jour PAS encore faite.** Si Adrien a **déjà** bougé aujourd'hui (`sportDoneToday`), le
  bonus est pris — pousser une **2e** séance le même jour contredirait la philosophie readiness
  (protège du surmenage). Même garde-fou que `sessionGoalAhead`. (Testé.)
- **Mutuellement exclusif** de `sessionGoalAhead` (branche `wc >= g` vs `onpace` — testé : onpace ×
  vert → `sessionGoalBonus` null), de `restOverGoal` (tight × plancher) et des notes focus
  (`chosen.pillar === 'sport'`).
- **Affine, ne remplace pas.** Note **appendue** à l'insight ; l'action du jour reste intacte.
- **Vocabulaire distinct** (« ta forme est au top ce matin », « objectif de séances déjà dans la
  poche », « chaque séance en plus est du gain offert ») → zéro collision à l'œil ni en regex avec
  `sessionGoalAhead` (« ton corps est au vert ce matin », « engranger une séance d'avance »),
  `focusGoalBonus` (« pur bonus, sans la moindre pression »), l'action readiness (« c'est le jour
  d'une vraie séance ») ni `readinessBoost` (« Ce qui te porte aujourd'hui »).
- **Zéro nouvelle fonction.** Réemploi de `readinessScore` déjà utilisé partout dans la fonction.

## Vérification

- Tests `logic.test.js` (nouveau bloc `sessionGoalBonus`) : objectif bouclé (2/2) × readiness 100
  (8/1/1) → `sessionGoalBonus === 100`, `sessionGoalPace === null`, notes « déjà tenu : 2/2 »,
  « ta forme est au top ce matin (readiness 100/100) », « objectif de séances déjà dans la poche »,
  « chaque séance en plus est du gain offert » présentes, pilier sport. Exclusions : moyen (60) →
  null, séance du jour déjà faite → null, sans check-in → null, onpace (non tenu) × vert → null.
- Check smoke **bloquant** `coachFocus` étendu (`fSessBonus`, `fSessBonusMid`) :
  `sessionGoalBonus === 100` + notes présentes en objectif bouclé au vert ; null en zone moyenne.
- `cd src && xvfb-run -a npm run verify` → **100 % vert** (512 tests node, SMOKE OK, EXIT=0).

## Suite possible

- La symétrie « objectif déjà bouclé × vert → bonus » est désormais complète des deux côtés (focus :
  `focusGoalBonus` ; sport : `sessionGoalBonus`). Comme `focusAheadDriver` (#537) nomme le moteur du
  check-in sur l'avance, `sessionGoalBonus` pourrait citer ce qui rend la forme si haute — mais le
  moteur est **déjà** nommé côté sport par `readinessBoost` (#531) sur la même condition (readiness
  ≥ 75), donc l'ajouter doublonnerait ; à écarter, comme pour `sessionGoalAhead` (#537).
- La zone MÉDIANE côté sport (objectif bouclé OU en cours × readiness 50-74) reste sans cadrage
  dédié — mais un jour moyen n'appelle probablement qu'un mot simple, sans force ni frein dominant.
