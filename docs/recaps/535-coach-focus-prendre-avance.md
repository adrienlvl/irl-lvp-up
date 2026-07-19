# 535 — Coaching : le coach t'invite à prendre de l'avance les bons jours de marge (focusGoalAhead)

**Build 2.0.166 · boucle #535 · priorité de la nuit (Coaching adaptatif à fond, CAP 3.0 étape 1)**

## Le manque

Depuis #509, le coach « Le focus du moment » (`adaptiveCoachFocus`, `logic.js`) sait relier la forme
du matin à l'objectif de deep work — mais **uniquement quand la semaine est SERRÉE** (allure `tight`,
« cale un vrai bloc d'~90 min aujourd'hui »). Dans cette branche il couvre désormais les trois zones
de readiness : vert (`focusGoalFresh`, #509 + moteur #532), médiane (`focusGoalSteady`, #534),
plancher (`focusGoalDrained`, #510 + frein #533). En face, la branche **onpace** (« tu as la marge »)
ne lisait **jamais** la readiness du jour : elle se contentait de « Dans les temps : ~15 min/jour… tu
as la marge. » Résultat, les semaines confortables, le coach **laissait filer les bons jours** — un
matin où l'esprit est clair ET où rien n'oblige à forcer est pourtant l'occasion idéale de **prendre
de l'avance**. Le recap #534 signalait lui-même cette piste : « symétriser côté focus onpace un mot
bref quand la forme est au top (marge sur l'objectif ET tête fraîche → avance dessus tant que c'est
facile). »

## Ce qui est livré

Nouveau champ **`focusGoalAhead`** (le score du jour, ou `null`, **toujours** renvoyé). Quand l'allure
focus est **large** (`onpace`) ET qu'un check-in de récup **daté du jour** met la forme **au vert**
(readiness ≥ 75), le coach **invite à engranger un coussin**, **appendu à l'insight** :

> Et ta tête est claire ce matin (readiness 88/100) : profite de cette marge pour prendre de l'avance
> sur l'objectif tant que c'est facile — un vrai bloc engrangé maintenant te fait un coussin qui
> amortira un jour creux plus tard, sans stress.

C'est le pendant **PROACTIF** de `focusGoalFresh` : là où `focusGoalFresh` répond à une échéance
**serrée** (l'effort est *nécessaire*), `focusGoalAhead` saisit une **opportunité** quand on a du mou
(l'effort est *optionnel mais malin*). Les minutes de focus s'ACCUMULENT : avancer un jour où la tête
suit, c'est se constituer une réserve sereine. C'est le même feu vert corps que le coach SPORT sert
déjà (readiness ≥ 75 → « c'est le jour d'une vraie séance, monte l'intensité »), appliqué à la
concentration quand on peut se le permettre.

## Garde-fous & honnêteté

- **Au vert SEULEMENT.** On ne parle qu'à readiness ≥ 75. Un jour **moyen** ou **bas** où l'objectif a
  déjà de la marge n'a besoin d'aucun mot : la marge suffit, inutile d'ajouter de la pression. (Testé :
  readiness 60 et 40 × onpace → `focusGoalAhead` null, note absente.)
- **On INVITE, sans pression.** « Profite de cette marge… tant que c'est facile… sans stress » — une
  occasion à saisir, pas une injonction.
- **Mutuellement exclusif** de `focusGoalFresh`/`Steady`/`Drained` par construction (branche `onpace`
  vs `tight` — `perDay ≤ 60` XOR `> 60`) et des notes sport (branche `chosen.pillar === 'sport'`).
- **Données réelles seulement.** Exige un check-in de récup **du jour** ET un objectif focus rendu
  large par le calendrier. Sans check-in → `focusGoalAhead` null.
- **Affine, ne remplace pas.** Note **appendue** ; l'action du jour reste intacte.
- **Vocabulaire distinct** (« ta tête est claire ce matin », « prendre de l'avance ») → zéro collision
  à l'œil ni en regex avec « au vert ce matin » (fresh), « tient la route ce matin » (steady) ni « à
  plat ce matin » (drained).
- **Zéro nouvelle fonction.** Réemploi de `readinessScore` déjà utilisé partout dans la fonction.

## Vérification

- Test `logic.test.js` (bloc allure focus) : onpace × readiness 100 (8/1/1) → `focusGoalAhead === 100`,
  note « ta tête est claire ce matin (readiness 100/100) », « prendre de l'avance sur l'objectif tant
  que c'est facile », « amortira un jour creux plus tard » présentes, pilier focus conservé.
  Exclusion : onpace × 60 (moyen) → null, onpace × 40 (bas) → null, sans check-in → null, branche
  serrée (fresh/steady) → null. Une session focus du 07-14 est ajoutée dans l'état de test pour que le
  pilier reste **focus** malgré le check-in de récup (sinon le pilier sommeil monte en tête ce jour-là).
- Check smoke **bloquant** `coachFocus` étendu (`fFocusAhead`, `fAheadMid`) : `focusGoalAhead === 100`
  + notes présentes en onpace au vert ; null en zone médiane onpace et en branche serrée.
- `cd src && xvfb-run -a npm run verify` → **100 % vert** (510 tests node, SMOKE OK, EXIT=0).

## Suite possible

Comme `focusGoalFresh`, la note d'avance pourrait **nommer le moteur** dominant du check-in
(`readinessDriver` : « ta nuit de 8 h te donne cette clarté ») pour renforcer l'ancrage du bon geste.
Autre piste : symétriser côté **sport** un pendant d'avance quand l'objectif de séances a de la marge
et que la readiness est au vert (« séance non due aujourd'hui, mais forme au top → engrange-en une
d'avance »).
