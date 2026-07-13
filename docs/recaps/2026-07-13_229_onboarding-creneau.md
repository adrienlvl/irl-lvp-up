# Boucle #229 (autonome) — 5ᵉ rotation #2 : onboarding « moment préféré » · build 1.9.163

**5ᵉ rotation, #2 (onboarding).** Après les jours dispo (#225), l'onboarding demande maintenant le **moment préféré** (matin/midi/soir) qui **alimente l'heure des séances programmées** — l'agenda colle à ta vraie journée.

## Livré

- **Sélecteur « 🕑 Ton moment préféré »** (Peu importe / Matin / Midi / Soir) dans l'onboarding, pré-sélectionné depuis le profil.
- **Heures des séances alimentées par le créneau** (aperçu **et** agenda 4 sem.) :
  - Matin → muscu 07:00 · course 07:30
  - Midi → muscu 12:15 · course 12:00
  - Soir → muscu 18:00 · course 18:30
  - « Peu importe » → comportement historique (muscu 18:00 · course 07:30).
- L'aperçu affiche désormais **jour + heure** de chaque séance.

## Détail technique

- **`lib/logic.js`** : `TRAINING_SLOTS` + `sessionTimesForSlot(slot)` (repli historique si clé inconnue/vide). `onboardingSetup` capte `profile.trainingSlot` (validé). Purs + testés. Exports ajoutés.
- **`app.js`** : `onboardingInputs`/`openOnboarding`/`renderOnboardingPreview` gèrent le créneau ; `scheduleObjectiveProgram` place chaque séance à l'heure du créneau (défaut `profile.trainingSlot`). `defaults.profile.trainingSlot:''`.
- **`index.html`** : `#onbSlot`.

## Vérifs

- `npm run verify` → **261 tests / 261 pass** (+1 `sessionTimesForSlot` + assertions `onboardingSetup`), garde-fou CSS vert, **SMOKE OK** (`onboardingSlot:true`).
- **Navigateur** : onboarding « matin » + Mar/Ven → aperçu 07:00/07:30 ; « Démarrer » place **24 séances** toutes à 07:00 (muscu) / 07:30 (course) sur Mar/Ven. ✓
- `npm run dist` → **Setup 1.9.163.exe** (app d'Adrien jamais fermée).

## Suite (rotation 5)

#1 ✅ (#228), #2 ✅ (#229). Prochain : #3 bien-être, #4 coaching.
