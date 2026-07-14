# #313 — Photos : compressées à l'import (1.9.247)

**Rotation 26 · item #2 · perf / stockage — piste identifiée en #310**

## Le problème — pire que la mesure initiale
`migratePhotosToDisk()` ne s'exécute **que dans l'app desktop** (`window.desktop?.savePhoto`).
Dans la **PWA** — celle qu'Adrien vient d'installer sur son iPhone — les photos restent en
**base64 dans le state**, donc dans `localStorage`.

En lisant l'import de près, le compte est sans appel :

| | |
|---|---|
| Garde-fou actuel | refus si le fichier > **3 Mo** |
| Une photo de 3 Mo en base64 | **~4 Mo** |
| Plafond de photos gardées | **12** |
| **Total possible dans localStorage** | **~48 Mo** |
| **Quota localStorage typique** | **5 à 10 Mo** |

Ça ne *peut pas* tenir. D'où le message « ⚠ Stockage local saturé » déjà présent dans le
code : les auteurs savaient que ça débordait, sans traiter la cause.

## Amélioration
Redimensionnement + recompression **à l'import** (1280 px sur le grand côté, JPEG qualité 0,72),
**et** migration des photos déjà stockées.

### Logique pure
- `fitDimensions(w, h, maxSide)` — conserve le ratio, borne le grand côté, et **n'agrandit
  jamais** une image déjà plus petite (ce serait gonfler le poids pour rien).
- `dataUrlBytes(dataUrl)` — poids réel d'une data URL base64 (padding décompté). Sert à
  **mesurer le gain** et surtout à **ne jamais remplacer une image par une version plus lourde**.

### Trois garde-fous, chacun vérifié
1. **Jamais d'alourdissement.** Une petite PNG (1 250 o) → 952 o : remplacée seulement parce que
   c'est plus léger. Si le JPEG avait été plus gros, l'original aurait été conservé.
2. **Jamais de perte.** Image illisible, canvas indisponible, erreur quelconque → on retombe sur
   l'original. On ne perd **jamais** une photo d'Adrien à cause d'une optimisation.
3. **Idempotence.** Un second passage de la migration ne recompresse pas ce qui l'est déjà.

### Migration des photos existantes
`optimizeStoredPhotos()` recompresse une fois les photos déjà stockées **> 250 Ko**, en différé
après le démarrage (pour ne pas ralentir l'ouverture), et affiche le gain.

## Mesures (le seul moyen de prouver le bénéfice)
Photo réaliste fabriquée au format iPhone (3024 × 4032, contenu bruité pour ne pas avantager
artificiellement la compression) :

| | avant | après |
|---|---|---|
| Une photo | 3024×4032 · **1 901 Ko** | 960×1280 · **174 Ko** (196 ms) |
| **Gain** | | **91 %** |
| 12 photos (le plafond) | **22,3 Mo** | **2,0 Mo** |

Migration de 3 photos déjà stockées :
- state **8,09 Mo → 0,81 Mo**
- message : « ✓ Photos optimisées : 5,5 Mo libérés dans le stockage local. »
- les 3 photos sont **toujours là**, toutes affichables.

Le state repasse largement sous le quota, et `save()` redevient bon marché (ce qui bénéficie
aussi à tout ce que #310 avait mis en évidence).

## Tests
- `logic.test.js` : `fitDimensions` (portrait iPhone 3:4, paysage, carré, **jamais
  d'agrandissement**, pile à la limite, ratio extrême → jamais 0 px, entrées invalides) ;
  `dataUrlBytes` (padding, ordre de grandeur du gonflement base64, entrées non conformes → 0
  sans exception).
- `renderer-smoke.cjs` : check `photoCompress`.
- `npm run verify` : **341 tests + SMOKE OK**.

## Fichiers
- `src/lib/logic.js` — `fitDimensions()`, `dataUrlBytes()` + exports + CHANGELOG[0] 1.9.247.
- `src/app.js` — `compressPhoto()` (canvas, avec repli sur l'original en cas d'erreur),
  `optimizeStoredPhotos()` (migration différée), import compressé (PWA **et** desktop).
- `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`.

## Note
La compression s'applique aussi côté desktop : les fichiers écrits sur disque sont plus légers,
sans inconvénient (1280 px reste largement suffisant pour comparer une évolution physique).
