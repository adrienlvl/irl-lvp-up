# Proposition — Socle sécurité « prêt pour le public » : chiffrement des données AU REPOS

_Rédigé le 2026-07-20 · statut : ⏳ **en attente de décision d'Adrien** · CAP 3.0 chantier 3
(« Sécurité & prêt pour le public », **avant** toute ouverture réseau : App Store + Play + site web)._

> **Périmètre volontairement restreint.** Cette proposition ne parle **PAS** de sécurité réseau : elle
> est déjà traitée, bien, par [`SECURITE-RESEAU-S8.md`](../SECURITE-RESEAU-S8.md) (réseau confiné au
> main, HTTPS, anti-SSRF, allowlists, bornage). Le VPS n'y touche pas (§3). Le trou restant du
> chantier 3, c'est le **stockage au repos** — et la **checklist de publication**.

## 1. Problème — la majorité des données personnelles est stockée EN CLAIR

Le chiffrement au repos existe déjà, mais **seulement pour deux petits fichiers de secrets réseau**
(principe S.8 n°6), via `safeStorage` (chiffrement adossé au trousseau de l'OS) :

- `electron-main.cjs:89-90` — `calendar-subs.dat` (URLs d'abonnement, qui portent un jeton) : chiffré.
- `electron-main.cjs:183-184` — `travel-config` (adresse du domicile) : chiffré.

Mais **le gros du corps de données reste en clair** :

- **`localStorage['irl-level-up']`** (`app.js:32`, `app.js:54`) — **tout l'état** (poids, mensurations,
  sommeil, nutrition, candidatures d'alternance, habitudes, journaux) sérialisé en JSON **non chiffré**.
- **Copies disque** (`electron-main.cjs:196`, `backup:save`) — un instantané `irl-lvp-up.json` **+ 14
  copies quotidiennes**, JSON **en clair** dans `userData/`.
- **Photos** (`electron-main.cjs:206`) — fichiers image bruts dans `userData/photos/` (desktop) ; en
  PWA elles vivent dans le blob d'état, donc en clair aussi.
- **Miroir IndexedDB** (`app.js:59`) — copie **en clair** du même blob.

Tant que l'app est **100 % locale et mono-utilisateur**, c'est un risque **mesuré** (il faut déjà un
accès à la machine déverrouillée). Mais le chantier 3 prépare **la publication** : un device volé/revendu,
une sauvegarde iCloud/Time Machine, un PC partagé, ou un futur backend de sync (chantier 4, chiffré
bout-en-bout **par définition**) rendent le clair-au-repos inacceptable. On veut décider **le modèle de
chiffrement une seule fois**, avant de le figer dans le code.

## 2. Pourquoi MAINTENANT (et pourquoi ça précède l'implémentation IndexedDB)

La réécriture IndexedDB primaire (`indexeddb-primary-persistence.md`, option B validée, **réservée à une
session supervisée**) va **récrire la couche de persistance**. Décider le chiffrement au repos **après**
avoir bâti cette couche obligerait à la re-toucher. Décider **avant**, c'est bâtir la persistance IDB
**déjà chiffrée**, en une passe. Cette proposition ne code rien : elle **cadre** la décision pour que la
session supervisée d'IDB l'intègre d'emblée.

## 3. Le vrai nœud : desktop a un trousseau, le WEB non

- **Desktop (Electron)** : `safeStorage` existe et marche déjà — la clé est protégée par l'OS
  (DPAPI/Keychain/kwallet). Étendre `safeStorage` au blob principal + aux backups + aux photos est
  **direct et sans UX supplémentaire**. C'est le cas facile.
- **Web / PWA (iOS, Play, site)** : **pas de trousseau OS**. Chiffrer au repos exige une clé — or si la
  clé est stockée à côté des données (localStorage/IDB), elle ne protège de **rien** contre l'attaquant
  qui a déjà les données. Un vrai chiffrement web suppose **une phrase de passe utilisateur**
  (dérivation type PBKDF2/Argon2 + WebCrypto AES-GCM), donc un **coût UX** (saisie au démarrage) et un
  **risque de perte** (mot de passe oublié = données irrécupérables). C'est **la** décision qui engage
  Adrien.

## 4. Options

| | Option | Portée | Coût / risque |
|---|---|---|---|
| **A** | **Desktop seul** — étendre `safeStorage` au blob principal, aux backups disque et aux photos ; web inchangé (clair). | Ferme le trou desktop, **zéro UX**. | Le web reste en clair — insuffisant pour les stores mobiles. Partiel. |
| **B** | **Desktop chiffré + web opt-in par phrase de passe** — A, plus un « verrou » **facultatif** côté web (WebCrypto AES-GCM, clé dérivée d'une phrase de passe ; sans phrase = comportement actuel). | Couvre les deux plateformes, sans imposer l'UX à ceux qui n'en veulent pas. | Complexité (dérivation, déverrouillage au boot, récupération/perte de mot de passe, interaction avec le boot async d'IDB). |
| **C** | **Chiffrement obligatoire partout** — phrase de passe requise sur toutes les plateformes. | Protection maximale, cohérente. | UX lourde imposée à un usage perso mono-appareil ; perte de mot de passe = perte de données. Probablement disproportionné aujourd'hui. |

## 5. Recommandation — **A tout de suite, B comme cible ; C non**

- **A est du gain net immédiat, sans contrepartie** : sur desktop, `safeStorage` est déjà là et éprouvé
  (2 fichiers en prod). L'étendre au blob + backups + photos supprime le clair-au-repos sur la plateforme
  principale d'Adrien, **sans une seule interaction en plus**. À intégrer dans la session supervisée IDB.
- **B est la bonne cible pour la publication** : le verrou web **opt-in** protège ceux qui le veulent
  (device mobile perdu) sans punir l'usage quotidien. Il se conçoit **en même temps** que le boot async
  d'IDB (même point d'entrée : « charger l'état » devient « déchiffrer puis charger »).
- **C est écarté** : imposer une phrase de passe à un journal de vie perso mono-appareil est
  disproportionné, et un oubli détruirait les données — l'inverse du but (garder ses données en sécurité
  **et** accessibles).

> Cadre non négociable, hérité de S.8 : **rien de tout ça n'ouvre une surface réseau** ; le chiffrement
> reste **100 % local**. La sync (chantier 4) est une décision distincte et postérieure.

## 6. Au-delà du chiffrement — la checklist « prêt pour le public » (à cadrer, pas à coder ici)

Le chantier 3 ne se limite pas au chiffrement. À trancher/produire **avant publication**, hors autonomie :
- **Politique de confidentialité** + fiche « données collectées » (App Store / Play l'exigent) — l'app
  ne collecte **rien** aujourd'hui, c'est un argument, encore faut-il le déclarer.
- **CSP web** : la meta CSP est forte (`script-src 'self'`, `object-src 'none'`, `base-uri 'none'`) ;
  résidu à assumer = `style-src 'unsafe-inline'`. Sur GitHub Pages, **aucun en-tête serveur** (HSTS,
  X-Frame-Options) — à documenter comme limite connue.
- **Justification des permissions** (notifications ; caméra plus tard pour les scans, chantier 6).
- **Cadence de mise à jour d'Electron** (S.8 cite Electron 43 « CVE purgées ») : une politique écrite.
- **Modèle de menace** formalisé (une page) : à quoi on se défend, à quoi on ne se défend pas.

## 7. Risques

- **Perte de données** (option B/C) : une phrase de passe oubliée = données irrécupérables. Il faut un
  parcours de récupération honnête (export en clair sur demande explicite ? indice ?) **décidé avant**.
- **Boot** : le déchiffrement s'insère exactement là où IDB rend le boot **asynchrone** — les deux
  chantiers se recouvrent ; d'où « décider le chiffrement avant/pendant, pas après ».
- **Migration** : chiffrer un état existant doit être **idempotent et sans perte** (garder une copie
  déchiffrable jusqu'à preuve du succès), comme pour la migration IDB.
- **Faux sentiment de sécurité** : un chiffrement web dont la clé traîne à côté des données ne protège
  de rien — d'où le refus d'un « chiffrement » web sans phrase de passe.

## 8. Ce qui dépend d'Adrien

1. **Périmètre : A, B ou C ?** (ma reco : **A maintenant, B en cible**.)
2. **Acceptes-tu, côté web, un verrou par phrase de passe** — même **facultatif** ? (le cœur de B)
3. En cas d'option B/C : **quel filet en cas de mot de passe oublié** (export clair à la demande, indice,
   ou rien d'assumé) ?
4. Confirmes-tu que **ce chantier se fait en session supervisée**, greffé sur la réécriture IndexedDB
   (persistance chiffrée d'emblée), et **pas en autonomie de nuit** ? (le VPS a écrit la proposition ; il
   n'implémentera pas la persistance chiffrée seul, même règle que P1.2.)
