# Boucle #106 (autonome) — Temps planifié du jour · build 1.9.40

**Contexte :** 31ᵉ itération de la boucle autonome. Aire : Agenda / vue jour.

## Livré

L'en-tête de la **vue jour** affiche désormais une pastille **« ⏱️ 2 h 30 planifiées »** : le temps total occupé par les créneaux horodatés de la journée.

D'un coup d'œil, on jauge si la journée est chargée ou légère — à côté du compteur « X/Y faits » et de l'alerte de chevauchement déjà présents.

## Détail technique

- `lib/logic.js` : `dayPlannedMinutes(items)` pur + testé — somme des `durationMin` (défaut 60) des items horodatés (HH:MM), en ignorant « journée entière » et anniversaires.
- `app.js` : `renderDayView` calcule le total, le formate en « X h Y min » et l'insère dans `.day-view-head`.
- `extras.css` : style `.day-planned`.

## Vérifs

- `npm run verify` → **147 tests / 147 pass** (+1 : `dayPlannedMinutes` — somme, ignore sans-heure/journée/anniversaire, défaut 60, vide, non-tableau), **SMOKE OK** (`dayPlanned:true`).
