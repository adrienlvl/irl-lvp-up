# Proposition — IndexedDB comme source de vérité

_Rédigé le 2026-07-19 · statut : **à trancher par Adrien** · **prérequis n°1 de la sync multi-appareils**_

## 1. Problème

Toutes les données vivent dans **une seule clé `localStorage`** (`irl-level-up`) :

- `app.js:32` — le démarrage lit `localStorage.getItem('irl-level-up')` : c'est **la** source de vérité ;
- `app.js:54` — `save()` écrit **localStorage d'abord**, puis `scheduleIdbMirror()` ;
- `app.js:55-58` — le commentaire l'assume : _« localStorage reste LA source de vérité — IndexedDB
  n'est qu'une copie de secours »_, **« AUCUNE migration »**.

Un miroir IndexedDB existe donc déjà (`idbOpen` `app.js:59`), mais **il n'est jamais lu au démarrage
normal** : `idbReadCandidates()` / `restoreFromIdbIfEmpty()` (`app.js:104-119`) ne servent qu'en
**récupération après éviction**, quand localStorage est vide au boot (cas desktop exclu).

Conséquence : les deux faiblesses de l'audit 2.0 restent **entières**.

- **Plafond de capacité** ~5-10 Mo pour tout l'état (historique, mesures, photos en PWA).
- **Éviction iOS** : Safari peut purger le localStorage d'une PWA. Le miroir sauve les meubles
  *après coup*, mais ne supprime pas le risque ni le plafond.

Et surtout : `AUDIT-ET-ROADMAP-3.0.md:81-82` et `:103` désignent « migrer la persistance vers
IndexedDB, état versionné/fusionnable » comme **le prérequis technique de la Vague A (sync)**. Tant
que ce n'est pas fait, la sync PC ↔ iPhone — ton manque n°1 — reste bloquée.

## 2. Options

| | Option | Portée | Coût / risque |
|---|---|---|---|
| **A** | **Sauvegarde seule** (statu quo amélioré) — garder localStorage primaire, fiabiliser le miroir. | Aucune migration. | Ne lève **ni** le plafond **ni** l'éviction. Ne débloque pas la sync. |
| **B** | **IDB primaire asynchrone** — un import unique localStorage → IDB, IDB devient la source lue au boot, localStorage conservé en repli hérité. | Lève le plafond et l'éviction. | **Le boot devient asynchrone** — c'est le vrai risque (voir §4). |
| **C** | **B + schéma versionné/fusionnable** — documents datés par entité, prêts pour une fusion multi-appareils. | Débloque la sync pour de bon. | Le plus gros chantier ; conception du modèle de fusion à faire. |

## 3. Recommandation — **B maintenant, en gardant C possible**

B règle les deux faiblesses réelles et **ne ferme pas** la porte à C. Faire C tout de suite obligerait
à trancher le modèle de fusion (par entité ? par horodatage ? résolution de conflits ?) **avant**
d'avoir choisi la stratégie de sync (fichier cloud vs backend), qui est une décision ouverte de
l'audit. Autrement dit : C dépend d'un choix que tu n'as pas encore fait, B non.

Chemin proposé : migration **idempotente et sans perte** (si IDB vide → importer depuis localStorage ;
si les deux existent → IDB gagne), localStorage continuant d'être écrit un temps comme filet.

## 4. Risques

- **Boot asynchrone** — c'est le point dur. Aujourd'hui l'état est chargé **synchroniquement** avant
  que les `render*()` ne tournent. Passer en async change l'ordre d'initialisation de **tout** le
  renderer : il faut un état d'attente propre (et non un flash d'app vide), et le **smoke bloquant**
  doit rester vert — il exécute l'app réelle et présuppose largement cet ordre.
- **Perte de données** : inacceptable. La migration doit être idempotente, vérifiée, et conserver
  localStorage jusqu'à preuve que l'import a réussi.
- **Quota / corruption IDB** : prévoir l'échec d'ouverture (mode privé, quota) avec repli localStorage.
- **Deux écrivains** (session locale + VPS) : ce chantier touche le cœur du renderer → à faire en une
  fois, pas en tranches concurrentes.

## 5. Ce qui dépend d'Adrien

1. **Jusqu'où aller maintenant : A, B ou C ?** (ma reco : **B**)
2. **Acceptes-tu un démarrage asynchrone** de l'app (le vrai changement visible) ?
3. Pour plus tard, mais ça oriente C : **sync par fichier cloud** (Drive/iCloud, zéro serveur) ou
   **petit backend chiffré bout-en-bout** ? Tu n'as pas à trancher aujourd'hui — mais C n'a pas de
   sens tant que ce n'est pas tranché.
