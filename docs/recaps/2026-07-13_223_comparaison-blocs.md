# Boucle #223 (autonome) — 3ᵉ rotation #4 : comparaison de blocs · build 1.9.157

**3ᵉ rotation, #4 (coaching périodisé).** La périodisation stockait déjà l'historique des blocs (objectif + fenêtre de dates), mais ne montrait aucune **progression réelle** d'un bloc à l'autre. Ajout d'un comparatif chiffré 1ᵉʳ → dernier bloc.

## Livré

- **Carte « Ma progression sur N blocs »** (panneau Programme auto, sous l'historique) : dès qu'**au moins 2 blocs sont terminés**, l'app compare le **premier** au **dernier** à partir du vrai journal d'entraînement :
  - **Tonnage / sem.** en % (normalisé par semaine → juste même si un bloc a duré un peu plus/moins).
  - **Séances / sem.** (delta).
  - Détail : « 1ᵉʳ bloc : X séances · Y kg — dernier : … ».
  - Couleur + flèche selon la tendance : 📈 up (+8 %), ➡️ flat, 📉 down.

## Détail technique

- **`lib/logic.js`** : `blockWindowStats(workouts, start, end)` (séances/tonnage/séries sur une fenêtre) + `blockComparison(history, workouts)` (null si < 2 blocs terminés ; normalisation /semaine ; `trend`). Purs + testés. Exports ajoutés.
- **`app.js`** : rendu `#blockCompare` dans `renderBlockStatus` (mapping objectif, format kg fr-FR).
- **`index.html`** : `#blockCompare`. **`strength.css`** : `.block-compare` / `.bc-grid` / `.bc-up` / `.bc-down`.

## Vérifs

- `npm run verify` → **255 tests / 255 pass** (+1 `blockComparison`/`blockWindowStats`), garde-fou CSS vert, **SMOKE OK** (`blockCompare:true`).
- **Navigateur** (état amorcé 2 blocs + 5 séances) : carte visible, `bc-up`, « 📈 Ma progression sur 2 blocs · +125 % · +0.3 séance/sem · 400→900 kg ». ✓
- `npm run dist` → **Setup 1.9.157.exe** (app d'Adrien jamais fermée).

## Rotation 3 complète

#1 iOS install (#220), #2 bienvenue onboarding (#221), #3 routines + surprise (#222), **#4 comparaison de blocs (#223)**. → Prochain : rotation 4 #1 (mobile/PWA), puis point à Adrien.
