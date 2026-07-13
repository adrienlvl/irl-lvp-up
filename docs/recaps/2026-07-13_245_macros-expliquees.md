# Boucle #245 (autonome) — 9ᵉ rotation #2 : macros expliquées dès l'aperçu · build 1.9.179

**9ᵉ rotation, #2 (onboarding).** L'aperçu affichait les macros en chiffres bruts (P/G/L en g) sans dire à quoi elles servent. Ajout d'un **détail pédagogique**.

## Livré

- **Détail des macros** sous les calories, dans l'aperçu d'onboarding :
  - 🥩 **Protéines** — g + % des calories — « construit et répare le muscle »
  - 🍚 **Glucides** — « ton carburant pour l'effort »
  - 🥑 **Lipides** — « hormones et santé »
- Le **% des calories** est calculé (P/G = 4 kcal/g, L = 9) pour situer chaque macro.

## Détail technique

- **`lib/logic.js`** : `macroBreakdown(nutri)` → `[{ key, emoji, label, grams, role, pct }]` (ou `[]` si pas de données). Pur + testé.
- **`app.js`** : `renderOnboardingPreview` rend la liste `.onb-macros` sous la ligne calories.
- **`companion.css`** : `.onb-macros`.

## Vérifs

- `npm run verify` → **276 tests / 276 pass** (+1 `macroBreakdown`), garde-fou CSS vert, **SMOKE OK** (`macroBreakdown:true`).
- **Navigateur** (muscle, 80 kg / 178 cm) : « 🥩 Protéines 160 g · 21 % · construit le muscle », « 🍚 Glucides 432 g · 57 % · carburant », « 🥑 Lipides 72 g · 21 % · hormones ». ✓
- `npm run dist` → **Setup 1.9.179.exe** (app d'Adrien jamais fermée).

## Suite (rotation 9)

#1 ✅ (#244), #2 ✅ (#245). Prochain : #3 bien-être, #4 coaching. Boucle autonome continue.
