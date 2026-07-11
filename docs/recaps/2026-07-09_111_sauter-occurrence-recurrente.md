# Boucle #111 (autonome) — Sauter une occurrence récurrente · build 1.9.45

**Contexte :** 36ᵉ itération de la boucle autonome. Aire : Agenda / événements récurrents.

## Livré

On peut désormais **sauter une seule occurrence** d'un événement récurrent (ex. « pas de muscu ce lundi, c'est férié ») **sans mettre toute la série en pause** :

- bouton **« ⤫ sauter »** à côté de « Valider » sur chaque occurrence récurrente dans la vue jour,
- l'occurrence disparaît **de ce jour uniquement** ; les suivantes restent planifiées,
- respecté partout : vue jour, vue semaine, **calendrier mensuel** et **rappels desktop**.

## Détail technique

- `lib/logic.js` :
  - `normalizeRecurring` : nouveau champ `skipLog` (dates YYYY-MM-DD, filtré).
  - `recurringOccurs(rec, dateKey)` pur + testé : occurrence ssi non en pause, jour non dans `skipLog`, et `recurrenceMatches` vrai. Utilisé par `todayItems`.
- `app.js` : `skipRecurringOn(recId, date)` (ajoute au `skipLog`, `save`), bouton `data-day-recskip` + handler ; calendrier mensuel filtré via `recurringOccurs`.
- `electron-main.cjs` : `recurringToday` utilise `recurringOccurs` (les rappels ne sonnent plus pour un jour sauté).

## Vérifs

- `npm run verify` → **151 tests / 151 pass** (+1 : `recurringOccurs` — occurrence, jour non prévu, jour sauté, pause, `skipLog` normalisé), **SMOKE OK** (`recSkip:true`). `node --check` app + main OK.
