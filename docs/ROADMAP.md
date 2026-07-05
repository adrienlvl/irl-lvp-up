# Roadmap d'évolution — IRL LVP UP

_Établie le 2026-07-05. Séquencée par vagues. Chaque vague est livrable indépendamment et laisse l'app fonctionnelle._

Légende : 🟥 P0 (fondations, bloquant) · 🟧 P1 (haute valeur) · 🟨 P2 (qualité/confort) · 🟩 P3 (plus tard).

---

## Vague 0 — Fondations & sécurité _(P0, indispensable avant tout)_

**Objectif : pouvoir rebuild le `.exe` et ne plus perdre de données.**

- [x] **0.1** Reconstituer une chaîne de build : `package.json` complet (deps `electron`, `electron-builder`), scripts `npm start` / `npm run dist`, config electron-builder, icône. → régénérer un `.exe` identique fonctionnellement. ✅ _boucle #02 — electron 33.4.11, `npm start` vérifié._
- [x] **0.2** `save()` robuste : `try/catch` sur `localStorage.setItem`, message clair si quota atteint, repli sur backup disque. ✅ _boucle #02._
- [x] **0.3** Sortir les **photos** du blob d'état → fichiers dans `userData/photos/` via IPC (`photos:save/read/delete`, entrées validées côté main = S.3 appliqué), state réduit à `{id,date,file}`, migration douce des anciennes photos base64, repli navigateur conservé. ✅ _boucle #04._
- [x] **0.4** Durcissement Electron : **icône de tray visible**, **verrou d'instance unique** (`requestSingleInstanceLock`), **CSP** dans `index.html`. ✅ _boucle #02._
- [x] **0.5** Filet de tests (Node, sans dépendance lourde) sur la logique pure. ✅ _boucle #03 — `src/lib/logic.js` (double export navigateur/Node), 6 tests `node:test` verts + harnais smoke-test renderer Electron qui capture les erreurs JS. `exercisePrescription`/`normalizeState` : extraction reportée (gros littéraux), déjà couvertes indirectement par le smoke-test._
- [x] **0.6** Gestionnaire d'erreurs global (`window.onerror` + `unhandledrejection`) : bannière non bloquante + `console.error`, l'UI ne casse plus. ✅ _boucle #03._

_Livrable : un `.exe` reproductible + données à l'épreuve du quota._

