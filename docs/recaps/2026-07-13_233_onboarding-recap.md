# Boucle #233 (autonome) — 6ᵉ rotation #2 : récap de fin d'onboarding + « Lancer ma 1re séance » · build 1.9.167

**6ᵉ rotation, #2 (onboarding).** À la fin de l'onboarding, l'app affichait juste un toast puis basculait sur la page. Désormais un **écran de récap** montre ce qui a été mis en place et propose de **lancer directement la 1re séance** — la boucle onboarding → action est bouclée.

## Livré

- **Dialogue de récap** après « Démarrer » :
  - « 📅 X séances placées dans ton agenda (4 semaines) »
  - « ▶️ Première séance : **Lundi 20/07/2026** — Poussée » (jour + date calculés)
  - « ⭐ N quêtes du jour créées »
- **Bouton « 🚀 Lancer ma 1re séance »** → ouvre directement la 1re séance de muscu en mode guidé (masqué si l'objectif ne génère que des courses).
- Bouton « 📅 Voir mon programme » pour fermer et explorer.

## Détail technique

- **`lib/logic.js`** : `onboardingFirstSession(week, mondayKey)` — première séance chronologique (lundi→dimanche) + date depuis le lundi de départ + `guidable` (muscu avec exercices). Pur + testé.
- **`app.js`** : `showOnboardingRecap(prog, scheduled, questCount)` (remplace le toast), câble « Lancer » → `openGuidedWorkout` de la 1re séance muscu.
- **`index.html`** : `#onboardingRecapDialog` / `#onboardingRecapBody`. **`companion.css`** : `.onb-recap-list` / `.onb-recap-actions`.

## Vérifs

- `npm run verify` → **265 tests / 265 pass** (+1 `onboardingFirstSession`), garde-fou CSS vert, **SMOKE OK** (`onboardingRecap:true`).
- **Navigateur** : onboarding muscle + Lun/Mer → récap « 24 séances · 1re Lundi 20/07/2026 Poussée · 3 quêtes » ; « Lancer ma 1re séance » → séance guidée « 💪 Poussée » ouverte. ✓
- `npm run dist` → **Setup 1.9.167.exe** (app d'Adrien jamais fermée).

## Suite (rotation 6)

#1 ✅ (#232), #2 ✅ (#233). Prochain : #3 bien-être, #4 coaching.
