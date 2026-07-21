# Proposition — La cible protéines ne monte pas en sèche active (préservation du muscle)

_Écrite le 2026-07-21 (boucle #619). Domaine : nutrition. Déclenchée par le **mandat coaching élite**
(VPS-AUTOPILOT §1 : « diététicien du sport… science d'abord, cite les sources, ambitieux mais SÛR —
préservation du muscle, planchers hormonaux ») croisé avec la **priorité de nuit** (« approfondir le
coaching adaptatif, conseils vraiment personnalisés à partir des données réelles »)._

## 0. Pourquoi une proposition et pas du code cette itération

Le manque est **réel et prouvé** (grep + lecture ci-dessous), et la science est **claire** (pas un
choix qui engage Adrien sur le fond). Mais le correctif propre est **entrelacé** :

- `proteinTarget` (`logic.js:2253`) est consommé par **8 sites**, dont **2 guards du coach**
  (`adaptiveCoachFocus`, `logic.js:6113` et `6843`). Le corriger globalement **modifie une sortie du
  domaine `coach`**, or `coach` est **bloqué par la rotation §4 bis** ce tour (recaps récents
  618 coach · 617 etudes · 616 robustesse · 615 sommeil · 614 coach : `coach` 2× dont le plus récent).
- Un correctif **partiel** (n'updater que l'onglet Nutrition en laissant le coach à 1,8) **créerait une
  NOUVELLE contradiction** entre la cible affichée dans Nutrition et celle que le coach/quête/adhérence
  utilisent — exactement l'anti-pattern que §4 ter interdit.

Donc : soit tout bouge ensemble (cohérence préservée partout, coach inclus → à faire dans un **tour où
`coach` est le domaine actif de la rotation**, ou en passe supervisée), soit rien. Le choix « quel
multiplicateur en sèche, et d'où vient le signal » mérite d'être **cadré avant de coder** (§4). D'où ce
document.

## 1. Le manque — trois calculs de protéines qui divergent, aucun conscient de la sèche

L'app calcule la cible protéique à **trois** endroits, avec **trois barèmes différents** :

| Fonction | Barème | Conscient du déficit ? | Rendu (surfaces lues) |
| --- | --- | --- | --- |
| `proteinTarget(weight, goal)` `logic.js:2253` | force **1,9** · trail **1,6** · sinon **1,8** g/kg | ❌ **non** (ne voit que `goal` ∈ {force, trail, recomposition}) | Onglet **Nutrition** (`#nutritionStatus`, `#nutritionWeekStatus`, quête « 🥩 Atteins tes protéines »), **Compléments** (`#suppProteinTarget`), barre **Hydratation** (`#proteinLabel`, `proteinSnackSuggestion`), score **`weeklyAdherence`**, et **2 guards du coach** (`adaptiveCoachFocus`) |
| `energyPlan(opts)` `logic.js:5168` | perte **2,4** · prise **2,0** · maintien **1,8** g/kg | ✅ **oui** (dérive `goal` de poids − `targetWeight`) | Carte **Coach Poids** (`app.js:383`, `plan.proteinG`), plan copié |
| `objectiveNutrition` → `proteinG` | selon objectif | partiel | Programme objectif, onboarding |

**Le défaut central** : `proteinTarget` est le barème **générique** que l'utilisateur voit dans l'onglet
Nutrition **tous les jours**. Pour un objectif « Perte de gras » (`seche`), `goalMap`
(`logic.js:3575`) le mappe sur `goal='recomposition'` → **1,8 g/kg**, **quelle que soit** l'intensité
réelle du déficit. Or, dès qu'Adrien saisit un **poids cible** plus bas (`state.goals.targetWeight`),
`energyPlan` bascule en sèche active et vise **2,4 g/kg** sur la carte Coach Poids **voisine**.

Un même utilisateur en sèche lit donc **deux cibles protéiques différentes** selon l'onglet
(ex. ~135 g dans Nutrition vs ~180 g dans Coach Poids pour 75 kg), et **la plus basse — celle affichée
au quotidien — sous-alimente la préservation musculaire pendant un déficit**. C'est précisément le
risque que le mandat élite dit d'éviter (« un vrai coach ne carence pas — préservation du muscle »).

## 2. La science — pourquoi la protéine doit monter en déficit

Le besoin protéique **augmente** pendant une restriction énergétique, pour épargner la masse maigre
(le corps oxyde plus d'acides aminés quand l'énergie manque) :

- **Longland et al. 2016** (_Am J Clin Nutr_ 103:738) : à **−40 %** d'énergie, le groupe **2,4 g/kg**
  a **gagné** du muscle et perdu plus de gras que le groupe 1,2 g/kg. C'est la source **déjà citée**
  dans `energyPlan` (`logic.js:5166`).
- **Helms et al. 2014** (_J Int Soc Sports Nutr_ 11:20 ; _preparation naturelle_) : **2,3–3,1 g/kg de
  masse maigre** pendant une sèche — soit ≈ **2,0–2,7 g/kg de poids** pour un athlète plutôt sec, la
  borne **haute** quand on est déjà sec et le déficit agressif.
- **Morton et al. 2018** (_Br J Sports Med_ 52:376, méta-analyse) : hors déficit, l'optimum pour la
  prise de force/muscle plafonne vers **1,6 g/kg** (IC jusqu'à ~2,2) — **1,8 g/kg en maintien reste
  donc défendable** ; c'est **en déficit** que le plancher doit monter.
- **Jäger/ISSN 2017** (_JISSN_ 14:20) et **Aragon/ISSN 2017** (_JISSN_ 14:16) : 1,4–2,0 g/kg pour un
  actif ; **borne haute, voire au-delà, en restriction calorique**.

Conclusion NUANCÉE (mandat : « personnaliser, pas cranker ») : **1,8 g/kg en maintien/recomposition est
correct** ; le défaut est **uniquement** l'absence de relèvement **en sèche active**.

## 3. Options

### A. Ne rien faire
Le gap reste : cible quotidienne sous-optimale en sèche + incohérence Nutrition ↔ Coach Poids. Rejetée
(contredit le mandat élite et §4 ter).

### B. Rendre `proteinTarget` conscient de la sèche, via un signal unique dérivé _(recommandée)_
1. **Un seul signal, une seule source.** Helper pur `activeWeightGoal(state)` → `'perte' | 'prise' |
   'maintien' | null`, dérivé **exactement** comme `energyPlan` (poids courant − `state.goals.targetWeight`,
   seuil 0,5 kg déjà utilisé `logic.js:5149`). Zéro nouvelle donnée saisie.
2. **`proteinTarget(weight, goal, opts)`** — 3ᵉ argument **optionnel** `{ cut: boolean }`. Sans `opts`
   → **comportement identique** (tous les tests existants restent verts, aucune assertion touchée).
   En sèche (`cut:true`) → **plancher relevé** : générique 1,8 → **2,2** ; force 1,9 → **2,2** ; trail
   1,6 → **2,0**. (Valeurs à confirmer, cf. décision 2 — 2,2 est **conservateur** vs le 2,4 d'`energyPlan`
   réservé à un déficit *mesuré*, et ferme l'essentiel du gap sans « cranker ».)
3. **Cohérence maintenue partout** : les **8 sites** passent le même `cut` dérivé du même helper → la
   cible monte **ensemble** dans Nutrition, Compléments, Hydratation, `weeklyAdherence`, quête ET coach.
   Aucun site ne diverge → §4 ter respecté par construction.
4. Source citée dans le code (Longland 2016 / Helms 2014) + entrée CHANGELOG.

**Coût / risque** : ~8 sites + 1 helper + tests + contrôle §4 ter sur les surfaces coach
(`adaptiveCoachFocus` : la note « protéines » et le `proteinTrainGuard` doivent rester cohérents). Faisable
en **une itération** quand `coach` est le domaine **actif** de la rotation (le ripple coach y est légitime),
ou en passe supervisée. Découpe possible façon P6 : B.1 helper + `proteinTarget(opts)` testés (pas de bump) →
B.2 branchement des 8 sites + smoke + §4 ter (bump).

### C. Ne relever que l'onglet Nutrition
Rejetée : crée une **nouvelle** divergence (Nutrition à 2,2 vs coach/adhérence à 1,8), soit exactement
la contradiction §4 ter qu'on veut supprimer.

## 4. Recommandation

**B**, réalisée dans un **tour où `coach` est le domaine actif** (parce que le correctif propre *doit*
toucher `adaptiveCoachFocus` pour rester cohérent, et la rotation §4 bis interdit de le faire en
tour-non-coach) — ou en passe supervisée. Le signal est déjà là (`targetWeight`), la science est
tranchée, aucun nouveau champ utilisateur.

## 5. Décisions qui t'attendent, Adrien

1. **Périmètre** — A (rien) / **B** (recommandé) / C (Nutrition seul, déconseillé) ?
2. **Multiplicateur de sèche** — plancher **2,2 g/kg** (conservateur, recommandé) ? ou **s'aligner sur
   les 2,4 g/kg d'`energyPlan`** pour une cohérence chiffrée parfaite avec la carte Coach Poids ? ou une
   valeur **personnalisée** selon l'IMC (comme `safeLossRate` module déjà le rythme de perte) ?
3. **Déclencheur du « cut »** — uniquement quand un `targetWeight` plus bas est saisi (proposé), ou aussi
   quand l'objectif fitness est `seche` **sans** cible chiffrée ?
4. **Réalisation** — j'attends un tour `coach`-actif de la rotation pour l'implémenter en autonomie
   (B.1→B.2), ou tu préfères le réserver à une **passe supervisée** ?

_(Sources : Longland 2016 AJCN 103:738 · Helms 2014 JISSN 11:20 · Morton 2018 BJSM 52:376 · Jäger/ISSN
2017 JISSN 14:20 · Aragon/ISSN 2017 JISSN 14:16.)_
