# Boucle #127 (autonome) — Échéances clés au calendrier · build 1.9.61

**Contexte :** 52ᵉ itération de la boucle autonome. Aire : Agenda / calendrier mensuel.

## Livré

Le **calendrier mensuel** affiche désormais les **échéances clés** sur leur jour, en plus des anniversaires et récurrents :

- 📚 **Examen** (date `examGoal`, ex. « BTS CG ») — pastille violette,
- 🏁 **Course** objectif (date `raceGoal`) — pastille bleue.

On visualise ses grands caps directement dans la vue d'ensemble du mois, pour planifier autour.

## Détail technique

- `lib/logic.js` : `keyDateMarkers(examGoal, raceGoal, dateKey)` pur + testé → liste de `{ kind:'exam'|'race', label }` pour le jour donné.
- `app.js` : `renderMonthCalendar` insère les marqueurs (via `keyDateMarkers(state.examGoal, state.raceGoal, date)`).
- `calendar-page.css` : styles `.month-event.exam-mark` / `.race-mark`.

## Vérifs

- `npm run verify` → **163 tests / 163 pass** (+1 : `keyDateMarkers` — examen, course, autre jour, les deux le même jour, null), **SMOKE OK** (`keyDateMarkers:true`). `node --check app.js` OK.
