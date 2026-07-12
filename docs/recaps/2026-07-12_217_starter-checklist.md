# Boucle #217 (autonome) — 2ᵉ rotation #2 : checklist « Bien démarrer » · build 1.9.151

**2ᵉ rotation, #2 (onboarding).** L'onboarding met en route, mais après, rien ne guide les premières actions. Ajout d'une **checklist de démarrage** sur le tableau de bord.

## Livré

Une carte **« 🚀 Pour bien démarrer · X/6 »** (dashboard, tant qu'on est un nouvel utilisateur) qui coche automatiquement les premiers pas selon les vraies données :

- ✅ Choisir ton objectif · ✅ Programmer ta semaine · ✅ Noter ton poids · ✅ Faire ta 1re séance · ✅ Boire ton eau du jour (≥ 4 verres) · ✅ Valider une quête.

La carte **disparaît** quand tout est coché, ou dès qu'on est établi (≥ 8 séances), et elle est **masquable** (✕, mémorisé). Elle donne un fil clair pour prendre l'app en main.

## Détail technique

- **`lib/logic.js`** : `starterChecklist(state, todayKey)` → `{items:[{key,label,done}], done, total, complete}`. Pur + testé.
- **`app.js`** : `renderStarterChecklist()` (dans `render()`) affiche `#starterCard` si non complété/non masqué et utilisateur récent ; bouton masquer (`state.starterDismissed`). Défaut ajouté.
- **`index.html`** : `#starterCard`. **`style.css`** : `.starter-card`/`.starter-list`.

## Vérifs

- `npm run verify` → **249 tests / 249 pass** (+1 : `starterChecklist`), garde-fou CSS vert, **SMOKE OK** (`starterChecklist:true`).
- `npm run dist` → **Setup 1.9.151.exe** (app d'Adrien jamais fermée).

## Suite (2ᵉ rotation)

#3 (routine récup récurrente dans l'agenda), #4 (historique de blocs + stats).
