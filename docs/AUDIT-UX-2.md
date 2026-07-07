# Audit UX #2 — app 1.5.2 (2026-07-07)

_Nouvelle passe demandée par Adrien, après confort & finitions. **Aucun changement fait ici** — c'est un menu, tu coches, j'implémente._
_Le 1er audit (`AUDIT-UX.md`, build 1.1.5) est en grande partie **livré** (sections rangées, repliables, sous-onglets Athlète, agenda unifié, nav 6 onglets). Celui-ci re-mesure l'app **telle qu'elle est aujourd'hui**._

---

## 1. Mesures objectives (relevées dans l'app réelle, fenêtre 1120×820)

| Page | Sections visibles | Hauteur | ≈ écrans | Champs/boutons |
|---|---|---|---|---|
| **Aujourd'hui** (dashboard) | 9 | 2 853 px | 3,5 | 46 |
| **Athlète** (sous-onglet Séance) | 9 | **5 193 px** | **6,3** | 65 |
| **Exercices** (bibliothèque) | 1 | **5 928 px** | **7,2** | 40 |
| **Nutrition** | 4 | 3 125 px | 3,8 | 32 |
| **Focus & vie** | 5 | 2 131 px | 2,6 | 28 |
| _Overlay_ Vue semaine | — | 755 px | 0,9 | — |
| _Overlay_ Vue mois (+ réglages) | 7 blocs | 1 404 px | 1,7 | — |
| _Overlay_ Ultra-trail | 6 blocs | 1 911 px | 2,3 | — |

Nav : Aujourd'hui · Agenda · Athlète · Exercices · Nutrition · Focus & vie.

**Verdict global : plus rien d'aberrant** (fini les 14 écrans de l'Athlète de juillet). Restent 3 points de densité : **Athlète (6,3)**, **Exercices (7,2)**, et un **dashboard qui empile beaucoup de widgets « aujourd'hui »**.

---

## 2. Problèmes principaux

### P1 — 🧩 Dashboard : trop de widgets qui parlent d'« aujourd'hui »
9 sections, dont **4 se recoupent** : **Ma journée** (événements du jour) + **À faire aujourd'hui** (To-Do) + **Mission Control** (6 étapes) + **Agenda IRL · Ta semaine** (mini-calendrier semaine). S'ajoutent Cap de vie, Boussole locale, Quêtes. On ne sait plus où regarder en premier.

### P2 — 📚 Athlète reste la page la plus longue (6,3 écrans)
Empile : Compagnon, **Objectif ultra-trail**, **Cycle ultra-trail**, Cap hebdo, Profil, Journal, Calendrier, Programmes. Les **blocs Ultra-trail sont AUSSI une page dédiée** (overlay 2,3 écrans) → **doublon**. Et aucune section n'est repliable ici (contrairement au dashboard).

### P3 — 🗂️ Exercices = 7,2 écrans sans repère fixe
La bibliothèque (37 fiches) est un catalogue légitime, mais la **recherche/filtre est en haut** : pour re-filtrer, il faut remonter tout en haut.

### P4 — ⚙️ « Vue mois » est devenue un fourre-tout de réglages
Le mois affiche : calendrier + **4 formulaires empilés** (ajout de bloc, import .ics, planning révision BTS, anniversaires). C'est le hub de config de l'agenda, mais tout est déroulé d'un coup.

### P5 — 🔁 Le mini « Agenda de la semaine » du dashboard fait doublon
Depuis qu'il y a un onglet Agenda complet (avec vue Jour), le mini-calendrier semaine sur le dashboard répète l'info.

---

## 3. Menu de changements (⭐ impact · 🔧 effort)

### Thème A — Désencombrer le dashboard
- [x] **A1.** Réunir **Ma journée + À faire (To-Do)** dans un seul bloc « Aujourd'hui » (sous-parties *Rendez-vous & blocs* / *À faire*). ✅ _boucle #43 (1.5.3)._
- [x] **A2.** **Retiré le mini « Agenda de la semaine »** du dashboard (doublon de l'onglet Agenda). ✅ _boucle #43._
- [x] **A3.** Mission Control + Boussole repliés par défaut (installation neuve) — inchangé, déjà en place. ✅

### Thème B — Raccourcir l'Athlète
- [x] **B1.** **Retiré le bloc `CYCLE ULTRA-TRAIL` statique** (doublon du cycle dynamique de la page Ultra). `trail-panel` conservé (il porte le bouton d'ouverture du plan + la saisie trail). Athlète 6,3 → 6,0 écrans. ✅ _boucle #44 (1.5.4)._
- [x] **B2.** **Sections d'Athlète repliables & mémorisées** : collapsibles étendus aux `article.panel` des grilles (Journal, Poids, Programmes, Progression, Objectifs…) + « Cap de vie » du dashboard. ✅ _boucle #44._
- [x] **B3.** **Objectifs regroupés** : « Objectif ultra-trail » (`trail-panel`) déplacé dans la grille des objectifs, **côte à côte avec « Cap sur l'objectif »** (`goal-panel`). ✅ _boucle #45 (1.5.5)._

### Thème C — Exercices
- [x] **C1.** **Barre de recherche/filtre collante** (sticky) en haut du catalogue → filtrer sans remonter. ✅ _boucle #43 (1.5.3)._

### Thème D — Réglages de l'agenda (Vue mois)
- [x] **D1.** Import, planning révision et anniversaires passés en **`<details>` repliables** (repliés par défaut) → la Vue mois n'est plus un mur de formulaires ; le calendrier + l'ajout de bloc restent visibles. ✅ _boucle #44 (1.5.4)._
- [x] **D2.** **Récap des anniversaires à venir** : bandeau doré en haut de l'agenda (`upcomingBirthdays`, testé) — les prochains anniversaires sous 60 j, triés par proximité, avec « aujourd'hui / demain / dans X j » et l'âge à venir. ✅ _boucle #45 (1.5.5)._

### Thème E — Cohérence & plus
- [x] **E1.** **Rappel Windows le matin d'un anniversaire** : le résumé de notification du matin (`todaySummary`, process principal) inclut désormais « 🎂 anniversaire de X ». ✅ _boucle #44 (1.5.4)._
- **E2.** Uniformiser les **états vides** et les libellés d'un onglet à l'autre. ⭐ · 🔧
- **E3.** Un **fil d'Ariane / titre de page** cohérent partout (déjà en place hors dashboard). ⭐ · 🔧

---

## 4. Recommandation (point de départ)
Le combo **A1 + A2 + B1 + B2 + C1** règle l'essentiel du ressenti « c'est encore un peu chargé » pour un effort raisonnable :
- Dashboard clarifié (un seul bloc « aujourd'hui », plus de doublon semaine),
- Athlète raccourci (ultra sorti + sections repliables),
- Catalogue d'exercices avec recherche qui suit.

Puis, si tu accroches : **D1** (réglages agenda rangés) et **E1** (rappel anniversaire).

## 5. Ce que je NE touche pas
- La logique métier (81 tests) et le contenu coaching/nutrition : ce sont des changements **de présentation**.
- Thème clair/sombre, densité, sécurité, auto-update : déjà en place.
