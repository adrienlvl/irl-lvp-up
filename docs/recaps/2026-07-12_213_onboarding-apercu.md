# Boucle #213 (autonome) — Approfondir #2 : aperçu du programme à l'onboarding · build 1.9.147

**Approfondir #2 (onboarding).** L'onboarding générait le programme **à l'aveugle** (on validait sans voir ce qu'on allait obtenir). Ajout d'un **aperçu avant validation**.

## Livré

Bouton **« 👁️ Voir un aperçu de mon programme »** dans l'onboarding : affiche, à partir des choix en cours, un **aperçu du programme généré** sans rien enregistrer :

- titre de l'objectif + **≈ X h/semaine · N séances** ;
- la **semaine jour par jour** (🏋️ muscu / 🏃 course avec le libellé) ;
- la **nutrition alignée** (kcal/jour + macros) si poids + taille renseignés.

L'aperçu se **met à jour** si on change d'objectif, et le bouton **« 🚀 Démarrer »** applique tout (programme + agenda 4 sem. + quêtes) comme avant. On voit donc exactement ce qu'on obtient avant de s'engager.

## Détail technique

- **`app.js`** : `onboardingInputs()` (lecture form factorisée) + `renderOnboardingPreview()` (réutilise `onboardingSetup`/`objectiveProgram`/`programWeekSummary`/`objectiveNutrition`) ; wiring du bouton aperçu + refresh au changement d'objectif ; reset de l'aperçu à l'ouverture.
- **`index.html`** : `#onboardingPreviewBtn` + `#onboardingPreview`. **`companion.css`** : styles `.onb-preview`/`.onb-prev-*`.

## Vérifs

- `npm run verify` → **245 tests / 245 pass**, garde-fou CSS vert, **SMOKE OK** (`onboardingPreview:true` — l'aperçu affiche kcal + séances).
- `npm run dist` → **Setup 1.9.147.exe** (app d'Adrien jamais fermée).

## Suite (rotation)

#3 CONTENU (routine récup récurrente / suggestion selon la forme / nouvelles routines), puis #4 PÉRIODISÉ (décharge qui allège vraiment), puis reboucler #1.
