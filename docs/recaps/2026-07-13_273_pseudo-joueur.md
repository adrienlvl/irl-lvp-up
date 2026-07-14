# Boucle #273 (autonome) — 16ᵉ rotation #2 : prénom/pseudo du joueur · build 1.9.207

**16ᵉ rotation, #2 (onboarding).** La carte joueur affichait un titre de niveau mais restait impersonnelle. Ajout d'un **prénom/pseudo** saisi à l'onboarding et affiché sur la carte joueur — touche personnelle pour un RPG de vie.

## Livré

- **Champ « 🙂 Ton prénom / pseudo »** (optionnel) en tête de l'onboarding.
- Affiché **« 👋 {pseudo} »** en haut de la carte joueur (au-dessus du niveau/XP). Masqué si vide.
- Pré-rempli à la réouverture ; se vide proprement si effacé.

## Détail technique

- **`lib/logic.js`** : `onboardingSetup` capte `profile.name` (trimé, plafonné à 24 caractères, '' sinon). Pur + testé.
- **`app.js`** : `onboardingInputs` (name), `openOnboarding` (pré-remplissage), `renderDashboardCore` (`#playerName` via `textContent` — sûr).
- **`index.html`** : `#onbName`, `#playerName`.
- **`style.css`** : `.player-name` (accent).
- **CHANGELOG** complété (v1.9.207).

## Vérifs

- `npm run verify` → **297 tests / 297 pass** (assertions `name` : trim, 24 max, non-string → ''), garde-fou CSS vert, **SMOKE OK** (`onboardingSetup` enrichi).
- **Navigateur** : « &nbsp;Adrien&nbsp; » → capté « Adrien », carte affiche « 👋 Adrien » ; effacé → ligne masquée. ✓
- `npm run dist` → **Setup 1.9.207.exe** (app d'Adrien jamais fermée).

## Suite (rotation 16)

#1 ✅ (#272), #2 ✅ (#273). Prochain : #3 bien-être, #4 coaching → puis fin de rotation = tag + auto-publish + notif. Boucle autonome continue.