> ✅ **Vague 0 terminée** (boucles #02–#04, 2026-07-05/06).

---

## Vague 1 — Unification du calendrier _(P1, prérequis de l'intégration)_

**Objectif : un modèle d'événement unique, prêt à accueillir les révisions BTS.**

- [ ] **1.1** Modèle d'événement unifié : `{id, title, date, time, durationMin, kind, source, refId?, completed}` avec `kind ∈ {focus, sport, life, study}` et `source ∈ {manual, training, study-glc, imported}`.
- [ ] **1.2** Migration douce : `agenda[]` + `plans[]` → événements unifiés (via `normalizeState`, sans perte).
- [ ] **1.3** Cycle de vie cohérent : supprimer un événement lié à un plan/une séance nettoie les deux côtés (plus d'orphelins).
- [ ] **1.4** Catégorie **« Révision / Étude »** dans l'UI (légende, filtres, couleur dédiée) du calendrier hebdo et mensuel.
- [ ] **1.5** `.ics` amélioré : durée réelle, `UID` stable, échappement complet, catégorie `study`.

_Livrable : calendrier unifié, filtrable par type, prêt à recevoir une source externe idempotente._

---

## Vague 2 — Connexion Le Grand Livre Compta _(P1, la demande centrale)_

**Objectif : IRL LVP UP devient le hub qui te dit quoi faire — planning de révision BTS CG sur la durée, rappels du jour, notifications. On ne révise PAS dans IRL (les flashcards restent dans Le Grand Livre).**

> **Décision révisée (2026-07-05, soir) : pas de fusion des flashcards.** Adrien ne veut pas réviser depuis IRL LVP UP. Ce qu'il veut : (1) un **planning de révision sur la durée** visible dans le calendrier, (2) des **rappels de ce qu'il y a à faire dans la journée**, (3) des **notifications Windows**, (4) une app **complète** et **sécurisée** (voir Vague S). L'ancienne option « Fusion » est abandonnée ; on est sur un hybride A/B léger + planificateur interne.

Tâches :
- [ ] **2.1** **Planificateur de révision interne** : générer un plan de révision BTS CG sur la durée (matières/chapitres, échéance examen, fréquence par semaine, répartition espacée) → événements `kind: study` dans le calendrier unifié. Fonctionne même sans données du Grand Livre.
- [ ] **2.2** **Import optionnel du planning Grand Livre** : bouton « Exporter mon planning » ajouté à `le-grand-livre-compta.html` (JSON : cartes dues par date) + import côté IRL (sélecteur de fichier, idempotent via `refId`) pour affiner le plan avec les vraies échéances de répétition espacée.
- [ ] **2.3** **« Ma journée » au premier plan** : le dashboard liste tout ce qu'il y a à faire aujourd'hui (blocs agenda, séance prévue, créneaux de révision, quêtes) en une seule vue.
- [ ] **2.4** **Notifications enrichies** (via le système de rappels Electron existant) : résumé du matin (« Aujourd'hui : 1 séance, 2 blocs focus, révision compta 30 min »), rappel avant chaque événement du jour (X min avant, réglable), rappel du soir si des choses restent non faites.
- [ ] **2.5** XP « étude » : valider un créneau de révision rapporte de l'XP (l'app reste un RPG).

_Livrable : tu ouvres l'app (ou pas : les notifs tombent toutes seules) et tu sais exactement quoi faire aujourd'hui, sport ET révision._

---

## Vague S — Cybersécurité _(P1, transverse et continue)_

**Objectif : app sûre par défaut aujourd'hui (100 % locale), et prête à être connectée à internet sans s'exposer.**

Déjà en place (Vague 0) : `contextIsolation: true`, `nodeIntegration: false`, CSP (`script-src 'self'`), instance unique, préload minimal.

- [ ] **S.1** **Sandbox renderer** : `sandbox: true` sur la fenêtre + vérifier que le préload reste compatible.
- [ ] **S.2** **Verrouillage de navigation** : bloquer `will-navigate` vers tout ce qui n'est pas le fichier local + `setWindowOpenHandler` → deny (aucune fenêtre/URL externe ne peut s'ouvrir, même via un lien piégé dans une note).
- [ ] **S.3** **Validation des entrées IPC côté main** : tailles/chemins/types vérifiés dans chaque handler (`backup:save`, futurs `photos:*`, imports) ; jamais de chemin fourni par le renderer utilisé tel quel (anti path-traversal).
- [ ] **S.4** **Échappement HTML systématique** : audit des `innerHTML` restants, tout passage de saisie utilisateur par `escapeHtml` (élimine le risque XSS local → RCE).
- [ ] **S.5** **Imports défensifs** : les fichiers JSON importés (restauration, planning Grand Livre) sont validés champ par champ (schéma strict, tailles bornées) avant d'entrer dans le state.
- [ ] **S.6** **Hygiène dépendances** : `npm audit` à chaque boucle de build, versions Electron suivies (les CVE Electron/Chromium sont fréquentes), lockfile commité.
- [ ] **S.7** **Si connexion internet un jour** (préparé, pas activé) : allowlist stricte de domaines HTTPS, aucun code distant exécuté (pas de script tiers), secrets via `safeStorage` (chiffrement OS, jamais en clair dans le state), mises à jour signées uniquement, et CSP resserrée par domaine.

_Principe : par défaut l'app n'a AUCUN accès réseau ; chaque ouverture future sera explicite, minimale et vérifiée._

---

## Vague 3 — Qualité & maintenabilité _(P2)_

- [ ] **3.1** Découper `app.js` en modules logiques (données, rendu, calendrier, entraînement, focus) — sans bundler si possible (ES modules) ou avec un bundler léger.
- [ ] **3.2** Rationaliser les 20 CSS → 3-4 fichiers thématiques, supprimer le mort.
- [ ] **3.3** Rendu ciblé : ne re-rendre que la section touchée (au lieu du `render()` global) pour supprimer le jank et la perte de focus.
- [ ] **3.4** Étendre la couverture de tests.

---

## Vague 4 — Fonctionnalités produit _(P2/P3, selon tes priorités)_

Idées issues de l'audit (à prioriser ensemble) :
- [ ] **4.1** Graphiques enrichis (charge d'entraînement, sommeil, focus/semaine).
- [ ] **4.2** Export PDF hebdo (bilan sport + étude).
- [x] ~~**4.3** Objectifs BTS CG intégrés au système d'XP~~ → déplacé en **2.5**.
- [ ] **4.4** Vue unifiée « Ma semaine » : sport + focus + révision côte à côte.
- [ ] **4.5** Thème clair/sombre, personnalisation.
- [ ] **4.6** Sauvegarde chiffrée / synchro multi-appareils (optionnel, casse le « 100 % local » — à discuter).

---

## Principe de travail (boucles autonomes)

- Je travaille par **boucles de 10–15 min**, chaque itération = un lot cohérent et testé.
- **À chaque boucle**, un récapitulatif horodaté est écrit dans `docs/recaps/` (voir `docs/recaps/`).
- **Commit git** à chaque lot stable (message clair, réversible).
- Rien de destructif sans filet : la baseline et chaque étape restent réversibles via git.

## Ordre d'exécution proposé

`0.x` (fondations) → `1.x` (calendrier unifié) → `2.x` (planning révision + rappels + notifications) → `S.x` (durcissement sécurité) → `3.x` (qualité), en tenant `4.x` comme réservoir priorisable. Les items `S.3`/`S.5` s'appliquent au fil de l'eau dès qu'un handler IPC ou un import est créé.
