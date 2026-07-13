# Boucle #225 (autonome) — 4ᵉ rotation #2 : onboarding « mes jours dispo » · build 1.9.159

**4ᵉ rotation, #2 (onboarding).** L'onboarding générait un programme placé sur des **jours fixes** (preset), sans tenir compte des jours où l'utilisateur peut réellement s'entraîner. Ajout d'un **sélecteur de jours dispo** qui **replace le programme** dessus — gros levier d'adhérence.

## Livré

- **Sélecteur « Tes jours dispo »** dans l'onboarding (Lun→Dim), pré-coché depuis le profil (défaut Lun/Mer/Ven).
- **Programme replacé sur ces jours** — aperçu **et** planification :
  - Assez de jours → une séance par jour, **espacée** (première au 1ᵉʳ jour, dernière au dernier).
  - Moins de jours que de séances → **répartition équilibrée** (ex. 2 jours / 7 séances → 2 muscu + du cardio par jour, jamais 4 muscu empilées le même jour).
  - Tri lundi d'abord, dimanche en fin de semaine.

## Détail technique

- **`lib/logic.js`** : `assignProgramDays(week, availableDays)` — pur, valide/déduplique/trie les jours, `floor(i·d/n)` pour le sur-remplissage équilibré, `round(i·(d-1)/(n-1))` pour l'espacement. `onboardingSetup` capte `profile.availableDays`. Exports ajoutés.
- **`app.js`** : `onboardingInputs` (jours cochés), `openOnboarding` (pré-cochage), `renderOnboardingPreview` + `finishOnboarding` remappent `prog.week` avant résumé/agenda.
- **`index.html`** : `#onbDays`. **`companion.css`** : `.onb-days` (puce active via `:has(input:checked)`).

## Vérifs

- `npm run verify` → **257 tests / 257 pass** (+1 `assignProgramDays`, `onboardingSetup` étendu), garde-fou CSS vert, **SMOKE OK** (`onboardingDays:true`).
- **Navigateur** : onboarding « muscle » + jours Mar/Ven → aperçu = **Mar : Poussée + Tirage + cardio**, **Ven : Jambes + Haut + cardio** (2 muscu/jour, équilibré). ✓
- `npm run dist` → **Setup 1.9.159.exe** (app d'Adrien jamais fermée).

## Suite (rotation 4)

#1 ✅ (#224), #2 ✅ (#225). Prochain : #3 bien-être, puis #4 coaching.
