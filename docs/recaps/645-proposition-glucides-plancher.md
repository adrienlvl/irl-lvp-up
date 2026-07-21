# #645 — Proposition : glucides, un plancher « carburant » plutôt qu'un pur reliquat

**Domaine : nutrition** · pas de build (proposition, zéro code) · boucle #645 (2026-07-21)

## Rotation (§4 bis) & quota de propositions (§4 bis.4)

Priorité de nuit = coaching. Contrôle des 5 derniers recaps **par numéro** :
`644 coach · 643 athlete · 642 sommeil · 641 focus · 640 athlete`.
→ `coach` (644) et `athlete` (643) exclus (dans les 2 derniers) ; `athlete` de toute façon 2× sur 5.
Domaines de coaching disponibles : `nutrition` (0× sur 5), `sommeil` (1×), `focus` (1×).
**`nutrition`** pris — le plus frais, aligné avec la priorité de nuit (diététique du sport, mandat
coaching élite).

**Quota §4 bis.4 déclenché** : les **10 derniers recaps (635→644) ne référencent aucune proposition**
(dernières propositions #631 et #619, hors fenêtre). La règle impose donc que **cette itération soit une
proposition**, pas une itération de code — ce qui tombe juste : après lecture, les fonctions pures
nutrition (`energyPlan`, `calorieAdjustment`, `safeLossRate`, `proteinStreak`, `hydrationPlan`,
`daysHittingTarget`, `waterGoalFor`…) sont **durcies et correctes** (familles de bugs purs closes) ; le
seul manque à forte valeur est **structurel**, donc proposition-gated.

## Manque prouvé (dans le code)

Les glucides sont calculés comme un **pur reliquat** — `carbG = max(0, (kcal − P*4 − F*9)/4)` dans
`energyPlan` (`logic.js:5235`) **et** `objectiveNutrition` (`logic.js:8371`) — sans plancher de carburant
ni conscience de la charge. Les lipides sont figés à 0,9 g/kg par une ligne **morte** :
`Math.max(round(w*0.5), round(w*0.9))` renvoie toujours `round(0.9w)` (le plancher 0,5 du commentaire ne
s'applique jamais).

Chiffré via la vraie fonction (`node -e` sur `energyPlan`) : en sèche, les glucides atterrissent à
**1,5–2,2 g/kg** — **sous** le repère ACSM/AND/DC 2016 (3–5 g/kg même en activité légère) **et sous le
plancher que l'app se cite à elle-même** (`nutritionTips('prise')` : « glucides ≥ 3–5 g/kg pour alimenter
les séances lourdes », `logic.js:8579`). Le conseil-texte dit 3–5 g/kg, le macro-chiffré en délivre ~2 :
contradiction interne inter-surfaces, même famille que #639/#636/#632. Enjeu réel pour un athlète hybride
muscu+trail : le déficit doit venir du gras, pas d'un effondrement silencieux du carburant d'entraînement.

## Livrable

`docs/proposals/glucides-plancher-carburant.md` — problème chiffré + science (ACSM 2016, Burke 2011,
Helms 2014), 3 options, reco **A** (remplissage glucides→plancher puis lipides→reste avec plancher
hormonal, en **étapes autonomes A.1/A.2 dans le seul domaine `nutrition`, sans ripple coach** ;
périodisation par charge = option **B**, supervisée), risques (cohérence multi-surfaces §4 ter, arbitrage
sèche agressive, zéro nouveau champ = curation §3), **4 décisions** pour Adrien.

## Vérification

Aucun code touché (proposition + recap + docs). `src/` inchangé → pas de bump, pas de `verify` (rien à
exercer côté runtime). Pointeur ajouté dans `docs/DEMANDES.md` (« En cours ») et « État actuel » de
`docs/ROADMAP.md`.

Sources : AND/DC/ACSM 2016 (Thomas/Erdman/Burke, Med Sci Sports Exerc 48:543) · Burke 2011 (J Sports Sci
29:S17) · Helms 2014 (JISSN 11:20) · Longland 2016 (AJCN, protéines en déficit, déjà en place).

_Domaine : nutrition._
