# 536 — Coaching : le coach t'invite à prendre de l'avance côté SPORT les bons jours de marge (sessionGoalAhead)

**Build 2.0.167 · boucle #536 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1)**

## Le manque

À la boucle #535, le coach « Le focus du moment » (`adaptiveCoachFocus`, `logic.js`) a appris à
**saisir une occasion** côté FOCUS : `focusGoalAhead` fire quand l'objectif de deep work est **large**
(`onpace`, « tu as la marge ») ET que la readiness du matin est au vert (≥ 75) → « profite de cette
marge pour prendre de l'avance, un bloc engrangé maintenant te fait un coussin ». Le recap #535
signalait lui-même la **suite manquante** : « symétriser côté **sport** un pendant d'avance quand
l'objectif de séances a de la marge et que la readiness est au vert. »

Côté SPORT, le trou était réel. La branche d'allure de l'objectif de séances distinguait déjà trois
registres — serré (`tight`), hors de portée (`unreachable`), **large** (`onpace`, « tu as la marge
pour boucler l'objectif hebdo ») — mais la branche `onpace` ne lisait **jamais** la forme du jour. Le
coach `restOverGoal` (#504) gérait bien le CONFLIT (allure serrée × readiness au plancher → la récup
prime) ; l'OPPORTUNITÉ symétrique (allure large × readiness au vert) restait muette. Résultat : les
semaines confortables, un matin où le corps est frais ET où rien n'oblige à s'entraîner — l'occasion
idéale de **prendre de l'avance** — le coach la laissait filer.

## Ce qui est livré

Nouveau champ **`sessionGoalAhead`** (le score du jour, ou `null`, **toujours** renvoyé). Quand
l'allure de l'objectif de séances est **large** (`onpace`), qu'un check-in de récup **daté du jour**
met la forme **au vert** (readiness ≥ 75) ET que **la séance du jour n'est pas encore faite**, le
coach **invite à banker une séance d'avance**, **appendu à l'insight** :

> Et ton corps est au vert ce matin (readiness 88/100) : rien ne t'oblige à t'entraîner aujourd'hui,
> mais profite de cette forme pour engranger une séance d'avance — une de plus maintenant te fait un
> coussin qui met l'objectif à l'abri si un jour creux tombe plus tard, sans sprint serré en fin de
> semaine.

C'est le pendant **EXACT**, côté séances, de `focusGoalAhead` : là où le focus engrange des minutes
qui s'accumulent, le sport banke une séance de plus un jour où le corps suit — les deux mettent
l'objectif hebdo à l'abri d'un imprévu (readiness au plancher plus tard, journée chargée). Le même feu
vert corps que le coach sport sert déjà à l'action (≥ 75 → « c'est le jour d'une vraie séance, monte
l'intensité »), appliqué ici à la **stratégie hebdo** : on cadre le POURQUOI (un coussin), pas juste
l'intensité.

## Garde-fous & honnêteté

- **Au vert SEULEMENT.** On ne parle qu'à readiness ≥ 75. Un jour **moyen** (60) ou **bas** × marge
  n'a besoin d'aucun mot : la marge suffit, inutile d'ajouter de la pression. (Testé : 6/3/3 → 60 →
  `sessionGoalAhead` null.)
- **Séance du jour PAS encore faite.** Si Adrien a **déjà** banké une séance aujourd'hui
  (`sportDoneToday`), le coussin est pris — pousser une **2e** séance le même jour contredirait la
  philosophie readiness qui protège du surmenage. (Testé : deux workouts dont celui du jour × au vert
  → null.)
- **On INVITE, sans injonction.** « Rien ne t'oblige à t'entraîner aujourd'hui, mais profite-en » —
  une occasion à saisir, pas une obligation.
- **Mutuellement exclusif** de `restOverGoal` (tight × plancher) par branche (`onpace` vs `tight`) et
  des notes focus (branche `chosen.pillar === 'sport'`).
- **Données réelles seulement.** Exige un check-in de récup **du jour** ET un objectif de séances
  rendu large par le calendrier. Sans check-in → `sessionGoalAhead` null.
- **Affine, ne remplace pas.** Note **appendue** à l'insight ; l'action du jour reste intacte.
- **Vocabulaire distinct** (« ton corps est au vert ce matin », « engranger une séance d'avance ») →
  zéro collision à l'œil ni en regex avec `focusGoalAhead` (« ta tête est claire ce matin »,
  « prendre de l'avance »), l'action readiness sport (« c'est le jour d'une vraie séance ») ni
  `readinessBoost` (« Ce qui te porte aujourd'hui »).
- **Zéro nouvelle fonction.** Réemploi de `readinessScore` déjà utilisé partout dans la fonction.

## Vérification

- Test `logic.test.js` (nouveau bloc `sessionGoalAhead`) : onpace × readiness 100 (8/1/1) →
  `sessionGoalAhead === 100`, notes « ton corps est au vert ce matin (readiness 100/100) »,
  « engranger une séance d'avance », « coussin qui met l'objectif à l'abri » présentes, pilier sport
  conservé. Exclusions : onpace × 60 (moyen) → null, séance du jour déjà faite → null, sans check-in
  → null, branche serrée (tight) × au vert → null.
- Check smoke **bloquant** `coachFocus` étendu (`fSessAhead`, `fSessMid`, `fSessDone`) :
  `sessionGoalAhead === 100` + notes présentes en onpace au vert ; null en zone moyenne, séance faite
  et branche serrée.
- `cd src && xvfb-run -a npm run verify` → **100 % vert** (511 tests node, SMOKE OK, EXIT=0).

## Suite possible

La symétrie « prendre de l'avance » est désormais complète des deux côtés (focus : `focusGoalAhead` ;
sport : `sessionGoalAhead`). Piste : comme `focusGoalFresh` nomme le **moteur** dominant du check-in
(`focusFreshDriver`), la note d'avance sport pourrait citer ce qui rend la forme si haute (« ta nuit
de 8 h te donne cette forme : profite-en pour banker une séance ») pour ancrer le bon geste. Autre
piste : côté focus **comme** sport, un mot bref quand l'objectif est **déjà tenu** (« objectif hebdo
tenu 💪 ») ET que la readiness est au vert (« objectif bouclé, mais forme au top → une séance bonus
tout en douceur, pur bonus sur la semaine »).
