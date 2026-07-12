# Boucle #189 (autonome, phase 2) — IMC dans le Coach Poids · build 1.9.123

**Phase 2 (polissage global — zone Coach Poids).** Le Coach Poids donnait l'objectif, la date estimée et les macros, mais aucun repère sur où se situe le poids actuel.

## Livré

Le panneau Coach Poids affiche désormais, sous l'objectif, une ligne **« ⚖️ IMC X · catégorie »** (corpulence normale / maigreur / surpoids / obésité, seuils OMS), avec une mention honnête : *« repère indicatif, ne distingue pas muscle et gras »*. Ça situe le poids actuel d'un coup d'œil sans remplacer le suivi réel.

## Détail technique

- **`lib/logic.js`** : `bmiInfo(weightKg, heightCm)` → `{ bmi, category }` (IMC arrondi 1 décimale, catégorie OMS). Null si entrées invalides. Pur + testé.
- **`app.js`** : `renderCoachWeight` calcule `bmiInfo(cur, state.profile.height)` et affiche `.cw-bmi` sous l'en-tête. **`athlete.css`** : styles `.cw-bmi`.

## Vérifs

- `npm run verify` → **227 tests / 227 pass** (+1 : `bmiInfo`), garde-fou CSS vert, **SMOKE OK** (`coachBmi:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.123.exe** (app d'Adrien jamais fermée).

## Suite (phase 2)

Polissage réparti : séances guidées, progression/palmarès, responsive mobile, autres passes a11y.
