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

- [x] **1.1** Modèle d'événement unifié : `{id, title, date, time, durationMin, kind, source, refId?, completed}` — `normalizeAgendaItem` dans `lib/logic.js`, testée. ✅ _boucle #05._
- [x] **1.2** Migration douce : chaque entrée d'`agenda[]` passe par `normalizeAgendaItem` dans `normalizeState` (idempotent, `planId`/`refId` préservés, `source` déduite). ✅ _boucle #05._
- [x] **1.3** Cycle de vie cohérent : supprimer un événement du calendrier mensuel supprime aussi le plan lié (`planId`) et rafraîchit toutes les vues — bug orphelin de l'audit corrigé. ✅ _boucle #05._
- [x] **1.4** Catégorie **« Révision »** (`study`, ambre `#5a4a2b`) : selects des 2 formulaires, légende, styles hebdo + mensuel. ✅ _boucle #05._
- [x] **1.5** `.ics` amélioré : `buildIcs()` dans `lib/logic.js` (testée) — durée réelle (`durationMin`), UID stable `<id>@irllvpup`, échappement RFC 5545 complet, catégorie `study`, CRLF. ✅ _boucle #06._

> ✅ **Vague 1 terminée** (boucles #05–#06, 2026-07-06).

_Livrable : calendrier unifié, filtrable par type, prêt à recevoir une source externe idempotente._

---

## Vague 2 — Connexion Le Grand Livre Compta _(P1, la demande centrale)_

**Objectif : IRL LVP UP devient le hub qui te dit quoi faire — planning de révision BTS CG sur la durée, rappels du jour, notifications. On ne révise PAS dans IRL (les flashcards restent dans Le Grand Livre).**

> **Décision révisée (2026-07-05, soir) : pas de fusion des flashcards.** Adrien ne veut pas réviser depuis IRL LVP UP. Ce qu'il veut : (1) un **planning de révision sur la durée** visible dans le calendrier, (2) des **rappels de ce qu'il y a à faire dans la journée**, (3) des **notifications Windows**, (4) une app **complète** et **sécurisée** (voir Vague S). L'ancienne option « Fusion » est abandonnée ; on est sur un hybride A/B léger + planificateur interne.

Tâches :
- [x] **2.1** **Planificateur de révision interne** : formulaire dans la page Calendrier (matière, jours de la semaine, heure, durée, date d'examen) → `planStudySessions()` + `mergePlannedEvents()` (lib/logic.js, testées) génèrent les créneaux `study` jusqu'à l'examen. **Idempotent** : régénérer ne crée pas de doublon et préserve les créneaux déjà validés. ✅ _boucle #06._
- [x] **2.2** **Import du planning Grand Livre** : bouton « ⬇ Exporter planning » injecté dans `le-grand-livre-compta.html` (backup `.bak` créé) → JSON des cartes dues par date ; import côté IRL (`glcPlanningToEvents`, validation défensive S.5, refId `glc-<date>` idempotent). ✅ _boucle #09._
- [x] **2.3** **« Ma journée » au premier plan** : section sur le dashboard listant chronologiquement séances (démarrables), créneaux de révision (validables), blocs agenda + compteur de quêtes — `todayItems()` testée, plans orphelins inclus. ✅ _boucle #07._
- [x] **2.4** **Notifications enrichies** : résumé du matin au 1er rappel + **rappel X min avant chaque bloc** (réglable 5–60, une notif par événement/jour) + **rappel du soir** (heure réglable, désactivable) s'il reste des blocs/quêtes. Réglages validés côté main (S.3), compat rétro, fix du bug de date UTC (00h–02h). ✅ _boucles #07–#08._
- [x] **2.5** XP « étude » : valider un créneau de révision = **+15 XP** (+1 Focus). ✅ _boucle #07._

_Livrable : tu ouvres l'app (ou pas : les notifs tombent toutes seules) et tu sais exactement quoi faire aujourd'hui, sport ET révision._

> ✅ **Vague 2 terminée** (boucles #06–#09, 2026-07-06).

---

## Vague S — Cybersécurité _(P1, transverse et continue)_

**Objectif : app sûre par défaut aujourd'hui (100 % locale), et prête à être connectée à internet sans s'exposer.**

Déjà en place (Vague 0) : `contextIsolation: true`, `nodeIntegration: false`, CSP (`script-src 'self'`), instance unique, préload minimal.

- [x] **S.1** **Sandbox renderer** : `sandbox: true` actif, préload validé sandboxé (smoke-test tourne lui aussi en sandbox). ✅ _boucle #10._
- [x] **S.2** **Verrouillage de navigation** : `will-navigate` → preventDefault + `setWindowOpenHandler` → deny. Aucune fenêtre/URL externe possible. ✅ _boucle #10._
- [x] **S.3** **Validation des entrées IPC côté main** : appliqué à `photos:*` (regex Data URL, taille bornée, nom regénéré anti path-traversal) et `notifications:save` (clamps + regex HH:MM). ✅ _boucles #04, #08._
- [x] **S.4** **Échappement HTML** : revue des `innerHTML` — toutes les saisies utilisateur (titres, notes, noms, pensées) passent par `escapeHtml` ; les sinks restants n'affichent que des données internes. ✅ _revue boucle #10 (à re-vérifier à chaque nouvelle feature)._
- [x] **S.5** **Imports défensifs** : restauration JSON (normalizeState), planning Grand Livre (`glcPlanningToEvents` : schéma strict, regex, bornes, cap 120 jours, 1 Mo max). ✅ _boucles #04, #09._
- [x] **S.6** **Hygiène dépendances** : `npm audit` intégré aux boucles ; **Electron monté 33 → 43.0.0** (purge ~18 CVE dont contournement d'intégrité ASAR). Résiduel : `tar` dans la chaîne electron-builder = **outillage de build uniquement** (jamais livré) — suivi, à purger avec electron-builder next (Vague 3). Lockfile commité. ✅ _boucle #10._
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
