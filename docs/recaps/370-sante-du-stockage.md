# #370 — Fondations : santé du stockage dans Réglages (3.0 · Vague 2, tranche 3) (2.0.14)

Suite de #368-369. Le socle « données indestructibles » existe (miroir + instantanés) — il manquait
la **visibilité** : Adrien n'avait aucun moyen de voir l'état de son stockage ni de ses sauvegardes.

## Ce qui est livré

- **Pur + testé** : `formatBytes(n)` (o/Ko/Mo/Go, entrées invalides → « — ») et
  `storageHealthSummary(info)` → `{ level: ok|warn|crit, lines }`. Seuils : état > 4 Mo → **crit**
  (localStorage réel ~5 Mo), > 2,4 Mo → warn ; quota navigateur ≥ 80 % → warn ; miroir non rafraîchi
  depuis > 48 h → warn ; persistance accordée/non garantie ; « pas encore de miroir » géré.
- **Réglages → 💾 Sauvegarde & données** : bouton **« 🩺 Santé du stockage »** + panneau
  `#storageHealth` (couleur selon le niveau). Rendu automatique ~2 s après le boot (après la
  décision de restauration) et à la demande.
- Collecte réelle côté renderer : taille de l'état (`Blob.size`), `navigator.storage.estimate()`,
  `navigator.storage.persisted()`, stats du miroir (`idbMirrorStats` : fraîcheur + nb d'instantanés).

## Vérification navigateur

Clic sur 🩺 → « Données de l'app : 2.1 Ko · Espace navigateur : 3.3 Mo / 8.56 Go (0 %) · Copie de
secours interne : à jour · 1 instantané (7 j max) · Persistance : non garantie », classe `sh-ok` ✅.
Aucune erreur console.

## Tests

386 tests (formatBytes ; storageHealthSummary : niveaux ok/warn/crit, quota 85 %, miroir 60 h,
sans miroir, entrée nulle) + smoke `storageHealth` **bloquant** (async : rendu réel avec vraies
mesures + niveau crit sur état 4,5 Mo simulé en pur).

## Contexte

Build **2.0.14**. Pas de Release (prochain lot : 2.0.12 → 2.0.14, le « pack données blindées »).
Vague 2, reste : schéma versionné de l'état (prépare la Sync/Vague 4), puis allègement (photos PWA
vers IDB) — à cadrer car migration réelle.

## Note VPS

Adrien met en place un **VPS** pour faire tourner la boucle 24/7 (nuit/journée/absences) — guide
committé : docs/VPS-SETUP.md. Offre en cours : installation complète via SSH par l'agent dès que la
machine est prête (clé publique, zéro secret en chat).
