# Boucle #215 (autonome) — Approfondir #4 : la périodisation agit sur la séance · build 1.9.149

**Approfondir #4 (coaching périodisé).** La carte « Mon bloc » montrait la phase, mais la **séance réellement lancée** ne changeait pas selon la semaine. Désormais la périodisation est **concrète dans la séance guidée**.

## Livré

Quand tu lances la **séance guidée depuis un jour programmé** (bouton ▶️ Séance de la vue Jour), le **nombre de séries s'ajuste à la phase du bloc** de ce jour :

- **S1 Base** → séries de base ; **S2 Volume** → **+1 série** ; **S3 Intensité** → base (tu montes la charge) ; **S4 Décharge** → **~60 % des séries** (allégé pour récupérer).

Le titre de la séance affiche la phase (« … · Volume », « … · Décharge »). Hors bloc ou séance manuelle : séries de base inchangées.

## Détail technique

- **`lib/logic.js`** : `phaseSetsForDay(baseSets, blockStartKey, dayKey)` = `progressSets(base, currentBlock(...).week-1)` ; base si hors bloc. Pur + testé (S1–S4 + hors bloc).
- **`app.js`** : `startGuidedFromNames(title, names, dayKey)` applique `phaseSetsForDay` par exercice + ajoute la phase au titre ; la vue Jour passe `item.date`.

## Vérifs

- `npm run verify` → **247 tests / 247 pass** (+1 : `phaseSetsForDay`), garde-fou CSS vert, **SMOKE OK** (`phaseSetsForDay:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.149.exe** (app d'Adrien jamais fermée).

## Suite (rotation)

Reboucle #1 (indicateur online/offline, bannière maj PWA), #2, #3, #4…
