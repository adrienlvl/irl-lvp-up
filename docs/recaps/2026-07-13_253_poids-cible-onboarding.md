# Boucle #253 (autonome) — 11ᵉ rotation #2 : poids cible à l'onboarding · build 1.9.187

**11ᵉ rotation, #2 (onboarding).** L'onboarding capturait poids/taille mais pas d'**objectif de poids**. Ajout d'un champ « poids cible » qui alimente directement le coach poids.

## Livré

- **Champ « Poids cible (kg) »** (optionnel) dans l'onboarding, à côté du poids.
- Enregistré dans `goals.targetWeight` → **alimente le coach poids** (allure vers l'objectif, prévision d'atteinte, progression) dès la fin de l'onboarding.
- Pré-rempli depuis l'objectif existant à la réouverture.

## Détail technique

- **`lib/logic.js`** : `onboardingSetup` capte `goals.targetWeight` (validé 30–300, absent sinon). Pur + testé.
- **`app.js`** : `onboardingInputs` (targetWeight) + `openOnboarding` (pré-remplissage depuis `state.goals.targetWeight`).
- **`index.html`** : `#onbTargetWeight`.

## Vérifs

- `npm run verify` → **282 tests / 282 pass** (assertions `targetWeight` ajoutées), garde-fou CSS vert, **SMOKE OK** (`onboardingSetup` enrichi).
- **Navigateur** (poids 82 → cible 75) : après « Démarrer », `goals.targetWeight = 75`. ✓
- `npm run dist` → **Setup 1.9.187.exe** (app d'Adrien jamais fermée).

## Suite (rotation 11)

#1 ✅ (#252), #2 ✅ (#253). Prochain : #3 bien-être, #4 coaching. Boucle autonome continue. _(Publication : 1ʳᵉ release v1.9.185 verte ✅ ; nouveaux builds en local, tag uniquement si Adrien dit « publie ».)_
