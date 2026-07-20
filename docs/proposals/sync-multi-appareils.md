# Proposition — Synchronisation multi-appareils (PC ↔ iPhone) sans export/import manuel

_Rédigé le 2026-07-20 · statut : ⏳ **en attente de décision d'Adrien** · CAP 3.0 chantier 4
(« Sync multi-appareils »), **le cœur de la 3.0** (audit `AUDIT-ET-ROADMAP-3.0.md` §Vague A)._

> **Pourquoi cette proposition MAINTENANT, avant d'écrire IndexedDB.** La sync ne s'implémente pas
> cette nuit — elle vient après Fondations (IDB, `indexeddb-primary-persistence.md`, option B validée,
> **session supervisée**) et Sécurité (`securite-socle-public.md`, chiffrement au repos, en attente).
> Mais **une décision de sync se prend AVANT de figer le schéma IDB** : le stockage doit naître
> « fusionnable » (horodaté par enregistrement) ou il faudra le re-toucher. C'est le même argument que
> la proposition sécurité (« construire IDB déjà chiffré ») — ici : **construire IDB déjà horodaté**.
> Cette proposition ne code rien ; elle **cadre** ce que la session supervisée d'IDB devra intégrer.

## 1. Problème — deux appareils, deux états qui divergent en silence

Aujourd'hui, passer du PC à l'iPhone impose un **export/import manuel** de fichier, et cet import
**écrase tout** :

- L'état est **un seul blob** : `localStorage['irl-level-up']` = `JSON.stringify(state)` (`app.js:32`
  lecture, `app.js:54` écriture), miroir IndexedDB (`app.js:59`), backups disque enveloppés
  `{version, savedAt, state}` (`unwrapBackup`, `logic.js:8174`).
- L'import de sauvegarde fait un **remplacement total** : `confirmBackupImport(parsed) → state = next`
  puis `render()` (`app.js:991`, `app.js:1000`). Pas de fusion : ce que l'appareil cible avait saisi
  **depuis** l'export est **perdu**.
- Il existe pourtant déjà des **fusions par enregistrement** — mais **domaine par domaine**, pas au
  niveau de l'état : `mergeApplications` (clé = société, statut **rang-monotone**, champ par champ,
  `logic.js:1065`), `mergePlannedEvents` (`logic.js:1200`), `mergeRecurring` (`logic.js:1216`),
  et l'import CSV alternance dédoublonne par `société|date` (`app.js:779`). Ce sont des **précédents
  utiles** : le projet sait déjà fusionner sans doublon quand il a une **clé** et une **règle de
  préséance**. Il ne sait pas encore fusionner l'état **entier**.
- **Le vrai trou pour la sync** : **aucun horodatage par enregistrement**. `savedAt` n'existe que sur
  l'**enveloppe** de backup (`logic.js:8174`) et sur le minuteur focus — jamais sur une pesée, un
  workout, une candidature, un item d'agenda. Sans « quand ce champ a-t-il changé, et sur quel
  appareil », une fusion fine (« garde la version la plus récente de CET enregistrement ») est
  **impossible** : on ne peut faire que du « tout le blob gagne » (grain grossier). Il n'y a pas non
  plus de **`schemaVersion` global** ni d'**identité d'appareil**.

Tant qu'Adrien reste mono-appareil, c'est théorique. Mais la 3.0 vise **PC ↔ iPhone**, et l'audit
désigne la sync comme « **LE** grand manque structurel » (§Constats n°1).

## 2. Deux décisions **orthogonales** (ne pas les confondre)

La sync se décide sur **deux axes indépendants** — l'audit les mélange en « fichier cloud vs
backend », mais ce sont deux questions séparées :

