# #605 — Coach Poids : rythme & durée cohérents entre le plan et le conseil (build 2.0.220)

**Domaine : nutrition** · logique pure + tests + smoke bloquant · bump 2.0.220.

## Le manque, vérifié (grep + lecture + reproduction)

L'écran **Coach Poids** rend côte à côte deux surfaces qui parlent de la même chose :

- `renderWeightPlan` (`app.js:351`) affiche le **plan** `energyPlan(...)` : « ≈ **X semaines** · cible
  estimée le … (au rythme de **Y kg/sem**) ».
- `renderTargetAdvice` (`app.js:330`) affiche les **conseils** `weightTargetAdvice(...)`, dont la note
  durée « il faut ~**Z semaines**, prévois des pauses ».

Or les deux dérivaient leur rythme **chacun de son côté** :

- `energyPlan` : rythme **personnalisé par corpulence** 0,5–0,9 %/sem selon l'IMC (Garthe 2011,
  Aragon/ISSN 2017), avec garde-fous déficit ≤ 25 % TDEE + apport ≥ BMR (depuis 2.0.211, #—).
- `weightTargetAdvice` : resté sur un **0,6 %/sem fixe** (`Math.min(0.9, Math.max(0.25, weight*0.006))`).

**Reproduction** (profil corpulent 92 kg → 78 kg, 178 cm, 30 ans, 4 séances) :
`energyPlan` → **0,67 kg/sem, 21 semaines** ; `weightTargetAdvice` → **0,55 kg/sem, 26 semaines**.
Soit, au même endroit, « ≈ 21 semaines » d'un côté et « ~26 semaines, prévois des pauses » de l'autre.
C'est **exactement** la classe de bug « deux verdicts opposés sur le même écran » que les correctifs
2.0.79 / 2.0.59 / 2.0.131 (déjà entre `energyPlan` et le conseil voisin) ont chassée à répétition.

## Le correctif — une SOURCE UNIQUE, pas un champ de plus (§3 : curation, pas volume)

Nouvelle fonction pure **`safeLossRate(weight, bmi, tdee, bmr)`** qui encapsule la logique de rythme de
perte (ratePct par IMC + les deux garde-fous d'élite) et renvoie `{ ratePerWeek, deficit, dailyTarget }`
ou `null`. **`energyPlan`** l'appelle (son bloc inline devient un appel — comportement identique, vérifié)
et **`weightTargetAdvice`** aussi : quand le profil (âge) permet de calculer BMR/TDEE, son rythme vient de
`safeLossRate` ; sinon **repli** sûr sur l'ancien 0,6 %/sem borné (aucune régression quand le profil est
incomplet — dans ce cas `energyPlan` renvoie `null` et le bloc plan n'est même pas rendu, donc zéro
divergence visible). `app.js` passe désormais aussi `activityLevel` à `weightTargetAdvice` pour que la
base TDEE soit **identique** à celle du plan.

Après correctif, les trois profils testés (corpulent / Adrien / sujet sec) donnent **rythme ET durée
strictement égaux** entre plan et conseil. Aucune donnée ajoutée, aucune note ajoutée : une contradiction
retirée.

## Vérif / sécurité

- `cd src && xvfb-run -a npm run verify` → **552 tests + smoke OK, 100 % vert.**
- Test dédié : `weightTargetAdvice ↔ energyPlan : rythme et durée COHÉRENTS` (3 profils : égalité
  `ratePerWeek`/`weeks` ; corpulence → rythme croissant ; repli borné sans âge ; garde-fous de
  `safeLossRate`).
- Check smoke **bloquant** : `targetAdvice` étendu — `energyPlan.ratePerWeek/weeks === weightTargetAdvice`
  sur un profil chargé (poussé dans `errors` via l'assertion existante).
- §4 ter : aucune nouvelle chaîne affichée (seuls des nombres de semaines convergent) ; le CHANGELOG
  2.0.220 a été relu en entier.
- Interdictions §3 respectées (aucune feature retirée, aucune dépendance, pas de tag/release, aucun
  champ coach ajouté). Rotation §4 bis : 5 derniers domaines = athlete·athlete·coach·robustesse·athlete →
  `nutrition` absent → autorisé. Priorité de nuit (DEMANDES.md « coaching à fond, en curation ») honorée
  côté diététique du sport (mandat coaching élite), en **qualité/cohérence**, pas en volume.

Domaine : nutrition
