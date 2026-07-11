# Boucle #124 (autonome) — Compte à rebours d'examen BTS · build 1.9.58

**Contexte :** 49ᵉ itération de la boucle autonome. Aire : Révisions / planning BTS CG (objectif clé d'Adrien).

## Livré

En générant son **planning de révision**, la **date d'examen est désormais mémorisée** et un **compte à rebours** s'affiche dans la section :

> 📚 **BTS CG — J-45 (le 15/05)**  · puis « J-28 · dernière ligne droite ! » (en orange) à ≤ 30 jours.

Avant, la date d'examen n'était qu'un champ ponctuel du formulaire. Elle devient un **cap persistant** — l'échéance qui donne du sens aux créneaux de révision.

- Au-delà de 90 j : affiché en semaines. À ≤ 30 j : bordure/texte orange « dernière ligne droite ! ». Après l'examen : « examen passé — nouveau cap ? ».

## Détail technique

- `lib/logic.js` : `examCountdown(examGoal, todayKey)` pur + testé → `{ daysLeft, weeksLeft, past, title, date }` (via `daysUntil`), `null` sans date.
- `app.js` :
  - `defaults` + `normalizeState` : nouveau champ persistant `examGoal { title, date }`.
  - handler `#studyPlanForm` : enregistre `state.examGoal` à la génération du planning.
  - `renderExamCountdown()` appelé dans le cycle de rendu ; remplit `#examCountdown` (masqué sans date).
- `index.html` / `extras.css` : `#examCountdown` dans la section « 🎓 Planning de révision » + style `.exam-soon`.

## Vérifs

- `npm run verify` → **161 tests / 161 pass** (+1 : `examCountdown` — J-XX, examen passé, titre défaut, pas de date/null), **SMOKE OK** (`examCountdown:true`). `node --check app.js` OK.
