# Boucle #241 (autonome) — 8ᵉ rotation #2 : choix de niveau (volume) · build 1.9.175

**8ᵉ rotation, #2 (onboarding).** Le programme générait toujours 5 exercices par séance muscu, quel que soit le niveau. Ajout d'un **choix de niveau** qui ajuste le volume.

## Livré

- **Sélecteur « Niveau »** (Débutant / Intermédiaire / Avancé) dans l'onboarding, pré-sélectionné depuis le profil.
- **Volume ajusté** : débutant **4** exos / séance muscu, intermédiaire **5**, avancé **6**.
- Appliqué **partout** : aperçu d'onboarding, planification, générateur principal (Programme auto), bouton « nouveau bloc ».

## Détail technique

- **`lib/logic.js`** : `perSessionForLevel(level)` (4/5/6, défaut 5). `onboardingSetup` capte `profile.level` (validé, défaut débutant). Purs + testés.
- **`app.js`** : `onboardingInputs`/`openOnboarding` gèrent le niveau ; `renderOnboardingPreview`, `finishOnboarding`, `runObjectiveProgram` et le bouton « nouveau bloc » passent `perSession: perSessionForLevel(...)`.
- **`index.html`** : `#onbLevel`.

## Vérifs

- `npm run verify` → **272 tests / 272 pass** (+1 `perSessionForLevel` + assertion `onboardingSetup`), garde-fou CSS vert, **SMOKE OK** (`onboardingLevel:true`).
- **Navigateur** (objectif muscle, vraie bibliothèque) : débutant → **4** exos / séance, intermédiaire → **5**, avancé → **6**. ✓
- `npm run dist` → **Setup 1.9.175.exe** (app d'Adrien jamais fermée).

## Suite (rotation 8)

#1 ✅ (#240), #2 ✅ (#241). Prochain : #3 bien-être, #4 coaching. Boucle autonome continue.
