# Boucle #89 (autonome) — Prochaine séance planifiée · build 1.9.23

**Contexte :** 14ᵉ itération de la boucle autonome. Aire : Athlète / planning.

## Livré

La page **Athlète** (panneau « Ton volume ») affiche désormais un bouton **« ⏭️ Prochaine séance »** qui montre le prochain créneau planifié à venir :
- « aujourd'hui à HH:MM », « demain à HH:MM », ou « dans X j (JJ/MM · HH:MM) »,
- clic → défile en douceur vers la liste des créneaux planifiés.

Avant, seul le créneau **du jour** était visible (coach du jour) ; on ne voyait pas d'un coup d'œil la prochaine séance quand elle tombait plus tard dans la semaine.

## Détail technique

- `lib/logic.js` : `nextTrainingSession(plans, todayKey, nowMinutes)` pur + testé.
  - Garde les séances de date future, et celles du jour même dont l'heure **n'est pas encore passée** (ou sans heure).
  - Tri par date puis heure ; renvoie `{ plan, daysLeft }` (via `daysUntil`), ou `null` si rien / entrée invalide.
- `app.js` : `renderAthlete` calcule et remplit `#nextSessionLine` (masqué s'il n'y a aucune séance à venir) + handler de défilement vers `#plannedList`.
- `index.html` : bouton `#nextSessionLine` dans le panneau volume. `athlete.css` : style `.next-session` (bord accent, hover).

## Vérifs

- `npm run verify` → **133 tests / 133 pass** (+1 : `nextTrainingSession` — tri, heure passée le jour même, aucune future, entrée non-tableau), **SMOKE OK** (`nextSession:true`).
