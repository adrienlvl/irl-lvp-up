# Boucle #261 (autonome) — 13ᵉ rotation #2 : objectif de course à l'onboarding · build 1.9.195

**13ᵉ rotation, #2 (onboarding).** L'onboarding captait poids/objectif/matériel mais pas d'**objectif de course hebdo**, alors que la barre de progression distance de la page Athlète l'attend (`goals.distance`). Ajout d'un champ « Course (km/sem.) ».

## Livré

- **Champ « Course (km / sem.) »** (optionnel) dans l'onboarding, à côté du poids cible.
- Enregistré dans `goals.distance` → **alimente la barre de progression distance hebdo** (page Athlète) dès la fin de l'onboarding.
- Pré-rempli depuis l'objectif existant à la réouverture.

## Détail technique

- **`lib/logic.js`** : `onboardingSetup` capte `goals.distance` (validé > 0 et ≤ 500, arrondi ; absent sinon). Pur + testé.
- **`app.js`** : `onboardingInputs` (distance) + `openOnboarding` (pré-remplissage depuis `state.goals.distance`).
- **`index.html`** : `#onbDistance`.
- **CHANGELOG** complété (v1.9.195).

## Vérifs

- `npm run verify` → **289 tests / 289 pass** (assertions `distance` ajoutées), garde-fou CSS vert, **SMOKE OK** (`onboardingSetup` enrichi).
- **Navigateur** (course 30) : après « Démarrer », `goals.distance = 30` ; pré-rempli « 30 » à la réouverture. ✓
- `npm run dist` → **Setup 1.9.195.exe** (app d'Adrien jamais fermée).

## Suite (rotation 13)

#1 ✅ (#260), #2 ✅ (#261). Prochain : #3 bien-être, #4 coaching → puis fin de rotation = tag + auto-publish + notif. Boucle autonome continue.
