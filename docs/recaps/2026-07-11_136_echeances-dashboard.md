# Boucle #136 (autonome) — Échéances clés sur le dashboard · build 1.9.70

**Contexte :** 61ᵉ itération de la boucle autonome. Aire : Dashboard / visibilité des objectifs.

## Livré

Le panneau **« Ma journée »** (dashboard) affiche désormais les **échéances clés à venir** sous forme de puces, quand elles tombent dans les **60 jours** :

> 📚 **BTS CG · J-15**   🏁 **Course objectif · J-5**

- Triées par proximité, **orange à ≤ 7 jours**, « aujourd'hui ! / demain ! » aux derniers jours.
- Avant, ces caps n'étaient visibles que sur leurs pages respectives (Athlète / planning révision) — ils sont maintenant sur la page d'accueil quotidienne.

## Détail technique

- `lib/logic.js` : `upcomingKeyDates(examGoal, raceGoal, todayKey, horizon=60)` pur + testé → liste `{ kind, label, daysLeft, date }` (examen + course) dans l'horizon, triée croissant par `daysLeft`.
- `app.js` : `renderMyDay` remplit `#upcomingDeadlines` (masqué si aucune échéance) ; classe `soon` à ≤ 7 j.
- `index.html` / `extras.css` : conteneur + puces `.deadline-chip`.

## Vérifs

- `npm run verify` → **170 tests / 170 pass** (+1 : `upcomingKeyDates` — tri par proximité, hors horizon exclu, date passée exclue, null), **SMOKE OK** (`upcomingDeadlines:true`). `node --check app.js` OK.
