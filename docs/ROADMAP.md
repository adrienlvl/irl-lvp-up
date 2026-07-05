# Roadmap d'évolution — IRL LVP UP

_Établie le 2026-07-05. Séquencée par vagues. Chaque vague est livrable indépendamment et laisse l'app fonctionnelle._

Légende : 🟥 P0 (fondations, bloquant) · 🟧 P1 (haute valeur) · 🟨 P2 (qualité/confort) · 🟩 P3 (plus tard).

---

## Vague 0 — Fondations & sécurité _(P0, indispensable avant tout)_

**Objectif : pouvoir rebuild le `.exe` et ne plus perdre de données.**

- [x] **0.1** Reconstituer une chaîne de build : `package.json` complet (deps `electron`, `electron-builder`), scripts `npm start` / `npm run dist`, config electron-builder, icône. → régénérer un `.exe` identique fonctionnellement. ✅ _boucle #02 — electron 33.4.11, `npm start` vérifié._
- [x] **0.2** `save()` robuste : `try/catch` sur `localStorage.setItem`, message clair si quota atteint, repli sur backup disque. ✅ _boucle #02._
- [ ] **0.3** Sortir les **photos** du blob d'état (stockage séparé : fichiers via Electron ou IndexedDB) → allège chaque écriture.
- [x] **0.4** Durcissement Electron : **icône de tray visible**, **verrou d'instance unique** (`requestSingleInstanceLock`), **CSP** dans `index.html`. ✅ _boucle #02._
- [ ] **0.5** Filet de tests (Node, sans dépendance lourde) sur la logique pure : niveau/XP, streak, `weekStart`, `exercisePrescription`, `normalizeState`.
- [ ] **0.6** Gestionnaire d'erreurs global (`window.onerror`) qui log localement au lieu de casser l'UI.

_Livrable : un `.exe` reproductible + données à l'épreuve du quota._

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

**Objectif : voir son planning de révision BTS CG dans le calendrier de IRL LVP UP.**

> **Décision actée (2026-07-05) : Option C — Fusion.** On intègre un module de révision BTS CG directement dans IRL LVP UP, avec état partagé et XP « étude ». Options A/B conservées ci-dessous pour mémoire.

Trois architectures possibles :

- **Option A — Pont par fichier partagé (recommandé).** Le Grand Livre Compta exporte son planning (cartes `due`, sessions de révision) dans un fichier JSON à un emplacement connu ; IRL LVP UP le lit via Electron (`fs` + IPC) et génère des événements `kind: study, source: study-glc`, **rafraîchissables** sans écraser les blocs manuels. Nécessite un petit ajout d'export côté Grand Livre.
- **Option B — Pont `.ics`.** Le Grand Livre génère un `.ics` de révision ; IRL l'importe. Simple, découplé, mais manuel et non « live ».
- **Option C — Fusion.** Intégrer le module de révision (ou un résumé) directement dans l'app hub, state partagé. Plus puissant, plus de travail, couple les deux apps.

Tâches (indépendantes de l'option) :
- [ ] **2.1** Définir le format d'échange (JSON planning : `{generatedAt, sessions:[{date, count, topics?, minutes?}], dueByDate:{...}}`).
- [ ] **2.2** Côté Grand Livre : bouton/export du planning (selon option).
- [ ] **2.3** Côté IRL : import + génération d'événements `study` idempotente (clé `refId` = date/session).
- [ ] **2.4** Vue « Révision du jour » sur le dashboard : nb de cartes dues aujourd'hui + accès rapide.
- [ ] **2.5** Rappels Windows optionnels sur les créneaux de révision.

_Livrable : le planning BTS CG apparaît et se met à jour dans le calendrier IRL._

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
- [ ] **4.3** Objectifs BTS CG intégrés au système d'XP (réviser = gagner de l'XP « étude »).
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

`0.1 → 0.2 → 0.4 → 0.3 → 0.5/0.6` puis `1.x` puis `2.x` (selon l'option choisie) puis `3.x`, en tenant `4.x` comme réservoir priorisable.
