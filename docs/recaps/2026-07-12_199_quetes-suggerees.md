# Boucle #199 (autonome) — Quêtes suggérées automatiquement · build 1.9.133

**Amélioration de fond (RPG).** Les quêtes étaient 100 % manuelles (4 par défaut). Le cœur « RPG de vie » gagne à proposer des objectifs du jour tirés des vraies données, en un clic.

## Livré — « Quêtes suggérées » sous la liste de quêtes

L'app propose jusqu'à 4 quêtes du jour, calculées depuis l'état réel, ajoutables d'un clic (puce cliquable) :

- **🏋️ Fais ta séance du jour** — si une séance sport est prévue dans l'agenda aujourd'hui et pas encore faite (sinon **👟 Bouge 20 min**).
- **🥩 Atteins tes protéines (X g)** — si les protéines du jour sont sous la cible.
- **💧 Bois tes N verres d'eau** — si l'hydratation du jour est en dessous (N s'adapte : +2 les jours de séance).
- **🧠 Un bloc de concentration** — si aucun focus aujourd'hui.
- **🌱 {habitude}** — si une habitude est due aujourd'hui et non faite.

Chaque suggestion exclut celles déjà présentes dans les quêtes, et respecte les catégories/XP existantes (Santé/Focus/Équilibre).

## Détail technique

- **`lib/logic.js`** : `suggestedQuests(state, todayKey)` → `[{key, name, category, xp}]` (max 4) ; réutilise `proteinTarget`, `waterGoalFor`, `habitsForDay`. Pur + testé (exclut les doublons, sûr si état nul).
- **`app.js`** : rendu de `#questSuggestions` (puces) + handler d'ajout au clic. **`index.html`** + **`style.css`** : `.quest-suggestions`/`.qs-chip`.

## Vérifs

- `npm run verify` → **233 tests / 233 pass** (+1 : `suggestedQuests`), garde-fou CSS vert, **SMOKE OK** (`suggestedQuests:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.133.exe** (app d'Adrien jamais fermée).

## Suite (améliorations de fond)

Plan de repas concret, comparaison photos avant/après, insights de tendances poids/mensurations.
