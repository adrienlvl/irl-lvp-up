# Boucle #84 (autonome) — Mettre en pause un événement récurrent · build 1.9.18

**Contexte :** 9ᵉ itération de la boucle autonome.

## Livré

Dans la liste des **événements récurrents** (page Calendrier), un bouton **⏸️ / ▶️** permet de **mettre en pause** (ou réactiver) un rendez-vous répété **sans le supprimer** — pratique pour suspendre une réunion pendant les vacances, par exemple.

Une occurrence en pause **disparaît** de toutes les vues (Jour, Semaine, Mois, « Ma journée ») et des **notifications**, mais la règle et l'historique sont conservés ; on réactive en un clic.

## Détail technique

- `lib/logic.js` : `normalizeRecurring` gagne `paused: Boolean`. `todayItems` n'injecte l'occurrence que si `!r.paused`.
- `electron-main.cjs` : `recurringToday` filtre aussi `!r.paused` (notifications).
- `app.js` : `renderMonthCalendar` (filtre `!r.paused`), `renderRecurring` (bouton pause + tag « en pause »), handler `data-pause-recurring` (bascule + re-render).
- `extras.css` : styles `.rec-paused` / `.rec-paused-tag` / `.rec-pause-btn`.

## Vérifs

- `node --check electron-main.cjs` OK ; `npm run verify` → **129 tests / 129 pass** (+1 : récurrent en pause exclu de `todayItems`, présent quand actif), **SMOKE OK**.
