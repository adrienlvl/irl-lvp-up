# Récap boucle #04 — Photos hors du blob localStorage (clôture Vague 0)

**Quand :** 2026-07-05 (fin de soirée)
**Vague :** 0 (Fondations) — tâche 0.3, dernière de la vague
**Statut :** ✅ terminé et vérifié (tests verts, smoke OK)

## Rappel du cap (décision révisée plus tôt ce soir)
Pas de fusion des flashcards : IRL LVP UP = **hub « quoi faire aujourd'hui »** (planning de révision BTS CG dans le calendrier, rappels, notifications) + **exigence cybersécurité** (Vague S). Cette boucle applique déjà S.3 aux nouveaux handlers.

## Ce que j'ai fait
### 0.3 — Photos stockées en fichiers, plus dans le state ✅
- **`electron-main.cjs`** : 3 nouveaux handlers IPC —
  - `photos:save` : écrit l'image dans `userData/photos/<id>.<ext>` et renvoie `{id, file}` ;
  - `photos:read` : relit un fichier photo en Data URL pour l'affichage ;
  - `photos:delete` : supprime un fichier photo.
  - **Sécurité (S.3 appliqué)** : Data URL validée par regex stricte (`png/jpeg/webp/gif` + base64 pur), taille bornée à 8 Mo, **nom de fichier regénéré côté main** (`basename` + motif `^\d+\.(ext)$`) → aucun chemin fourni par le renderer n'est utilisé, anti path-traversal.
- **`preload.cjs`** : expose `desktop.savePhoto / readPhoto / deletePhoto`.
- **`app.js`** :
  - Ajout de photo → écrite sur disque via Electron ; le state ne garde que `{id, date, file}` (**plus de base64 dans `localStorage`**). Repli navigateur (sans Electron) : comportement base64 conservé.
  - Galerie → chargement asynchrone des images (`loadGalleryPhotos()`), les photos legacy `{data}` s'affichent toujours.
  - **Migration douce** (`migratePhotosToDisk()`) : au démarrage (après restauration éventuelle du backup) et après une restauration manuelle, les anciennes photos base64 sont écrites sur disque puis allégées dans le state. Idempotent.
  - Rotation : au-delà de 12 photos, les fichiers des photos évincées sont **supprimés du disque** (pas de fichiers orphelins).

## Impact
- Le blob `localStorage` ne contient plus d'images → chaque `save()` est plus léger, le risque de quota s'éloigne fortement (les photos étaient le principal facteur de gonflement).

## Limite connue (assumée, documentée)
- L'export JSON / la sauvegarde ne contiennent plus les pixels des photos, seulement les références fichiers. Les photos restent « privées, sur cet appareil » (c'est le positionnement affiché de l'app). Si tu veux un export « tout compris », on l'ajoutera en Vague 4.

## Vérifications
- `node --check` : app.js, electron-main.cjs, preload.cjs, renderer-smoke.cjs → OK.
- `npm test` → 6/6.
- Smoke-test renderer étendu (stubs `photos:*` + check `photosApi`) → `SMOKE OK`, `photosApi:true`, 4 quêtes + 30 exercices rendus, exit 0.

## ✅ Vague 0 terminée (0.1 → 0.6)
L'app est re-buildable, testée, durcie, et ses données sont à l'épreuve du quota.

## Prochaine boucle (prévu)
- **Vague 1** — unification du calendrier : modèle d'événement unique `{id, title, date, time, durationMin, kind(focus/sport/life/study), source(manual/training/study-glc/imported), refId, completed}`, migration `agenda[]`+`plans[]`, cycle de vie sans orphelins, catégorie « Révision » dans l'UI, `.ics` amélioré. C'est le socle du planning de révision + rappels (Vague 2).

## Git
- Commit : `feat(photos): stockage fichiers via IPC valide + migration douce (0.3, cloture Vague 0)`.
