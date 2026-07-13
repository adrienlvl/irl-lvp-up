# Boucle #265 (autonome) — 14ᵉ rotation #2 : calories en direct à l'onboarding · build 1.9.199

**14ᵉ rotation, #2 (onboarding).** L'onboarding calculait déjà les calories, mais seulement dans le preview (après clic). Ajout d'une **estimation en direct** dès que poids/taille/âge sont saisis — feedback immédiat qui motive à compléter le profil.

## Livré

- **Bandeau live** sous la jauge de complétude : « 🔥 ~X kcal/j pour maintenir · 📉/📈/⚖️ objectif Y kcal/j · 🥩 ~Z g protéines/j ».
- Se met à jour à chaque frappe ; s'adapte à l'objectif choisi (déficit / maintien / surplus).

## Détail technique

- **`lib/logic.js`** : `onboardingNutritionEstimate(inputs)` → `{ maintenance, target, dir, adjustPct, proteinG }` (fin wrapper testé sur `objectiveNutrition`) ; null si poids/taille/âge insuffisants. Pur + testé.
- **`app.js`** : `renderOnboardingCalories()` câblé sur input/change du dialogue, le change d'objectif et l'ouverture.
- **`index.html`** : `#onboardingCalories`.
- **`companion.css`** : `.onb-calories`.
- **CHANGELOG** complété (v1.9.199).

## Vérifs

- `npm run verify` → **292 tests / 292 pass** (+ test `onboardingNutritionEstimate`), garde-fou CSS vert, **SMOKE OK** (`onboardingCalories`).
- **Navigateur** (80 kg / 178 / 30 / homme / 4 séances, sèche) : « 🔥 ~2740 kcal/j pour maintenir · 📉 objectif 2247 kcal/j (déficit) · 🥩 ~176 g protéines/j ». ✓
- `npm run dist` → **Setup 1.9.199.exe** (app d'Adrien jamais fermée).

## Suite (rotation 14)

#1 ✅ (#264), #2 ✅ (#265). Prochain : #3 bien-être, #4 coaching → puis fin de rotation = tag + auto-publish + notif. Boucle autonome continue.
