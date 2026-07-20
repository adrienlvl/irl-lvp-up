# #581 — Proposition : Synchronisation multi-appareils (CAP 3.0 chantier 4)

_2026-07-20 · docs seuls, aucun code touché → **pas de bump** (build reste 2.0.200)._

## Contexte de rotation (§4 bis)

5 derniers domaines (recaps #576→#580) = `docs · coach · a11y · docs · coach`.

- `coach` (#579/#576, 2× + dans les 2 derniers) → **interdit**. La **priorité de nuit** d'Adrien
  (pousser le coaching à fond) est donc **rotation-bloquée** ce tour — §3 : la rotation s'applique
  pleinement au coach, et les demandes ne priment jamais sur §3. La piste coach vérifiée en réserve
  (action `reinforce` « Encore un jour actif » qui radote nutrition/sommeil un jour `doneToday`,
  `logic.js:6222`, cf. recap #580 + mémoire) attend une boucle coach-ouverte.
- `docs` (#580/#577, 2× + dernier) → **interdit**.
- `fondations` (absent des 5 derniers) → **autorisé**.

## Pourquoi une proposition (et pas du code)

Backlog code **nommé épuisé** dans les domaines autorisés : P2 (a11y) clos, P3 impasse actée, P4
(regex) clos (« plus de cible ouverte »), P6/P7 clos, P5 mesuré (les 2 angles). Reste seulement la
piste coach — rotation-bloquée. Le protocole « backlog vide » de la roadmap (§750) ordonne, dans cet
ordre : reprendre P4 (épuisé) → **écrire une proposition manquante** → améliorer les recaps (`docs`,
interdit) → ne rien commiter. Donc : proposition.

Le **quota §4 bis.4 n'était pas déclenché** (#574 est une proposition dans les 10 derniers recaps),
mais la 2ᵉ demande d'Adrien (« fais avancer CAP 3.0, pas seulement du polish ») pointe vers le chantier
suivant sans design doc. Or **la Sync (Vague A de l'audit, « LE grand manque structurel ») n'avait
AUCUNE proposition** — c'est le cœur de la 3.0.

## Le raisonnement clé : décider la sync AVANT de figer IndexedDB

Même logique que la proposition sécurité #574 (« construire IDB déjà chiffré ») : la fusion de sync
exige un **`updatedAt` + une clé stable par enregistrement**. Les rétro-remplir après avoir bâti la
persistance IDB = migration risquée. Les décider **maintenant** = construire le schéma IDB **déjà
horodaté**, en une passe (session supervisée).

## Faits vérifiés dans le code (pas une intuition)

- État = **un seul blob** : `localStorage['irl-level-up']` (`app.js:32` lecture, `app.js:54` écriture),
  miroir IDB (`app.js:59`), backups enveloppés `{version, savedAt, state}` (`unwrapBackup`,
  `logic.js:8174`).
- Import de sauvegarde = **remplacement total** : `confirmBackupImport → state = next → render()`
  (`app.js:991/1000`). **Aucune fusion** : les saisies faites sur l'appareil cible depuis l'export sont
  perdues.
- Fusions **par enregistrement déjà éprouvées** (précédent réutilisable) : `mergeApplications` (clé =
  société, statut **rang-monotone**, champ par champ, `logic.js:1065`), `mergePlannedEvents`
  (`logic.js:1200`), `mergeRecurring` (`logic.js:1216`), dédoublonnage CSV alternance `société|date`
  (`app.js:779`).
- **Le trou réel** : **aucun horodatage par enregistrement**. `savedAt` n'existe que sur l'enveloppe de
  backup et le minuteur focus. Pas de `schemaVersion` global, pas d'identité d'appareil.

## Contenu de la proposition

`docs/proposals/sync-multi-appareils.md`. Deux axes **orthogonaux** (l'audit les mélangeait) :

- **Axe 1 — granularité** : blob « dernier-écrit-gagne » (simple, mais **perd** une saisie croisée le
  même jour) vs **par enregistrement horodaté** (pas de perte, généralise `mergeApplications`).
- **Axe 2 — transport** : **fichier `.json` chiffré dans un cloud** (Drive/iCloud, zéro serveur) vs
  **backend E2E** (plus « produit », mais serveur + surface réseau).

Options A (cloud + LWW) / **B (cloud + par enregistrement)** / C (backend E2E). **Reco : B** — le seul
qui ne perde pas de saisie croisée, sans coût d'exploitation d'un serveur, en réutilisant la brique de
fusion existante. Risques couverts : migration idempotente, horloges désynchronisées, **suppressions
qui ressuscitent** (pierres tombales), recouvrement au boot (IDB async + déchiffrement), taille du blob
(photos base64). **5 décisions** listées pour Adrien.

README des proposals + « En cours » de `docs/DEMANDES.md` (chantier 4 signalé) + « État actuel » de la
roadmap mis à jour.

## Vérification

Docs seuls, aucun code touché → pas de `verify` requis (§2.6, précédents #574/#577/#580), pas de bump.

_Domaine : fondations._
