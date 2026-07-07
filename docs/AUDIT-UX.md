# Audit UX — clarté, simplicité, désencombrement

_2026-07-06 · app IRL LVP UP 1.1.5. Objectif : app plus claire, plus facile, pages moins chargées. **Aucun changement fait ici** — c'est un menu ; tu choisis, j'exécute ensuite._

---

## 1. Mesures objectives (relevées dans l'app réelle)

| Page | Sections visibles | Hauteur totale | ≈ écrans à scroller |
|---|---|---|---|
| **Aujourd'hui** (dashboard) | 12 | ~3 150 px | ~3,5 |
| **Athlète** | **18** | **~12 900 px** | **~14** 😵 |
| **Focus & vie** | 9 | ~2 780 px | ~3 |
| Navigation | 6 onglets (Aujourd'hui · Ma semaine · Calendrier · Ultra-trail · Athlète · Focus & vie) | | |

**Verdict : la page Athlète est un fourre-tout de 14 écrans**, et 4 sections « fuient » sur toutes les pages. C'est la cause n°1 du sentiment de confusion.

---

## 2. Les 5 problèmes principaux

### P1 — 🐞 Sections « fantômes » sur toutes les pages *(bug + clutter)*
4 sections ne sont rattachées à aucun onglet et s'affichent donc **partout** : `agenda-panel` (agenda du dashboard), `trail-panel`, `trail-plan`, `weekly-review-panel`. Résultat : tu retrouves le plan ultra-trail et la revue hebdo au milieu de « Focus & vie », etc.

### P2 — 📚 Page Athlète surchargée (18 sections, 14 écrans)
Tout y est empilé : compagnon, objectifs, semaine, profil, échauffement, journal, poids, historique, progression, **bibliothèque de 37 exercices** (≈5 000 px à elle seule), nutrition, planning, photos, analyse, tendances, graphiques, compléments, programmes, récupération, mensurations. Impossible de s'y retrouver.

### P3 — 🔁 Dashboard redondant (4 widgets « aujourd'hui »)
« Mission Control » (6 étapes), « Ma journée », « Boussole locale » et « Agenda de la semaine » disent **la même chose de 4 façons**. On ne sait plus où regarder.

### P4 — 🗓️ Trois calendriers qui se chevauchent
« Agenda » (dashboard) + « Ma semaine » + « Calendrier » (mensuel) = 3 vues du même agenda, dans 3 endroits différents.

### P5 — 🧭 Navigation peu hiérarchisée
6 onglets de même poids, sans regroupement (l'entraînement est éparpillé entre Athlète, Ultra-trail, et le planning est dans Athlète alors que Ma semaine/Calendrier sont ailleurs).

---

## 3. Menu de changements proposés (choisis ceux que tu veux)

> Chaque item est noté **Impact clarté** (⭐→⭐⭐⭐) et **Effort** (🔧→🔧🔧🔧).

### Thème A — Corrections rapides, gros gains
- **A1.** Rattacher les 4 sections fantômes à leur bonne page (agenda → onglet Agenda ; trail/ultra → Ultra-trail ; revue hebdo → Athlète). ⭐⭐⭐ · 🔧 *(quick win, à faire quoi qu'il arrive)*
- **A2.** Rendre toutes les grosses sections **repliables** (accordéon) avec mémorisation ouvert/fermé. Tu déplies ce que tu veux voir. ⭐⭐⭐ · 🔧🔧

### Thème B — Dégonfler la page Athlète
- **B1.** La scinder en **sous-onglets** : *Séance du jour · Progrès · Bibliothèque · Nutrition*. ⭐⭐⭐ · 🔧🔧
- **B2.** Sortir la **bibliothèque d'exercices** (37 fiches) dans sa propre page/onglet accessible à la demande. ⭐⭐⭐ · 🔧
- **B3.** Regrouper les suivis (poids, mensurations, photos, tendances, graphiques) sous un seul bloc « **Mes progrès** » replié par défaut. ⭐⭐ · 🔧🔧

### Thème C — Dégonfler le Dashboard
- **C1.** Fusionner **Mission Control + Ma journée + Boussole** en **un seul bloc « Aujourd'hui »** (le plan du jour + les 6 mini-étapes). ⭐⭐⭐ · 🔧🔧
- **C2.** Retirer le **formulaire d'agenda** du dashboard (il vit déjà dans l'onglet Agenda). ⭐⭐ · 🔧
- **C3.** Réduire le bloc **stats** (Vitalité/Focus/Équilibre) à une ligne compacte. ⭐ · 🔧

### Thème D — Rationaliser navigation & calendriers
- **D1.** Fusionner **Ma semaine + Calendrier + Agenda** en un seul onglet **« Agenda »** (bascule semaine/mois). ⭐⭐⭐ · 🔧🔧
- **D2.** Regrouper la nav en moins d'onglets, ex. **Aujourd'hui · Agenda · Entraînement · Focus & Vie** (Ultra-trail devient une section d'Entraînement). ⭐⭐ · 🔧🔧

### Thème E — Confort & lisibilité
- [x] **E1.** Densité réglable (confort / compact) — bouton ⇕ dans l'en-tête, mémorisé (`irl-density`), applique un mode compact (moins de padding, plus d'infos à l'écran). ✅ _boucle #39 (build 1.4.1)._
- [x] **E2.** Un **« retour en haut »** flottant sur les pages longues (apparaît après ~600 px de défilement). ✅ _boucle #39._
- **E3.** Recherche/raccourci global (aller directement à une section). ⭐ · 🔧🔧
- _Bonus #39 :_ **version affichée** dans le pied de page (`IRL LVP UP vX.Y.Z` via IPC `app:version`) — pour savoir quelle version on utilise.

### Thème F — Première utilisation
- **F1.** Un mode « **essentiel** » au démarrage (afficher peu, déplier au besoin) pour ne pas noyer un nouveau venu. ⭐⭐ · 🔧🔧

---

## 4. Ma recommandation (si tu veux un point de départ)
Le combo **A1 + A2 + C1 + B2** règle 80 % du ressenti « c'est le bordel » pour un effort modéré :
- A1 : plus de sections fantômes.
- A2 : tu replies ce que tu ne regardes pas.
- C1 : un seul bloc « Aujourd'hui » clair.
- B2 : la grosse bibliothèque sort de la page Athlète.

Puis, si tu accroches, **D1** (un seul Agenda) et **B1** (sous-onglets Athlète) pour finir le travail.

---

## 5. Ce que je NE toucherais pas
- La logique métier (tout est testé, 56 tests) et le contenu coaching : ce sont des changements **de présentation**, pas de fond.
- Le thème clair/sombre et la sécurité : déjà en place.

> Dis-moi les numéros que tu veux (ex. « A1, A2, C1, B2 ») et je les implémente, testés, dans un nouveau build.
