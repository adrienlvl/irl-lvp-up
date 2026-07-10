# Boucle #85 (autonome) — Export / import des données · build 1.9.19

**Contexte :** 10ᵉ itération de la boucle autonome. Aire : fiabilité / portabilité.

## Livré

Dans **Réglages → 💾 Sauvegarde & données** :
- **⬇️ Exporter mes données (.json)** : ouvre un dialogue « Enregistrer sous », écrit tout l'état dans le fichier choisi (nom par défaut daté).
- **⬆️ Importer une sauvegarde** : ouvre un dialogue de choix de fichier, lit le `.json`, **confirmation** puis restaure via `normalizeState` (import défensif, déjà testé), `save()` + `render()`.

→ Portabilité vers un autre PC, sauvegarde manuelle avant une manip, restauration en cas de pépin. Tout reste local.

## Détail technique

- `electron-main.cjs` : `dialog` ajouté aux imports ; IPC `data:export(json)` (showSaveDialog + `fs.writeFileSync`) et `data:import()` (showOpenDialog + lecture, taille bornée 20 Mo), erreurs avalées.
- `preload.cjs` : `exportData` / `importData` exposés.
- `index.html` : groupe Réglages « Sauvegarde & données ». `app.js` : handlers (dégradés proprement hors app installée ; import via `normalizeState` + `confirm`).

## Vérifs

- `node --check` OK sur main / preload / app ; `npm run verify` → **129 tests / 129 pass**, **SMOKE OK** (`dataIo:true`).
- Import sécurisé : passe par `normalizeState` (schéma strict, déjà couvert par les tests S.5 / smoke `normalize`).
