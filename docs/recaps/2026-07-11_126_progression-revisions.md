# Boucle #126 (autonome) — Progression des révisions BTS · build 1.9.60

**Contexte :** 51ᵉ itération de la boucle autonome. Aire : Révisions BTS CG (suite du compte à rebours d'examen).

## Livré

Sous le **compte à rebours d'examen**, une ligne montre l'**avancement des révisions** :

> 📖 **4/12 révisions faites** · 8 à venir.

- Relie l'effort quotidien (créneaux validés) à l'échéance (J-XX) — vue de progression concrète pour la prépa d'Adrien.
- Basée sur les événements d'agenda de type révision (`kind='study'`).

## Détail technique

- `lib/logic.js` : `studyStats(agenda, todayKey)` pur + testé → `{ total, done, upcoming }` (faites = `completed`, à venir = non faites et date ≥ aujourd'hui).
- `app.js` : `renderExamCountdown` remplit aussi `#studyProgress` (masqué si aucune révision).
- `index.html` / `extras.css` : `#studyProgress` sous `#examCountdown` + style.

## Vérifs

- `npm run verify` → **162 tests / 162 pass** (+1 : `studyStats` — total/faites/à venir, ignore non-study et passées non faites, vide/non-tableau), **SMOKE OK** (`studyProgress:true`). `node --check app.js` OK.
