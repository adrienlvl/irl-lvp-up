# Boucle #75 — Vue Jour en grille horaire · build 1.9.9

**Demande d'Adrien :** « oui, continue à améliorer l'onglet Agenda ! »

## Livré

Au-dessus de la liste détaillée, la **vue Jour affiche désormais une grille par heure** (comme un vrai agenda) :
- Rail des heures à gauche (labels HH:00).
- Chaque événement daté est un **bloc positionné par son heure**, **hauteur = durée**, **couleur = type** (sport/focus/vie/révision).
- **Chevauchements gérés côte à côte** (colonnes) via `dayColumns` (pur + testé).
- **Ligne « maintenant »** rouge quand on regarde aujourd'hui.
- **Clic sur un bloc** (vrai événement) → boîte d'édition ; les blocs récurrents/plans/anniversaires ne sont pas cliquables.
- La **liste détaillée reste en dessous** avec toutes les actions (valider ✓, ▶️ Séance, ✏️, → demain, départ/notes).

## Détail technique

- `lib/logic.js` : `dayColumns(events)` — partition d'intervalles en colonnes (pur, testé : chevauchement → 2 colonnes, séparés/contigus → 1).
- `app.js` : `renderDayView` construit `.day-grid` (plage horaire dynamique bornée aux événements, `44px/h`, blocs absolus, ligne now). Clic géré par le handler existant (`data-day-edit` → `openAgendaEdit`).
- `extras.css` : `.day-grid` / `.dg-hour` / `.dg-event` (couleurs par type) / `.dg-now`.

## Vérifs

- `npm run verify` → **125 tests / 125 pass** (+1 : `dayColumns`), **SMOKE OK** (`dayGrid:true`).
- **Capture** : journée avec Cours GRETA (09:00→11:00) et Appel visio (10:00→11:00) **superposés → 2 colonnes côte à côte** ✓ ; Courses (12:00), hauteurs proportionnelles aux durées, couleurs correctes, labels d'heures. ✅
