# 595 — Coach Poids au niveau nutritionniste du sport : rythme personnalisé + protéines sourcées (2.0.211)

> Demande d'Adrien : « pousse au max, sois au niveau d'un diététicien/nutritionniste de haut niveau,
> tu peux chercher des documents scientifiques ». Loop 1 de la série « coaching poussé à fond ».

## Méthode : la science d'abord

Recherche (workflow 4 agents WebSearch) sur des sources reconnues avant de coder. Verdict **nuancé et
important** : pour un athlète, perdre trop vite est **contre-productif** — donc « aller plus loin » ≠
« plus agressif bêtement », c'est **personnaliser** et **protéger le muscle**.

## Ce qui change dans `energyPlan`

**Rythme de perte PERSONNALISÉ par corpulence** (l'IMC sert de proxy du %MG, non saisi). Avant :
`weight × 0,006` fixe (~0,6 %/sem pour tous). Maintenant, fourchette **0,5–0,9 %/sem** :
- IMC ≥ 28 → 0,9 %/sem · 25–28 → 0,8 · 23–25 → 0,7 · 21–23 → 0,6 · < 21 → 0,5 %/sem.
- **Plus corpulent → plus ambitieux** ; **plus sec → plus lent, pour préserver le muscle**.
- _Sources_ : Aragon/ISSN 2017 (JISSN 14:16, « the higher the baseline body-fat, the more aggressively
  the deficit may be imposed ») ; Garthe 2011 (IJSNEM 21:97 : 0,7 %/sem fait **gagner** LBM +2,1 % et
  double les gains de force vs 1,4 %/sem).

**Garde-fous d'élite** (un vrai coach ne blesse pas) :
- Déficit **plafonné à 25 % du TDEE** (ISSN — au-delà : fonte musculaire, adaptation, chute hormonale).
- Apport **≥ métabolisme de base** (conservé).

**Protéines** : **2,4 g/kg en déficit** (Longland 2016, AJCN 103:738 — gagne de la LBM même à −40 %),
**2,0 g/kg en prise** (ISSN/Jäger 2017). Lipides ≥ plancher hormonal 0,5 g/kg.

## `nutritionTips` niveau diététicien (avec sources)

Conseils enrichis et cités : répartition des protéines **~0,4 g/kg × 3-4 repas** (ISSN 2017), déficit
modéré 15-25 %, protéines hautes en sèche, **hydratation ~35 ml/kg/j**, **fibres ~25-30 g/j**, surplus
modéré +10-15 % en prise. Fini les conseils génériques.

## Effet concret (mesuré)

| Profil | Avant | Après |
|---|---|---|
| 80 kg / IMC 24,7 | 0,48 kg/sem, 160 g prot | **0,56 kg/sem, 192 g prot** (déficit 22 % TDEE) |
| 100 kg / IMC 31,6 | ~0,6 kg/sem | **0,69 kg/sem** (plafonné à 25 % TDEE) |
| 68 kg / IMC 21 (sec) | ~0,4 kg/sem | **0,34 kg/sem** (protège le muscle) |

## Vérifs

- **543 tests** + smoke verts. Test `energyPlan` mis à jour (valeurs sourcées) + assertions nouvelles
  (corpulent = déficit plafonné à 25 % TDEE et rythme > moyen ; sec = rythme < moyen). Test
  `nutritionTips` : levier protéines nommé.
- **Navigateur** : Coach Poids affiche 2143 kcal (rythme perso) et les conseils cités (Garthe 2011,
  Longland 2016, ISSN 2017) à l'écran.

## Suite (série coaching poussé à fond)

- Muscu/renforcement **niveau kiné** : RIR/RPE, surcharge progressive, périodisation, prévention/prehab.
- Running/**trail** : zones (polarisé 80/20), +10 %/sem, VO2max, sortie longue, affûtage, **distance
  par objectif** (gap déjà repéré).
- Exercices plus complets (à la Garmin/Strava/Apple Fitness).

## Fichiers

- `src/lib/logic.js` — `energyPlan` (rythme perso + garde-fous + protéines), `nutritionTips` enrichis, CHANGELOG.
- `src/test/logic.test.js` — tests mis à jour + assertions science.

Domaine : nutrition
