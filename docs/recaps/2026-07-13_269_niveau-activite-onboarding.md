# Boucle #269 (autonome) — 15ᵉ rotation #2 : niveau d'activité à l'onboarding · build 1.9.203

**15ᵉ rotation, #2 (onboarding).** Les calories de l'onboarding s'appuyaient sur le nombre de séances (approximation). Ajout du **niveau d'activité au quotidien** (sédentaire→très actif) qui affine directement la dépense énergétique — se marie avec l'estimation live des calories (#265).

## Livré

- **Sélecteur « Activité au quotidien »** dans l'onboarding : — (auto), Sédentaire, Légère, Modérée, Active, Très active.
- Enregistré dans `profile.activityLevel` (cohérent avec le Coach Poids) → **affine maintenance/objectif** dans l'estimation live ET l'aperçu de programme.

## Détail technique

- **`lib/logic.js`** : `onboardingSetup` capte `profile.activityLevel` (5 clés validées, '' sinon) ; `onboardingNutritionEstimate` transmet `activityLevel` à `objectiveNutrition` (facteur d'activité choisi plutôt que déduit des séances). Purs + testés.
- **`app.js`** : `onboardingInputs` (activity), `openOnboarding` (pré-remplissage), aperçu de programme aligné (`activityLevel`).
- **`index.html`** : `#onbActivity`.
- **CHANGELOG** complété (v1.9.203).

## Vérifs

- `npm run verify` → **294 tests / 294 pass** (assertions `activityLevel` + effet maintenance), garde-fou CSS vert, **SMOKE OK** (`onboardingSetup` enrichi).
- **Navigateur** (80 kg / 178 / 30 / homme) : sédentaire → **2122 kcal** maintenance ; très actif → **3359 kcal** ; `profile.activityLevel = 'tres'`. ✓
- `npm run dist` → **Setup 1.9.203.exe** (app d'Adrien jamais fermée).

## Suite (rotation 15)

#1 ✅ (#268), #2 ✅ (#269). Prochain : #3 bien-être, #4 coaching → puis fin de rotation = tag + auto-publish + notif. Boucle autonome continue.
