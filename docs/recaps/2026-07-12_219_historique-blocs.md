# Boucle #219 (autonome) — 2ᵉ rotation #4 : historique de blocs · build 1.9.153

**2ᵉ rotation, #4 (coaching périodisé).** La périodisation vivait au présent (bloc en cours). Ajout d'une **mémoire des blocs** pour voir sa continuité dans le temps.

## Livré

- **Archivage automatique** : quand tu démarres un **nouveau bloc** (bouton « nouveau bloc », onboarding, reprogrammation vers une autre semaine), le bloc précédent est **archivé** dans `state.blockHistory` (objectif, dates début→fin, semaines).
- **Ligne « mes blocs »** sous la carte « Mon bloc » : « 📚 **N blocs** terminés · dernier : Perte de gras (04/05) ». Montre ta régularité sur la durée.

Anti-doublon (n'archive que si la nouvelle date de début diffère), plafonné à 12 blocs.

## Détail technique

- **`lib/logic.js`** : `archiveBlock(history, entry, cap)` (pousse + plafonne, ignore entrée invalide) et `blockHistorySummary(history)` → `{count, last, byObjective}` ou null. Purs + testés.
- **`app.js`** : `scheduleObjectiveProgram` archive l'ancien bloc avant de fixer le nouveau `blockStart` ; `renderBlockStatus` rend `#blockHistory`. `blockHistory:[]` (défauts + normalizeState).
- **`index.html`** : `#blockHistory`. **`strength.css`** : `.block-history`.

## Vérifs

- `npm run verify` → **251 tests / 251 pass** (+1 : `archiveBlock`/`blockHistorySummary`), garde-fou CSS vert, **SMOKE OK** (`blockHistory:true`).
- `npm run dist` → **Setup 1.9.153.exe** (app d'Adrien jamais fermée).

## 2ᵉ rotation d'approfondissement — COMPLÈTE

#1 hors-ligne+maj PWA (#216) · #2 checklist démarrage (#217) · #3 routine programmable (#218) · #4 historique de blocs (#219). → Point à faire à Adrien.
