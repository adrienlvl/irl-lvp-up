# #619 — Proposition : la cible protéines ne monte pas en sèche active

**Domaine : nutrition** (frais : absent des 5 derniers recaps — 618 coach · 617 etudes · 616 robustesse
· 615 sommeil · 614 coach). `coach`/`etudes` bloqués par la rotation §4 bis. Mandat coaching élite (§1,
diététicien du sport) croisé à la priorité de nuit (approfondir le coaching nutrition).

## Le manque, prouvé (grep + lecture)

`proteinTarget` (`logic.js:2253`) est le barème protéique **générique** de l'onglet Nutrition (force 1,9
· trail 1,6 · sinon 1,8 g/kg). Il ne voit que `goal` ∈ {force, trail, recomposition} — jamais le
**déficit réel**. Or, dès qu'un poids cible plus bas est saisi, `energyPlan` (`logic.js:5168`) vise déjà
**2,4 g/kg en sèche** (Longland 2016, cité dans le code) sur la carte Coach Poids **voisine**. Un
utilisateur en sèche lit donc **deux cibles différentes** selon l'onglet, et la plus basse — celle du
quotidien — **sous-alimente la préservation musculaire en déficit** (précisément ce que le mandat élite
dit d'éviter). Science : Longland 2016 (AJCN), Helms 2014 (JISSN, 2,3–3,1 g/kg de masse maigre en
sèche), Morton 2018 (BJSM, 1,6 g/kg hors déficit → 1,8 en maintien reste OK), ISSN 2017.

## Pourquoi une proposition, pas du code ce tour

`proteinTarget` est consommé par **8 sites, dont 2 guards du coach** (`adaptiveCoachFocus`,
`logic.js:6113`/`6843`). Le corriger proprement **ripple dans le domaine `coach`**, bloqué par la
rotation §4 bis ce tour ; et un correctif **partiel** (Nutrition seul) créerait une **nouvelle**
contradiction (§4 ter). Le choix « quel multiplicateur en sèche · d'où vient le signal » est un choix à
cadrer avant de coder (§4). → `docs/proposals/proteine-cible-deficit.md`.

## Reco

**B** — `proteinTarget(weight, goal, opts)` avec 3ᵉ arg optionnel `{cut}` (sans opts = comportement
identique, tous tests verts), signal `cut` dérivé d'un helper unique `activeWeightGoal(state)`
(poids − `targetWeight`, comme `energyPlan`) passé aux 8 sites → cible qui monte **ensemble** partout
(cohérence §4 ter par construction). Plancher de sèche conservateur ~2,2 g/kg (vs 2,4 réservé au déficit
mesuré). À implémenter dans un **tour `coach`-actif** de la rotation (le ripple coach y est légitime) ou
en passe supervisée. **4 décisions** attendent Adrien en fin de doc (périmètre · multiplicateur · déclencheur
· mode de réalisation).

Pas de bump (proposition, aucun changement de code utilisateur). Quota propositions §4 bis.4 : déjà
satisfait (#610), mais le seul levier de profondeur nutrition **réel** ce tour était structurant.

Domaine : nutrition
