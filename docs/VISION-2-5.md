# 🗺️ Vision & Roadmap générale — IRL LVP UP (2.0 → 5.0)

_Rédigé le 2026-07-22 (build 2.0.297). Vue d'ensemble : ce qui est **livré** (2.0), ce qui est **en route**
(3.0), et deux horizons **possibles** (4.0, 5.0). Objectif : une app **complète** — ton système de vie, 100 %
local, privé, qui grandit avec tes vrais besoins (BTS, alternance, sport)._

> **Fil rouge.** 2.0 = complétude (tout est là, manuel, local). 3.0 = **le saut** (mes données me suivent
> partout, l'app pense un peu à ma place, elle colle à mes vrais besoins). 4.0 = **automatisation & ouverture**.
> 5.0 = **coach intelligent unifié**. Chaque palier reste fidèle à l'ADN : **100 % local par défaut, zéro
> dépendance runtime, offline, sans compte imposé, privé par conception.**

---

## ✅ 2.0 — LIVRÉ (la complétude)

Un RPG de vie 100 % local (desktop Electron + PWA iPhone), ~350 fonctions pures testées, **591 tests + smoke
bloquant**, 0 dépendance runtime, auto-update. Par domaine :

### 🏋️ Athlète — Musculation
Blocs périodisés 4 semaines (Base·Volume·Intensité·Décharge) · volume hebdo **par groupe musculaire** avec
repères MEV≈10 / MRV≈20 séries (Israetel/RP) · équilibre **poussée/tirage** · **décharge** fondée volume+forme ·
prévision de palier de force + **1RM estimé** (Epley) · double progression + règle 2-for-2 + RIR/RPE (Zourdos) ·
plateau détecté · **palmarès de force** · **Standards de force relatifs au poids de corps** (Débutant→Élite,
#698) · **séance guidée** complète (échauffement/prévention/retour au calme, log par série, chrono repos, reprise
d'une séance interrompue, record en direct) · programme auto par objectif · séance express · ~47 exercices animés.

### 🏃 Endurance — Course / Trail / Running
Plans de course · **séances qualité VO2max/fractionné** (30/30 Billat, 4×4 norvégien) · **affûtage/taper** avant
course (Bosquet) · **ratio aigu:chronique (ACWR)** anti-blessure · prépa **descentes** trail/ultra (stress
excentrique) · allure, montée de km progressive, endurance polarisée 80/20 (Seiler).

### ⚖️ Coach Poids & Nutrition
`energyPlan` **science-first** (perte 0,5-1 %/sem personnalisée par IMC, déficit ≤25 %, protéines 2,4 g/kg en
déficit) · prévision de poids + graphe zoomé sur le point actuel · macros/protéines, hydratation adaptative ·
**frigo → repas → liste de courses** (table CIQUAL 2265 aliments) · mesures corporelles, **photos privées** (sur
l'appareil), compléments & ravitaillement.

### 💼 Alternance
**Funnel visuel** du pipeline de candidatures · **sync Google Sheets** (hôtes allowlistés) · classifieur de
statut FR robuste (regex ancrées, funnel qui ne ment plus) · relances datées · deadline rentrée · import CSV.

### 🧠 Focus, Vie, Bien-être, Sommeil & Récup
Minuteur de focus + parking à pensées + bilan de fin · **habitudes** (séries, à-risque) · **quêtes / XP /
niveaux / trophées** (le RPG) · **bien-être & mobilité** (routines guidées minutées) · **recalage du sommeil** +
dette de sommeil · **readiness** (sommeil/fatigue/courbatures) qui bride la charge · rituel du matin.

### 🎓 Études, Agenda & Calendrier
Planning de **révision BTS** (jours + date d'examen → créneaux posés, répétition) · compte à rebours d'épreuves ·
agenda jour/semaine · export/import **.ics** · import Grand-Livre-Compta.

### 🧱 Fondations, Sécurité & UI
100 % local, offline, **0 dépendance runtime** · CSP stricte, `contextIsolation`, réseau confiné au main,
anti-SSRF · sauvegarde/restauration robuste, assainissement d'état, gardes de dates **canoniques**
(`isRealDateKey`) · **PWA installable + desktop**, auto-update · **passe qualité UI** récente (nav en tuiles,
anneau de progression XP, dégradés graphes, retour tactile des boutons) · a11y démarrée (aria, focus, reduced-motion).

---

## 🚀 3.0 — EN ROUTE (le saut)

Ordre validé : **Coaching → Fondations → Sécurité → Sync → Études → Scans**. Ce n'est pas du polish, c'est un
changement de nature.

1. **🤖 Coaching adaptatif** — base livrée ; chantier vivant en **qualité** (recommandations plus fines, moins de
   redondance, hiérarchisées par ce qui compte le jour même).
2. **🧱 Fondations techniques** _(catalyseur)_ — **IndexedDB** en persistance primaire (fin du plafond ~5-10 Mo
   localStorage + éviction iOS), découpe `logic.js`/`app.js` en **modules ES** + bundler léger (sans casser le
   0-dépendance runtime), **tests E2E** (Playwright) en complément du smoke.
3. **🔒 Sécurité & prêt pour le public** — socle sécu (chiffrement au repos, audit) **avant** toute surface réseau ;
   objectif App Store / Play / web sans fuite.
4. **☁️ Sync multi-appareils** _(le cœur)_ — **PC ↔ iPhone sans export/import manuel**, chiffrée de bout en bout
   dès le jour 1 (fichier cloud chiffré, ou petit backend illisible côté serveur). Le manque n°1 aujourd'hui.
5. **🎓 Planning études multi-échéances** — **multi-matières / multi-épreuves** BTS (amorcé), le générateur
   équilibre plusieurs matières jusqu'à leurs dates avec **répétition espacée**, bilan par matière.
6. **📷 & ⌚ Premiers ponts vers le réel** — **scan code-barres du frigo** on-device (fondation « carte apprenante »
   posée, #697 ; scanner caméra à brancher) + **import Strava** (OAuth, faisable en solo).

---

## 🌟 4.0 — POSSIBLE (automatisation & ouverture)

Quand les fondations 3.0 sont là, l'app **fait à ta place** ce qui est manuel aujourd'hui, et s'ouvre.

- **⌚ Import sportif automatique** — Strava/Garmin/Polar alimentent charge, ACWR, tonnage, km **sans saisie**.
- **🧬 Autorégulation réelle** — **RPE/RIR par série** enregistré → prescription de charge vraiment autorégulée
  (au-delà du 2-for-2) ; **mésocycle auto-généré** qui progresse le volume MEV→MRV par zone, bloc après bloc.
- **🩹 Readiness par zone** — fatigue par groupe musculaire (pas seulement globale) → prévention de blessure fine.
- **🥗 Nutrition détaillée** — journal de repas horodaté (calories par aliment), **scan du frigo par vision**
  (opt-in, décision de vie privée explicite) au-delà du code-barres.
- **🎓 Tuteur BTS** — fiches, quiz, répétition espacée avancée par matière ; suivi de progression réel.
- **🌍 i18n (anglais)** + **audit WCAG complet** — ouvrir l'app au-delà du français, accessibilité de bout en bout.
- **📱 Intégration OS plus riche** — widgets, notifications actionnables, raccourcis Siri/Shortcuts.

---

## 🔮 5.0 — VISION (le coach intelligent unifié)

L'app devient un **coach de vie** qui raisonne sur l'ensemble — sport, études, nutrition, sommeil — en restant
**privée par conception** (IA on-device, pas de fuite de données).

- **🤖 Coach IA on-device** — écrit un **macrocycle personnalisé** couplant muscu + trail + révisions BTS +
  nutrition + sommeil, **réajusté chaque semaine** selon tes tendances.
- **⌚ Autorégulation temps réel** — HRV/sommeil du wearable **modulent la séance du jour** (séries, charge, repos).
- **📸 Vision on-device** — comptage de reps / retour sur la technique par la caméra, scan d'assiette — tout local.
- **🛡️ Prédiction de risque de blessure** — à partir de charge/équilibre/fraîcheur, avec repos anticipé conseillé.
- **🔐 Partage chiffré opt-in** — sauvegarde/partage entre appareils ou pairs, leaderboard privé de records, voire
  un coach humain qui lit un rapport chiffré — jamais sans ton accord explicite.

---

## 🧭 Principes qui ne changent jamais (2.0 → 5.0)

- **100 % local par défaut**, offline, **0 dépendance runtime** ; toute ouverture réseau/IA est **opt-in** et
  décidée explicitement (vie privée d'abord).
- **Science-first** pour tout le coaching (sources citées), **ambitieux mais sûr** (jamais blesser ni carencer).
- **Logique pure testée** + smoke bloquant : rien ne ship sans filet.
- **Ambitieux mais honnête** : une feature qui n'est pas mûre (ex. reconnaissance d'aliments par IA) est
  **cadrée en proposition**, pas bricolée.

_Ce document est une boussole, pas un contrat : Adrien arbitre l'ordre et le périmètre de chaque vague._
