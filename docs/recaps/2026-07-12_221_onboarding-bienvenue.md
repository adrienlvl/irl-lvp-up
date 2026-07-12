# Boucle #221 (autonome) — 3ᵉ rotation #2 : bienvenue personnalisée + prérempli · build 1.9.155

**3ᵉ rotation, #2 (onboarding).** L'onboarding demande un objectif mais n'explique pas ce que ça va donner. Ajout d'un **message personnalisé** + un **préremplissage intelligent**.

## Livré

- **Message de bienvenue par objectif** : dès qu'on choisit un objectif, une ligne verte explique ce que l'app va mettre en place — ex. « ✨ Objectif perte de gras : cardio (tempo/fractionné) + full body pour garder le muscle, déficit calorique maîtrisé. » Se met à jour en direct.
- **Préremplissage intelligent** : si le poids n'est pas renseigné dans le profil mais qu'une **pesée existe**, le champ poids est prérempli avec la dernière valeur.

## Détail technique

- **`lib/logic.js`** : `OBJECTIVE_WELCOME` (5) + `objectiveWelcome(key)` (défaut athlétique). Pur + testé.
- **`app.js`** : `renderOnboardingWelcome()` (au change d'objectif + à l'ouverture) ; prérempli du poids depuis `state.weights.at(-1)`.
- **`index.html`** : `#onboardingWelcome`. **`companion.css`** : `.onb-welcome`.

## Vérifs

- `npm run verify` → **253 tests / 253 pass** (+1 : `objectiveWelcome`), garde-fou CSS vert, **SMOKE OK** (`objectiveWelcome:true`).
- `npm run dist` → **Setup 1.9.155.exe** (app d'Adrien jamais fermée).

## Suite (3ᵉ rotation)

#3 (nouvelles routines / « surprends-moi »), #4 (comparaison de blocs / notif fin de bloc).
