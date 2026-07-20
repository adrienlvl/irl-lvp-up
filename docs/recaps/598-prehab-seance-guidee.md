# 598 — Séance guidée : bloc PRÉVENTION / prehab niveau kiné (2.0.214)

> Série coaching poussé à fond (demande d'Adrien : « pour les exos de renforcement tu dois être un
> kiné »). Recherche scientifique d'abord.

## Fondé science

Nouveau bloc `prehabFor(title)` (pur, testé) : quelques mouvements de prévention ciblés par zone,
appuyés sur la **méta-analyse Lauersen et al. 2014 (Br J Sports Med 48:871)** — un renforcement ciblé,
surtout **excentrique**, réduit d'environ **moitié** le risque de blessure (et ~2/3 pour l'excentrique,
type Nordic hamstring). Confirmé par la recherche de cette session (FIFA 11+, NSCA).

- **Haut du corps** → coiffe des rotateurs (rotations externes élastique), face pulls, YTW : protège l'épaule.
- **Bas du corps** → **Nordic hamstring curl** (descente freinée), pont fessier, mollets lents, gainage
  latéral : protège genoux et ischios.
- **Course/trail** → mollets excentriques, Nordic curl, proprioception de cheville (unipodal) : périostite,
  Achille, ischios.
- **Général** → planche, bird-dog, pont fessier, mobilité.

Chaque bloc porte un **`why`** qui explique le bénéfice (cité).

## Rendu

Bloc repliable **« 🛡️ Prévention »** dans la séance guidée, après l'échauffement, thème **bleu**
(distinct de l'échauffement orange), avec la note « pourquoi » en italique. Peuplé par
`renderGuidedWorkout` comme l'échauffement/retour au calme.

## Vérifs

- **544 tests** + smoke verts. Test `prehabFor` (ciblage par zone, excentrique/Nordic présents, `why`
  cité). Check smoke **bloquant** `prehab` (fonction + éléments DOM + contenu kiné).
- **Navigateur (DOM)** : jour de jambes → « 🛡️ Prévention genou & ischios », 4 mouvements, premier =
  « Nordic hamstring curl · descente freinée ».

## Suite immédiate

La recherche muscu (RIR/RPE, 2-for-2, incréments par zone, volume landmarks — Zourdos 2016, ACSM 2009,
Israetel/RP) est prête → prochain loop : **progression autorégulée par RIR** dans `progressionSuggestion`
+ cible du jour (fourchettes de reps par objectif, règle 2-for-2, incrément haut/bas du corps).

## Fichiers

- `src/lib/logic.js` — `prehabFor` + export + CHANGELOG 2.0.214.
- `src/index.html` — `<details id="guidedPrehab">` (label, why, list).
- `src/app.js` — `renderGuidedWorkout` peuple le bloc prehab.
- `src/strength.css` — `.guided-prehab` (bleu) + `.guided-prehab-why`.
- `src/test/logic.test.js`, `src/test/renderer-smoke.cjs` — test + check bloquant.

Domaine : athlete