- **Axe 1 — GRANULARITÉ de fusion** : que se passe-t-il quand les deux appareils ont modifié l'état
  depuis le dernier échange ?
  - **Blob entier, dernier-écrit-gagne (LWW)** : l'état le plus récemment sauvegardé écrase l'autre
    **en entier**. Simple, mais **perte réelle** : si le PC a saisi une pesée à 9 h et l'iPhone un repas
    à 10 h, la sync de 11 h garde un seul des deux blobs → l'autre saisie disparaît.
  - **Par enregistrement (horodaté)** : chaque collection (`workouts`, `weights`, `applications`,
    `agenda`, `recovery`, `nutrition`, `habits`, …) fusionne **élément par élément** via sa clé + un
    `updatedAt`, en réutilisant l'esprit de `mergeApplications`. Pas de perte croisée. **Prérequis** :
    ajouter `updatedAt` (et une clé stable) à chaque enregistrement — donc **le décider avant IDB**.
- **Axe 2 — TRANSPORT** : par où transitent les données ?
  - **Fichier dans un cloud existant** (Google Drive / iCloud Drive / Dropbox) : l'app lit/écrit un
    `.json` (chiffré, cf. chantier 3) dans un dossier synchronisé par l'OS. **Zéro serveur à
    maintenir**, zéro compte à créer, coût récurrent nul. Le cloud gère le transport ; l'app gère la
    **fusion** au moment où elle relit le fichier.
  - **Petit backend de sync chiffré bout-en-bout** : un service minimal stocke des blobs **illisibles
    côté serveur**. Plus « produit » (multi-appareils temps quasi-réel, pas de dépendance à un dossier
    cloud), mais **serveur à héberger, maintenir, sécuriser** — et une surface réseau à ouvrir (ce que
    le chantier 3 veut justement encadrer d'abord).

Les deux axes se combinent : on peut faire « fichier cloud + fusion par enregistrement » (recommandé)
comme « backend + LWW » (déconseillé).

## 3. Options

| | Option | Axe 1 (fusion) | Axe 2 (transport) | Coût / ce qu'elle ferme |
|---|---|---|---|---|
| **A** | **Fichier cloud + LWW blob** | Blob entier, dernier-écrit-gagne | Fichier `.json` chiffré dans Drive/iCloud | Le plus rapide à livrer, **zéro backend**. Mais **perte de saisies croisées** le même jour → inacceptable pour un journal de vie quotidien à deux appareils. |
| **B** | **Fichier cloud + fusion par enregistrement** | Par enregistrement (`updatedAt` + clé, façon `mergeApplications`) | Fichier `.json` chiffré dans Drive/iCloud | **Zéro backend**, **zéro perte croisée**. Coût : ajouter `updatedAt`/clé partout (à faire **dans** le schéma IDB), et écrire un `mergeState` généralisant les 3 merges existants. Le grain « champ » fin (deux appareils éditent la MÊME pesée à la même minute) reste LWW — acceptable en perso. |
| **C** | **Backend de sync E2E** | Par enregistrement | Petit serveur chiffré bout-en-bout | Le plus « produit » (quasi temps réel, indépendant d'un dossier cloud). Mais **serveur à héberger/maintenir/sécuriser** + surface réseau + comptes → lourd, et prématuré tant que le chantier 3 (posture publique) n'est pas posé. |

## 4. Recommandation — **B** (fichier cloud + fusion par enregistrement), **construite dans le schéma IDB**

- **B évite le seul défaut rédhibitoire de A** (perdre une saisie faite sur l'autre appareil), **sans**
  le coût d'exploitation de C. Un journal de vie se saisit des deux côtés dans la même journée : la
  fusion **doit** être par enregistrement, pas par blob.
- **Le projet a déjà la brique** : `mergeApplications` prouve le motif (clé stable + règle de
  préséance + champ par champ, `logic.js:1065`). B généralise cet acquis en un **`mergeState(a, b)`
  pur et testé**, collection par collection, avec `updatedAt` comme départage par défaut et les règles
  domaine déjà écrites là où elles existent (statut rang-monotone pour les candidatures, dédoublonnage
  agenda existant).
- **Le fichier cloud suffit** et respecte la ligne « zéro dépendance / pas de serveur » : l'app écrit
  un `.json` chiffré (chantier 3) dans un dossier que l'OS synchronise déjà ; elle **fusionne à la
  relecture**. C garde le mérite d'être la **cible produit** plus tard, si un vrai multi-utilisateur
  ou du temps réel devient nécessaire — B ne l'interdit pas (même modèle de données fusionnable).
- **Le point non négociable** : `updatedAt` + une clé stable par enregistrement doivent entrer dans le
  **schéma IDB dès sa construction** (session supervisée). Les rétro-remplir après coup sur des données
  existantes est une migration risquée qu'on s'épargne en décidant **maintenant**.

> Cadre hérité de S.8 et du chantier 3 : le fichier de sync est **chiffré**, la clé ne voyage pas avec
> les données, et **rien n'ouvre de surface réseau côté app** (le transport, c'est l'OS/le cloud). Un
> backend (option C) rouvrirait cette question — d'où « pas maintenant ».

## 5. Risques

- **Migration du schéma** : ajouter `updatedAt`/clé à chaque enregistrement change la forme de l'état.
  À faire **dans** la réécriture IDB (supervisée), idempotent et sans perte (mêmes garde-fous que
  `normalizeState` : un champ manquant se rétro-remplit à une valeur sûre, jamais un retour aux
  défauts). Précédent à respecter : `unwrapBackup` (`logic.js:8174`) montre qu'un import mal déballé
  = **perte totale** — la fusion doit être aussi défensive.
- **Horloges désynchronisées** : LWW/`updatedAt` dépend de l'heure des appareils. Un iPhone à l'heure
  et un PC en retard peuvent inverser une préséance. Atténuation : `updatedAt` en horodatage monotone
  local + départage stable (déjà le motif « rang-monotone » de `mergeApplications` pour les statuts, à
  ne PAS ramener à une simple heure).
- **Suppressions** : une fusion additive **ressuscite** un enregistrement supprimé sur un appareil
  (l'autre l'a encore). Il faut des **pierres tombales** (marqueur « supprimé à telle date ») ou une
  règle de préséance suppression > modification — à décider avec le schéma.
- **Conflit boot** : la sync se branche exactement là où IDB rend le boot **asynchrone** et où le
  déchiffrement (chantier 3) s'insère — les trois chantiers se recouvrent au même point d'entrée
  (« charger l'état »). D'où l'ordre : Fondations → Sécurité → Sync, **mais schéma décidé ensemble**.
- **Taille du fichier** : le blob inclut les photos (base64) en PWA → un `.json` de sync peut être
  lourd. À cadrer (sortir les photos de la sync ? sync séparée ?) — hors périmètre de cette décision,
  à noter.

## 6. Ce qui dépend d'Adrien

1. **Granularité de fusion : A (blob LWW) ou B (par enregistrement) ?** (ma reco : **B** — le seul qui
   ne perde pas une saisie faite sur l'autre appareil le même jour.)
2. **Transport : fichier dans un cloud (Drive/iCloud/Dropbox) ou petit backend E2E ?** (ma reco :
   **fichier cloud** maintenant, backend en cible produit lointaine si besoin.)
3. **Acceptes-tu d'ajouter un `updatedAt` + une clé stable par enregistrement** — la brique sans
   laquelle aucune fusion fine n'est possible — **et de l'intégrer au schéma IndexedDB dès sa
   construction** (pour ne pas re-migrer après) ?
4. **Règle des suppressions** : pierres tombales (suivi des éléments supprimés) ou « suppression
   l'emporte » ? (nécessaire pour ne pas ressusciter ce qu'on efface.)
5. Confirmes-tu que **ce chantier se fait en session supervisée, APRÈS** IndexedDB (P1.2) **et** le
   chiffrement au repos (chantier 3), le VPS n'écrivant ici que la **proposition** — même règle que
   P1.2 et que la proposition sécurité ?
