# Boucle #281 (autonome) — 18ᵉ rotation #2 : note blessures/limitations · build 1.9.215

**18ᵉ rotation, #2 (onboarding).** Ajout d'un champ **« Blessures / limitations »** à l'onboarding, rappelé sous forme de bannière **au-dessus du programme d'entraînement** — pour garder ses fragilités en tête avant de s'entraîner.

## Livré

- **Champ « 🩹 Blessures / limitations »** (optionnel, 140 caractères) dans l'onboarding.
- **Bannière « 🩹 À adapter : … »** au-dessus du programme (Programme auto), affichée dès que la note est renseignée ; pré-remplie à la réouverture de l'onboarding.

## Détail technique

- **`lib/logic.js`** : `onboardingSetup` capte `profile.limitations` (trimé, plafonné à 140, '' sinon). Pur + testé.
- **`app.js`** : `onboardingInputs` (limitations) + `openOnboarding` (pré-remplissage) + `renderLimitationsNote()` (bannière, `escapeHtml`, sûr) appelé dans `render()`.
- **`index.html`** : `#onbLimitations`, `#limitationsNote`.
- **`strength.css`** : `.limitations-note` (bord ambre).
- **CHANGELOG** complété (v1.9.215).

## Vérifs

- `npm run verify` → **302 tests / 302 pass** (assertions `limitations` : trim, 140 max, non-string → ''), garde-fou CSS vert, **SMOKE OK** (`onboardingSetup` enrichi + éléments présents).
- **Navigateur** : bannière « 🩹 À adapter : genou droit fragile » ; effacée → masquée ; champ onboarding « épaule gauche » capté (trimé). ✓
- `npm run dist` → **Setup 1.9.215.exe** (app d'Adrien jamais fermée).

## Suite (rotation 18)

#1 ✅ (#280), #2 ✅ (#281). Prochain : #3 bien-être, #4 coaching → puis fin de rotation = tag + auto-publish + notif. Boucle autonome continue.
