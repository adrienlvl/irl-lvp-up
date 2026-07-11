# Boucle #99 (autonome) — Calendrier : clic sur un jour → vue jour · build 1.9.33

**Contexte :** 24ᵉ itération de la boucle autonome. Aire : Agenda / calendrier mensuel.

## Livré

Dans le **calendrier mensuel**, cliquer sur **n'importe quelle case-jour** (pas seulement un événement) ouvre désormais la **vue « jour »** de cette date : on passe de la vue d'ensemble du mois au détail d'une journée d'un seul clic.

- Cliquer un événement continue de l'ouvrir en édition (comportement inchangé).
- Curseur main + léger survol pour signaler que la case est cliquable.

## Détail technique

- `app.js` :
  - `renderMonthCalendar` : chaque `.month-day` porte `data-cal-day="YYYY-MM-DD"` + `title`.
  - handler `#monthCalendar` : si clic hors événement sur une case → `dayCursor` = date, `agendaView='day'` (mémorisé), masque `#calendarPage`, affiche `#weekPage`, `renderAgenda()`.
- `calendar-page.css` : `.month-day{cursor:pointer}` + `:hover`.

## Vérifs

- `npm run verify` → **141 tests / 141 pass**, **SMOKE OK** (nouveau check `monthDayJump` : `renderMonthCalendar()` génère ≥ 28 cases avec `data-cal-day`). `node --check app.js` OK.

_Itération de navigation UI : couverte par un check smoke qui exerce le rendu du calendrier, pas de nouvelle fonction pure._
