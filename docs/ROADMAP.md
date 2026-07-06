# Roadmap d'évolution — IRL LVP UP

_Établie le 2026-07-05. Séquencée par vagues. Chaque vague est livrable indépendamment et laisse l'app fonctionnelle._

Légende : 🟥 P0 (fondations, bloquant) · 🟧 P1 (haute valeur) · 🟨 P2 (qualité/confort) · 🟩 P3 (plus tard).

## Vague 6 — UX : clarté & désencombrement _(en cours, choix d'Adrien)_
_Détail : [`AUDIT-UX.md`](AUDIT-UX.md). Adrien a retenu : A1+A2, B1+B3, C1+B2, D1+D2._
- [x] **A1** Sections fantômes rattachées à leur page (agenda→dashboard ; trail/plan/revue→athlète). Fuites = 0. ✅ _boucle #27._
- [x] **A2** Sections repliables (16 panneaux), état mémorisé (`localStorage['irl-collapsed']`). ✅ _boucle #27._
- [x] **C1** Dashboard désencombré (approche prudente) : « Ma journée » remontée en tête (juste sous le profil) ; Mission Control + Boussole **repliés par défaut** au 1er lancement (dépliables). ✅ _boucle #28._
- [ ] **C2** Retirer le formulaire d'agenda du dashboard.
- [ ] **B2** Sortir la bibliothèque d'exercices dans son propre onglet.
- [ ] **B1** Page Athlète en sous-onglets (Séance / Progrès / Nutrition).
- [ ] **B3** Bloc « Mes progrès » (poids/mensurations/photos/tendances/graphiques) replié.
- [ ] **D1** Agenda unifié (semaine + mois + agenda en un onglet).
- [ ] **D2** Navigation regroupée (moins d'onglets ; Ultra-trail sous Entraînement).


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

## Vague 5 — Coaching haut niveau & contenu sport _(P1, demande d'Adrien)_

**Objectif : se comporter comme le coach d'un athlète de haut niveau. Plus de séances, mieux guidées, adaptées au matériel réel d'Adrien (poignées de pompes, gilet lesté, kettlebell, barre de traction — PAS de banc/box).**

- [x] **5.0a** Matériel corrigé : `{handles, vest, kettlebell, pullup}` (fini le « banc »). Onboarding + profil + defaults + migration. ✅ _boucle #19._
- [x] **5.0b** Illustrations refaites : pictogrammes **SVG** par schéma de mouvement (`lib/exercise-icons.js`) — fini les photos coupées/mal alignées. 10 patterns, couleur du thème, jamais tronqués. ✅ _boucle #19._
- [x] **5.1** **Exercices barre de traction + poignées** : Tractions, Tractions supination, Tractions négatives, Rowing australien, Suspension barre (dead hang), Relevés de genoux suspendu, Pompes déficit — 7 fiches complètes (cue, exécution, objectif, à éviter). Mappées aux icônes. **Bibliothèque : 30 → 37 exercices.** ✅ _boucle #20._
- [~] **5.2** **Programmes hybrides trail + force** : 3 programmes redessinés — « Hybride trail + force » (tirage/poussée · jambes/chaîne postérieure · puissance/tronc), « Force & tractions » (haut du corps), « Spécial trail & course » — avec `why` coaching (placement vs course, RPE). ✅ _structure de base boucle #20._ Reste : sections échauffement/finisher explicites dans l'UI.
- [x] **5.3** **Objectif de course + périodisation** : Adrien vise **150–200 km sur 2 ans** (ajustable semi/marathon/ultra). Section « Mon objectif » (page Ultra) : presets + distance + date → calcul automatique de la **phase** (Fondation → Base → Développement → Spécifique → Affûtage) avec focus du moment et sortie longue cible. `raceGoalStatus`/`racePhase`/`weeksBetween` purs + testés. ✅ _boucle #21._
  - **Paliers intermédiaires** (`intermediateGoals`, testé) : échelle de courses croissantes échelonnées vers l'objectif (ex. ultra 170 km/2 ans → Semi ~7 mois, 50 km ~13 mois, 100 km ~20 mois, puis 170 km). Affichés en timeline dans la section objectif. ✅ _boucle #22._
- [x] **5.4** **Guidage renforcé** : échauffement spécifique (`warmupFor`, testé) en tête de chaque séance guidée (encart repliable, adapté haut/bas/trail) + le compagnon d'entraînement affiche le **contexte de course** (objectif, échéance, phase). ✅ _boucle #26._

> ✅ **Vague 5 (Coaching) terminée** (boucles #19–#26, 2026-07-06). Installeur **1.1.5**.
- [x] **5.8** **Montée en volume sécurisée** : de ton volume actuel vers ta cible (km/sem) sur une date — gain hebdo plafonné (~12 %) + semaine de décharge/4. Dit la cible de cette semaine, ce que tu atteindras réellement à la date, et **est honnête si c'est trop rapide** (propose la durée réaliste). `volumeRamp` pur + 3 tests. Cas Adrien (15→50 fin août) : atteint ~30 km, 50 km réaliste vers 14 sem. ✅ _boucle #25._
- [x] **5.7** **Planning hebdo adaptatif** : tu coches tes jours (jusqu'à 7), l'app répartit automatiquement course facile / sortie longue / force / fractionné, espace les jours durs (jamais 2 collés), place la sortie longue le week-end et n'ajoute du fractionné qu'en phase avancée. Régénérable chaque semaine selon ton emploi du temps (retire les anciens créneaux auto, garde les manuels). `buildWeekPlan` pur + testé (6 tests). ✅ _boucle #24._
- [x] **5.6** **Compléments & ravitaillement** : panneau (page Athlète) — Whey (Overstims) : cible protéique personnalisée (g/kg selon objectif) + timing (post-muscu, collation, repos) ; **électrolytes en course** dosés par heure (boisson + sodium) **ajustés à la chaleur** (Frais → Très chaud). `proteinTarget`/`hydrationPlan` purs + testés. ✅ _boucle #23._
- [x] **5.5** Mouvements sans banc/box : Step-up et Step-down reformulés sur **escalier**, pompes inclinées sur **plan de travail/rambarde**. ✅ _boucle #20._

---

## Vague 3 — Qualité & maintenabilité _(P2)_

- [~] **3.1** Découper `app.js` : logique pure dans `lib/logic.js` ✅, données statiques (30 exercices + 3 programmes) dans `lib/exercises-data.js` ✅ (_boucle #13_, app.js 100 Ko → 93 Ko). Reste (optionnel) : séparer les gros blocs de rendu par domaine.
- [~] **3.2** Rationaliser les CSS : **19 → 15 fichiers** (4 `-plus` fusionnés dans `extras.css`, `audit.css` dans `pages.css`, ordre de cascade préservé). Reste : purge des règles mortes (analyse fine). _boucle #12._
- [x] **3.3** Rendu ciblé : `renderDashboardCore()` (léger) pour les actions fréquentes — quêtes, défi, pas de vie, focus, validation Ma journée — au lieu du `render()` complet (20 sections). Le `render()` global reste pour les changements larges (séances, restauration). ✅ _boucle #12._
- [x] **3.4** Couverture de tests étendue : **23 → 31 tests**. Calcul de prescription extrait en pur (`prescriptionFor`/`formatFor`), + cas limites (bornes, familles, titres hostiles XSS, ICS multi-événements, listes vides). ✅ _boucle #14._

---

## Vague 4 — Fonctionnalités produit _(P2/P3, selon tes priorités)_

Priorités choisies par Adrien (2026-07-06) : **les 4** — graphiques, Ma semaine, PDF hebdo, thème clair.
- [x] **4.1** Graphiques enrichis : 4 histogrammes sur 8 semaines (charge d'entraînement, focus/semaine, sommeil moyen, révisions validées) — `weeklyAggregate()` pur + testé, SVG maison, dans la page Athlète. ✅ _boucle #15._
- [x] **4.2** Export PDF hebdo : bouton « 🖨️ Bilan PDF » (page Ma semaine) → vue imprimable A4 paysage (KPI sport/focus/sommeil/révision + grille 7 jours + phrase de bilan) via `window.print()` + `print.css` (`@media print`). `weeklySummary()` pur + testé. Vérifié : `printToPDF` génère un PDF valide. ✅ _boucle #17._
- [x] ~~**4.3** Objectifs BTS CG intégrés au système d'XP~~ → déplacé en **2.5**.
- [x] **4.4** Vue « Ma semaine » : page lundi→dimanche, 4 types côte à côte (sport/focus/vie/révision, couleurs distinctes), compteurs d'équilibre, navigation semaine, aujourd'hui surligné. `weekItems()` pur + testé. Vérifiée par capture Electron. ✅ _boucle #16._
- [x] **4.5** Thème clair/sombre : bouton 🌙/☀️ dans l'en-tête, persistant (`localStorage['irl-theme']`), appliqué au boot (anti-flash). Surfaces refactorisées en variables (`--surface-2`, `--input-bg`) + `theme.css`. Bascule vérifiée (texte sombre/fond clair/panels blancs, Mission Control inclus). ✅ _boucle #18._

> ✅ **Vague 4 terminée** (boucles #15–#18, 2026-07-06). Installeur **1.1.2** livré.
- [ ] **4.6** Sauvegarde chiffrée / synchro multi-appareils (optionnel, casse le « 100 % local » — à discuter).

---

## Principe de travail (boucles autonomes)

- Je travaille par **boucles de 10–15 min**, chaque itération = un lot cohérent et testé.
- **À chaque boucle**, un récapitulatif horodaté est écrit dans `docs/recaps/` (voir `docs/recaps/`).
- **Commit git** à chaque lot stable (message clair, réversible).
- Rien de destructif sans filet : la baseline et chaque étape restent réversibles via git.

## Ordre d'exécution proposé

`0.x` (fondations) → `1.x` (calendrier unifié) → `2.x` (planning révision + rappels + notifications) → `S.x` (durcissement sécurité) → `3.x` (qualité), en tenant `4.x` comme réservoir priorisable. Les items `S.3`/`S.5` s'appliquent au fil de l'eau dès qu'un handler IPC ou un import est créé.
