# Boucle #237 (autonome) — 7ᵉ rotation #2 : jauge de complétude du profil · build 1.9.171

**7ᵉ rotation, #2 (onboarding).** Rien n'indiquait à l'utilisateur si son profil était assez complet (notamment poids/taille, nécessaires aux calories/macros). Ajout d'une **jauge de complétude** en direct dans le dialogue.

## Livré

- **Barre « Profil complété à X% »** dans l'onboarding, mise à jour **en direct** à chaque changement de champ (objectif, poids, taille, âge, jours dispo, moment préféré).
- **Indice nutrition** : « ✓ Calories & macros calculables » si poids + taille sont valides, sinon « 💡 Ajoute poids + taille pour tes calories/macros ».

## Détail technique

- **`lib/logic.js`** : `onboardingCompleteness(inputs)` → `{ percent, filled, total, nutritionReady, missing:[labels] }` (bornes validées). Pur + testé.
- **`app.js`** : `renderOnboardingMeter()` (au change/input du dialogue + à l'ouverture).
- **`index.html`** : `#onboardingMeter`. **`companion.css`** : `.onb-meter` / `.onb-meter-bar` (barre animée).

## Vérifs

- `npm run verify` → **269 tests / 269 pass** (+1 `onboardingCompleteness`), garde-fou CSS vert, **SMOKE OK** (`onboardingMeter:true`).
- **Navigateur** : ouverture → « 83 % » (moment préféré manquant) → choix du créneau → « 100 % » ; indice « ✓ macros calculables ». Mise à jour en direct. ✓
- `npm run dist` → **Setup 1.9.171.exe** (app d'Adrien jamais fermée).

## Suite (rotation 7)

#1 ✅ (#236), #2 ✅ (#237). Prochain : #3 bien-être, #4 coaching. Boucle autonome continue.
