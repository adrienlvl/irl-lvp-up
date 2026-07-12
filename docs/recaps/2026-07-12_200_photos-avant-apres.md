# Boucle #200 (autonome) — Comparaison photos avant/après · build 1.9.134

**Amélioration de fond (suivi de transformation).** Les photos de progression étaient stockées et affichées en galerie, mais rien ne permettait de **comparer** visuellement le début et le présent — pourtant le meilleur moteur de motivation quand on transforme son corps.

## Livré — bloc « 📸 Avant / Après »

Sous la galerie, dès qu'il y a **au moins 2 photos datées**, un bloc affiche côte à côte la **photo la plus ancienne** (badge « Avant ») et la **plus récente** (badge « Après »), avec :

- la **date** de chaque photo ;
- le **poids le plus proche** de chaque date (repris du suivi de poids) ;
- le **delta de poids** et le **nombre de jours** écoulés (ex. « 📉 −5 kg sur 70 j »).

## Détail technique

- **`lib/logic.js`** : `photoComparePair(photos, weights)` → `{before, after, days, weightDelta}` (photo la plus ancienne/récente + poids le plus proche de chaque date). Null si < 2 photos. Pur + testé.
- **`app.js`** : rendu de `#photoCompare` dans `renderGrowth` ; `loadGalleryPhotos` élargi pour charger aussi les images de comparaison stockées sur disque.
- **`index.html`** + **`growth.css`** : bloc `.photo-compare` (2 colonnes, badges, légendes, delta).

## Vérifs

- `npm run verify` → **234 tests / 234 pass** (+1 : `photoComparePair`), garde-fou CSS vert, **SMOKE OK** (`photoCompare:true`). `node --check app.js` OK.
- `npm run dist` → **Setup 1.9.134.exe** (app d'Adrien jamais fermée).

## Suite (améliorations de fond)

Prédiction d'atteinte d'objectif, approfondir le Coach, insights complémentaires.
