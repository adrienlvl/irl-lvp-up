# Boucle #87 (autonome) — Recherche dans l'agenda · build 1.9.21

**Contexte :** 12ᵉ itération de la boucle autonome. Aire : Agenda.

## Livré

Un champ **🔍 Rechercher (titre, lieu, notes)** au-dessus des filtres de l'agenda : il filtre en direct les événements affichés dans les vues **Jour** et **Semaine** par correspondance texte (titre, lieu ou notes), **insensible à la casse**. Se combine avec les filtres par type / priorité existants.

## Détail technique

- `lib/logic.js` : `agendaMatch(item, query)` pur + testé (requête vide → tout passe ; recherche dans title + location + notes en minuscules).
- `app.js` : variable `agendaSearchText` ; `renderDayView` et `renderWeekPage` ajoutent `&& agendaMatch(it, agendaSearchText)` à leur filtre ; input `#agendaSearch` câblé (`oninput` → `renderAgenda`).
- `index.html` : `#agendaSearch`. `extras.css` : `.agenda-search`.

## Vérifs

- `npm run verify` → **131 tests / 131 pass** (+1 : `agendaMatch` — titre/lieu/notes, casse, item nul), **SMOKE OK** (`agendaSearch:true`).
