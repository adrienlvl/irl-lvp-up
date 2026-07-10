# Boucle #93 (autonome) — Frise 7 jours des habitudes · build 1.9.27

**Contexte :** 18ᵉ itération de la boucle autonome. Aire : Habitudes / motivation.

## Livré

Chaque habitude du jour affiche désormais une **mini-frise des 7 derniers jours** sous son nom :
- 🟩 pastille pleine = jour **fait**,
- ⬜ contour rouge = jour **prévu mais non fait**,
- pastille estompée = jour **non prévu** (hors planning de l'habitude),
- contour accent = **aujourd'hui**.

On voit d'un coup d'œil la régularité récente, en complément de la série 🔥 et du record 🏆 déjà présents.

## Détail technique

- `lib/logic.js` : `habitWeekMap(habit, todayKey)` pur + testé → tableau de 7 jours (ancien→récent) `{ key, dow, scheduled, done }`, respecte les `weekdays` de l'habitude.
- `app.js` : `renderHabits` insère `<span class="habit-week">` (7 `<i class="hw-dot …">` avec infobulle date + état).
- `extras.css` : styles `.habit-week` / `.hw-dot` (`hw-done` / `hw-miss` / `hw-off` / `hw-today`).

## Vérifs

- `npm run verify` → **137 tests / 137 pass** (+1 : `habitWeekMap` — longueur 7, bornes J-6→aujourd'hui, fait/non fait, respect des jours prévus, date invalide), **SMOKE OK** (`habitWeek:true`).
