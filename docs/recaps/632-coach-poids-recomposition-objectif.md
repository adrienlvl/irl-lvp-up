# #632 — Coach Poids : l'interprétation poids/taille colle enfin à l'objectif (build 2.0.241)

## Contexte & choix de la tâche
Priorité de nuit = coaching à fond (`docs/DEMANDES.md`). Rotation §4 bis : les 2 derniers recaps
sont `athlete` (#631) et `coach` (#630) → **`athlete` et `coach` bloqués** ; sur 5, `coach` 2×.
Domaines coaching disponibles : **`nutrition`** (629, 1×) et `sommeil` (628, 1×). Quota de
propositions §4 bis.4 **non** déclenché (#631 est une proposition dans les 10 derniers recaps).
Domaine pris : **`nutrition`**, au service du MANDAT COACHING ÉLITE (diététique du sport).

## Défaut prouvé (contradiction inter-surfaces, angle NEUF)
`recompositionInsight(weightDeltaKg, waistDeltaCm)` (logic.js:8903) interprète l'évolution
poids vs tour de taille et s'affiche sur la carte « Coach Poids » (app.js:383, juste sous
`calorieAdjustment`). La fonction était **goal-agnostique**, mais la carte, elle, connaît
`plan.goal`. Deux branches imprimaient donc un verdict dont la **direction contredit l'objectif** :

- **Branche `gain`** (`t >= 1 && w >= 1`) : « Poids et tour de taille montent : **en prise de
  muscle**, surveille que la taille ne grimpe pas trop (gras). » — affiché **même en objectif
  perte**. Or, en pleine sèche, poids ET taille qui montent ≠ muscle : c'est du gras. Contradiction
  directe avec `calorieAdjustment` voisin (corrigé #629) qui dit sur la **même carte** « Ton poids
  **repart à la hausse** alors que tu vises la perte ».
- **Branche `fatloss`** (`t <= -1 && w <= -1`) : « Poids et tour de taille en baisse : la **perte
  de gras est bien engagée**. » — une félicitation à contretemps **en objectif prise** (poids qui
  baisse pendant un gainer = on fond), là encore en contradiction avec `calorieAdjustment` (« Ton
  poids **recule** alors que tu vises la prise »).

Contre-exemple exécuté (§4 ter, état chargé, objectif perte, +2 kg / +2 cm) :
- Ajustement : « Ton poids repart à la hausse (+0,7 kg/sem) alors que tu vises la perte… »
- Mensuration (AVANT) : « …**en prise de muscle**, surveille… » → **les deux se contredisaient**.

Même famille que #628/#629 (verdict↔chiffres), **jamais traitée sur CETTE carte** — angle neuf.

## Correctif (curation §3 — zéro champ ajouté)
`recompositionInsight` reçoit un **3ᵉ paramètre optionnel `goal`** (rétro-compatible : sans lui,
comportement historique inchangé). Seul le `message` des deux branches change quand la direction
contredit l'objectif ; les `key` (`gain`/`fatloss`/`recomp`) et les cas concordants sont intacts :
- objectif `perte` + tout monte → « …alors que tu vises la perte : c'est du gras qui revient, pas
  du muscle — resserre un peu les calories. »
- objectif `prise` + tout baisse → « …alors que tu vises la prise : tu fonds au lieu de construire
  — remonte un peu les calories. »
- `prise`/`maintien`/absent sur `gain`, `perte`/`maintien`/absent sur `fatloss`, et toute la
  branche `recomp` : **messages historiques mot pour mot**.

Le rendu passe désormais `plan.goal` (app.js:383). §4 ter : résultat cumulé relu (voir ci-dessus)
→ les deux surfaces disent enfin la même chose ; recouvrement mineur (« resserre les calories »)
= renforcement, pas redite contradictoire (angles distincts : cible kcal chiffrée vs lecture
poids/taille).

## Vérification
`cd src && xvfb-run -a npm run verify` → **100 % vert** (569 tests + smoke). Ajouté :
- logic.test.js : cas `goal='perte'`/`'prise'` (message recadré) + non-régression concordants/absents.
- renderer-smoke.cjs : check **`coachMeasure` étendu ET rendu bloquant** (il était défini mais
  **jamais poussé dans `errors`** — même motif que le P2.2/#566) : refuse « prise de muscle » en
  visée perte et « bien engagée » en visée prise.

## Versionnage
Build **2.0.241** : `src/package.json` + `CHANGELOG[0]` (📏) + 2 asserts `CHANGELOG[0].v`.

Domaine : nutrition
