# #336 — Sauvegarde/restauration des données sur PWA (data-safety) (1.9.270)

## Le trou (robustesse, sérieux)

`#exportDataBtn` et `#importDataBtn` reposaient uniquement sur `window.desktop.exportData/importData`
(app Electron installée). En **PWA/navigateur** (donc sur **iPhone**), ils affichaient « Disponible
seulement dans l'app installée ». Or :
- iOS peut **évincer le localStorage** (documenté dans `INSTALLER-SUR-IPHONE.md`) ;
- ce doc affirme que l'export/import JSON est « le seul pont entre appareils ».

Donc les utilisateurs mobiles n'avaient **aucune sauvegarde** — risque de perte totale, et une
affirmation fausse dans la doc.

## Ce qui change

Fallback PWA quand `window.desktop` est absent :
- **Export** : `Blob` JSON + téléchargement d'un fichier daté (`backupFilename` pur : `irl-lvp-up-
  sauvegarde-AAAA-MM-JJ.json`).
- **Import** : `<input type="file">` créé à la volée + `FileReader`, mêmes garde-fous que le desktop
  (JSON validé en try/catch, confirmation, `normalizeState` qui assainit tout).

## Vérification navigateur (contexte PWA réel, sans window.desktop)

| Contrôle | Résultat |
|---|---|
| Contexte PWA (pas de `window.desktop`) | ✅ |
| Export → téléchargement `irl-lvp-up-sauvegarde-2026-07-15.json` | ✅ |
| Statut « ✓ Sauvegarde téléchargée » | ✅ |
| Import → crée un input file (accept json) et l'ouvre | ✅ |
| **Round-trip** : exporter, modifier l'état, réimporter → données restaurées | ✅ (cible 77, nom RoundTrip) |

Le round-trip confirme la chaîne complète : le fichier exporté se réimporte et écrase bien l'état
courant via `normalizeState`. La doc iOS devient exacte.

## Tests

358 tests `node:test` (+ `backupFilename`) + smoke `backupFilename` **bloquant**. Le comportement
PWA (Blob/FileReader) est vérifié en navigateur — non testable en smoke Electron où `window.desktop`
existe.

## Rotation

#336 — ouvre la rotation 32 (build 1.9.270).
