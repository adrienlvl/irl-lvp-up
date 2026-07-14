# #288 — Échéances agenda prioritaires en évidence (1.9.222)

**Rotation 20 · item #1 · liberté totale (domaine : agenda / dashboard)**

## Problème
Les puces « échéances à venir » de la page **Ma journée** ne montraient que
l'examen (objectif BTS) et la course objectif, via `upcomingKeyDates`. Un bloc
d'agenda marqué **priorité haute** (rendu de dossier, contrôle blanc, RDV
important) planifié dans les jours à venir n'apparaissait nulle part en évidence :
il fallait ouvrir le calendrier pour le retrouver.

## Amélioration
Les échéances **prioritaires de l'agenda** rejoignent les puces de Ma journée,
triées avec les jalons examen/course par proximité.

### Logique pure — `upcomingPriorityItems(agenda, todayKey, horizon, limit)`
- Filtre les blocs d'agenda **non faits**, **priorité `high`**, à date valide et
  à venir dans l'horizon (défaut 30 j, borné 1–365).
- Trie par proximité puis titre ; limite à `limit` (défaut 3, borné 1–10).
- Renvoie `[{ kind, title, daysLeft, date }]`. `[]` si agenda/clé invalides.

### Rendu — `renderMyDay()`
- Fusionne les puces `upcomingKeyDates` (examen/course) et `upcomingPriorityItems`.
- Puce prioritaire : classe `deadline-chip prio` (liseré rouge), 🔴 + emoji du
  type (🎯 focus / 🏃 sport / 📌 vie / 📚 révision) + titre + `J-x`.
- Marquée `soon` si J‑3 ou moins ; le conteneur reste masqué si aucune puce.

## Tests
- `logic.test.js` : tri par proximité, exclusion (fait / non‑high / passé / hors
  horizon), respect de `limit`, entrées invalides → `[]`.
- `renderer-smoke.cjs` : check `priorityDeadlines` (2 items, plus proche en tête).
- `npm run verify` : **309 tests + SMOKE OK** (`whatsNew` toujours vert).
- Vérif navigateur (tab-8, 2 blocs high‑prio à J‑2 et J‑6) : puces
  « 🔴 📚 Rendu dossier CG · J‑2 » (soon) et « 🔴 📌 Contrôle blanc · J‑6 ». ✔

## Fichiers
- `src/lib/logic.js` — `upcomingPriorityItems()` + export + CHANGELOG[0] 1.9.222.
- `src/app.js` — fusion des puces dans `renderMyDay()`.
- `src/extras.css` — `.deadline-chip.prio` (liseré rouge).
- `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`.
